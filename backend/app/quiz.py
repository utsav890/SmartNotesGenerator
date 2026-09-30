import os
import json

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


def get_groq_client():
    return Groq(
        api_key=os.getenv("GROQ_API_KEY")
    )


def generate_quiz(
    notes_context: str,
    count: int = 10
):

    client = get_groq_client()

    prompt = f"""
Create exactly {count} multiple-choice questions
from the lecture material below.

Rules:
- Use ONLY the provided lecture material.
- Do not use outside knowledge.
- Each question must have exactly 4 options.
- Only one option can be correct.
- Include a short explanation.
- Questions should cover important lecture concepts.
- Return valid JSON only.

Required format:

{{
    "questions": [
        {{
            "question": "Question",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "correct_answer": "A",
            "explanation": "Short explanation"
        }}
    ]
}}

LECTURE MATERIAL:

{notes_context}
"""

    response = client.chat.completions.create(
        model="qwen/qwen3.8-27b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a lecture quiz generator. "
                    "Create accurate questions using only "
                    "the provided lecture material."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        response_format={
            "type": "json_object"
        }
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError(
            "Empty quiz response from LLM"
        )

    result = json.loads(content)

    questions = result.get(
        "questions",
        []
    )

    if not questions:
        raise ValueError(
            "No quiz questions generated"
        )

    return {
        "questions": questions[:count]
    }