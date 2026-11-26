import {
  ArrowLeft,
  MessageCircleQuestion,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  BookOpen
} from "lucide-react";

export default function ChatView({
  lectures = [],
  selectedLecture,
  selectChatLecture,
  conversation = [],
  historyLoading,
  historyError,
  question,
  setQuestion,
  questionSubmitting,
  questionError,
  setQuestionError,
  submitQuestion,
  reloadConversation,
  questionInputRef,
  resetWorkspace,
  setView,
}) {
  const readyLectures = lectures.filter(
    (lec) => lec.has_notes || lec.status === "completed"
  );
  const isLectureReady =
    selectedLecture &&
    (selectedLecture.has_notes || selectedLecture.status === "completed");

  return (
    <section className="reader-card chat-page" aria-labelledby="chat-view-title">
      <button
        type="button"
        className="back-btn"
        onClick={() => {
          if (resetWorkspace) resetWorkspace();
          else setView("dashboard");
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard
      </button>

      <div className="reader-heading">
        <div>
          <span className="preview-kicker">Qdrant Vector RAG Copilot</span>
          <h1 id="chat-view-title" tabIndex={-1}>
            Chat with Lecture
          </h1>
          <p className="reader-saved-date">
            Ask targeted questions grounded strictly in your saved lecture transcript and notes.
          </p>
        </div>
      </div>

      {/* Lecture Selector Bar */}
      <div className="chat-lecture-selector-bar">
        <label htmlFor="chat-lecture-select" className="selector-dropdown-label">
          Active Lecture Context:
        </label>
        {readyLectures.length > 0 ? (
          <select
            id="chat-lecture-select"
            className="selector-dropdown-input"
            value={isLectureReady ? String(selectedLecture.id) : ""}
            onChange={(e) => {
              const target = readyLectures.find(
                (lec) => String(lec.id) === e.target.value
              );
              if (target && selectChatLecture) {
                selectChatLecture(target);
              }
            }}
          >
            <option value="" disabled>
              Select a completed lecture to chat with...
            </option>
            {readyLectures.map((lec) => (
              <option key={lec.id} value={lec.id}>
                {lec.title || `Lecture #${lec.id}`}
              </option>
            ))}
          </select>
        ) : (
          <div className="chat-no-lectures-inline">
            <span>No synthesized lectures available yet.</span>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                if (resetWorkspace) resetWorkspace();
                else setView("dashboard");
              }}
            >
              <Sparkles size={15} /> Go to Ingestion Studio
            </button>
          </div>
        )}
      </div>

      {!isLectureReady ? (
        <div className="study-sheet-selector-card" style={{ marginTop: "20px" }}>
          <div className="selector-icon-badge">
            <BookOpen size={28} />
          </div>
          <h2>Select a Lecture to Start Chatting</h2>
          <p>
            Choose one of your synthesized lectures from the dropdown above (or click below) to launch Qdrant RAG Q&amp;A.
          </p>
          {readyLectures.length > 0 && (
            <div className="lecture-selector-grid">
              {readyLectures.map((lec) => (
                <button
                  key={lec.id}
                  type="button"
                  className="lecture-select-item"
                  onClick={() => selectChatLecture && selectChatLecture(lec)}
                >
                  <div className="item-icon-wrapper">
                    <MessageCircleQuestion size={20} />
                  </div>
                  <div className="item-info">
                    <span className="item-title">{lec.title}</span>
                    <span className="item-meta">
                      {lec.audio_format || "Ready"} ·{" "}
                      {lec.created_at
                        ? new Date(lec.created_at).toLocaleDateString()
                        : "Saved"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <section className="lecture-qa" aria-label="AI Lecture Q&A">
          <div className="lecture-qa-heading">
            <div className="lecture-qa-icon" aria-hidden="true">
              <MessageCircleQuestion size={22} />
            </div>
            <div>
              <h2>{selectedLecture.title || "Lecture Q&A"}</h2>
              <p>
                Answers are generated from matching Qdrant vector chunks and verified lecture notes.
              </p>
            </div>
          </div>

          <div className="qa-chips-row">
            <span className="qa-chips-label">Suggested questions:</span>
            <button
              type="button"
              className="qa-chip"
              onClick={() => {
                setQuestion("What are the 3 most crucial takeaways from this lecture?");
                questionInputRef?.current?.focus();
              }}
            >
              3 Crucial Takeaways
            </button>
            <button
              type="button"
              className="qa-chip"
              onClick={() => {
                setQuestion("Explain the main concept in simple, beginner-friendly terms.");
                questionInputRef?.current?.focus();
              }}
            >
              Explain in Simple Terms
            </button>
            <button
              type="button"
              className="qa-chip"
              onClick={() => {
                setQuestion("What potential exam or interview questions could come from this lecture?");
                questionInputRef?.current?.focus();
              }}
            >
              Potential Exam Questions
            </button>
          </div>

          {historyLoading ? (
            <div className="qa-state" role="status">
              <LoaderCircle className="spin" size={20} aria-hidden="true" />
              <span>Loading saved conversation...</span>
            </div>
          ) : historyError ? (
            <div className="qa-state qa-state-error" role="alert">
              <span>{historyError}</span>
              <button
                type="button"
                className="secondary-btn"
                onClick={reloadConversation}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : conversation.length === 0 ? (
            <div className="qa-empty">
              <p>
                No questions asked yet for this lecture. Ask about definitions, mechanisms, formulas, or exam takeaways.
              </p>
            </div>
          ) : (
            <ol className="qa-thread" aria-label="Lecture conversation">
              {conversation.map((message, index) => (
                <li
                  key={message.id ?? `${message.role}-${index}`}
                  className={`qa-message ${
                    message.role === "user" ? "qa-user" : "qa-assistant"
                  }`}
                >
                  <div className="qa-message-meta">
                    <span className="qa-role">
                      {message.role === "user" ? "You" : "AI Copilot"}
                    </span>
                    {message.confidence && (
                      <span className={`qa-confidence qa-confidence-${message.confidence}`}>
                        {message.confidence} confidence
                      </span>
                    )}
                  </div>
                  {message.role === "user" ? (
                    <p className="qa-message-text">{message.content}</p>
                  ) : (
                    <>
                      <p className="qa-message-text">{message.content}</p>
                      {message.sources?.length > 0 && (
                        <div className="qa-answer-sources">
                          <h4>Cited Sources</h4>
                          <ul>
                            {message.sources.map((source, sIdx) => (
                              <li key={`${message.id || index}-source-${sIdx}`}>
                                {source}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}

          {questionError && (
            <p className="qa-error" id="chat-question-error" role="alert">
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
              disabled={questionSubmitting}
              placeholder="Ask anything about this lecture..."
            />
            <div className="qa-form-footer">
              <span className="qa-hint">
                {question.length}/4000 characters · Grounded in Qdrant RAG &amp; lecture notes
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
      )}
    </section>
  );
}
