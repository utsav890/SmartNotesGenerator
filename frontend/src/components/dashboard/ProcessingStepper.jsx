import { LoaderCircle, Check, Sparkles } from "lucide-react";

export default function ProcessingStepper({
  status,
  stages = [],
  getActiveStep,
}) {
  const activeStepNum = getActiveStep ? getActiveStep(status) : 1;
  const currentStepIdx = Math.max(0, Math.min(stages.length - 1, activeStepNum - 1));
  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIdx + 0.5) / stages.length) * 100)
  );
  const activeStageName = stages[currentStepIdx]?.name || "Processing";

  return (
    <section className="stitch-stepper-container" role="status" aria-live="polite">
      <div className="stitch-stepper-header">
        <div className="stepper-title-row">
          <div className="stepper-spinner-wrapper">
            <LoaderCircle className="spin" size={20} />
          </div>
          <div className="stepper-text-group">
            <div className="stepper-heading-line">
              <h3>AI Synthesis Pipeline Active</h3>
              <span className="stepper-active-pill">
                <Sparkles size={12} /> {activeStageName}
              </span>
            </div>
            <p className="stepper-subtext">
              {status || "Processing lecture content with AI models..."}
            </p>
          </div>
        </div>
        <div className="stepper-meta-row">
          <span className="stepper-count-badge">
            Step {currentStepIdx + 1} of {stages.length}
          </span>
          <span className="stepper-status-badge">Processing</span>
        </div>
      </div>

      {/* Sleek Horizontal Progress Bar */}
      <div className="stepper-progress-track">
        <div
          className="stepper-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Multi-Column Responsive Pill Stepper */}
      <div className="stitch-stepper-stages">
        {stages.map((st, idx) => {
          const isComplete = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          return (
            <div
              key={st.id || idx}
              className={`stitch-step-item${isComplete ? " complete" : ""}${
                isCurrent ? " current" : ""
              }`}
            >
              <div className="step-indicator">
                {isComplete ? (
                  <Check size={13} strokeWidth={3} />
                ) : isCurrent ? (
                  <LoaderCircle className="spin" size={13} strokeWidth={2.5} />
                ) : (
                  <span>{st.id || idx + 1}</span>
                )}
              </div>
              <span className="step-name">{st.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
