"""
SmartNotes AI - Pipeline, NLP & AI Services Test Suite
Covers:
- Transcript cleaning and noise removal (cleaner.py)
- Topic segmentation and chunking (segmentor.py)
- Content coverage verification (coverage_checker.py)
- Mocked Google Gemini native audio transcription flow
- Mocked Google Gemini structured note synthesis (notes_generator.py)
- Mocked RAG retrieval and Q&A context assembly (rag.py & notes_generator.py)
- Mocked Quiz & Flashcard generation via Gemini (quiz.py & flashcard.py)
"""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.cleaner import clean_transcript
from app.segmentor import segment_transcript
from app.coverage_checker import check_coverage
from app.quiz import generate_quiz
from app.flashcard import generate_flashcards


class TestPipelineAndAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["GEMINI_API_KEY"] = "gemini_ci_mock_test_key_for_automated_testing_12345"

    def test_01_clean_transcript_noise_and_markers(self):
        """Verify cleaner removes transcription artifacts, noise markers and excessive spaces."""
        raw = "Hello everyone... [applause]   Welcome to class [inaudible] ..   Today we cover AI."
        cleaned = clean_transcript(raw)
        self.assertNotIn("[applause]", cleaned)
        self.assertNotIn("[inaudible]", cleaned)
        self.assertNotIn("..", cleaned)
        self.assertEqual(cleaned, "Hello everyone. Welcome to class. Today we cover AI.")

    def test_02_clean_transcript_empty(self):
        """Verify cleaner handles empty string gracefully."""
        self.assertEqual(clean_transcript(""), "")
        self.assertEqual(clean_transcript(None), "")

    def test_03_segmentor_chunking_logic(self):
        """Verify transcript chunk grouping into uniform segments."""
        chunks = [f"Sentence {i}." for i in range(12)]
        segments = segment_transcript(chunks, chunk_size=5)
        self.assertEqual(len(segments), 3)  # 5 + 5 + 2
        self.assertIn("Sentence 0.", segments[0])
        self.assertIn("Sentence 4.", segments[0])
        self.assertIn("Sentence 10.", segments[2])

    def test_04_segmentor_empty_input(self):
        """Verify segmentor handles empty list."""
        self.assertEqual(segment_transcript([]), [])
        self.assertEqual(segment_transcript(["   "]), [])

    def test_05_coverage_checker(self):
        """Verify coverage checker calculates representation percentage between transcript and notes."""
        source_segments = [
            "Neural networks use activation functions like ReLU and backpropagation.",
            "Cellular respiration involves glycolysis Krebs cycle and ATP synthase."
        ]
        generated_notes = [
            {
                "notes": {
                    "title": "Neural Networks & Biology",
                    "summary": "Covers neural networks, backpropagation, and cellular respiration ATP.",
                    "sections": [
                        {
                            "heading": "Neural Networks",
                            "content": "Neural networks use activation functions like ReLU and backpropagation.",
                        }
                    ]
                }
            }
        ]
        res = check_coverage(source_segments, generated_notes, threshold=0.10)
        self.assertIn("coverage_percentage", res)
        self.assertGreaterEqual(res["coverage_percentage"], 0.0)
        self.assertIn("covered_segments", res)

    @patch("app.transcription.load_model")
    def test_06_mocked_whisper_audio_transcription(self, mock_load_model):
        """Verify Whisper audio transcription workflow and cleaned transcript return."""
        from app.transcription import transcribe_audio

        mock_model = MagicMock()
        mock_model.transcribe.return_value = {
            "text": "  This is a transcribed lecture on microeconomics.  ",
            "language": "en",
        }
        mock_load_model.return_value = mock_model

        with patch("pathlib.Path.is_file", return_value=True), patch(
            "pathlib.Path.stat", return_value=SimpleNamespace(st_size=2048)
        ):
            result = transcribe_audio("dummy_lecture.mp3")
            self.assertEqual(result["transcript"], "This is a transcribed lecture on microeconomics.")
            self.assertEqual(result["language"], "en")
            mock_model.transcribe.assert_called_once()

    @patch("app.notes_generator.get_gemini_client")
    def test_07_mocked_notes_generation(self, mock_get_client):
        """Verify structured notes generation produces required JSON schema including bold-lead bullets."""
        from app.notes_generator import generate_notes

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text="""{
                "title": "Deep Learning Basics",
                "summary": "Comprehensive overview of neural architectures.",
                "sections": [
                    {
                        "heading": "Perceptrons",
                        "intro": "Artificial neurons compute weighted linear combinations.",
                        "bullets": [
                            {"label": "Weighted Sum", "detail": "Inputs are multiplied by weights plus bias."},
                            {"label": "Activation", "detail": "ReLU introduces non-linearity."}
                        ],
                        "content": ""
                    }
                ],
                "key_points": ["Weights adjust via backprop"],
                "glossary": [{"term": "ReLU", "definition": "Rectified Linear Unit"}],
                "revision_questions": [{"question": "What is backpropagation?", "answer": "Gradient computation via chain rule."}]
            }"""
        )

        notes = generate_notes("Sample lecture text about neural networks.")
        self.assertEqual(notes["title"], "Deep Learning Basics")
        self.assertEqual(len(notes["sections"]), 1)
        self.assertEqual(len(notes["sections"][0]["bullets"]), 2)
        self.assertEqual(notes["sections"][0]["bullets"][0]["label"], "Weighted Sum")
        self.assertIn("Weighted Sum: Inputs are multiplied", notes["sections"][0]["content"])
        self.assertEqual(notes["glossary"][0]["term"], "ReLU")

    @patch("app.notes_generator.get_gemini_client")
    def test_08_mocked_answer_question_rag(self, mock_get_client):
        """Verify RAG question answering formats context, retrieved sources, and returns confidence."""
        from app.notes_generator import answer_question

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text="""{
                "answer": "Backpropagation calculates error gradients using the chain rule.",
                "sources": ["Lecture Section 2"],
                "confidence": "high"
            }"""
        )

        res = answer_question(
            question="How does backpropagation work?",
            context="Backpropagation computes gradients backwards using calculus chain rule.",
            notes_context="Gradient descent adjusts weights.",
            history=[]
        )
        self.assertIn("Backpropagation", res["answer"])
        self.assertEqual(res["confidence"], "high")

    @patch("app.quiz.get_gemini_client")
    def test_09_mocked_quiz_generation(self, mock_get_client):
        """Verify quiz generator parses multiple choice questions, options, and explanations."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text="""{
                "questions": [
                    {
                        "question": "What is the primary role of ATP?",
                        "options": {
                            "A": "Energy storage",
                            "B": "Genetic blueprint",
                            "C": "Cellular respiration fuel",
                            "D": "Structural component"
                        },
                        "correct_answer": "A",
                        "explanation": "ATP is the primary biochemical energy currency."
                    }
                ]
            }"""
        )

        res = generate_quiz("Lecture notes content on ATP synthesis.", count=1)
        self.assertIn("questions", res)
        q = res["questions"][0]
        self.assertEqual(q["correct_answer"], "A")
        self.assertEqual(q["options"]["A"], "Energy storage")

    @patch("app.flashcard.get_gemini_client")
    def test_10_mocked_flashcard_generation(self, mock_get_client):
        """Verify flashcard generator produces question and answer pairs."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text="""{
                "flashcards": [
                    {
                        "question": "What is an artificial neuron?",
                        "answer": "A mathematical model receiving weighted inputs plus bias."
                    }
                ]
            }"""
        )

        res = generate_flashcards("Perceptron mathematical definition.", count=1)
        self.assertIn("flashcards", res)
        self.assertEqual(len(res["flashcards"]), 1)
        self.assertIn("mathematical model", res["flashcards"][0]["answer"])

    @patch("app.transcription.load_model")
    @patch("app.transcription._convert_video_to_audio_if_needed")
    def test_11_mocked_whisper_mp4_audio_extraction(self, mock_extract, mock_load_model):
        """Verify MP4 uploads run ffmpeg audio pre-extraction before Whisper transcription."""
        from pathlib import Path
        from app.transcription import transcribe_audio

        extracted_wav = Path("large_lecture.extracted.wav")
        mock_extract.return_value = extracted_wav
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "MP4 lecture transcript via Whisper.", "language": "en"}
        mock_load_model.return_value = mock_model

        with patch("pathlib.Path.is_file", return_value=True), patch(
            "pathlib.Path.stat", return_value=SimpleNamespace(st_size=18 * 1024 * 1024)
        ), patch("pathlib.Path.unlink"):
            result = transcribe_audio("large_lecture.mp4")
            self.assertEqual(result["transcript"], "MP4 lecture transcript via Whisper.")
            mock_extract.assert_called_once()
            mock_model.transcribe.assert_called_once_with(str(extracted_wav), fp16=False)

    @patch("app.coverage_checker.get_gemini_client")
    def test_12_mocked_gemini_coverage_audit(self, mock_get_client):
        """Verify Gemini semantic coverage validation enforces JSON output cleanly."""
        from app.coverage_checker import verify_coverage_with_gemini

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text='{"covered": true, "coverage_percentage": 95.0, "missing_topics": []}'
        )

        res = verify_coverage_with_gemini(["Neural network gradients"], [{"notes": {"summary": "Neural network gradients overview"}}])
        self.assertTrue(res["semantic_covered"])
        self.assertEqual(res["semantic_missing_topics"], [])

    def test_13_gemini_client_uses_v1beta_and_parses_api_error(self):
        """Verify Gemini client selects v1beta (for system_instruction) and extracts clean error messages."""
        import os
        from google.genai import errors
        from app.gemini_client import extract_gemini_error_message, get_gemini_client

        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaSyTestDummyKeyForUnitTestOnly123"}):
            client = get_gemini_client()
            self.assertEqual(client._api_client._http_options.api_version, "v1beta")

        api_err = errors.APIError(
            code=400,
            response_json={"error": {"code": 400, "message": "System instruction unsupported on v1.", "status": "INVALID_ARGUMENT"}},
        )
        self.assertEqual(extract_gemini_error_message(api_err), "System instruction unsupported on v1.")

        wrapped = RuntimeError(
            "400 INVALID_ARGUMENT. {'error': {'code': 400, 'message': 'Model quota temporarily exceeded.', 'status': 'INVALID_ARGUMENT'}}"
        )
        self.assertEqual(extract_gemini_error_message(wrapped), "Model quota temporarily exceeded.")
