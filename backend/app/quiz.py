from typing import Literal

from pydantic import BaseModel

from app.gemini_client import generate_gemini_json, get_gemini_client


class QuizOptionsSchema(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuizQuestionSchema(BaseModel):
    question: str
    options: QuizOptionsSchema
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str


class QuizResponseSchema(BaseModel):
    questions: list[QuizQuestionSchema]


def generate_quiz(notes_context: str, count: int = 10) -> dict:
    """Generate active-recall multiple-choice quiz questions grounded in lecture material via Gemini."""
    client = get_gemini_client()

    prompt = f"""Create exactly {count} multiple-choice questions from the lecture material below.

Rules:
- Use ONLY the provided lecture material.
- Do not use outside knowledge.
- Each question must have exactly 4 options labeled A, B, C, D.
- Only one option can be correct ("A", "B", "C", or "D").
- Include a short explanation for each answer.

LECTURE MATERIAL:

{notes_context}"""

    result = generate_gemini_json(
        client,
        contents=prompt,
        system_instruction="You are a lecture quiz generator. Create accurate questions using only the provided lecture material.",
        temperature=0.2,
        response_schema=QuizResponseSchema,
    )

    questions = result.get("questions", [])
    if not questions:
        raise ValueError("No quiz questions generated")

    return {"questions": questions[:count]}
