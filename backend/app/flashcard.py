import os
import json

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


def get_groq_client():
    return Groq(
        api_key=os.getenv("GROQ_API_KEY")
    )


def generate_flashcards(
    notes_context: str,
    count: int = 10
):

    client = get_groq_client()

    prompt = f"""
Create exactly {count} study flashcards from the lecture
material below.

Rules:
- Use ONLY the provided lecture material.
- Do not add outside information.
- Focus on important concepts and facts.
- Questions should be useful for revision.
- Answers should be concise and accurate.
- Return valid JSON only.

Required format:

{{
    "flashcards": [
        {{
            "question": "Question",
            "answer": "Answer"
        }}
    ]
}}

LECTURE MATERIAL:
{notes_context}
"""

    response = client.chat.completions.create(
        model="qwen/qwen3-8b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a lecture study assistant "
                    "that creates accurate flashcards."
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
            "Empty flashcard response from LLM"
        )

    result = json.loads(content)

    flashcards = result.get(
        "flashcards",
        []
    )

    if not flashcards:
        raise ValueError(
            "No flashcards were generated"
        )

    return {
        "flashcards": flashcards[:count]
    }