"""
Regression tests for permanent lecture deletion, /api route aliases,
quiz transcript fallback, and Qdrant failure fallback.
"""

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine, TestingSessionLocal
from app.database import Base
from app.models import User, Lecture, Transcript, Note, LectureMessage, Quiz, QuizQuestion
from app.auth import hash_password
from app.main import app


class TestDeleteAndRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

        with TestingSessionLocal() as db:
            if not db.query(User).filter(User.email == "deltest.owner@university.edu").first():
                db.add(
                    User(
                        full_name="Delete Owner",
                        email="deltest.owner@university.edu",
                        password_hash=hash_password("PassOwner#2026!"),
                        role="user",
                        is_active=True,
                        is_verified=True,
                    )
                )
            if not db.query(User).filter(User.email == "deltest.other@university.edu").first():
                db.add(
                    User(
                        full_name="Delete Other",
                        email="deltest.other@university.edu",
                        password_hash=hash_password("PassOther#2026!"),
                        role="user",
                        is_active=True,
                        is_verified=True,
                    )
                )
            db.commit()

            cls.owner_id = db.query(User).filter(User.email == "deltest.owner@university.edu").first().id

        cls.owner_headers = cls._login("deltest.owner@university.edu", "PassOwner#2026!")
        cls.other_headers = cls._login("deltest.other@university.edu", "PassOther#2026!")

    @classmethod
    def _login(cls, email: str, password: str) -> dict:
        res = cls.client.post("/api/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Login failed: {res.text}"
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    def _create_full_lecture(self, title: str, with_note: bool = True) -> int:
        with TestingSessionLocal() as db:
            lec = Lecture(user_id=self.owner_id, title=title, status="completed" if with_note else "transcribed")
            db.add(lec)
            db.flush()

            db.add(
                Transcript(
                    lecture_id=lec.id,
                    transcript_text="Gradient descent minimizes a differentiable loss function iteratively using the negative gradient.",
                    duration_seconds=120,
                )
            )
            if with_note:
                db.add(
                    Note(
                        lecture_id=lec.id,
                        title=title,
                        summary="Overview of gradient descent optimization.",
                        content={
                            "title": title,
                            "summary": "Overview of gradient descent optimization.",
                            "sections": [{"heading": "Core Idea", "content": "Follow negative gradient steps."}],
                            "key_points": ["Learning rate controls step size."],
                            "revision_questions": [],
                        },
                        version=1,
                    )
                )
            db.add(LectureMessage(lecture_id=lec.id, role="user", content="What is gradient descent?"))
            db.add(LectureMessage(lecture_id=lec.id, role="assistant", content="An optimization method."))

            quiz_id = (db.query(Quiz.id).order_by(Quiz.id.desc()).first() or (0,))[0] + 1
            db.add(Quiz(id=quiz_id, lecture_id=lec.id, title=f"Quiz: {title}"))
            qq_id = (db.query(QuizQuestion.id).order_by(QuizQuestion.id.desc()).first() or (0,))[0] + 1
            db.add(
                QuizQuestion(
                    id=qq_id,
                    quiz_id=quiz_id,
                    question="What does gradient descent minimize?",
                    option_a="Loss function",
                    option_b="Batch size",
                    option_c="Learning rate",
                    option_d="Epoch count",
                    correct_answer="A",
                    explanation="Steps follow the negative gradient of loss.",
                )
            )
            db.commit()
            return lec.id

    def test_01_delete_api_lecture_removes_row_and_related_records(self):
        lecture_id = self._create_full_lecture("Gradient Descent Permanent Delete")

        with patch("app.main.delete_lecture_chunks") as mock_qdrant_delete:
            res = self.client.delete(f"/api/lectures/{lecture_id}", headers=self.owner_headers)
            self.assertEqual(res.status_code, 200, res.text)
            mock_qdrant_delete.assert_called_once_with(lecture_id)

        # Lecture must no longer exist in GET /lectures or GET /lectures/{id}
        detail_res = self.client.get(f"/lectures/{lecture_id}", headers=self.owner_headers)
        self.assertEqual(detail_res.status_code, 404)

        list_res = self.client.get("/lectures", headers=self.owner_headers)
        self.assertEqual(list_res.status_code, 200)
        listed_ids = [item["id"] for item in list_res.json().get("lectures", [])]
        self.assertNotIn(lecture_id, listed_ids)

        with TestingSessionLocal() as db:
            self.assertIsNone(db.query(Lecture).filter(Lecture.id == lecture_id).first())
            self.assertEqual(db.query(Note).filter(Note.lecture_id == lecture_id).count(), 0)
            self.assertEqual(db.query(Transcript).filter(Transcript.lecture_id == lecture_id).count(), 0)
            self.assertEqual(db.query(LectureMessage).filter(LectureMessage.lecture_id == lecture_id).count(), 0)
            self.assertEqual(db.query(Quiz).filter(Quiz.lecture_id == lecture_id).count(), 0)

    def test_02_delete_lecture_idor_forbidden(self):
        lecture_id = self._create_full_lecture("IDOR Delete Guard")
        res = self.client.delete(f"/api/lectures/{lecture_id}", headers=self.other_headers)
        self.assertEqual(res.status_code, 403)

    def test_03_quiz_transcript_fallback_and_api_alias(self):
        lecture_id = self._create_full_lecture("Transcript Fallback Quiz", with_note=False)
        mocked_quiz_response = {
            "questions": [
                {
                    "question": "How does gradient descent update weights?",
                    "options": {
                        "A": "Negative gradient direction",
                        "B": "Positive gradient direction",
                        "C": "Random perturbation",
                        "D": "Zero out weights",
                    },
                    "correct_answer": "A",
                    "explanation": "Negative gradient reduces loss locally.",
                }
            ]
        }
        with patch("app.main.generate_quiz", return_value=mocked_quiz_response) as mock_gen:
            res = self.client.post(f"/api/lectures/{lecture_id}/quiz", headers=self.owner_headers)
            self.assertEqual(res.status_code, 200, res.text)
            self.assertEqual(len(res.json().get("questions", [])), 1)
            mock_gen.assert_called_once()

    def test_04_chat_api_alias_and_qdrant_fallback(self):
        lecture_id = self._create_full_lecture("Chat Qdrant Fallback")
        mocked_qa = {
            "answer": "Gradient descent iteratively moves against the gradient of loss.",
            "confidence": "high",
            "sources": ["Transcript summary"],
        }
        with patch("app.main.retrieve_context", side_effect=RuntimeError("Qdrant down")), patch(
            "app.main.answer_question", return_value=mocked_qa
        ):
            res = self.client.post(
                f"/api/lectures/{lecture_id}/questions",
                headers=self.owner_headers,
                json={"question": "What does gradient descent do?"},
            )
            self.assertEqual(res.status_code, 200, res.text)
            self.assertIn("messages", res.json())

            hist = self.client.get(f"/api/lectures/{lecture_id}/questions", headers=self.owner_headers)
            self.assertEqual(hist.status_code, 200)
            self.assertGreaterEqual(len(hist.json().get("messages", [])), 2)


if __name__ == "__main__":
    unittest.main()
