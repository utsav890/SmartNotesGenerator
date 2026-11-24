import {
  ArrowLeft,
  LoaderCircle,
  Brain,
  MessageCircleQuestion,
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  RotateCcw,
  Sparkles,
  Send,
  BookOpen,
  ArrowRight
} from "lucide-react";
import NotesArticle from "./NotesArticle";

export default function NoteReaderView({
  selectedLecture,
  readerTitle,
  notes,
  notesLoading,
  notesError,
  openMyNotes,
  generateAndOpenQuiz,
  jumpToQuestion,
  copyNotesToClipboard,
  downloadNotes,
  copied,
  quizLoading,
  questionSubmitting,
  conversation,
  historyLoading,
  historyError,
  question,
  setQuestion,
  questionError,
  setQuestionError,
  submitQuestion,
  reloadConversation,
  questionInputRef,
  deleteTriggerRef,
  deleteDialogRef,
  _deleteDialogOpen,
  setDeleteDialogOpen,
  deleteError,
  setDeleteError,
  deletingNotes,
  deleteSavedNotes,
  openSavedNote,
  lectures = [],
  resetWorkspace,
  setView,
}) {
  if (!notesLoading && !notesError && !notes) {
    return (
      <section className="reader-card" aria-label="Study Sheets Selection">
        <button
          type="button"
          className="back-btn"
          onClick={() => {
            if (resetWorkspace) resetWorkspace();
            if (setView) setView("dashboard");
            else openMyNotes();
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard
        </button>

        <div className="study-sheet-selector-card">
          <div className="selector-icon-badge">
            <BookOpen size={28} />
          </div>
          <h2>Select a Lecture Study Sheet</h2>
          <p>
            Choose one of your synthesized lectures below to inspect structured notes, review key takeaways, and chat with AI Copilot.
          </p>

          {lectures && lectures.length > 0 ? (
            <div className="lecture-selector-grid">
              {lectures.map((lec) => (
                <button
                  key={lec.id}
                  type="button"
                  className="lecture-select-item"
                  onClick={() => openSavedNote(lec)}
                >
                  <div className="item-icon-wrapper">
                    <FileText size={20} />
                  </div>
                  <div className="item-info">
                    <span className="item-title">{lec.title}</span>
                    <span className="item-meta">
                      {lec.audio_format || "Lecture Audio"} • {lec.created_at ? new Date(lec.created_at).toLocaleDateString() : "Saved"}
                    </span>
                  </div>
                  <div className="item-arrow-action">
                    <span>View Notes</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="selector-empty-cta">
              <p>No synthesized lectures found in your library yet.</p>
              <button
                type="button"
                className="stitch-primary-btn"
                onClick={() => {
                  if (resetWorkspace) resetWorkspace();
                  if (setView) setView("dashboard");
                }}
              >
                <Sparkles size={16} /> Go to Ingestion Studio
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="reader-card" aria-labelledby="reader-title">
      <button type="button" className="back-btn" onClick={openMyNotes}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to My Notes
      </button>

      <div className="reader-heading reader-heading-actions">
        <div>
          <span className="preview-kicker">Saved Study Sheet</span>
          <h1 id="reader-title" tabIndex={-1}>
            {readerTitle}
          </h1>
          {selectedLecture?.created_at && (
            <p className="reader-saved-date">
              <Clock size={13} /> Saved on{" "}
              {new Date(selectedLecture.created_at).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="reader-actions">
          <button
            type="button"
            className="reader-quiz-btn"
            onClick={generateAndOpenQuiz}
            disabled={quizLoading || notesLoading || !notes}
            aria-busy={quizLoading}
          >
            {quizLoading ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <Brain size={17} aria-hidden="true" />
            )}
            {quizLoading ? "Generating Quiz…" : "Take Quiz"}
          </button>

          <button
            type="button"
            className="reader-ask-btn"
            onClick={jumpToQuestion}
            disabled={questionSubmitting || notesLoading || !notes}
            aria-controls="lecture-question"
          >
            <MessageCircleQuestion size={17} aria-hidden="true" />
            Ask AI Copilot
          </button>

          <button
            type="button"
            className="action-icon-btn"
            onClick={copyNotesToClipboard}
            title="Copy Markdown"
            aria-label="Copy notes to clipboard"
          >
            {copied ? (
              <Check size={18} color="var(--success)" />
            ) : (
              <Copy size={18} />
            )}
          </button>

          <button
            type="button"
            className="action-icon-btn"
            onClick={downloadNotes}
            title="Download Text File"
            aria-label="Download notes"
          >
            <Download size={18} />
          </button>

          <button
            ref={deleteTriggerRef}
            type="button"
            className="delete-notes-btn"
            onClick={() => {
              setDeleteError("");
              setDeleteDialogOpen(true);
            }}
            disabled={deletingNotes || notesLoading || !notes}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete Notes
          </button>
        </div>
      </div>

      {notesLoading && (
        <div className="library-state" role="status">
          <LoaderCircle
            className="spin"
            size={32}
            color="var(--accent)"
            aria-hidden="true"
          />
          <h2>Loading your study sheet</h2>
          <p>Formatting sections and retrieving lecture materials…</p>
        </div>
      )}

      {!notesLoading && notesError && (
        <div className="library-state error-state" role="alert">
          <h2>Couldn’t open this note</h2>
          <p>{notesError}</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => selectedLecture && openSavedNote(selectedLecture)}
          >
            <RotateCcw size={16} /> Try again
          </button>
        </div>
      )}

      {!notesLoading && !notesError && notes && (
        <>
          <div className="notes-output reader-output">
            <NotesArticle notes={notes} headingLevel={2} showTitle={false} />
          </div>

          {/* AI Lecture Copilot (Q&A Section) */}
          <section className="lecture-qa" aria-labelledby="lecture-qa-title">
            <div className="lecture-qa-heading">
              <div className="lecture-qa-icon" aria-hidden="true">
                <MessageCircleQuestion size={22} />
              </div>
              <div>
                <h2 id="lecture-qa-title">Ask AI About This Lecture</h2>
                <p>
                  Instant answers grounded strictly in this lecture’s transcript
                  and notes.
                </p>
              </div>
            </div>

            {/* Quick suggested questions */}
            <div className="qa-chips-row">
              <span className="qa-chips-label">Suggested questions:</span>
              <button
                type="button"
                className="qa-chip"
                onClick={() => {
                  setQuestion(
                    "What are the 3 most crucial takeaways from this lecture?"
                  );
                  jumpToQuestion();
                }}
              >
                💡 3 Crucial Takeaways
              </button>
              <button
                type="button"
                className="qa-chip"
                onClick={() => {
                  setQuestion(
                    "Explain the main concept in simple, beginner-friendly terms."
                  );
                  jumpToQuestion();
                }}
              >
                🧠 Explain in Simple Terms
              </button>
              <button
                type="button"
                className="qa-chip"
                onClick={() => {
                  setQuestion(
                    "What potential exam questions could be asked based on this material?"
                  );
                  jumpToQuestion();
                }}
              >
                🎯 Potential Exam Questions
              </button>
            </div>

            {historyLoading && (
              <p className="qa-state" role="status">
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
                Loading conversation history…
              </p>
            )}

            {!historyLoading && historyError && (
              <div className="qa-error" role="alert">
                <p>{historyError}</p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={reloadConversation}
                >
                  Retry loading conversation
                </button>
              </div>
            )}

            {!historyLoading && !historyError && conversation.length === 0 && (
              <p className="qa-empty">
                No questions asked yet. Ask about definitions, formulas,
                derivations, or confusing concepts!
              </p>
            )}

            {conversation.length > 0 && (
              <ol
                className="qa-conversation"
                aria-label="Saved lecture question and answer history"
                aria-live="polite"
                aria-relevant="additions"
              >
                {conversation.map((message) => (
                  <li
                    className={`qa-message qa-message-${message.role}`}
                    key={message.id}
                  >
                    <strong>
                      {message.role === "assistant" ? "Study Copilot" : "You"}
                    </strong>
                    <p>{message.content}</p>
                    {message.role === "assistant" && (
                      <>
                        {message.confidence && (
                          <div className="qa-answer-confidence">
                            <Sparkles size={13} color="var(--accent)" />
                            Confidence: {message.confidence}
                          </div>
                        )}
                        {message.sources?.length > 0 && (
                          <div className="qa-answer-sources">
                            <h4>Cited Sources</h4>
                            <ul>
                              {message.sources.map((source, index) => (
                                <li key={`${message.id}-source-${index}`}>
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
              <p className="qa-error" id="question-error" role="alert">
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
                aria-describedby={`question-hint${
                  questionError ? " question-error" : ""
                }`}
                disabled={questionSubmitting}
                placeholder="Type your question about this lecture..."
              />
              <div className="qa-form-footer">
                <span className="qa-hint" id="question-hint">
                  {question.length}/4000 characters · Answers grounded in lecture
                  notes
                </span>
                <button
                  type="submit"
                  className="qa-submit-btn"
                  disabled={questionSubmitting || !question.trim()}
                  aria-busy={questionSubmitting}
                >
                  {questionSubmitting ? (
                    <>
                      <LoaderCircle
                        className="spin"
                        size={16}
                        aria-hidden="true"
                      />
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
        </>
      )}

      {/* Delete Modal Dialog */}
      <dialog
        ref={deleteDialogRef}
        className="delete-dialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteError("");
          deleteTriggerRef.current?.focus();
        }}
        onCancel={(event) => {
          if (deletingNotes) event.preventDefault();
        }}
      >
        <div className="delete-dialog-content">
          <span className="preview-kicker danger-kicker">Irreversible Action</span>
          <h2 id="delete-dialog-title">Delete saved notes?</h2>
          <p id="delete-dialog-description">
            This permanently removes generated note versions and Q&amp;A history for{" "}
            <strong>{selectedLecture?.title || "this lecture"}</strong>. The
            original lecture audio and transcript will remain safely preserved in
            your database.
          </p>
          {deleteError && (
            <p className="qa-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="delete-dialog-actions">
            <button
              type="button"
              className="secondary-btn delete-cancel-btn"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingNotes}
            >
              Keep Notes
            </button>
            <button
              type="button"
              className="delete-confirm-btn"
              onClick={deleteSavedNotes}
              disabled={deletingNotes}
              aria-busy={deletingNotes}
            >
              {deletingNotes ? "Deleting…" : "Delete Saved Notes"}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
