import { ArrowLeft, ArrowRight, FileText, Sparkles } from "lucide-react";

export default function LectureSelector({
  ariaLabel,
  sectionClassName = "reader-card",
  cardClassName = "study-sheet-selector-card",
  icon,
  secondaryIcon = false,
  title,
  description,
  selectId,
  dropdownLabel = "Quick Select Lecture:",
  dropdownPlaceholder = "Choose a synthesized lecture...",
  emptyMessage = "No synthesized lectures available yet.",
  actionLabel = "Open",
  itemIcon,
  readyLectures = [],
  onSelectLecture,
  onBack,
  onGoDashboard,
  showDropdown = true,
  backLabel = "Back to Dashboard",
}) {
  return (
    <section className={sectionClassName} aria-label={ariaLabel}>
      {onBack && (
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
        </button>
      )}

      <div className={cardClassName}>
        <div className={`selector-icon-badge${secondaryIcon ? " secondary" : ""}`}>{icon}</div>
        <h2>{title}</h2>
        <p>{description}</p>

        {readyLectures.length > 0 ? (
          <>
            {showDropdown && selectId && (
              <div className="selector-dropdown-row">
                <label htmlFor={selectId} className="selector-dropdown-label">
                  {dropdownLabel}
                </label>
                <select
                  id={selectId}
                  className="selector-dropdown-input"
                  defaultValue=""
                  onChange={(e) => {
                    const selected = readyLectures.find((l) => String(l.id) === e.target.value);
                    if (selected && onSelectLecture) onSelectLecture(selected);
                  }}
                >
                  <option value="" disabled>
                    {dropdownPlaceholder}
                  </option>
                  {readyLectures.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      {lec.title} ({lec.audio_format || "Ready"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="lecture-selector-grid">
              {readyLectures.map((lec) => (
                <button
                  key={lec.id}
                  type="button"
                  className="lecture-select-item"
                  onClick={() => onSelectLecture && onSelectLecture(lec)}
                >
                  <div className={`item-icon-wrapper${secondaryIcon ? " secondary" : ""}`}>
                    {itemIcon || <FileText size={20} />}
                  </div>
                  <div className="item-info">
                    <span className="item-title">{lec.title}</span>
                    <span className="item-meta">
                      {lec.audio_format || "Lecture Audio"} •{" "}
                      {lec.created_at ? new Date(lec.created_at).toLocaleDateString() : "Saved"}
                    </span>
                  </div>
                  <div className="item-arrow-action">
                    <span>{actionLabel}</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>

            {onGoDashboard && (
              <div className="selector-footer-action">
                <button type="button" className="btn-secondary-link" onClick={onGoDashboard}>
                  <Sparkles size={14} /> Or Ingest a New Lecture
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="selector-empty-cta">
            <p>{emptyMessage}</p>
            {onGoDashboard && (
              <button type="button" className="stitch-primary-btn" onClick={onGoDashboard}>
                <Sparkles size={16} /> Go to Ingestion Studio
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
