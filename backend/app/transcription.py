"""Lecture audio/video transcription powered by Google Gemini native audio understanding."""

import logging
import mimetypes
import shutil
import subprocess
import time
import traceback
from pathlib import Path

from pydantic import BaseModel

from app.gemini_client import extract_gemini_error_message, generate_gemini_json, get_gemini_client

logger = logging.getLogger(__name__)

INLINE_AUDIO_LIMIT_BYTES = 15 * 1024 * 1024

MIME_TYPE_MAP = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".webm": "audio/webm",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
}


class TranscriptionResponseSchema(BaseModel):
    transcript: str
    language: str


def _resolve_mime_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in MIME_TYPE_MAP:
        return MIME_TYPE_MAP[ext]
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "audio/mpeg"


def _convert_video_to_audio_if_needed(path: Path) -> Path:
    """Extract an audio track from video containers via ffmpeg when available to shrink payload size."""
    if path.suffix.lower() in (".mp4", ".mov", ".avi", ".mkv"):
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            converted_path = path.with_suffix(".extracted.wav")
            if not converted_path.is_file() or converted_path.stat().st_size == 0:
                logger.info("Extracting audio from video file %s via ffmpeg...", path.name)
                try:
                    subprocess.run(
                        [
                            ffmpeg_bin, "-y", "-i", str(path), "-vn",
                            "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                            str(converted_path),
                        ],
                        check=True,
                        capture_output=True,
                    )
                    return converted_path
                except Exception as ffmpeg_err:
                    logger.warning("ffmpeg audio extraction failed (%s); sending container directly to Gemini.", ffmpeg_err)
    return path


def transcribe_audio(file_path: str) -> dict:
    """Transcribe an audio or video file using Google Gemini multimodal audio input."""
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
    client = None
    uploaded_file = None

    try:
        from google.genai import types

        client = get_gemini_client()
        mime_type = _resolve_mime_type(target_path)
        try:
            file_size = target_path.stat().st_size
        except OSError:
            file_size = 0

        prompt = (
            "Transcribe all spoken words from this lecture recording accurately and verbatim. "
            "Preserve technical terms, formulas, and equations cleanly with proper punctuation. "
            "Do NOT summarize, omit sections, or invent content not spoken in the audio. "
            "If no intelligible speech exists, return an empty string for transcript. "
            'Return JSON with keys "transcript" and "language" (ISO 639-1 code such as "en").'
        )

        if 0 < file_size <= INLINE_AUDIO_LIMIT_BYTES:
            logger.info("Transcribing %s (%.2f MB) via Gemini inline audio...", target_path.name, file_size / (1024 * 1024))
            audio_part = types.Part.from_bytes(data=target_path.read_bytes(), mime_type=mime_type)
            contents = [audio_part, prompt]
        else:
            logger.info("Uploading %s (%.2f MB) to Gemini Files API for transcription...", target_path.name, file_size / (1024 * 1024))
            uploaded_file = client.files.upload(file=str(target_path), config={"mime_type": mime_type})
            contents = [uploaded_file, prompt]

        result = generate_gemini_json(
            client,
            contents=contents,
            system_instruction="You are a verbatim academic speech-to-text transcription engine.",
            temperature=0.0,
            response_schema=TranscriptionResponseSchema,
        )
    except Exception as exc:
        clean_err = extract_gemini_error_message(exc)
        logger.error(
            "Gemini audio transcription failed for %s after %.2f seconds: %s\n%s",
            file_path,
            time.perf_counter() - started_at,
            clean_err,
            traceback.format_exc(),
        )
        raise RuntimeError(f"Gemini transcription failed: {clean_err}") from exc
    finally:
        if client and uploaded_file and getattr(uploaded_file, "name", None):
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass
        if target_path != path and target_path.is_file():
            try:
                target_path.unlink()
            except Exception:
                pass

    transcript = str(result.get("transcript", "")).strip()
    language = str(result.get("language") or "en").strip() or "en"
    logger.info(
        "Gemini transcription completed in %.2fs (transcript_chars=%d language=%s)",
        time.perf_counter() - started_at,
        len(transcript),
        language,
    )
    return {"transcript": transcript, "language": language}
