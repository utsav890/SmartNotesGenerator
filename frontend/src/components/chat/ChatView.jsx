import { ArrowLeft, BookOpen, MessageCircleQuestion, Sparkles } from "lucide-react";
import LectureSelector from "../shared/LectureSelector";
import LectureQA from "./LectureQA";
import { isLectureReady } from "../../utils/lectureUtils";

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
  const readyLectures = lectures.filter(isLectureReady);
  const lectureReady = isLectureReady(selectedLecture);
  const goDashboard = () => (resetWorkspace ? resetWorkspace() : setView("dashboard"));

  return (
    <section className="reader-card chat-page" aria-labelledby="chat-view-title">
      <button type="button" className="back-btn" onClick={goDashboard}>
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

      <div className="chat-lecture-selector-bar">
        <label htmlFor="chat-lecture-select" className="selector-dropdown-label">
          Active Lecture Context:
        </label>
        {readyLectures.length > 0 ? (
          <select
            id="chat-lecture-select"
            className="selector-dropdown-input"
            value={lectureReady ? String(selectedLecture.id) : ""}
            onChange={(e) => {
              const target = readyLectures.find((lec) => String(lec.id) === e.target.value);
              if (target && selectChatLecture) selectChatLecture(target);
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
            <button type="button" className="secondary-btn" onClick={goDashboard}>
              <Sparkles size={15} /> Go to Ingestion Studio
            </button>
          </div>
        )}
      </div>

      {!lectureReady ? (
        <LectureSelector
          ariaLabel="Select a Lecture to Start Chatting"
          sectionClassName="chat-empty-selector"
          cardClassName="study-sheet-selector-card"
          icon={<BookOpen size={28} />}
          itemIcon={<MessageCircleQuestion size={20} />}
          title="Select a Lecture to Start Chatting"
          description="Choose one of your synthesized lectures from the dropdown above (or click below) to launch Qdrant RAG Q&A."
          actionLabel="Open Chat"
          readyLectures={readyLectures}
          showDropdown={false}
          onSelectLecture={selectChatLecture}
          emptyMessage="No synthesized lectures available yet."
        />
      ) : (
        <LectureQA
          headingId="chat-qa-heading"
          title={selectedLecture.title || "Lecture Q&A"}
          subtitle="Answers are generated from matching Qdrant vector chunks and verified lecture notes."
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
          errorId="chat-question-error"
        />
      )}
    </section>
  );
}
