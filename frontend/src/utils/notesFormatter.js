function splitBulletLabel(rawLine) {
  const clean = String(rawLine || "")
    .replace(/^[-*•]\s+/, "")
    .trim();
  if (!clean) return null;

  const boldMatch = clean.match(/^\*\*(.+?)\*\*:?\s+(.+)$/);
  if (boldMatch) {
    return {
      label: boldMatch[1].replace(/:$/, "").trim(),
      detail: boldMatch[2].trim(),
    };
  }

  const colonMatch = clean.match(/^([A-Za-z0-9][A-Za-z0-9\s,&/-]{1,36}):\s+(.+)$/);
  if (colonMatch) {
    return {
      label: colonMatch[1].trim(),
      detail: colonMatch[2].trim(),
    };
  }

  return { label: "", detail: clean };
}

function parseContentToBullets(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map(splitBulletLabel).filter(Boolean);
  }

  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  if (sentences.length >= 2) {
    return sentences.map(splitBulletLabel).filter(Boolean);
  }

  const single = splitBulletLabel(raw);
  return single ? [single] : [];
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((section, idx) => {
    const rawHeading = String(section?.heading || `Section ${idx + 1}`).trim();
    const heading = rawHeading.replace(/^\d+[.)]\s*/, "").trim() || `Section ${idx + 1}`;
    const intro = String(section?.intro || "").trim();
    const content = String(section?.content || "").trim();

    let bullets = [];
    if (Array.isArray(section?.bullets) && section.bullets.length > 0) {
      bullets = section.bullets
        .map((b) =>
          typeof b === "object" && b !== null
            ? {
                label: String(b.label || "").replace(/:$/, "").trim(),
                detail: String(b.detail || "").trim(),
              }
            : splitBulletLabel(b)
        )
        .filter((b) => b && b.detail);
    } else if (content) {
      bullets = parseContentToBullets(content);
    }

    return { heading, intro, bullets, content };
  });
}

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
      sections: normalizeSections(content.sections),
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
    ...(notes.sections || []).map((s) =>
      [
        s.heading,
        s.intro,
        ...(s.bullets || []).map((b) => `${b.label} ${b.detail}`),
        s.content,
      ].join(" ")
    ),
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
