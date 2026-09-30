from app.qdrant_service import search_chunks


def retrieve_context(
    lecture_id: int,
    query: str,
    limit: int = 5
):

    results = search_chunks(
        lecture_id=lecture_id,
        query=query,
        limit=limit
    )

    contexts = []

    for result in results:

        text = result.payload.get(
            "text",
            ""
        )

        score = result.score

        if text:
            contexts.append({
                "text": text,
                "score": score
            })

    return contexts


def build_context(
    lecture_id: int,
    query: str,
    limit: int = 5
):

    contexts = retrieve_context(
        lecture_id=lecture_id,
        query=query,
        limit=limit
    )

    return "\n\n".join(
        f"[Source {i + 1}]\n"
        f"Relevance: {item['score']:.4f}\n"
        f"{item['text']}"
        for i, item in enumerate(contexts)
    )