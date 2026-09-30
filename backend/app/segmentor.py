def segment_transcript(chunks, chunk_size=5):
    """
    Split transcript chunks into groups.

    This is the initial MVP segmentation strategy.
    Later, this can be replaced with embedding-based
    topic segmentation.
    """

    if not chunks:
        return []

    segments = []
    current_segment = []

    for chunk in chunks:
        chunk = chunk.strip()

        if not chunk:
            continue

        current_segment.append(chunk)

        if len(current_segment) >= chunk_size:
            segments.append(" ".join(current_segment))
            current_segment = []

    if current_segment:
        segments.append(" ".join(current_segment))

    return segments