import {
  BookOpen,
  Brain,
  MessageCircleQuestion,
  Layers,
  ArrowRight
} from "lucide-react";
import { isLectureReady } from "../../utils/lectureUtils";

export default function AIToolsGrid({
  notes,
  lectures = [],
  openSavedNote,
  generateAndOpenQuiz,
  openStudySheets,
  openQuizzes,
  openChatView,
  openMyNotes,
  setView,
  selectedLecture,
}) {
  const readyLectures = lectures.filter(isLectureReady);
  const latestReadyLecture = readyLectures[0] || null;
  const activeReadyLecture = isLectureReady(selectedLecture)
    ? selectedLecture
    : latestReadyLecture;

  return (
    <section className="stitch-tools-section" aria-label="AI Study Tools">
      <div className="stitch-section-heading">
        <div>
          <h3>AI Study Tools</h3>
          <p>Interactive workflows built from your synthesized lecture knowledge</p>
        </div>
      </div>

      <div className="stitch-tools-grid">
        <div
          className="stitch-tool-card"
          onClick={() => {
            if (activeReadyLecture) {
              openSavedNote(activeReadyLecture);
            } else if (openStudySheets) {
              openStudySheets();
            } else {
              setView("note-reader");
            }
          }}
        >
          <div className="tool-card-icon icon-purple">
            <BookOpen size={24} />
          </div>
          <h4>Study Sheet</h4>
          <p>Structured summaries, key takeaways, and core concept breakdowns.</p>
          <div className="tool-footer">
            <span>
              {notes
                ? "Active Sheet"
                : readyLectures.length > 0
                ? "Open Latest Sheet"
                : "Select or Ingest Lecture"}
            </span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="stitch-tool-card"
          onClick={() => {
            if (activeReadyLecture) {
              generateAndOpenQuiz(activeReadyLecture);
            } else if (openQuizzes) {
              openQuizzes();
            } else {
              setView("quiz");
            }
          }}
        >
          <div className="tool-card-icon icon-violet">
            <Brain size={24} />
          </div>
          <h4>Practice Quiz</h4>
          <p>Dynamic multiple-choice questions with answer analysis and scoring.</p>
          <div className="tool-footer">
            <span>
              {activeReadyLecture
                ? "Quiz Ready Lecture"
                : "Select a Lecture"}
            </span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="stitch-tool-card"
          onClick={() => {
            if (openChatView) {
              openChatView(activeReadyLecture);
            } else {
              setView("chat");
            }
          }}
        >
          <div className="tool-card-icon icon-fuchsia">
            <MessageCircleQuestion size={24} />
          </div>
          <h4>Chat with Lecture</h4>
          <p>Ask questions against vector-grounded lecture transcripts via Qdrant RAG.</p>
          <div className="tool-footer">
            <span>Open RAG Copilot</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="stitch-tool-card"
          onClick={() => {
            if (activeReadyLecture) {
              openSavedNote(activeReadyLecture);
            } else if (openMyNotes) {
              openMyNotes();
            } else {
              setView("my-notes");
            }
          }}
        >
          <div className="tool-card-icon icon-emerald">
            <Layers size={24} />
          </div>
          <h4>Topic Breakdown</h4>
          <p>Granular subject analysis with technical definitions and concept hierarchies.</p>
          <div className="tool-footer">
            <span>View Breakdown</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </section>
  );
}
