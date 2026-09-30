
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  Plus,
  Upload,
  FileAudio,
  Sparkles,
  Download,
  ArrowLeft,
  LoaderCircle,
  MessageCircleQuestion,
  Send,
  Trash2,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  RotateCcw,
} from "lucide-react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Safely read JSON responses from FastAPI
async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

// Normalize generated and persisted backend note responses for rendering.
function formatNotes(data) {
  let result = data;

  if (Array.isArray(result) && result.length > 0) {
    result = result[0];
  }

  if (result && result.notes) {
    result = result.notes;

    if (Array.isArray(result) && result.length > 0) {
      result = result[0];
    }
  }

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      return {
        title: "Lecture Notes",
        summary: result,
        sections: [],
        key_points: [],
        revision_questions: [],
      };
    }
  }

  if (result && typeof result === "object") {
    let content = result.content ?? result;

    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        return {
          title: result.title || "Lecture Notes",
          summary: content,
          sections: [],
          key_points: [],
          revision_questions: [],
        };
      }
    }

    if (!content || typeof content !== "object") {
      return {
        title: result.title || "Lecture Notes",
        summary: "",
        sections: [],
        key_points: [],
        revision_questions: [],
      };
    }

    return {
      title: content.title || result.title || "Lecture Notes",
      summary: content.summary || result.summary || "",
      sections: Array.isArray(content.sections) ? content.sections : [],
      key_points: Array.isArray(content.key_points) ? content.key_points : [],
      revision_questions: Array.isArray(content.revision_questions)
        ? content.revision_questions
        : [],
    };
  }

  return {
    title: "Lecture Notes",
    summary: String(result ?? ""),
    sections: [],
    key_points: [],
    revision_questions: [],
  };
}

function NotesArticle({ notes, headingLevel = 3, showTitle = true }) {
  const TitleHeading = `h${headingLevel}`;
  const SectionHeading = `h${headingLevel + 1}`;

  return (
    <div className="notes-article">
      {showTitle && <TitleHeading className="notes-title">{notes.title}</TitleHeading>}
      {notes.summary && <p className="notes-summary">{notes.summary}</p>}

      {notes.sections.length > 0 && (
        <div className="notes-sections">
          {notes.sections.map((section, index) => (
            <article className="note-section" key={`${section.heading || "section"}-${index}`}>
              <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <SectionHeading>{section.heading || `Section ${index + 1}`}</SectionHeading>
                <p>{section.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {notes.key_points.length > 0 && (
        <section className="notes-keypoints" aria-labelledby="key-points-title">
          <SectionHeading id="key-points-title">Key points</SectionHeading>
          <ul>
            {notes.key_points.map((point, index) => <li key={`key-${index}`}>{point}</li>)}
          </ul>
        </section>
      )}

      {notes.revision_questions.length > 0 && (
        <section className="notes-questions" aria-labelledby="revision-questions-title">
          <SectionHeading id="revision-questions-title">Check your understanding</SectionHeading>
          <ol>
            {notes.revision_questions.map((question, index) => <li key={`question-${index}`}>{question}</li>)}
          </ol>
        </section>
      )}
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("dashboard");
  const [lectures, setLectures] = useState([]);
  const [notesError, setNotesError] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [question, setQuestion] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNotes, setDeletingNotes] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");
  const deleteDialogRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const questionInputRef = useRef(null);
  const quizQuestionHeadingRef = useRef(null);
  const quizResultsHeadingRef = useRef(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;

    if (!dialog) return;

    if (deleteDialogOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector(".delete-cancel-btn")?.focus();
    } else if (!deleteDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [deleteDialogOpen]);

  useEffect(() => {
    if (view === "my-notes") {
      document.getElementById("my-notes-title")?.focus();
    } else if (view === "note-reader") {
      document.getElementById("reader-title")?.focus();
    } else if (view === "quiz") {
      document.getElementById("quiz-title")?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (view !== "quiz" || quizLoading || quizError || !quiz) return;

    if (quizSubmitted) {
      quizResultsHeadingRef.current?.focus();
    } else {
      quizQuestionHeadingRef.current?.focus();
    }
  }, [view, quiz, quizLoading, quizError, quizQuestionIndex, quizSubmitted]);

  // Complete audio -> transcription -> notes -> database workflow
  const handleAudioGenerate = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotes("");

      // 1. Upload audio to FastAPI
      setStatus("Uploading lecture audio...");

      const formData = new FormData();
      formData.append("file", file);

      const uploadResult = await apiRequest("/upload-audio", {
        method: "POST",
        body: formData,
      });

      const id = uploadResult.lecture_id;
      const filename = uploadResult.saved_filename;

      if (!id || !filename) {
        throw new Error(
          "Upload response is missing lecture_id or saved_filename."
        );
      }


      // 2. Transcribe audio using Whisper
      setStatus("Transcribing lecture with Whisper...");

      await apiRequest(
        `/transcribe/${encodeURIComponent(filename)}`,
        {
          method: "POST",
        }
      );

      // 3. Generate and save notes using Groq
      setStatus("Generating and saving AI notes...");

      await apiRequest(`/lectures/${id}/generate-notes`, {
        method: "POST",
      });

      // 4. Retrieve saved notes from MySQL
      setStatus("Loading your saved notes...");

      const savedNotes = await apiRequest(
        `/lectures/${id}/notes`
      );

      setNotes(formatNotes(savedNotes));
      setStatus("Your notes are ready!");
    } catch (err) {
      console.error("Audio workflow error:", err);
      setError(err.message || "Failed to generate notes.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Pasted transcript -> Groq notes workflow
  const handleTranscriptGenerate = async () => {
    if (!transcript.trim()) {
      setError("Please enter a lecture transcript first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotes("");

      setStatus("Generating notes from your transcript...");

      const result = await apiRequest("/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript.trim(),
        }),
      });

      setNotes(formatNotes(result));
      setStatus("Your notes are ready!");
    } catch (err) {
      console.error("Transcript workflow error:", err);
      setError(err.message || "Failed to generate notes.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const openMyNotes = async () => {
    if (loading || notesLoading) return;

    setView("my-notes");
    setNotesError("");
    setLibraryNotice("");
    setNotesLoading(true);

    try {
      const result = await apiRequest("/lectures");
      setLectures(Array.isArray(result.lectures) ? result.lectures : []);
    } catch (err) {
      console.error("Saved notes list error:", err);
      setNotesError(err.message || "Failed to load your saved notes.");
    } finally {
      setNotesLoading(false);
    }
  };

  const openSavedNote = async (lecture) => {
    if (notesLoading) return;

    setSelectedLecture(lecture);
    setNotesError("");
    setHistoryError("");
    setQuestionError("");
    setConversation([]);
    setQuestion("");
    setNotesLoading(true);
    setHistoryLoading(true);
    setView("note-reader");

    try {
      const [notesResult, historyResult] = await Promise.allSettled([
        apiRequest(`/lectures/${lecture.id}/notes`),
        apiRequest(`/lectures/${lecture.id}/questions`),
      ]);

      if (notesResult.status === "rejected") {
        throw notesResult.reason;
      }

      const savedNote = Array.isArray(notesResult.value.notes)
        ? notesResult.value.notes[0]
        : null;

      if (!savedNote) {
        throw new Error("This lecture does not have generated notes yet.");
      }

      setNotes(formatNotes(savedNote));

      if (historyResult.status === "fulfilled") {
        setConversation(
          Array.isArray(historyResult.value.messages)
            ? historyResult.value.messages
            : []
        );
      } else {
        setHistoryError("Couldn’t load saved questions. Try again.");
      }
    } catch (err) {
      console.error("Saved note loading error:", err);
      setNotes("");
      setNotesError(err.message || "Failed to load this note.");
    } finally {
      setNotesLoading(false);
      setHistoryLoading(false);
    }
  };

  const reloadConversation = async () => {
    if (!selectedLecture || historyLoading) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const result = await apiRequest(
        `/lectures/${selectedLecture.id}/questions`
      );
      setConversation(Array.isArray(result.messages) ? result.messages : []);
    } catch (err) {
      console.error("Question history loading error:", err);
      setHistoryError("Couldn’t load saved questions. Try again.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const jumpToQuestion = () => {
    const questionInput = questionInputRef.current;

    if (!questionInput) return;

    questionInput.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    questionInput.focus({ preventScroll: true });
  };

  const submitQuestion = async (event) => {
    event.preventDefault();

    if (!selectedLecture || questionSubmitting) return;

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setQuestionError("Enter a question about this lecture.");
      return;
    }

    setQuestionSubmitting(true);
    setQuestionError("");
    setHistoryError("");

    try {
      const result = await apiRequest(
        `/lectures/${selectedLecture.id}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: trimmedQuestion }),
        }
      );

      const newMessages = Array.isArray(result.messages)
        ? result.messages.map((message) =>
            message.role === "assistant"
              ? {
                  ...message,
                  confidence: result.confidence,
                  sources: Array.isArray(result.sources) ? result.sources : [],
                }
              : message
          )
        : [];
      setConversation((current) => [...current, ...newMessages]);
      setQuestion("");
    } catch (err) {
      console.error("Lecture question error:", err);
      setQuestionError(
        `${err.message || "Couldn’t send your question."} Your question is still here; try again.`
      );
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const generateAndOpenQuiz = async () => {
    if (!selectedLecture || quizLoading) return;

    setView("quiz");
    setQuiz(null);
    setQuizLoading(true);
    setQuizError("");
    setQuizAnswers({});
    setQuizQuestionIndex(0);
    setQuizSubmitted(false);

    try {
      const result = await apiRequest(
        `/lectures/${selectedLecture.id}/quiz`,
        { method: "POST" }
      );
      if (!result || typeof result !== "object") {
        throw new Error("The quiz response was invalid. Try generating a new quiz.");
      }

      const questions = Array.isArray(result.questions)
        ? result.questions
        : [];

      if (questions.length === 0) {
        throw new Error("No quiz questions were returned. Try generating a new quiz.");
      }

      setQuiz({ ...result, questions });
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuizError(err.message || "Couldn’t generate the quiz. Try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const selectQuizAnswer = (answer) => {
    if (quizSubmitted) return;

    setQuizAnswers((current) => ({
      ...current,
      [quizQuestionIndex]: answer,
    }));
  };

  const advanceQuiz = () => {
    if (!quiz || quizAnswers[quizQuestionIndex] === undefined) return;

    if (quizQuestionIndex === quiz.questions.length - 1) {
      setQuizSubmitted(true);
      return;
    }

    setQuizQuestionIndex((current) => current + 1);
  };

  const getQuizScore = () => {
    if (!quiz?.questions) return 0;

    return quiz.questions.reduce(
      (score, item, index) =>
        score + (quizAnswers[index] === item.correct_answer ? 1 : 0),
      0
    );
  };

  const deleteSavedNotes = async () => {
    if (!selectedLecture || deletingNotes) return;

    setDeletingNotes(true);
    setDeleteError("");

    try {
      await apiRequest(`/lectures/${selectedLecture.id}/notes`, {
        method: "DELETE",
      });

      const deletedTitle = selectedLecture.title || "this lecture";
      setDeleteDialogOpen(false);
      setSelectedLecture(null);
      setNotes("");
      setConversation([]);
      await openMyNotes();
      setLibraryNotice(
        `Saved notes and Q&A for ${deletedTitle} were deleted. The lecture and transcript are still saved.`
      );
    } catch (err) {
      console.error("Saved notes deletion error:", err);
      setDeleteError(err.message || "Couldn’t delete these saved notes.");
    } finally {
      setDeletingNotes(false);
    }
  };

  // Select the correct workflow based on the user's input
  const handleGenerate = () => {
    setError("");
    setStatus("");

    if (file) {
      handleAudioGenerate();
    } else if (transcript.trim()) {
      handleTranscriptGenerate();
    } else {
      setError("Upload audio or enter a transcript first.");
    }
  };

  const downloadNotes = () => {
    if (!notes) return;

    const text = [
      notes.title,
      "",
      "Summary",
      notes.summary,
      ...notes.sections.flatMap((section, index) => [
        "",
        `${index + 1}. ${section.heading || `Section ${index + 1}`}`,
        section.content || "",
      ]),
      ...(notes.key_points.length
        ? ["", "Key points", ...notes.key_points.map((point) => `- ${point}`)]
        : []),
      ...(notes.revision_questions.length
        ? [
            "",
            "Revision questions",
            ...notes.revision_questions.map((question, index) => `${index + 1}. ${question}`),
          ]
        : []),
    ].join("\n");
    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lecture-notes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const resetWorkspace = () => {
    if (loading) return;

    setFile(null);
    setTranscript("");
    setNotes("");
    setError("");
    setStatus("");
    setNotesError("");
    setSelectedLecture(null);
    setView("dashboard");
  };

  const readerTitle =
    selectedLecture?.title
      ?.replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Note reader";
  const quizQuestions = quiz?.questions ?? [];
  const currentQuizQuestion = quizQuestions[quizQuestionIndex];
  const currentQuizAnswer = quizAnswers[quizQuestionIndex];

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand">
          <BookOpen size={25} aria-hidden="true" />
          <h2>NoteFlow</h2>
        </div>

        <button type="button" className="new-btn" onClick={resetWorkspace} aria-label="Create a new notes workspace">
          <Plus size={18} aria-hidden="true" /> New Notes
        </button>

        <p className="nav-title">Workspace</p>

        <nav aria-label="Primary">
          <button
            type="button"
            className={`nav-item${view === "dashboard" ? " active" : ""}`}
            aria-current={view === "dashboard" ? "page" : undefined}
            onClick={() => setView("dashboard")}
          >
            <LayoutDashboard size={19} aria-hidden="true" />
            Dashboard
          </button>

          <button
            type="button"
            className={`nav-item${view !== "dashboard" ? " active" : ""}`}
            aria-label="Open saved notes"
            aria-current={view !== "dashboard" ? "page" : undefined}
            onClick={openMyNotes}
          >
            <FileText size={19} aria-hidden="true" />
            My Notes
          </button>
        </nav>

        <div className="profile">
          <div className="avatar">U</div>
          <div>
            <strong>Student Workspace</strong>
            <p>Smart Notes Generator</p>
          </div>
        </div>
      </aside>

      <main className="main" id="main">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span aria-hidden="true">/</span>{" "}
            {view === "dashboard" ? "Dashboard" : view === "my-notes" ? "My Notes" : view === "quiz" ? "Lecture Quiz" : "Note Reader"}
          </span>

          <span className={`status${loading ? " is-loading" : ""}`} role="status" aria-live="polite">
            <span className="status-indicator" aria-hidden="true" />
            {loading ? "Working on your notes" : "Ready for a new lecture"}
          </span>
        </header>

        <div className="content">
          {view === "dashboard" && <section className="hero">
            <div>
              <span className="eyebrow">
                Your lecture, made clearer
              </span>

              <h1>
                Turn lectures into<br />smart notes.
              </h1>

              <p>
                Bring an audio recording or transcript. Leave with clear,
                structured notes ready for review.
              </p>
            </div>

            <div className="hero-icon">
              <BookOpen size={65} aria-hidden="true" />
              <Sparkles size={24} aria-hidden="true" />
            </div>
          </section>}

          {view === "dashboard" && <section className="workspace">
            <div className="form-card">
              <div className="section-title">
                <div className="step">1</div>
                <div>
                  <h2>Upload lecture audio</h2>
                  <p>MP3, WAV, M4A, OGG, or WEBM</p>
                </div>
              </div>

              <label className={`upload-box${file ? " has-file" : ""}`}>
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*"
                  disabled={loading}
                  aria-label="Choose lecture audio file"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setTranscript("");
                    setError("");
                    setNotes("");
                    setStatus("");
                  }}
                />

                {file ? (
                  <>
                    <span className="upload-icon"><FileAudio size={24} aria-hidden="true" /></span>
                    <strong>{file.name}</strong>
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to process</span>
                    <span className="browse">Choose another file</span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon"><Upload size={24} aria-hidden="true" /></span>
                    <strong>
                      Choose an audio file
                    </strong>
                    <span>MP3, WAV, M4A, OGG or WEBM · Up to 50 MB</span>
                    <span className="browse">Browse files</span>
                  </>
                )}
              </label>

              <div className="separator">
                <span>OR</span>
              </div>

              <div className="section-title">
                <div className="step">2</div>
                <div>
                  <h2>Or paste a transcript</h2>
                  <p>Already have text? Paste it below.</p>
                </div>
              </div>

              <label className="field-label" htmlFor="transcript">Lecture transcript</label>
              <textarea
                id="transcript"
                placeholder="Paste your lecture transcript here..."
                value={transcript}
                disabled={loading}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setFile(null);
                  setError("");
                  setNotes("");
                  setStatus("");
                }}
              />

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="form-message error-message"
                >
                  {error}
                </div>
              )}

              {status && (
                <div
                  role="status"
                  aria-live="polite"
                  className="form-message status-message"
                >
                  {status}
                </div>
              )}

              <button
                type="button"
                className="generate-btn"
                onClick={handleGenerate}
                disabled={loading}
                aria-label="Generate notes from the uploaded audio or pasted transcript"
              >
                <Sparkles size={19} aria-hidden="true" />
                {loading
                  ? "Creating your notes…"
                  : "Generate study notes"}
              </button>
            </div>

            <section className="preview-card" aria-labelledby="notes-preview-title">
              <div className="preview-heading">
                <div>
                  <span className="preview-kicker">Your study sheet</span>
                  <h2 id="notes-preview-title">{notes ? "Notes are ready" : "Notes preview"}</h2>
                  <p>{notes ? "Review or download your structured notes." : "Your generated notes will appear here."}</p>
                </div>

                {notes && (
                  <button
                    type="button"
                    onClick={downloadNotes}
                    title="Download notes"
                    aria-label="Download generated notes"
                  >
                    <Download size={18} aria-hidden="true" />
                  </button>
                )}
              </div>

              {notes ? (
                <div className="notes-output">
                  <NotesArticle notes={notes} />
                </div>
              ) : (
                <div className="empty-preview">
                  <div className="empty-icon" aria-hidden="true">
                    <FileText size={30} />
                  </div>

                  <h3>Start with a lecture</h3>

                  <p>
                    Add an audio recording or paste a transcript. We’ll organize
                    the key ideas, summary and revision questions here.
                  </p>
                </div>
              )}
            </section>
          </section>}

            {view === "my-notes" && (
              <section className="library-card" aria-labelledby="my-notes-title">
                <div className="library-heading">
                  <div>
                    <span className="preview-kicker">Your study library</span>
                    <h1 id="my-notes-title" tabIndex={-1}>My Notes</h1>
                    <p>Open a saved lecture to review its generated study sheet.</p>
                  </div>
                  <button type="button" className="secondary-btn" onClick={resetWorkspace}>
                    <Plus size={17} aria-hidden="true" /> Add Notes
                  </button>
                </div>

                {notesLoading && (
                  <div className="library-state" role="status">
                    <LoaderCircle className="spin" size={28} aria-hidden="true" />
                    <h2>Loading your notes</h2>
                    <p>Fetching your saved lectures...</p>
                  </div>
                )}
                {!notesLoading && libraryNotice && (
                  <p className="library-notice" role="status">{libraryNotice}</p>
                )}
                {!notesLoading && notesError && <div className="library-state error-state" role="alert"><h2>Couldn’t load your notes</h2><p>{notesError}</p><button type="button" className="secondary-btn" onClick={openMyNotes}>Try again</button></div>}
                {!notesLoading && !notesError && lectures.length === 0 && <div className="library-state"><div className="empty-icon" aria-hidden="true"><FileText size={30} /></div><h2>No saved notes yet</h2><p>Generate notes from a lecture and they’ll appear here for review.</p><button type="button" className="generate-btn compact-btn" onClick={resetWorkspace}><Plus size={18} aria-hidden="true" /> Add your first lecture</button></div>}
                {!notesLoading && !notesError && lectures.length > 0 && (
                  <div className="lecture-list">
                    {lectures.map((lecture) => (
                      <button type="button" className="lecture-row" key={lecture.id} onClick={() => openSavedNote(lecture)}>
                        <span className="lecture-row-icon"><FileText size={20} aria-hidden="true" /></span>
                        <span className="lecture-row-copy"><strong>{lecture.title || "Untitled lecture"}</strong><small>{lecture.created_at ? new Date(lecture.created_at).toLocaleDateString() : "Saved lecture"}</small></span>
                        <ArrowLeft className="lecture-row-arrow" size={18} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {view === "note-reader" && (
              <section className="reader-card" aria-labelledby="reader-title">
                <button type="button" className="back-btn" onClick={openMyNotes}><ArrowLeft size={17} aria-hidden="true" /> Back to My Notes</button>
                <div className="reader-heading reader-heading-actions">
                  <div>
                    <span className="preview-kicker">Saved study sheet</span>
                    <h1 id="reader-title" tabIndex={-1}>{readerTitle}</h1>
                    <p>Review your generated notes at your own pace.</p>
                    {selectedLecture?.created_at && (
                      <p className="reader-saved-date">
                        Saved {new Date(selectedLecture.created_at).toLocaleDateString()}
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
                      {quizLoading ? "Preparing quiz…" : "Take quiz"}
                    </button>
                    <button
                      type="button"
                      className="reader-ask-btn"
                      onClick={jumpToQuestion}
                      disabled={questionSubmitting || notesLoading || !notes}
                      aria-controls="lecture-question"
                    >
                      <MessageCircleQuestion size={17} aria-hidden="true" />
                      Ask a question
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
                      <Trash2 size={17} aria-hidden="true" />
                      Delete saved notes
                    </button>
                  </div>
                </div>
                {notesLoading && <div className="library-state" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true" /><h2>Loading this note</h2><p>Preparing your study sheet...</p></div>}
                {!notesLoading && notesError && <div className="library-state error-state" role="alert"><h2>Couldn’t open this note</h2><p>{notesError}</p><button type="button" className="secondary-btn" onClick={() => selectedLecture && openSavedNote(selectedLecture)}>Try again</button></div>}
                {!notesLoading && !notesError && notes && (
                  <>
                    <div className="notes-output reader-output"><NotesArticle notes={notes} headingLevel={2} showTitle={false} /></div>

                    <section className="lecture-qa" aria-labelledby="lecture-qa-title">
                      <div className="lecture-qa-heading">
                        <span className="lecture-qa-icon" aria-hidden="true">
                          <MessageCircleQuestion size={20} />
                        </span>
                        <div>
                          <h2 id="lecture-qa-title">Ask about this lecture</h2>
                          <p>Answers use this lecture’s transcript and latest notes.</p>
                        </div>
                      </div>

                      {historyLoading && (
                        <p className="qa-state" role="status">
                          <LoaderCircle className="spin" size={18} aria-hidden="true" />
                          Loading your saved conversation…
                        </p>
                      )}

                      {!historyLoading && historyError && (
                        <div className="qa-error" role="alert">
                          <p>{historyError}</p>
                          <button
                            type="button"
                            className="qa-retry-btn"
                            onClick={reloadConversation}
                          >
                            Retry loading conversation
                          </button>
                        </div>
                      )}

                      {!historyLoading && !historyError && conversation.length === 0 && (
                        <p className="qa-empty">
                          No questions yet. Ask about a concept, definition, or
                          detail from these lecture materials.
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
                                {message.role === "assistant" ? "Study assistant" : "You"}
                              </strong>
                              <p>{message.content}</p>
                              {message.role === "assistant" && (
                                <>
                                  {message.confidence && (
                                    <div className="qa-answer-confidence">
                                      Confidence: {message.confidence}
                                    </div>
                                  )}
                                  {message.sources?.length > 0 && (
                                    <div className="qa-answer-sources">
                                      <h4>Sources</h4>
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
                        <label htmlFor="lecture-question">Your question</label>
                        <p className="qa-hint" id="question-hint">
                          Up to 4,000 characters. Answers are limited to the lecture materials.
                        </p>
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
                          aria-describedby={`question-hint${questionError ? " question-error" : ""}`}
                          disabled={questionSubmitting}
                          placeholder="What would you like to understand?"
                        />
                        <div className="qa-form-footer">
                          <span>{question.length}/4000</span>
                          <button
                            type="submit"
                            className="qa-submit-btn"
                            disabled={questionSubmitting}
                            aria-busy={questionSubmitting}
                          >
                            {questionSubmitting ? (
                              <LoaderCircle className="spin" size={17} aria-hidden="true" />
                            ) : (
                              <Send size={17} aria-hidden="true" />
                            )}
                            {questionSubmitting ? "Sending…" : "Ask question"}
                          </button>
                        </div>
                      </form>
                    </section>
                  </>
                )}

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
                    <span className="preview-kicker">Remove saved study content</span>
                    <h2 id="delete-dialog-title">Delete saved notes?</h2>
                    <p id="delete-dialog-description">
                      This permanently deletes all saved note versions and Q&amp;A
                      for {selectedLecture?.title || "this lecture"}. The lecture,
                      transcript, and audio will stay saved.
                    </p>
                    {deleteError && <p className="qa-error" role="alert">{deleteError}</p>}
                    <div className="delete-dialog-actions">
                      <button
                        type="button"
                        className="secondary-btn delete-cancel-btn"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deletingNotes}
                      >
                        Keep notes
                      </button>
                      <button
                        type="button"
                        className="delete-confirm-btn"
                        onClick={deleteSavedNotes}
                        disabled={deletingNotes}
                        aria-busy={deletingNotes}
                      >
                        {deletingNotes ? "Deleting…" : "Delete saved notes"}
                      </button>
                    </div>
                  </div>
                </dialog>
              </section>
            )}

            {view === "quiz" && (
              <section className="quiz-page" aria-labelledby="quiz-title">
                <button
                  type="button"
                  className="back-btn quiz-back-link"
                  onClick={() => setView("note-reader")}
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  Back to lecture
                </button>

                <header className="quiz-header">
                  <div>
                    <span className="preview-kicker">Active recall</span>
                    <h1 id="quiz-title" tabIndex={-1}>
                      {quiz?.title || "Lecture quiz"}
                    </h1>
                    <p>{readerTitle}</p>
                  </div>
                  {quiz && (
                    <span className="quiz-count">
                      <Brain size={18} aria-hidden="true" />
                      {quizQuestions.length} {quizQuestions.length === 1 ? "question" : "questions"}
                    </span>
                  )}
                </header>

                {quizLoading && (
                  <div className="library-state quiz-state" role="status">
                    <LoaderCircle className="spin" size={28} aria-hidden="true" />
                    <h2>Preparing your quiz</h2>
                    <p>Creating questions from your lecture notes…</p>
                  </div>
                )}

                {!quizLoading && quizError && (
                  <div className="library-state error-state quiz-state" role="alert">
                    <h2>Couldn’t prepare the quiz</h2>
                    <p>{quizError}</p>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={generateAndOpenQuiz}
                      disabled={quizLoading}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Try again
                    </button>
                  </div>
                )}

                {!quizLoading && quiz && !quizError && (
                  quizSubmitted ? (
                    <div className="quiz-results">
                      <div className="quiz-score-card">
                        <div className="quiz-score-icon" aria-hidden="true">
                          <Brain size={24} />
                        </div>
                        <div>
                          <span className="preview-kicker">Quiz complete</span>
                          <h2 id="quiz-results-title" ref={quizResultsHeadingRef} tabIndex={-1}>
                            {getQuizScore()} <span>/ {quizQuestions.length}</span>
                          </h2>
                          <p>
                            Review each answer and explanation to strengthen your understanding.
                          </p>
                        </div>
                      </div>

                      <section className="quiz-review-list" aria-label="Quiz answer review">
                        {quizQuestions.map((item, index) => {
                          const selectedAnswer = quizAnswers[index];
                          const correct = selectedAnswer === item.correct_answer;
                          const options = item.options || {};

                          return (
                            <article className="quiz-review-card" key={`review-${index}`}>
                              <div className={`quiz-review-status${correct ? " is-correct" : " is-incorrect"}`}>
                                {correct ? (
                                  <CircleCheck size={17} aria-hidden="true" />
                                ) : (
                                  <CircleX size={17} aria-hidden="true" />
                                )}
                                <span>Question {index + 1} · {correct ? "Correct" : "Review this answer"}</span>
                              </div>
                              <h2>{item.question}</h2>
                              <p className="quiz-correct-answer">
                                Correct answer: <strong>{item.correct_answer}. {options[item.correct_answer]}</strong>
                              </p>
                              {!correct && (
                                <p className="quiz-selected-answer">
                                  Your answer: {selectedAnswer}. {options[selectedAnswer]}
                                </p>
                              )}
                              {item.explanation && (
                                <div className="quiz-explanation">
                                  <strong>Explanation</strong>
                                  <p>{item.explanation}</p>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </section>

                      <div className="quiz-result-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setView("note-reader")}
                        >
                          <ArrowLeft size={16} aria-hidden="true" />
                          Back to lecture
                        </button>
                        <button
                          type="button"
                          className="generate-btn quiz-restart-btn"
                          onClick={generateAndOpenQuiz}
                          disabled={quizLoading}
                        >
                          <RotateCcw size={17} aria-hidden="true" />
                          Try a fresh quiz
                        </button>
                      </div>
                    </div>
                  ) : currentQuizQuestion ? (
                    <div className="quiz-active">
                      <div className="quiz-progress-copy" id="quiz-progress-label" aria-live="polite">
                        <span>Question {quizQuestionIndex + 1} of {quizQuestions.length}</span>
                        <span>{Math.round(((quizQuestionIndex + 1) / quizQuestions.length) * 100)}% complete</span>
                      </div>
                      <progress
                        className="quiz-progress"
                        value={quizQuestionIndex + 1}
                        max={quizQuestions.length}
                        aria-label={`Question ${quizQuestionIndex + 1} of ${quizQuestions.length}`}
                      />

                      <article className="quiz-question-card" aria-labelledby={`quiz-question-${quizQuestionIndex}`}>
                        <span className="quiz-question-kicker">Question {quizQuestionIndex + 1}</span>
                        <h2
                          id={`quiz-question-${quizQuestionIndex}`}
                          ref={quizQuestionHeadingRef}
                          tabIndex={-1}
                        >
                          {currentQuizQuestion.question}
                        </h2>
                        <fieldset className="quiz-options" aria-labelledby={`quiz-question-${quizQuestionIndex}`}>
                          {["A", "B", "C", "D"].map((option) => (
                            <label
                              className={`quiz-option${currentQuizAnswer === option ? " is-selected" : ""}`}
                              key={option}
                            >
                              <input
                                type="radio"
                                name={`quiz-answer-${quizQuestionIndex}`}
                                value={option}
                                checked={currentQuizAnswer === option}
                                onChange={() => selectQuizAnswer(option)}
                              />
                              <span className="quiz-option-letter">{option}</span>
                              <span>{currentQuizQuestion.options?.[option] || "Option unavailable"}</span>
                            </label>
                          ))}
                        </fieldset>
                      </article>

                      <p className="quiz-answer-hint" id="quiz-answer-hint">
                        Choose an answer to continue. You can return and change your answers before submitting.
                      </p>
                      <div className="quiz-navigation">
                        <button
                          type="button"
                          className="secondary-btn quiz-nav-btn"
                          onClick={() => setQuizQuestionIndex((current) => Math.max(0, current - 1))}
                          disabled={quizQuestionIndex === 0}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                          Previous
                        </button>
                        <button
                          type="button"
                          className="generate-btn quiz-nav-btn"
                          onClick={advanceQuiz}
                          disabled={currentQuizAnswer === undefined}
                          aria-describedby="quiz-answer-hint"
                        >
                          {quizQuestionIndex === quizQuestions.length - 1 ? "Submit quiz" : "Next question"}
                          {quizQuestionIndex === quizQuestions.length - 1 ? (
                            <Sparkles size={17} aria-hidden="true" />
                          ) : (
                            <ChevronRight size={18} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="library-state error-state quiz-state" role="alert">
                      <h2>This quiz has no questions</h2>
                      <p>Try generating a fresh quiz from these lecture notes.</p>
                      <button type="button" className="secondary-btn" onClick={generateAndOpenQuiz}>
                        <RotateCcw size={16} aria-hidden="true" />
                        Generate another quiz
                      </button>
                    </div>
                  )
                )}
              </section>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;