import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  BookOpen,
  Brain
} from "lucide-react";
import { calculateReadingTime } from "../../utils/notesFormatter";

export default function NotesArticle({
  notes,
  headingLevel = 3,
  showTitle = true,
}) {
  const TitleHeading = `h${headingLevel}`;
  const SectionHeading = `h${headingLevel + 1}`;
  const readingTime = calculateReadingTime(notes);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [copiedSection, setCopiedSection] = useState(null);

  const toggleAnswer = (idx) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copySectionText = (idx, heading, content) => {
    const text = `### ${heading}\n\n${content}`;
    navigator.clipboard?.writeText(text);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!notes) return null;

  return (
    <div className="notes-article stitch-study-sheet">
      {showTitle && (
        <div className="stitch-sheet-header">
          <div className="stitch-sheet-top-row">
            <TitleHeading className="stitch-sheet-title">{notes.title}</TitleHeading>
            <div className="stitch-sheet-meta">
              <span className="stitch-sheet-pill">
                <Clock size={14} aria-hidden="true" />
                {readingTime}
              </span>
              <span
                className="stitch-sheet-pill"
                style={{ background: "#dcfce7", color: "#15803d" }}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                100% Grounded
              </span>
              {notes.sections?.length > 0 && (
                <span className="stitch-sheet-pill">
                  {notes.sections.length} Topics
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {notes.summary && (
        <div className="stitch-summary-card">
          <div className="stitch-card-heading">
            <Sparkles size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Executive Summary
          </div>
          <p className="stitch-summary-text">{notes.summary}</p>
        </div>
      )}

      {notes.key_points && notes.key_points.length > 0 && (
        <section
          className="stitch-section-card"
          aria-labelledby="key-points-title"
        >
          <div className="stitch-card-heading" id="key-points-title">
            <CheckCircle2 size={16} color="#10b981" aria-hidden="true" />
            Key Takeaways &amp; Core Concepts
          </div>
          <ul className="stitch-takeaways-list">
            {notes.key_points.map((point, index) => (
              <li key={`key-${index}`} className="stitch-takeaway-item">
                <span className="stitch-takeaway-check">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.sections && notes.sections.length > 0 && (
        <div className="notes-sections-wrapper">
          {notes.sections.map((section, index) => (
            <article
              className="stitch-section-card"
              key={`${section.heading || "section"}-${index}`}
            >
              <div className="stitch-section-header">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span className="section-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <SectionHeading className="stitch-section-heading">
                    {section.heading || `Section ${index + 1}`}
                  </SectionHeading>
                </div>
                <button
                  type="button"
                  className="stitch-icon-btn"
                  onClick={() =>
                    copySectionText(index, section.heading, section.content)
                  }
                  title="Copy Section"
                  aria-label="Copy section text"
                >
                  {copiedSection === index ? (
                    <Check size={16} color="#10b981" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <p className="stitch-section-body">{section.content}</p>
            </article>
          ))}
        </div>
      )}

      {notes.glossary && notes.glossary.length > 0 && (
        <section
          className="stitch-section-card"
          aria-labelledby="glossary-title"
        >
          <div className="stitch-card-heading" id="glossary-title">
            <BookOpen size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Technical Glossary &amp; Definitions
          </div>
          <div className="stitch-glossary-grid">
            {notes.glossary.map((item, index) => (
              <div key={`glossary-${index}`} className="stitch-glossary-item">
                <div className="stitch-term-name">{item.term}</div>
                <div className="stitch-term-def">{item.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.revision_questions && notes.revision_questions.length > 0 && (
        <section
          className="stitch-section-card"
          aria-labelledby="revision-questions-title"
        >
          <div className="stitch-card-heading" id="revision-questions-title">
            <Brain size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Check Your Understanding &amp; Model Answers
          </div>
          <div className="stitch-qa-list">
            {notes.revision_questions.map((item, index) => {
              const qText = typeof item === "object" ? item.question : item;
              const aText = typeof item === "object" ? item.answer : null;
              const isRevealed = revealedAnswers[index];

              return (
                <div key={`question-${index}`} className="stitch-qa-item">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div className="stitch-question-text">
                      <span
                        style={{
                          color: "var(--stitch-primary)",
                          marginRight: "6px",
                        }}
                      >
                        Q{index + 1}.
                      </span>
                      {qText}
                    </div>
                    {aText && (
                      <button
                        type="button"
                        className="stitch-view-btn"
                        onClick={() => toggleAnswer(index)}
                        style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        {isRevealed ? "Hide Answer" : "Show Model Answer"}
                      </button>
                    )}
                  </div>
                  {isRevealed && aText && (
                    <div className="stitch-model-answer">
                      <strong
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "var(--stitch-primary)",
                          fontSize: "0.82rem",
                        }}
                      >
                        Model Answer &amp; Explanation:
                      </strong>
                      {aText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
