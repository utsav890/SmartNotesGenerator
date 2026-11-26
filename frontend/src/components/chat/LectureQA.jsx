import { LoaderCircle, MessageCircleQuestion, RotateCcw, Send, Sparkles } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  {
    label: "3 Crucial Takeaways",
    prompt: "What are the 3 most crucial takeaways from this lecture?",
  },
  {
    label: "Explain in Simple Terms",
    prompt: "Explain the main concept in simple, beginner-friendly terms.",
  },
  {
    label: "Potential Exam Questions",
    prompt: "What potential exam or interview questions could come from this lecture?",
  },
];

export default function LectureQA({
  headingId = "lecture-qa-title",
  title = "Ask AI About This Lecture",
  subtitle = "Instant answers grounded strictly in this lecture’s transcript and notes.",
  conversation = [],
  historyLoading,
  historyError,
  reloadConversation,
  question,
  setQuestion,
  questionSubmitting,
  questionError,
  setQuestionError,
  submitQuestion,
  questionInputRef,
  onSuggestionSelect,
  errorId = "question-error",
  hintText = "Grounded in Qdrant RAG & lecture notes",
  placeholder = "Ask anything about this lecture...",
  emptyText = "No questions asked yet. Ask about definitions, mechanisms, formulas, or exam takeaways.",
}) {
  return (
    <section className="lecture-qa" aria-labelledby={headingId}>
      <div className="lecture-qa-heading">
        <div className="lecture-qa-icon" aria-hidden="true">
          <MessageCircleQuestion size={22} />
        </div>
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="qa-chips-row">
        <span className="qa-chips-label">Suggested questions:</span>
        {SUGGESTED_QUESTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            className="qa-chip"
            onClick={() => {
              setQuestion(item.prompt);
              if (onSuggestionSelect) onSuggestionSelect();
              else questionInputRef?.current?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {historyLoading && (
        <div className="qa-state" role="status">
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
          <span>Loading saved conversation...</span>
        </div>
      )}

      {!historyLoading && historyError && (
        <div className="qa-state qa-state-error" role="alert">
          <span>{historyError}</span>
          <button type="button" className="secondary-btn" onClick={reloadConversation}>
            <RotateCcw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {!historyLoading && !historyError && conversation.length === 0 && (
        <p className="qa-empty">{emptyText}</p>
      )}

      {conversation.length > 0 && (
        <ol
          className="qa-conversation"
          aria-label="Saved lecture question and answer history"
          aria-live="polite"
          aria-relevant="additions"
        >
          {conversation.map((message, index) => (
            <li
              key={message.id ?? `${message.role}-${index}`}
              className={`qa-message qa-message-${message.role}`}
            >
              <div className="qa-message-meta">
                <span className="qa-role">
                  {message.role === "assistant" ? "AI Copilot" : "You"}
                </span>
                {message.role === "assistant" && message.confidence && (
                  <span className={`qa-confidence qa-confidence-${message.confidence}`}>
                    <Sparkles size={12} aria-hidden="true" />
                    {message.confidence} confidence
                  </span>
                )}
              </div>
              <p className="qa-message-text">{message.content}</p>
              {message.role === "assistant" && message.sources?.length > 0 && (
                <div className="qa-answer-sources">
                  <h4>Cited Sources</h4>
                  <ul>
                    {message.sources.map((source, sIdx) => (
                      <li key={`${message.id || index}-source-${sIdx}`}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {questionError && (
        <p className="qa-error" id={errorId} role="alert">
          {questionError}
        </p>
      )}

      <form className="qa-form" onSubmit={submitQuestion}>
        <textarea
          ref={questionInputRef}
          id="lecture-question"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            if (questionError) setQuestionError("");
          }}
          maxLength={4000}
          rows={3}
          required
          aria-invalid={questionError ? "true" : undefined}
          aria-describedby={questionError ? errorId : undefined}
          disabled={questionSubmitting}
          placeholder={placeholder}
        />
        <div className="qa-form-footer">
          <span className="qa-hint">
            {question.length}/4000 characters · {hintText}
          </span>
          <button
            type="submit"
            className="qa-submit-btn"
            disabled={questionSubmitting || !question.trim()}
            aria-busy={questionSubmitting}
          >
            {questionSubmitting ? (
              <>
                <LoaderCircle className="spin" size={16} aria-hidden="true" />
                Thinking…
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Send Question
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
