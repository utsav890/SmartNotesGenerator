import {
  BookOpen,
  Brain,
  MessageCircleQuestion,
  Layers,
  ArrowRight
} from "lucide-react";

export default function AIToolsGrid({
  notes,
  lectures,
  openSavedNote,
  generateAndOpenQuiz,
  setView,
  jumpToQuestion,
  setError,
  selectedLecture,
}) {
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
            if (notes) {
              // notes is already active
            } else if (lectures.length > 0) {
              openSavedNote(lectures[0]);
            } else {
              setView("my-notes");
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
                : lectures.length > 0
                ? "Open Latest Sheet"
                : "Generate Notes First"}
            </span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="stitch-tool-card"
          onClick={() => {
            if (notes) {
              generateAndOpenQuiz();
            } else if (lectures.length > 0) {
              openSavedNote(lectures[0]);
            } else {
              setError("Generate or select a lecture note first to start a quiz.");
            }
          }}
        >
          <div className="tool-card-icon icon-violet">
            <Brain size={24} />
          </div>
          <h4>Practice Quiz</h4>
          <p>Dynamic multiple-choice questions with answer analysis and scoring.</p>
          <div className="tool-footer">
            <span>{notes ? "Start Quiz Now" : "Select a Lecture"}</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="stitch-tool-card"
          onClick={() => {
            if (notes && selectedLecture) {
              setView("note-reader");
              setTimeout(() => jumpToQuestion(), 200);
            } else if (lectures.length > 0) {
              openSavedNote(lectures[0]);
              setTimeout(() => jumpToQuestion(), 200);
            } else {
              setError("Select or generate a lecture note to chat with its AI copilot.");
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
            if (notes) {
              const el = document.querySelector(".topic-notes-grid");
              if (el) el.scrollIntoView({ behavior: "smooth" });
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
