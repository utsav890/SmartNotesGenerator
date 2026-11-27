"""Shared Google Gemini client configuration and structured JSON generation helpers."""

import ast
import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
FALLBACK_GEMINI_MODELS = [
    m.strip()
    for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash-lite").split(",")
    if m.strip()
]
_PLACEHOLDER_KEYS = {"", "your_gemini_api_key_here", "replace_with_gemini_api_key"}


class GeminiQuotaError(RuntimeError):
    """Raised when all configured Gemini models return 429 / RESOURCE_EXHAUSTED quota errors."""

    def __init__(self, message: str, retry_after_seconds: int | None = None):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


def extract_retry_after_seconds(text: str) -> int | None:
    """Extract a retry delay in whole seconds from a Gemini quota error message, if present."""
    if not text:
        return None
    match = re.search(r"(?:retry in|retryDelay['\":\s]+)(\d+(?:\.\d+)?)\s*s", text, re.IGNORECASE)
    if match:
        try:
            return max(1, int(round(float(match.group(1)))))
        except ValueError:
            return None
    return None


def is_quota_or_rate_limit_error(error: BaseException) -> bool:
    """Return True when an exception represents a 429 / RESOURCE_EXHAUSTED quota limit."""
    if isinstance(error, GeminiQuotaError):
        return True
    code = getattr(error, "code", None) or getattr(error, "status_code", None)
    if code == 429:
        return True
    status = str(getattr(error, "status", "") or "").upper()
    if "RESOURCE_EXHAUSTED" in status:
        return True
    raw = str(error).lower()
    return "429" in raw or "resource_exhausted" in raw or "quota" in raw or "rate limit" in raw


def is_model_fallback_error(error: BaseException) -> bool:
    """Return True when an exception is a 429 quota error or 404 model-not-found error."""
    if is_quota_or_rate_limit_error(error):
        return True
    code = getattr(error, "code", None) or getattr(error, "status_code", None)
    if code == 404:
        return True
    status = str(getattr(error, "status", "") or "").upper()
    if "NOT_FOUND" in status:
        return True
    raw = str(error).lower()
    return "404" in raw or "not_found" in raw or "is not found" in raw


def get_gemini_api_key() -> str:
    """Return configured GEMINI_API_KEY or empty string when unset/placeholder."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return "" if key in _PLACEHOLDER_KEYS else key


def get_gemini_client() -> genai.Client:
    """Create a Google GenAI SDK client targeting v1beta (required for system_instruction and JSON schemas)."""
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing in environment.")
    # Explicitly select v1beta because google-genai>=3.x defaults to v1, which rejects system_instruction.
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(api_version="v1beta"),
    )


def _sanitize_error_text(msg: str) -> str:
    """Strip raw Google API URLs and metric identifiers so user-facing errors stay concise."""
    if not msg:
        return "AI service request failed. Please try again."
    retry_sec = extract_retry_after_seconds(msg)
    lower = msg.lower()
    if "resource_exhausted" in lower or "quota" in lower or "429" in lower:
        if retry_sec:
            return f"AI quota limit reached. Please retry in {retry_sec}s."
        return "Daily AI quota reached. Please try again later."
    cleaned = re.sub(r"https?://\S+", "", msg)
    cleaned = re.sub(r"\*?\s*Quota exceeded for metric:[^.\n]*\.?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" .:-")
    return cleaned or "AI service request failed. Please try again."


def extract_gemini_error_message(error: Exception) -> str:
    """Extract a clean human-readable message from Gemini APIError exceptions without raw dict reprs."""
    visited: set[int] = set()
    current: BaseException | None = error

    while current is not None and id(current) not in visited:
        visited.add(id(current))
        direct_msg = getattr(current, "message", None)
        if isinstance(direct_msg, str) and direct_msg.strip():
            return _sanitize_error_text(direct_msg.strip())
        current = current.__cause__ or current.__context__

    raw = str(error).strip()
    if not raw:
        return "AI service request failed. Please try again."

    # Strip repeated wrapper prefixes if already nested
    for prefix in ("Gemini transcription failed:", "Note generation failed:", "Transcription failed:"):
        if raw.startswith(prefix):
            raw = raw[len(prefix) :].strip()

    dict_match = re.search(r"(\{.*\})\s*$", raw, re.DOTALL)
    if dict_match:
        payload_str = dict_match.group(1)
        for parser in (json.loads, ast.literal_eval):
            try:
                parsed = parser(payload_str)
                if isinstance(parsed, dict):
                    err_obj = parsed.get("error") if isinstance(parsed.get("error"), dict) else parsed
                    msg = err_obj.get("message")
                    if isinstance(msg, str) and msg.strip():
                        return _sanitize_error_text(msg.strip())
            except Exception:
                continue

    return _sanitize_error_text(raw)


def _strip_json_fences(raw_text: str) -> str:
    cleaned = raw_text.strip()
    fence_match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```$", cleaned, re.DOTALL | re.IGNORECASE)
    return fence_match.group(1).strip() if fence_match else cleaned


def parse_gemini_json_response(response: Any) -> dict[str, Any]:
    """Extract and validate a JSON object from a Gemini GenerateContentResponse."""
    parsed = getattr(response, "parsed", None)
    if parsed is not None:
        if hasattr(parsed, "model_dump"):
            return parsed.model_dump()
        if isinstance(parsed, dict):
            return parsed

    raw_text = getattr(response, "text", None)
    if not raw_text or not str(raw_text).strip():
        raise ValueError("Empty response from Gemini API")

    data = json.loads(_strip_json_fences(str(raw_text)))
    if not isinstance(data, dict):
        raise ValueError("Gemini API did not return a JSON object")
    return data


def generate_gemini_json(
    client: genai.Client,
    *,
    contents: Any,
    system_instruction: str,
    temperature: float = 0.2,
    model: str | None = None,
    response_schema: Any = None,
) -> dict[str, Any]:
    """Call Gemini models.generate_content enforcing application/json output, with automatic 429 model fallback."""
    config_kwargs: dict[str, Any] = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "response_mime_type": "application/json",
    }
    if response_schema is not None:
        config_kwargs["response_schema"] = response_schema

    primary_model = model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    candidate_models = [primary_model] + [m for m in FALLBACK_GEMINI_MODELS if m != primary_model]

    last_error: Exception | None = None
    for idx, candidate_model in enumerate(candidate_models):
        try:
            response = client.models.generate_content(
                model=candidate_model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            return parse_gemini_json_response(response)
        except errors.APIError as api_err:
            last_error = api_err
            if is_model_fallback_error(api_err) and idx < len(candidate_models) - 1:
                logger.warning(
                    "Gemini model %s failed (429/404); retrying with fallback model %s",
                    candidate_model,
                    candidate_models[idx + 1],
                )
                continue
            clean_msg = extract_gemini_error_message(api_err)
            if is_model_fallback_error(api_err):
                retry_sec = extract_retry_after_seconds(str(api_err))
                raise GeminiQuotaError(clean_msg, retry_after_seconds=retry_sec) from api_err
            raise RuntimeError(clean_msg) from api_err

    if last_error is not None:
        clean_msg = extract_gemini_error_message(last_error)
        raise GeminiQuotaError(clean_msg, retry_after_seconds=extract_retry_after_seconds(str(last_error))) from last_error
    raise RuntimeError("No Gemini models configured.")
