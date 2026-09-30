import logging
import time
from functools import lru_cache
from pathlib import Path

import whisper

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_model():
    # Load the model once and reuse it
    return whisper.load_model("base")


def transcribe_audio(file_path: str):
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError("Audio file not found")

    started_at = time.perf_counter()
    model = load_model()
    model_loaded_at = time.perf_counter()

    try:
        result = model.transcribe(
            str(path),
            fp16=False
        )
    except Exception:
        logger.error(
            "Whisper audio decoding and inference failed after %.2f seconds",
            time.perf_counter() - model_loaded_at
        )
        raise

    text = result.get("text")
    transcript = text.strip() if isinstance(text, str) else ""
    completed_at = time.perf_counter()

    logger.info(
        "Whisper timing: model_load=%.2fs decode_and_inference=%.2fs "
        "total=%.2fs transcript_chars=%d language=%s",
        model_loaded_at - started_at,
        completed_at - model_loaded_at,
        completed_at - started_at,
        len(transcript),
        result.get("language") or "unknown"
    )

    return {
        "transcript": transcript,
        "language": result.get("language")
    }