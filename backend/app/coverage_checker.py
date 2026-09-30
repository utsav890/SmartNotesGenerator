def check_coverage(source_segments, generated_notes, threshold=0.30):
    """
    Check how much of the original lecture content
    is represented in the generated notes.

    This is the initial MVP coverage checker.
    It uses word-level overlap and can later be upgraded
    to embedding-based semantic coverage.
    """

    missing = []
    generated_parts = []

    # --------------------------------------------------
    # Extract text from generated notes
    # --------------------------------------------------

    for item in generated_notes:

        if not isinstance(item, dict):
            generated_parts.append(str(item))
            continue

        notes = item.get("notes", {})

        if not isinstance(notes, dict):
            generated_parts.append(str(notes))
            continue

        # Title
        generated_parts.append(
            str(notes.get("title", ""))
        )

        # Summary
        generated_parts.append(
            str(notes.get("summary", ""))
        )

        # Sections
        sections = notes.get("sections", [])

        if isinstance(sections, list):
            for section in sections:

                if not isinstance(section, dict):
                    continue

                generated_parts.append(
                    str(section.get("heading", ""))
                )

                generated_parts.append(
                    str(section.get("content", ""))
                )

        # Key points
        key_points = notes.get("key_points", [])

        if isinstance(key_points, list):
            generated_parts.extend(
                str(point)
                for point in key_points
            )

        # Glossary
        glossary = notes.get("glossary", [])

        if isinstance(glossary, list):
            for item in glossary:

                if not isinstance(item, dict):
                    continue

                generated_parts.append(
                    str(item.get("term", ""))
                )

                generated_parts.append(
                    str(item.get("definition", ""))
                )

        # Revision questions
        questions = notes.get(
            "revision_questions",
            []
        )

        if isinstance(questions, list):
            generated_parts.extend(
                str(question)
                for question in questions
            )

    # Combine generated content
    generated_text = " ".join(generated_parts).lower()

    # --------------------------------------------------
    # Check every source segment
    # --------------------------------------------------

    total_segments = len(source_segments)
    covered_segments = 0

    for segment in source_segments:

        if isinstance(segment, dict):
            segment_text = segment.get("text", "")
        else:
            segment_text = str(segment)

        segment_text = segment_text.strip()

        if not segment_text:
            continue

        words = segment_text.lower().split()

        if not words:
            continue

        matched = sum(
            1
            for word in words
            if word in generated_text
        )

        coverage = matched / len(words)

        if coverage >= threshold:
            covered_segments += 1
        else:
            missing.append({
                "segment": segment_text,
                "coverage": round(
                    coverage * 100,
                    2
                )
            })

    # --------------------------------------------------
    # Overall coverage
    # --------------------------------------------------

    coverage_percentage = (
        covered_segments / total_segments * 100
        if total_segments
        else 0
    )

    return {
        "covered": len(missing) == 0,
        "coverage_percentage": round(
            coverage_percentage,
            2
        ),
        "total_segments": total_segments,
        "covered_segments": covered_segments,
        "missing_segments": missing
    }