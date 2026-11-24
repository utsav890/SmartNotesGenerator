import logging
import shutil
import subprocess
import time
import traceback
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_model():
    # Load the model once and reuse it (lazy-imported on first invocation)
    import whisper
    return whisper.load_model("base")


def _convert_video_to_audio_if_needed(path: Path) -> Path:
    """If file is an .mp4 or other video container, ensure an audio stream is extracted if ffmpeg exists."""
    ext = path.suffix.lower()
    if ext in (".mp4", ".mov", ".avi", ".mkv"):
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            converted_path = path.with_suffix(".extracted.wav")
            if not converted_path.is_file() or converted_path.stat().st_size == 0:
                logger.info("Extracting audio from video file %s via ffmpeg...", path.name)
                try:
                    subprocess.run(
                        [
                            ffmpeg_bin,
                            "-y",
                            "-i",
                            str(path),
                            "-vn",
                            "-acodec",
                            "pcm_s16le",
                            "-ar",
                            "16000",
                            "-ac",
                            "1",
                            str(converted_path),
                        ],
                        check=True,
                        capture_output=True,
                    )
                    return converted_path
                except Exception as ffmpeg_err:
                    logger.warning("ffmpeg audio pre-extraction failed: %s. Falling back to direct Whisper decoding.", ffmpeg_err)
    return path


def transcribe_audio(file_path: str):
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    try:
        if path.stat().st_size == 0:
            raise ValueError(f"Audio file is empty (0 bytes): {file_path}")
    except (FileNotFoundError, OSError):
        pass

    started_at = time.perf_counter()
    target_path = _convert_video_to_audio_if_needed(path)

    model = load_model()
    model_loaded_at = time.perf_counter()

    try:
        logger.info("Starting Whisper transcription on %s...", target_path.name)
        result = model.transcribe(
            str(target_path),
            fp16=False
        )
    except Exception as exc:
        logger.error(
            "Whisper audio decoding and inference failed for %s after %.2f seconds:\n%s",
            file_path,
            time.perf_counter() - model_loaded_at,
            traceback.format_exc()
        )
        raise RuntimeError(f"Whisper transcription failed: {exc}") from exc
    finally:
        # If a temporary extracted wav was generated, clean it up
        if target_path != path and target_path.is_file():
            try:
                target_path.unlink()
            except Exception:
                pass

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