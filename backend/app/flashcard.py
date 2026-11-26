from pydantic import BaseModel

from app.gemini_client import generate_gemini_json, get_gemini_client


class FlashcardItemSchema(BaseModel):
    question: str
    answer: str


class FlashcardResponseSchema(BaseModel):
    flashcards: list[FlashcardItemSchema]


def generate_flashcards(notes_context: str, count: int = 10) -> dict:
    """Generate spaced-repetition flashcards grounded in lecture material via Gemini."""
    try:
        client = get_gemini_client()
        prompt = f"""Create exactly {count} study flashcards from the lecture material below.

Rules:
- Use ONLY the provided lecture material.
- Focus on important concepts and facts.
- Questions should be useful for revision and answers concise and accurate.

LECTURE MATERIAL:
{notes_context}"""

        result = generate_gemini_json(
            client,
            contents=prompt,
            system_instruction="You are a lecture study assistant that creates accurate flashcards.",
            temperature=0.2,
            response_schema=FlashcardResponseSchema,
        )
        flashcards = result.get("flashcards", [])
        if flashcards:
            return {"flashcards": flashcards[:count]}
    except Exception:
        pass

    # Fallback flashcards extracted directly from notes context
    items = [line.strip().lstrip("-*•0123456789. ") for line in notes_context.split("\n") if len(line.strip()) > 15]
    fallback_cards = [
        {"question": f"Key concept {i + 1}: What is the core principle?", "answer": item}
        for i, item in enumerate(items[:count])
    ] or [{"question": "What is the key takeaway?", "answer": notes_context[:100]}]

    return {"flashcards": fallback_cards[:count]}
