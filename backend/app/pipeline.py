from .cleaner import clean_transcript
from .segmentor import segment_transcript
from .coverage_checker import check_coverage
from .notes_generator import generate_notes
from .qdrant_service import store_chunks


def process_transcript(
    transcript: str,
    lecture_id: int
):
    """
    Complete P_119 processing pipeline.

    Flow:
        Transcript
            ↓
        Cleaning
            ↓
        Chunking
            ↓
        Embeddings + Qdrant
            ↓
        Hybrid topic segmentation
            ↓
        LLM note generation
            ↓
        Coverage checking
    """

    # --------------------------------------------------
    # 1. VALIDATE TRANSCRIPT
    # --------------------------------------------------

    if not transcript or not transcript.strip():
        raise ValueError(
            "Transcript cannot be empty"
        )

    # --------------------------------------------------
    # 2. CLEAN TRANSCRIPT
    # --------------------------------------------------

    cleaned = clean_transcript(
        transcript
    )

    if not cleaned:
        raise ValueError(
            "Transcript is empty after cleaning"
        )

    # --------------------------------------------------
    # 3. SPLIT INTO CHUNKS
    # --------------------------------------------------

    chunks = [
        chunk.strip()
        for chunk in cleaned.split(".")
        if chunk.strip()
    ]

    if not chunks:
        raise ValueError(
            "No usable transcript chunks found"
        )

    # --------------------------------------------------
    # 4. STORE EMBEDDINGS IN QDRANT
    # --------------------------------------------------

    store_chunks(
        lecture_id=lecture_id,
        chunks=chunks
    )

    # --------------------------------------------------
    # 5. HYBRID TOPIC SEGMENTATION
    # --------------------------------------------------

    segments = segment_transcript(
        chunks
    )

    if not segments:
        raise ValueError(
            "No topic segments generated"
        )

    # --------------------------------------------------
    # 6. GENERATE NOTES
    # --------------------------------------------------

    generated_notes = []

    for segment in segments:

        if isinstance(segment, dict):
            segment_text = segment.get(
                "text",
                ""
            )
        else:
            segment_text = str(segment)

        segment_text = segment_text.strip()

        if not segment_text:
            continue

        notes = generate_notes(
            segment_text
        )

        generated_notes.append({
            "source_segment": segment_text,
            "notes": notes
        })

    if not generated_notes:
        raise ValueError(
            "No notes were generated"
        )

    # --------------------------------------------------
    # 7. COVERAGE CHECK
    # --------------------------------------------------

    coverage = check_coverage(
        segments,
        generated_notes
    )

    # --------------------------------------------------
    # 8. FINAL RESULT
    # --------------------------------------------------

    return {
        "cleaned_transcript": cleaned,
        "chunks": chunks,
        "segments": segments,
        "notes": generated_notes,
        "coverage": coverage
    }