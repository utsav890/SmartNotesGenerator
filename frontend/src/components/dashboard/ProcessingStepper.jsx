import { LoaderCircle, Check } from "lucide-react";

export default function ProcessingStepper({
  status,
  stages,
  getActiveStep,
}) {
  const activeIndex = getActiveStep(status);

  return (
    <section className="stitch-stepper-container" role="status" aria-live="polite">
      <div className="stitch-stepper-header">
        <div className="stepper-title-row">
          <LoaderCircle className="spin" size={20} color="var(--stitch-primary)" />
          <div>
            <h3>AI Synthesis Pipeline Active</h3>
            <p>{status || "Processing lecture content with AI models..."}</p>
          </div>
        </div>
        <span className="stepper-status-badge">Processing</span>
      </div>

      <div className="stitch-stepper-stages">
        {stages.map((st, idx) => {
          const isComplete = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <div
              key={st.id || idx}
              className={`stitch-step-item${isComplete ? " complete" : ""}${
                isCurrent ? " current" : ""
              }`}
            >
              <div className="step-indicator">
                {isComplete ? (
                  <Check size={14} strokeWidth={3} />
                ) : isCurrent ? (
                  <LoaderCircle className="spin" size={14} />
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
