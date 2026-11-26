"""Optimized lecture audio/MP4 transcription powered by OpenAI Whisper with fast 16kHz PCM extraction."""

import logging
import os
import shutil
import subprocess
import time
import traceback
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

_FFMPEG_CONVERT_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".mp3", ".m4a", ".ogg", ".opus", ".webm", ".flac", ".aac"}


@lru_cache(maxsize=1)
def load_model():
    """Lazy-load and cache the Whisper model once across requests with tuned CPU threading."""
    import torch
    import whisper

    torch.set_num_threads(min(4, max(1, os.cpu_count() or 2)))
    model_name = os.getenv("WHISPER_MODEL", "tiny").strip() or "tiny"
    return whisper.load_model(model_name)


def _convert_video_to_audio_if_needed(path: Path) -> Path:
    """Convert non-WAV media (.mp4, .mp3, etc.) to 16kHz mono PCM WAV via ffmpeg for fast decoding."""
    if path.suffix.lower() in _FFMPEG_CONVERT_EXTENSIONS:
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            converted_path = path.with_suffix(".extracted.wav")
            if not converted_path.is_file() or converted_path.stat().st_size == 0:
                logger.info("Pre-converting %s to 16kHz mono WAV via ffmpeg...", path.name)
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
                        timeout=180,
                    )
                    return converted_path
                except Exception as ffmpeg_err:
                    logger.warning(
                        "ffmpeg pre-conversion skipped (%s); letting Whisper decode %s directly.",
                        ffmpeg_err,
                        path.name,
                    )
    return path


def transcribe_audio(file_path: str) -> dict:
    """Transcribe an audio or MP4 file using tuned single-beam Whisper inference."""
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
        logger.info("Starting fast Whisper transcription on %s...", target_path.name)
        result = model.transcribe(
            str(target_path),
            fp16=False,
            beam_size=1,
            best_of=1,
            condition_on_previous_text=False,
            temperature=0.0,
        )
    except Exception as exc:
        logger.error(
            "Whisper audio transcription failed for %s after %.2f seconds:\n%s",
            file_path,
            time.perf_counter() - model_loaded_at,
            traceback.format_exc(),
        )
        raise RuntimeError(f"Whisper transcription failed: {exc}") from exc
    finally:
        if target_path != path and target_path.is_file():
            try:
                target_path.unlink()
            except Exception:
                pass

    raw_text = result.get("text")
    transcript = raw_text.strip() if isinstance(raw_text, str) else ""
    language = str(result.get("language") or "en").strip() or "en"
    completed_at = time.perf_counter()

    logger.info(
        "Whisper timing: model_load=%.2fs inference=%.2fs total=%.2fs transcript_chars=%d language=%s",
        model_loaded_at - started_at,
        completed_at - model_loaded_at,
        completed_at - started_at,
        len(transcript),
        language,
    )
    return {"transcript": transcript, "language": language}
