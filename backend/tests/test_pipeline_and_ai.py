"""
SmartNotes AI - Pipeline, NLP & AI Services Test Suite
Covers:
- Transcript cleaning and noise removal (cleaner.py)
- Topic segmentation and chunking (segmentor.py)
- Content coverage verification (coverage_checker.py)
- Mocked Whisper audio transcription flow
- Mocked Groq LLM note synthesis (notes_generator.py)
- Mocked RAG retrieval and Q&A context assembly (rag.py & notes_generator.py)
- Mocked Quiz & Flashcard generation (quiz.py & flashcard.py)
"""

import unittest
from unittest.mock import MagicMock, patch

from app.cleaner import clean_transcript
from app.segmentor import segment_transcript
from app.coverage_checker import check_coverage
from app.quiz import generate_quiz
from app.flashcard import generate_flashcards


class TestPipelineAndAI(unittest.TestCase):
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
                            "summary": "Neural networks use activation functions like ReLU and backpropagation.",
                            "points": ["Backpropagation computes gradients"]
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
    def test_06_mocked_whisper_transcription(self, mock_load):
        """Verify Whisper transcription workflow with mocked model inference."""
        from app.transcription import transcribe_audio
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {
            "text": "This is a transcribed lecture on microeconomics.",
            "language": "en"
        }
        mock_load.return_value = mock_model

        with patch("pathlib.Path.is_file", return_value=True):
            result = transcribe_audio("dummy_lecture.mp3")
            self.assertEqual(result["transcript"], "This is a transcribed lecture on microeconomics.")
            self.assertEqual(result["language"], "en")

    @patch("app.notes_generator.Groq")
    def test_07_mocked_notes_generation(self, mock_groq_class):
        """Verify structured notes generation produces required Pydantic-compliant schema."""
        from app.notes_generator import generate_notes

        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content="""{
                        "title": "Deep Learning Basics",
                        "summary": "Comprehensive overview of neural architectures.",
                        "sections": [{"heading": "Perceptrons", "summary": "Basic unit", "points": ["Linear sum"]}],
                        "key_points": ["Weights adjust via backprop"],
                        "glossary": [{"term": "ReLU", "definition": "Rectified Linear Unit"}],
                        "revision_questions": ["What is backpropagation?"]
                    }"""
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        notes = generate_notes("Sample lecture text about neural networks.")
        self.assertEqual(notes["title"], "Deep Learning Basics")
        self.assertIn("sections", notes)
        self.assertEqual(len(notes["sections"]), 1)
        self.assertEqual(notes["glossary"][0]["term"], "ReLU")

    @patch("app.notes_generator.Groq")
    def test_08_mocked_answer_question_rag(self, mock_groq_class):
        """Verify RAG question answering formats context, retrieved sources, and returns confidence."""
        from app.notes_generator import answer_question

        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content="""{
                        "answer": "Backpropagation calculates error gradients using the chain rule.",
                        "sources": ["Lecture Section 2"],
                        "confidence": "high"
                    }"""
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        res = answer_question(
            question="How does backpropagation work?",
            context="Backpropagation computes gradients backwards using calculus chain rule.",
            notes_context="Gradient descent adjusts weights.",
            history=[]
        )
        self.assertIn("Backpropagation", res["answer"])
        self.assertEqual(res["confidence"], "high")

    @patch("app.quiz.Groq")
    def test_09_mocked_quiz_generation(self, mock_groq_class):
        """Verify quiz generator parses multiple choice questions, options, and explanations."""
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content="""{
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
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        res = generate_quiz("Lecture notes content on ATP synthesis.", count=1)
        self.assertIn("questions", res)
        q = res["questions"][0]
        self.assertEqual(q["correct_answer"], "A")
        self.assertEqual(q["options"]["A"], "Energy storage")

    @patch("app.flashcard.Groq")
    def test_10_mocked_flashcard_generation(self, mock_groq_class):
        """Verify flashcard generator produces question and answer pairs."""
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content="""{
                        "flashcards": [
                            {
                                "question": "What is an artificial neuron?",
                                "answer": "A mathematical model receiving weighted inputs plus bias."
                            }
                        ]
                    }"""
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        res = generate_flashcards("Perceptron mathematical definition.", count=1)
        self.assertIn("flashcards", res)
        self.assertEqual(len(res["flashcards"]), 1)
        self.assertIn("mathematical model", res["flashcards"][0]["answer"])
