/**
 * Normalize generated and persisted backend note responses for rendering.
 */
export function formatNotes(data) {
  let result = data;

  if (Array.isArray(result) && result.length > 0) {
    result = result[0];
  }

  if (result && result.notes) {
    result = result.notes;

    if (Array.isArray(result) && result.length > 0) {
      result = result[0];
    }
  }

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      return {
        title: "Lecture Notes",
        summary: result,
        sections: [],
        key_points: [],
        glossary: [],
        revision_questions: [],
        pipeline: null,
      };
    }
  }

  if (result && typeof result === "object") {
    let content = result.content ?? result;

    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        return {
          title: result.title || "Lecture Notes",
          summary: content,
          sections: [],
          key_points: [],
          glossary: [],
          revision_questions: [],
          pipeline: null,
        };
      }
    }

    if (!content || typeof content !== "object") {
      return {
        title: result.title || "Lecture Notes",
        summary: "",
        sections: [],
        key_points: [],
        glossary: [],
        revision_questions: [],
        pipeline: null,
      };
    }

    return {
      title: content.title || result.title || "Lecture Notes",
      summary: content.summary || result.summary || "",
      sections: Array.isArray(content.sections) ? content.sections : [],
      key_points: Array.isArray(content.key_points) ? content.key_points : [],
      glossary: Array.isArray(content.glossary) ? content.glossary : [],
      revision_questions: Array.isArray(content.revision_questions)
        ? content.revision_questions.map((q) => {
            if (typeof q === "object" && q !== null) {
              return {
                question: q.question || "Practice question",
                answer:
                  q.answer ||
                  "Refer to the comprehensive lecture notes above for the detailed explanation and analysis.",
              };
            }
            return {
              question: String(q),
              answer:
                "Refer to the comprehensive lecture notes above for the detailed explanation and analysis.",
            };
          })
        : [],
      pipeline: content.pipeline || result.pipeline || null,
    };
  }

  return {
    title: "Lecture Notes",
    summary: String(result ?? ""),
    sections: [],
    key_points: [],
    glossary: [],
    revision_questions: [],
    pipeline: null,
  };
}

export function calculateReadingTime(notes) {
  if (!notes) return "1 min read";
  const words = [
    notes.title,
    notes.summary,
    ...(notes.sections || []).map((s) => `${s.heading} ${s.content}`),
    ...(notes.key_points || []),
    ...(notes.glossary || []).map((g) => `${g.term} ${g.definition}`),
    ...(notes.revision_questions || []).map((q) =>
      typeof q === "object" ? q.question : q
    ),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}
