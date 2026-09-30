import re


def clean_transcript(text: str) -> str:
    """
    Clean raw lecture transcript before topic segmentation.

    The cleaner removes transcription noise while preserving
    meaningful lecture content.
    """

    if not text:
        return ""

    # Normalize line breaks and tabs
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = text.replace("\t", " ")

    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove repeated punctuation
    text = re.sub(r"\.{2,}", ".", text)
    text = re.sub(r",{2,}", ",", text)

    # Remove common standalone transcription markers
    text = re.sub(
        r"\[(music|noise|applause|inaudible|silence)\]",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove spaces before punctuation
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)

    # Normalize repeated spaces again
    text = re.sub(r"\s+", " ", text)

    return text.strip()