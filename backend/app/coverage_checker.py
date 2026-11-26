import logging
from pydantic import BaseModel

from app.gemini_client import generate_gemini_json, get_gemini_client

logger = logging.getLogger(__name__)


class CoverageAuditSchema(BaseModel):
    covered: bool
    coverage_percentage: float
    missing_topics: list[str]


def check_coverage(source_segments, generated_notes, threshold=0.30):
    """
    Check how much of the original lecture content is represented in generated notes
    via deterministic token overlap.
    """
    missing = []
    generated_parts = []

    for item in generated_notes:
        if not isinstance(item, dict):
            generated_parts.append(str(item))
            continue

        notes = item.get("notes", {})
        if not isinstance(notes, dict):
            generated_parts.append(str(notes))
            continue

        generated_parts.append(str(notes.get("title", "")))
        generated_parts.append(str(notes.get("summary", "")))

        for section in notes.get("sections", []) if isinstance(notes.get("sections"), list) else []:
            if isinstance(section, dict):
                generated_parts.append(str(section.get("heading", "")))
                generated_parts.append(str(section.get("content", "")))

        if isinstance(notes.get("key_points"), list):
            generated_parts.extend(str(p) for p in notes["key_points"])

        for g in notes.get("glossary", []) if isinstance(notes.get("glossary"), list) else []:
            if isinstance(g, dict):
                generated_parts.append(str(g.get("term", "")))
                generated_parts.append(str(g.get("definition", "")))

        if isinstance(notes.get("revision_questions"), list):
            generated_parts.extend(str(q) for q in notes["revision_questions"])

    generated_text = " ".join(generated_parts).lower()
    total_segments = len(source_segments)
    covered_segments = 0

    for segment in source_segments:
        segment_text = (segment.get("text", "") if isinstance(segment, dict) else str(segment)).strip()
        if not segment_text:
            continue
        words = segment_text.lower().split()
        if not words:
            continue

        matched = sum(1 for word in words if word in generated_text)
        coverage = matched / len(words)
        if coverage >= threshold:
            covered_segments += 1
        else:
            missing.append({"segment": segment_text, "coverage": round(coverage * 100, 2)})

    coverage_percentage = (covered_segments / total_segments * 100) if total_segments else 0
    return {
        "covered": len(missing) == 0,
        "coverage_percentage": round(coverage_percentage, 2),
        "total_segments": total_segments,
        "covered_segments": covered_segments,
        "missing_segments": missing,
    }


def verify_coverage_with_gemini(source_segments, generated_notes) -> dict:
    """Audit semantic coverage between source segments and synthesized notes using Gemini JSON output."""
    base_result = check_coverage(source_segments, generated_notes)
    try:
        client = get_gemini_client()
        src_text = "\n".join(
            (s.get("text", "") if isinstance(s, dict) else str(s)) for s in source_segments[:15]
        )[:6000]
        notes_preview = "\n".join(
            str((item.get("notes", {}) if isinstance(item, dict) else item).get("summary", ""))
            for item in generated_notes[:10]
        )[:4000]

        audit = generate_gemini_json(
            client,
            contents=f"SOURCE SEGMENTS:\n{src_text}\n\nGENERATED SUMMARIES:\n{notes_preview}",
            system_instruction=(
                "Compare generated lecture notes against source transcript segments and report whether "
                "all major concepts are covered in JSON."
            ),
            temperature=0.0,
            response_schema=CoverageAuditSchema,
        )
        base_result["semantic_covered"] = bool(audit.get("covered", base_result["covered"]))
        base_result["semantic_missing_topics"] = audit.get("missing_topics", [])
    except Exception as err:
        logger.debug("Gemini coverage audit skipped (%s); using deterministic overlap result.", err)

    return base_result
