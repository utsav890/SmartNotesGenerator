import json
import logging
import re
from typing import Any, Literal

from pydantic import BaseModel

from app.gemini_client import (
    GeminiQuotaError,
    generate_gemini_json,
    get_gemini_api_key,
    get_gemini_client,
    is_quota_or_rate_limit_error,
)

logger = logging.getLogger(__name__)

OPTION_LETTERS = ("A", "B", "C", "D")


class QuizOptionsSchema(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuizQuestionSchema(BaseModel):
    question: str
    options: QuizOptionsSchema
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str


class QuizResponseSchema(BaseModel):
    questions: list[QuizQuestionSchema]


def _clean_snippet(text: str, max_len: int = 180) -> str:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip(" ,;:") + "…"


def _parse_note_payload(notes_context: str, note_data: dict[str, Any] | None = None) -> dict[str, Any]:
    if isinstance(note_data, dict):
        return note_data
    try:
        parsed = json.loads(notes_context)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return {}


def _pick_distractors(correct: str, pool: list[str], fallback_pool: list[str], needed: int = 3) -> list[str]:
    norm_correct = correct.strip().lower()
    chosen: list[str] = []
    seen = {norm_correct}
    for candidate in [*pool, *fallback_pool]:
        c_clean = _clean_snippet(candidate, 170)
        c_norm = c_clean.lower()
        if not c_clean or c_norm in seen:
            continue
        seen.add(c_norm)
        chosen.append(c_clean)
        if len(chosen) >= needed:
            return chosen

    generic = [
        "An unrelated external process not covered in this lecture.",
        "A secondary side effect that only occurs outside the main system.",
        "An outdated assumption explicitly rejected in the lecture.",
        "None of the concepts described in the lecture notes.",
    ]
    for g in generic:
        if g.lower() not in seen:
            chosen.append(g)
            seen.add(g.lower())
        if len(chosen) >= needed:
            break
    return chosen[:needed]


def _make_mcq(
    question: str,
    correct_text: str,
    distractors: list[str],
    explanation: str,
    index: int,
) -> dict[str, Any]:
    correct_clean = _clean_snippet(correct_text, 170)
    correct_idx = index % 4
    items = list(distractors[:3])
    items.insert(correct_idx, correct_clean)
    options = {OPTION_LETTERS[i]: items[i] for i in range(4)}
    return {
        "question": question,
        "options": options,
        "correct_answer": OPTION_LETTERS[correct_idx],
        "explanation": _clean_snippet(explanation, 240),
    }


def build_local_fallback_quiz(
    notes_context: str,
    count: int = 10,
    note_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Deterministically build multiple-choice practice questions from saved key_terms and chapter paragraphs."""
    data = _parse_note_payload(notes_context, note_data)

    raw_terms = data.get("key_terms") or data.get("glossary") or []
    term_pairs: list[tuple[str, str]] = []
    for item in raw_terms:
        if isinstance(item, dict):
            term = str(item.get("term") or item.get("name") or "").strip()
            definition = str(item.get("definition") or item.get("description") or "").strip()
            if term and definition and "not clearly defined" not in definition.lower():
                term_pairs.append((term, definition))

    sections = data.get("sections") or []
    section_facts: list[tuple[str, str]] = []
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        heading = str(sec.get("heading") or "Lecture Section").strip()
        intro = str(sec.get("intro") or "").strip()
        if len(intro) > 25:
            section_facts.append((heading, intro))
        for bullet in sec.get("bullets") or []:
            if isinstance(bullet, dict):
                label = str(bullet.get("label") or "").strip()
                detail = str(bullet.get("detail") or "").strip()
                fact = f"{label}: {detail}" if label and detail else detail
                if len(fact) > 20:
                    section_facts.append((heading, fact))
        content = str(sec.get("content") or "").strip()
        if content and not sec.get("bullets"):
            for sent in re.split(r"(?<=[.!?])\s+", content):
                if len(sent.strip()) > 25:
                    section_facts.append((heading, sent.strip()))

    key_points = [str(k).strip() for k in (data.get("key_points") or []) if len(str(k).strip()) > 20]
    revision_items = [
        (str(r.get("question") or "").strip(), str(r.get("answer") or "").strip())
        for r in (data.get("revision_questions") or [])
        if isinstance(r, dict) and r.get("question") and r.get("answer")
    ]

    if not term_pairs and not section_facts and not key_points:
        plain_sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", str(data.get("summary") or notes_context or ""))
            if len(s.strip()) > 25
        ]
        section_facts = [("Lecture Overview", s) for s in plain_sentences[:count]]

    definition_pool = [d for _, d in term_pairs]
    term_pool = [t for t, _ in term_pairs]
    fact_pool = [f for _, f in section_facts] + key_points + [a for _, a in revision_items]

    questions: list[dict[str, Any]] = []
    seen_questions: set[str] = set()

    def _add_question(q_obj: dict[str, Any]) -> None:
        q_norm = q_obj["question"].strip().lower()
        if q_norm not in seen_questions and len(questions) < count:
            seen_questions.add(q_norm)
            questions.append(q_obj)

    # 1. Questions from key_terms / glossary
    for term, definition in term_pairs:
        distractors = _pick_distractors(definition, definition_pool, fact_pool)
        _add_question(
            _make_mcq(
                question=f'Which of the following best defines "{term}" as presented in this lecture?',
                correct_text=definition,
                distractors=distractors,
                explanation=f'In the lecture glossary, "{term}" is defined as: {definition}',
                index=len(questions),
            )
        )
        if len(questions) >= count:
            break

    # 2. Questions from saved revision questions
    for rev_q, rev_a in revision_items:
        if len(questions) >= count:
            break
        distractors = _pick_distractors(rev_a, fact_pool, definition_pool)
        _add_question(
            _make_mcq(
                question=rev_q,
                correct_text=rev_a,
                distractors=distractors,
                explanation=rev_a,
                index=len(questions),
            )
        )

    # 3. Questions from chapter paragraphs & section bullets
    for heading, fact in section_facts:
        if len(questions) >= count:
            break
        distractors = _pick_distractors(fact, fact_pool, definition_pool)
        _add_question(
            _make_mcq(
                question=f'According to "{heading}", which statement accurately reflects the lecture?',
                correct_text=fact,
                distractors=distractors,
                explanation=f'From "{heading}": {fact}',
                index=len(questions),
            )
        )

    # 4. Questions from key takeaways
    for kp in key_points:
        if len(questions) >= count:
            break
        distractors = _pick_distractors(kp, fact_pool, definition_pool)
        _add_question(
            _make_mcq(
                question="Which of the following is highlighted as a core takeaway of this lecture?",
                correct_text=kp,
                distractors=distractors,
                explanation=f"Key takeaway from the lecture notes: {kp}",
                index=len(questions),
            )
        )

    # 5. Reverse term questions if we still need more to reach `count`
    for term, definition in term_pairs:
        if len(questions) >= count:
            break
        distractors = _pick_distractors(term, term_pool, ["Linear Regression", "Gradient Clipping", "Static Cache"])
        _add_question(
            _make_mcq(
                question=f'Which term corresponds to this description: "{_clean_snippet(definition, 120)}"?',
                correct_text=term,
                distractors=distractors,
                explanation=f'"{term}" matches this description in the lecture.',
                index=len(questions),
            )
        )

    if not questions:
        raise ValueError("Not enough lecture content to build practice questions.")

    return {
        "questions": questions[:count],
        "fallback": True,
        "fallback_reason": "quota_exhausted",
        "notice": "Daily AI quota reached — showing offline practice questions.",
    }


def generate_quiz(notes_context: str, count: int = 10, note_data: dict[str, Any] | None = None) -> dict:
    """Generate active-recall multiple-choice quiz questions grounded in lecture material via Gemini, with local fallback."""
    if not get_gemini_api_key():
        logger.info("GEMINI_API_KEY unset; building deterministic local quiz.")
        return build_local_fallback_quiz(notes_context, count=count, note_data=note_data)

    client = get_gemini_client()
    prompt = f"""Create exactly {count} multiple-choice questions from the lecture material below.

Rules:
- Use ONLY the provided lecture material.
- Do not use outside knowledge.
- Each question must have exactly 4 options labeled A, B, C, D.
- Only one option can be correct ("A", "B", "C", or "D").
- Include a short explanation for each answer.

LECTURE MATERIAL:

{notes_context}"""

    try:
        result = generate_gemini_json(
            client,
            contents=prompt,
            system_instruction="You are a lecture quiz generator. Create accurate questions using only the provided lecture material.",
            temperature=0.2,
            response_schema=QuizResponseSchema,
        )
        questions = result.get("questions", [])
        if not questions:
            raise ValueError("No quiz questions generated")
        return {"questions": questions[:count], "fallback": False}
    except GeminiQuotaError as quota_err:
        logger.warning("All Gemini models exhausted quota for quiz generation; using local fallback: %s", quota_err)
        return build_local_fallback_quiz(notes_context, count=count, note_data=note_data)
    except Exception as err:
        if is_quota_or_rate_limit_error(err):
            logger.warning("Gemini quota error for quiz generation; using local fallback: %s", err)
            return build_local_fallback_quiz(notes_context, count=count, note_data=note_data)
        raise
