import { useState } from "react";
import {
  Clock,
  Calendar,
  FileText,
  CheckCircle2,
  Zap,
  Copy,
  Check,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatDate, formatDuration } from "../../utils/lectureUtils";
import { calculateReadingTime } from "../../utils/notesFormatter";

function formatSectionCopyText(index, section) {
  const heading = `### ${index + 1}. ${section.heading || `Section ${index + 1}`}`;
  const lines = [];
  if (section.intro) lines.push(section.intro);
  if (Array.isArray(section.bullets) && section.bullets.length > 0) {
    section.bullets.forEach((b) => {
      lines.push(b.label ? `- **${b.label}:** ${b.detail}` : `- ${b.detail}`);
    });
  } else if (section.content) {
    lines.push(section.content);
  }
  return `${heading}\n\n${lines.join("\n")}`;
}

export default function NotesArticle({
  notes,
  headingLevel = 2,
  showTitle = true,
  sourceLabel = "",
  durationSeconds = null,
  createdAt = null,
}) {
  const TitleHeading = `h${headingLevel}`;
  const SectionHeading = `h${headingLevel + 1}`;
  const readingTime = calculateReadingTime(notes);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [copiedSection, setCopiedSection] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);

  const toggleAnswer = (idx) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleDrawer = (drawerName) => {
    setActiveDrawer((prev) => (prev === drawerName ? null : drawerName));
  };

  const copySectionText = (idx, section) => {
    navigator.clipboard?.writeText(formatSectionCopyText(idx, section));
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!notes) return null;

  const displayDuration =
    durationSeconds !== null && durationSeconds !== undefined && !isNaN(Number(durationSeconds))
      ? `Duration: ${formatDuration(durationSeconds)}`
      : readingTime;
  const displayDate = formatDate(createdAt || new Date().toISOString());
  const glossaryCount = notes.glossary?.length || 0;
  const questionsCount = notes.revision_questions?.length || 0;

  return (
    <article className="notes-article notes-paper-sheet">
      {showTitle && (
        <header className="notes-doc-header">
          <TitleHeading
            className="notes-doc-title"
            id={headingLevel === 1 ? "reader-title" : undefined}
            tabIndex={headingLevel === 1 ? -1 : undefined}
          >
            {notes.title}
          </TitleHeading>
          <div className="notes-doc-meta">
            <span className="notes-doc-meta-item">
              <FileText size={14} aria-hidden="true" />
              {sourceLabel || "Study Notes"}
            </span>
            <span className="notes-doc-meta-sep" aria-hidden="true" />
            <span className="notes-doc-meta-item">
              <Clock size={14} aria-hidden="true" />
              {displayDuration}
            </span>
            {displayDate !== "—" && (
              <>
                <span className="notes-doc-meta-sep" aria-hidden="true" />
                <span className="notes-doc-meta-item">
                  <Calendar size={14} aria-hidden="true" />
                  Generated: {displayDate}
                </span>
              </>
            )}
            <span className="notes-doc-grounded-pill">
              <CheckCircle2 size={13} aria-hidden="true" />
              Grounded
            </span>
          </div>
          <hr className="notes-doc-divider" />
        </header>
      )}

      {notes.summary && <p className="notes-doc-summary">{notes.summary}</p>}

      {notes.sections && notes.sections.length > 0 && (
        <div className="notes-doc-sections">
          {notes.sections.map((section, index) => (
            <section
              className="notes-doc-section"
              key={`${section.heading || "section"}-${index}`}
            >
              <div className="notes-doc-section-header">
                <SectionHeading className="notes-doc-section-heading">
                  {index + 1}. {section.heading || `Section ${index + 1}`}
                </SectionHeading>
                <button
                  type="button"
                  className="stitch-icon-btn notes-section-copy no-print"
                  onClick={() => copySectionText(index, section)}
                  title="Copy section"
                  aria-label="Copy section text"
                >
                  {copiedSection === index ? (
                    <Check size={15} color="#10b981" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>

              {section.intro && <p className="notes-doc-intro">{section.intro}</p>}

              {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                <ul className="notes-bullet-list">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={`b-${index}-${bIdx}`} className="notes-bullet-item">
                      {bullet.label ? (
                        <>
                          <strong>{bullet.label}:</strong> {bullet.detail}
                        </>
                      ) : (
                        bullet.detail
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                section.content && <p className="stitch-section-body">{section.content}</p>
              )}
            </section>
          ))}
        </div>
      )}

      {notes.key_points && notes.key_points.length > 0 && (
        <aside className="notes-recap-callout" aria-labelledby="key-points-title">
          <div className="notes-recap-heading" id="key-points-title">
            <Zap size={16} aria-hidden="true" />
            <span>Key Points (Quick Recap)</span>
          </div>
          <ul className="notes-recap-list">
            {notes.key_points.map((point, index) => (
              <li key={`key-${index}`}>{point}</li>
            ))}
          </ul>
        </aside>
      )}

      {(glossaryCount > 0 || questionsCount > 0) && (
        <div className="notes-drawers no-print">
          <div className="notes-drawer-toggles">
            {glossaryCount > 0 && (
              <button
                type="button"
                className={`notes-drawer-btn ${activeDrawer === "glossary" ? "active" : ""}`}
                onClick={() => toggleDrawer("glossary")}
                aria-expanded={activeDrawer === "glossary"}
              >
                <span className="notes-drawer-btn-label">
                  <BookOpen size={15} aria-hidden="true" />
                  Glossary ({glossaryCount} {glossaryCount === 1 ? "term" : "terms"})
                </span>
                {activeDrawer === "glossary" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}

            {questionsCount > 0 && (
              <button
                type="button"
                className={`notes-drawer-btn ${activeDrawer === "questions" ? "active" : ""}`}
                onClick={() => toggleDrawer("questions")}
                aria-expanded={activeDrawer === "questions"}
              >
                <span className="notes-drawer-btn-label">
                  <Brain size={15} aria-hidden="true" />
                  Practice Questions ({questionsCount})
                </span>
                {activeDrawer === "questions" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
          </div>

          {activeDrawer === "glossary" && glossaryCount > 0 && (
            <section className="notes-drawer-panel" aria-label="Technical Glossary">
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

          {activeDrawer === "questions" && questionsCount > 0 && (
            <section className="notes-drawer-panel" aria-label="Practice Questions">
              <div className="stitch-qa-list">
                {notes.revision_questions.map((item, index) => {
                  const qText = typeof item === "object" ? item.question : item;
                  const aText = typeof item === "object" ? item.answer : null;
                  const isRevealed = revealedAnswers[index];

                  return (
                    <div key={`question-${index}`} className="stitch-qa-item">
                      <div className="notes-qa-row">
                        <div className="stitch-question-text">
                          <span className="notes-qa-num">Q{index + 1}.</span>
                          {qText}
                        </div>
                        {aText && (
                          <button
                            type="button"
                            className="stitch-view-btn"
                            onClick={() => toggleAnswer(index)}
                          >
                            {isRevealed ? "Hide Answer" : "Show Answer"}
                          </button>
                        )}
                      </div>
                      {isRevealed && aText && (
                        <div className="stitch-model-answer">
                          <strong className="notes-qa-answer-label">Model Answer:</strong>
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
      )}
    </article>
  );
}
