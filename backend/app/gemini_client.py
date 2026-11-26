"""Shared Google Gemini client configuration and structured JSON generation helpers."""

import ast
import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_PLACEHOLDER_KEYS = {"", "your_gemini_api_key_here", "replace_with_gemini_api_key"}


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


def extract_gemini_error_message(error: Exception) -> str:
    """Extract a clean human-readable message from Gemini APIError exceptions without raw dict reprs."""
    visited: set[int] = set()
    current: BaseException | None = error

    while current is not None and id(current) not in visited:
        visited.add(id(current))
        direct_msg = getattr(current, "message", None)
        if isinstance(direct_msg, str) and direct_msg.strip():
            return direct_msg.strip()
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
                        return msg.strip()
            except Exception:
                continue

    return raw


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
    """Call Gemini models.generate_content enforcing application/json output."""
    config_kwargs: dict[str, Any] = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "response_mime_type": "application/json",
    }
    if response_schema is not None:
        config_kwargs["response_schema"] = response_schema

    try:
        response = client.models.generate_content(
            model=model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
    except errors.APIError as api_err:
        raise RuntimeError(extract_gemini_error_message(api_err)) from api_err

    return parse_gemini_json_response(response)
