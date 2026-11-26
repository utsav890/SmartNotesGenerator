from app.qdrant_service import search_chunks


def retrieve_context(lecture_id: int, query: str, limit: int = 5):
    results = search_chunks(lecture_id=lecture_id, query=query, limit=limit)
    return [
        {"text": text, "score": result.score}
        for result in results
        if (text := result.payload.get("text", ""))
    ]