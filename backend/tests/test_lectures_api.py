"""
SmartNotes AI - Lecture Lifecycle, Multi-Tenancy & File Security Test Suite
Covers:
- Lecture creation and metadata validation
- Multi-tenancy isolation and IDOR (Insecure Direct Object Reference) prevention
- Audio upload security (magic byte verification, extension whitelisting, size limits)
- Path traversal defense on file transcription endpoints
"""

import io
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine, TestingSessionLocal
from app.database import Base
from app.models import User, Lecture
from app.auth import hash_password
import app.main as app_main
from app.main import app


class TestLecturesAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

        # Create two distinct tenants for IDOR testing if not already present
        with TestingSessionLocal() as db:
            if not db.query(User).filter(User.email == "tenant.alpha@university.edu").first():
                user_a = User(
                    full_name="Tenant Alpha",
                    email="tenant.alpha@university.edu",
                    password_hash=hash_password("PassAlpha#2026!"),
                    role="user",
                    is_verified=True,
                    is_active=True
                )
                db.add(user_a)
            if not db.query(User).filter(User.email == "tenant.beta@university.edu").first():
                user_b = User(
                    full_name="Tenant Beta",
                    email="tenant.beta@university.edu",
                    password_hash=hash_password("PassBeta#2026!"),
                    role="user",
                    is_verified=True,
                    is_active=True
                )
                db.add(user_b)
            db.commit()

        # Login Tenant A
        res_a = cls.client.post("/api/auth/login", json={
            "email": "tenant.alpha@university.edu",
            "password": "PassAlpha#2026!"
        })
        cls.token_a = res_a.json()["token"]

        # Login Tenant B
        res_b = cls.client.post("/api/auth/login", json={
            "email": "tenant.beta@university.edu",
            "password": "PassBeta#2026!"
        })
        cls.token_b = res_b.json()["token"]

    def test_01_create_lecture_valid(self):
        """Verify lecture creation succeeds for authenticated user."""
        res = self.client.post(
            "/lectures",
            json={"title": "Introduction to Quantum Mechanics"},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("lecture_id", data)
        self.assertEqual(data["title"], "Introduction to Quantum Mechanics")
        TestLecturesAPI.lecture_a_id = data["lecture_id"]

    def test_02_create_lecture_empty_title_rejection(self):
        """Verify lecture creation rejects empty or whitespace-only titles (400 Bad Request)."""
        res = self.client.post(
            "/lectures",
            json={"title": "   "},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot be empty", res.json()["detail"].lower())

    def test_03_idor_protection_lecture_detail(self):
        """Verify Tenant B cannot access Tenant A's private lecture (IDOR defense - 403 Forbidden)."""
        res = self.client.get(
            f"/lectures/{self.lecture_a_id}",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("permission", res.json()["detail"].lower())

    def test_04_idor_protection_delete_notes(self):
        """Verify Tenant B cannot delete notes belonging to Tenant A's lecture (403 Forbidden)."""
        res = self.client.delete(
            f"/lectures/{self.lecture_a_id}/notes",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_05_audio_upload_unsupported_format(self):
        """Verify rejection of non-audio files (e.g. .exe, .sh, .py)."""
        fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
        res = self.client.post(
            "/upload-audio",
            files={"file": ("malicious.exe", fake_exe, "application/octet-stream")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("unsupported", res.json()["detail"].lower())

    def test_06_audio_upload_empty_file(self):
        """Verify rejection of empty audio files (400 Bad Request)."""
        empty_file = io.BytesIO(b"")
        res = self.client.post(
            "/upload-audio",
            files={"file": ("silent.mp3", empty_file, "audio/mpeg")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("empty", res.json()["detail"].lower())

    def test_07_audio_upload_magic_bytes_spoofing_defense(self):
        """Verify file extension spoofing defense: Disguised text file named .mp3 is rejected."""
        disguised_file = io.BytesIO(b"Plain text payload pretending to be an audio file.")
        res = self.client.post(
            "/upload-audio",
            files={"file": ("fake_audio.mp3", disguised_file, "audio/mpeg")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("disguised", res.json()["detail"].lower())

    def test_08_audio_upload_valid_binary_success(self):
        """Verify valid audio file with correct ID3 header uploads and associates with user."""
        # Genuine MP3 ID3 header
        valid_audio = io.BytesIO(b"ID3\x04\x00\x00\x00\x00\x00\x20" + b"\x00" * 200)
        res = self.client.post(
            "/upload-audio",
            files={"file": ("quantum_lecture.mp3", valid_audio, "audio/mpeg")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("lecture_id", data)
        self.assertIn("saved_filename", data)
        self.assertEqual(data["status"], "uploaded")

    def test_09_path_traversal_defense(self):
        """Verify path traversal attack on /transcribe/{filename} is blocked (400, 404, or 405)."""
        res = self.client.post(
            "/transcribe/..%2F..%2Fetc%2Fpasswd",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertIn(res.status_code, [400, 404, 405])

    def test_10_mp4_audio_upload_valid_binary_success(self):
        """Verify valid MP4 video/audio container file with ftyp header uploads successfully."""
        valid_mp4 = io.BytesIO(b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41" + b"\x00" * 200)
        res = self.client.post(
            "/upload-audio",
            files={"file": ("lecture_recording.mp4", valid_mp4, "video/mp4")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("lecture_id", data)
        self.assertIn("saved_filename", data)
        self.assertEqual(data["status"], "uploaded")

    def test_11_audio_upload_over_300mb_rejected(self):
        """Verify max media upload limit is 300 MB and oversized MP4 uploads return HTTP 413."""
        self.assertEqual(app_main.MAX_FILE_SIZE, 300 * 1024 * 1024)
        oversized_mp4 = io.BytesIO(
            b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41" + b"\x00" * 2048
        )
        with patch.object(app_main, "MAX_FILE_SIZE", 1024):
            res = self.client.post(
                "/upload-audio",
                files={"file": ("too_big.mp4", oversized_mp4, "video/mp4")},
                headers={"Authorization": f"Bearer {self.token_a}"}
            )
        self.assertEqual(res.status_code, 413)
        self.assertIn("300 MB", res.json()["detail"])

    def test_12_duration_extraction_backfill_and_dashboard_stats(self):
        """Verify WAV/transcript duration tracking, zero-duration backfill, and /api/dashboard summation."""
        import wave
        from app.models import Transcript

        # 1. Valid WAV header upload extracts real duration (2 seconds @ 8000Hz)
        wav_buf = io.BytesIO()
        with wave.open(wav_buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(8000)
            wf.writeframes(b"\x00\x00" * 16000)
        wav_buf.seek(0)

        up_res = self.client.post(
            "/upload-audio",
            files={"file": ("short_clip.wav", wav_buf, "audio/wav")},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(up_res.status_code, 200)
        self.assertEqual(up_res.json()["duration_seconds"], 2)

        # 2. Pasted transcript estimates ~130 wpm (260 words -> 120 seconds)
        with patch("app.main.generate_notes", return_value={
            "title": "Operating Systems Scheduling",
            "summary": "Overview of CPU scheduling algorithms.",
            "sections": [{"heading": "Round Robin", "bullets": [{"label": "Quantum", "detail": "Fixed time slice."}], "content": "Fixed time slice."}],
            "key_points": ["Fairness vs throughput"],
            "glossary": [],
            "revision_questions": [],
        }):
            gen_res = self.client.post(
                "/generate-notes",
                json={"transcript": " ".join(["scheduler"] * 260)},
                headers={"Authorization": f"Bearer {self.token_a}"}
            )
        self.assertEqual(gen_res.status_code, 200)
        self.assertEqual(gen_res.json()["duration_seconds"], 120)
        pasted_lec_id = gen_res.json()["lecture_id"]

        # 3. Backfill zero-duration completed lecture via /api/dashboard
        db = TestingSessionLocal()
        try:
            zero_lec = db.query(Lecture).filter(Lecture.id == pasted_lec_id).first()
            zero_lec.duration_seconds = 0
            tr = db.query(Transcript).filter(Transcript.lecture_id == pasted_lec_id).first()
            tr.duration_seconds = 0
            db.commit()
        finally:
            db.close()

        dash_res = self.client.get("/api/dashboard", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.json()
        self.assertGreaterEqual(dash_data["stats"]["total_duration_seconds"], 122)
        matched = next(l for l in dash_data["lectures"] if l["id"] == pasted_lec_id)
        self.assertEqual(matched["duration_seconds"], 120)
