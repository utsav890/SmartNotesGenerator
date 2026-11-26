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
  BookOpen
} from "lucide-react";
import NotesArticle from "./NotesArticle";
import LectureSelector from "../shared/LectureSelector";
import LectureQA from "../chat/LectureQA";
import { isLectureProcessing, isLectureReady } from "../../utils/lectureUtils";

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
  setDeleteDialogOpen,
  deleteError,
  setDeleteError,
  deletingNotes,
  deleteSavedNotes,
  openSavedNote,
  lectures = [],
  resetWorkspace,
  setView,
  handleRetryLecture,
}) {
  const isProcessing = !notes && isLectureProcessing(selectedLecture);
  const isFailed =
    selectedLecture &&
    (selectedLecture.status === "failed" || (!notesLoading && !notes && Boolean(notesError)));

  if (!notesLoading && !notes && !isProcessing && !isFailed) {
    const returnDashboard = () => {
      resetWorkspace?.();
      if (setView) setView("dashboard");
      else openMyNotes();
    };

    return (
      <LectureSelector
        ariaLabel="Study Sheets Selection"
        sectionClassName="reader-card"
        cardClassName="study-sheet-selector-card"
        icon={<BookOpen size={28} />}
        title="Select a Lecture Study Sheet"
        description="Choose one of your synthesized lectures below to inspect structured notes, review key takeaways, and chat with AI Copilot."
        selectId="study-sheet-select"
        dropdownPlaceholder="Choose a synthesized lecture..."
        emptyMessage="No synthesized study sheets found in your library yet."
        actionLabel="View Notes"
        readyLectures={lectures.filter(isLectureReady)}
        onSelectLecture={openSavedNote}
        onBack={returnDashboard}
        onGoDashboard={returnDashboard}
      />
    );
  }

  const isReady = Boolean(notes) && !isProcessing && !isFailed;

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
            disabled={!isReady || quizLoading || notesLoading}
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
            disabled={!isReady || questionSubmitting || notesLoading}
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
            disabled={!isReady}
          >
            {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
          </button>

          <button
            type="button"
            className="action-icon-btn"
            onClick={downloadNotes}
            title="Download Text File"
            aria-label="Download notes"
            disabled={!isReady}
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
            disabled={!isReady || deletingNotes || notesLoading}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete Notes
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="library-state" role="status">
          <LoaderCircle className="spin" size={36} color="var(--accent)" aria-hidden="true" />
          <h2>Synthesizing Study Sheet with AI...</h2>
          <p>
            Whisper transcription and Groq analysis are currently active. This page
            will automatically refresh when the notes are ready.
          </p>
          {handleRetryLecture && selectedLecture?.id && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleRetryLecture(selectedLecture.id)}
            >
              <RotateCcw size={16} /> Restart / Retry Synthesis
            </button>
          )}
        </div>
      )}

      {!isProcessing && notesLoading && (
        <div className="library-state" role="status">
          <LoaderCircle className="spin" size={32} color="var(--accent)" aria-hidden="true" />
          <h2>Loading your study sheet</h2>
          <p>Formatting sections and retrieving lecture materials…</p>
        </div>
      )}

      {!isProcessing && !notesLoading && isFailed && (
        <div className="library-state error-state" role="alert">
          <h2>Couldn’t generate notes for this lecture</h2>
          <p>
            {selectedLecture?.error_message ||
              notesError ||
              "An error occurred during lecture processing."}
          </p>
          {handleRetryLecture && selectedLecture?.id && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleRetryLecture(selectedLecture.id)}
            >
              <RotateCcw size={16} /> Try again
            </button>
          )}
        </div>
      )}

      {isReady && (
        <>
          <div className="notes-output reader-output">
            <NotesArticle notes={notes} headingLevel={2} showTitle={false} />
          </div>

          <LectureQA
            conversation={conversation}
            historyLoading={historyLoading}
            historyError={historyError}
            reloadConversation={reloadConversation}
            question={question}
            setQuestion={setQuestion}
            questionSubmitting={questionSubmitting}
            questionError={questionError}
            setQuestionError={setQuestionError}
            submitQuestion={submitQuestion}
            questionInputRef={questionInputRef}
            onSuggestionSelect={jumpToQuestion}
            placeholder="Type your question about this lecture..."
            emptyText="No questions asked yet. Ask about definitions, formulas, derivations, or confusing concepts!"
            hintText="Answers grounded in lecture notes"
          />
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
          <h2 id="delete-dialog-title">Delete lecture &amp; notes?</h2>
          <p id="delete-dialog-description">
            This permanently deletes{" "}
            <strong>{selectedLecture?.title || "this lecture"}</strong> along with its
            generated notes, quizzes, Q&amp;A history, and vector embeddings from your account.
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
              Keep Lecture
            </button>
            <button
              type="button"
              className="delete-confirm-btn"
              onClick={deleteSavedNotes}
              disabled={deletingNotes}
              aria-busy={deletingNotes}
            >
              {deletingNotes ? "Deleting..." : "Delete Forever"}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
