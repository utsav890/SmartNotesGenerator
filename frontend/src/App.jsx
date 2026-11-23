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
  Search,
  Moon,
  Sun,
  Copy,
  Check,
  Menu,
  X,
  Clock,
  CheckCircle2,
  Volume2,
  Wand2,
  ArrowUpRight,
  Shield,
  ShieldAlert,
  LogOut,
  Bell,
  Video,
  Layers,
  ExternalLink,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import "./App.css";
import "./Auth.css";
import "./Admin.css";

import { useAuth } from "./context/AuthContext";
import { useRouter } from "./context/RouterContext";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import VerifyEmailPage from "./components/auth/VerifyEmailPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import SecurityPage from "./components/auth/SecurityPage";
import AdminPanel from "./components/admin/AdminPanel";
import UserProfileMenu from "./components/auth/UserProfileMenu";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : "http://127.0.0.1:8000";

// Curated high-yield samples for instant 1-click testing
const SAMPLE_TRANSCRIPTS = {
  ml: {
    label: "AI & Neural Networks",
    title: "Introduction to Artificial Neural Networks and Backpropagation",
    text: `Welcome everyone to Lecture 4 on Neural Networks and Deep Learning. Today we are exploring the architecture of artificial neural networks inspired by biological neurons in the human brain.

An artificial neuron, or perceptron, receives multiple inputs x1, x2, up to xn. Each input is multiplied by an associated weight w1, w2, through wn. The weighted sum of all inputs is calculated, and a bias term b is added. Mathematically, z equals the summation of wi times xi plus b.

This linear combination is then passed through a non-linear activation function. Without non-linear activation functions like ReLU, Sigmoid, or GELU, a deep network of multiple layers would simply collapse into a single linear transformation, regardless of how many layers it contains. The Rectified Linear Unit, or ReLU, defined as f(x) = max(0, x), is particularly popular because it avoids the vanishing gradient problem during backpropagation and enables faster convergence.

Next, let's understand how a network learns: gradient descent and backpropagation. During the forward pass, predictions are generated, and a loss function measures the discrepancy between predicted output and true target labels. During the backward pass, the chain rule of calculus is applied backwards through every layer to compute the partial derivative of the loss with respect to each weight. These gradients are then used by optimizers such as Adam or Stochastic Gradient Descent to adjust the weights and minimize prediction error.`
  },
  bio: {
    label: "Cellular Biology",
    title: "Cellular Respiration and ATP Synthesis",
    text: `Good morning class. Today we will break down Cellular Respiration, the fundamental biochemical process through which eukaryotic cells convert glucose and oxygen into usable energy in the form of ATP.

Cellular respiration consists of three fundamental stages: Glycolysis, the Citric Acid Cycle (also known as the Krebs cycle), and Oxidative Phosphorylation.

Stage one is Glycolysis, which takes place in the cytoplasm of the cell and does not require oxygen. In glycolysis, a single six-carbon glucose molecule is broken down into two three-carbon molecules of pyruvate, yielding a net production of 2 ATP and 2 NADH molecules.

Stage two occurs inside the mitochondrial matrix: the Krebs cycle. Here, pyruvate is converted into Acetyl-CoA, which enters an enzymatic cycle that generates additional NADH and FADH2 high-energy electron carriers, along with 2 ATP molecules and releasing carbon dioxide as a metabolic byproduct.

Finally, the grand finale of energy production is Oxidative Phosphorylation along the inner mitochondrial membrane. The electron transport chain passes electrons down protein complexes, pumping protons across the membrane to create a steep electrochemical gradient. ATP Synthase, an extraordinary rotary molecular motor, harnesses this proton motive force to synthesize approximately 28 to 32 ATP molecules per glucose molecule.`
  }
};

// Safely read JSON responses from FastAPI
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("smartnotes_token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !url.includes("/api/auth/")) {
      localStorage.removeItem("smartnotes_token");
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
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
      glossary: Array.isArray(content.glossary) ? content.glossary : [],
      revision_questions: Array.isArray(content.revision_questions)
        ? content.revision_questions.map((q) => {
            if (typeof q === "object" && q !== null) {
              return {
                question: q.question || "Practice question",
                answer: q.answer || "Refer to the comprehensive lecture notes above for the detailed explanation and analysis."
              };
            }
            return {
              question: String(q),
              answer: "Refer to the comprehensive lecture notes above for the detailed explanation and analysis."
            };
          })
        : [],
      pipeline: content.pipeline || result.pipeline || null,
    };
  }

  return {
    title: "Lecture Notes",
    summary: String(result ?? ""),
    sections: [],
    key_points: [],
    glossary: [],
    revision_questions: [],
    pipeline: null,
  };
}

function calculateReadingTime(notes) {
  if (!notes) return "1 min read";
  const words = [
    notes.title,
    notes.summary,
    ...notes.sections.map((s) => `${s.heading} ${s.content}`),
    ...notes.key_points,
    ...(notes.glossary || []).map((g) => `${g.term} ${g.definition}`),
    ...notes.revision_questions.map((q) => (typeof q === "object" ? q.question : q))
  ].join(" ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function NotesArticle({ notes, headingLevel = 3, showTitle = true }) {
  const TitleHeading = `h${headingLevel}`;
  const SectionHeading = `h${headingLevel + 1}`;
  const readingTime = calculateReadingTime(notes);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [copiedSection, setCopiedSection] = useState(null);

  const toggleAnswer = (idx) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copySectionText = (idx, heading, content) => {
    const text = `### ${heading}\n\n${content}`;
    navigator.clipboard?.writeText(text);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="notes-article stitch-study-sheet">
      {showTitle && (
        <div className="stitch-sheet-header">
          <div className="stitch-sheet-top-row">
            <TitleHeading className="stitch-sheet-title">{notes.title}</TitleHeading>
            <div className="stitch-sheet-meta">
              <span className="stitch-sheet-pill">
                <Clock size={14} aria-hidden="true" />
                {readingTime}
              </span>
              <span className="stitch-sheet-pill" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle2 size={14} aria-hidden="true" />
                100% Grounded
              </span>
              {notes.sections?.length > 0 && (
                <span className="stitch-sheet-pill">
                  {notes.sections.length} Topics
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {notes.summary && (
        <div className="stitch-summary-card">
          <div className="stitch-card-heading">
            <Sparkles size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Executive Summary
          </div>
          <p className="stitch-summary-text">{notes.summary}</p>
        </div>
      )}

      {notes.key_points && notes.key_points.length > 0 && (
        <section className="stitch-section-card" aria-labelledby="key-points-title">
          <div className="stitch-card-heading" id="key-points-title">
            <CheckCircle2 size={16} color="#10b981" aria-hidden="true" />
            Key Takeaways &amp; Core Concepts
          </div>
          <ul className="stitch-takeaways-list">
            {notes.key_points.map((point, index) => (
              <li key={`key-${index}`} className="stitch-takeaway-item">
                <span className="stitch-takeaway-check">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.sections && notes.sections.length > 0 && (
        <div className="notes-sections-wrapper">
          {notes.sections.map((section, index) => (
            <article className="stitch-section-card" key={`${section.heading || "section"}-${index}`}>
              <div className="stitch-section-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
                  <SectionHeading className="stitch-section-heading">
                    {section.heading || `Section ${index + 1}`}
                  </SectionHeading>
                </div>
                <button
                  type="button"
                  className="stitch-icon-btn"
                  onClick={() => copySectionText(index, section.heading, section.content)}
                  title="Copy Section"
                  aria-label="Copy section text"
                >
                  {copiedSection === index ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="stitch-section-body">{section.content}</p>
            </article>
          ))}
        </div>
      )}

      {notes.glossary && notes.glossary.length > 0 && (
        <section className="stitch-section-card" aria-labelledby="glossary-title">
          <div className="stitch-card-heading" id="glossary-title">
            <BookOpen size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Technical Glossary &amp; Definitions
          </div>
          <div className="stitch-glossary-grid">
            {notes.glossary.map((item, index) => (
              <div key={`glossary-${index}`} className="stitch-glossary-item">
                <div className="stitch-term-name">{item.term}</div>
                <div className="stitch-term-def">{item.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.revision_questions && notes.revision_questions.length > 0 && (
        <section className="stitch-section-card" aria-labelledby="revision-questions-title">
          <div className="stitch-card-heading" id="revision-questions-title">
            <Brain size={16} color="var(--stitch-primary)" aria-hidden="true" />
            Check Your Understanding &amp; Model Answers
          </div>
          <div className="stitch-qa-list">
            {notes.revision_questions.map((item, index) => {
              const qText = typeof item === "object" ? item.question : item;
              const aText = typeof item === "object" ? item.answer : null;
              const isRevealed = revealedAnswers[index];

              return (
                <div key={`question-${index}`} className="stitch-qa-item">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div className="stitch-question-text">
                      <span style={{ color: "var(--stitch-primary)", marginRight: "6px" }}>Q{index + 1}.</span>
                      {qText}
                    </div>
                    {aText && (
                      <button
                        type="button"
                        className="stitch-view-btn"
                        onClick={() => toggleAnswer(index)}
                        style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        {isRevealed ? "Hide Answer" : "Show Model Answer"}
                      </button>
                    )}
                  </div>
                  {isRevealed && aText && (
                    <div className="stitch-model-answer">
                      <strong style={{ display: "block", marginBottom: "4px", color: "var(--stitch-primary)", fontSize: "0.82rem" }}>
                        Model Answer &amp; Explanation:
                      </strong>
                      {aText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function App() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const { pathname, searchParams, navigate } = useRouter();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("noteflow_theme") || "dark";
  });

  // Navigation & Workspace State
  const [view, setView] = useState("dashboard"); // "dashboard" | "my-notes" | "note-reader" | "quiz" | "security"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inputTab, setInputTab] = useState("audio"); // "audio" | "transcript" | "youtube"
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [recentLecturesSearch, setRecentLecturesSearch] = useState("");
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);

  // Form Inputs & Processing
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // My Notes / Library State
  const [lectures, setLectures] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notesError, setNotesError] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [libraryNotice, setLibraryNotice] = useState("");

  // Reader Q&A State
  const [conversation, setConversation] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [question, setQuestion] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // Quiz State
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Dialog & Deletion State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNotes, setDeletingNotes] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Refs
  const deleteDialogRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const questionInputRef = useRef(null);
  const quizQuestionHeadingRef = useRef(null);
  const quizResultsHeadingRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronize route and enforce authenticated protection
  useEffect(() => {
    if (isLoading) return;

    const publicAuthRoutes = [
      "/login",
      "/register",
      "/verify-email",
      "/forgot-password",
      "/reset-password"
    ];

    const isPublicAuthRoute = publicAuthRoutes.includes(pathname);

    if (!isAuthenticated) {
      if (!isPublicAuthRoute) {
        const fullCurrentPath = pathname + (window.location.search || "");
        navigate(`/login?redirect=${encodeURIComponent(fullCurrentPath)}`, { replace: true });
      }
    } else {
      if (pathname === "/login" || pathname === "/register") {
        const rawTarget = searchParams.get("redirect");
        const target = (!rawTarget || rawTarget === "/login" || rawTarget === "/register")
          ? "/dashboard"
          : rawTarget;
        navigate(target, { replace: true });
      } else if (pathname === "/settings" || pathname === "/settings/security") {
        setView("security");
      } else if (pathname === "/admin") {
        if (!isAdmin) {
          navigate("/dashboard", { replace: true });
        } else {
          setView("admin");
        }
      } else if (pathname === "/lectures" || pathname === "/notes") {
        setView("my-notes");
      } else if (pathname.startsWith("/lecture/")) {
        setView("note-reader");
      } else if (pathname === "/" || pathname === "/dashboard") {
        setView("dashboard");
      }
    }
  }, [pathname, isAuthenticated, isLoading, isAdmin, searchParams, navigate]);

  // Open specific note from library
  const openSavedNote = async (lecture) => {
    if (notesLoading) return;

    if (pathname !== `/lecture/${lecture.id}`) {
      navigate(`/lecture/${lecture.id}`);
    }
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

  // Load library, stats, or deep-linked lecture
  const fetchLecturesAndStats = async () => {
    try {
      const result = await apiRequest("/lectures");
      if (Array.isArray(result?.lectures)) {
        setLectures(result.lectures);
      }
      if (result?.stats) {
        setStats(result.stats);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    fetchLecturesAndStats();

    if (pathname.startsWith("/lecture/")) {
      const lectureId = parseInt(pathname.split("/lecture/")[1], 10);
      if (lectureId && (!selectedLecture || selectedLecture.id !== lectureId)) {
        apiRequest(`/lectures/${lectureId}`)
          .then((lectureData) => {
            if (lectureData && lectureData.id) {
              openSavedNote(lectureData);
            }
          })
          .catch((err) => {
            setNotesError(err.message || "Failed to load lecture");
          });
      }
    }
  }, [pathname, isAuthenticated, isLoading]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("noteflow_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Toast feedback helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3200);
  };

  // Sync native dialog
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

  // Focus management on view switch
  useEffect(() => {
    if (view === "my-notes") {
      document.getElementById("my-notes-title")?.focus();
    } else if (view === "note-reader") {
      document.getElementById("reader-title")?.focus();
    } else if (view === "quiz") {
      document.getElementById("quiz-title")?.focus();
    }
  }, [view]);

  // Focus management inside quiz
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
      setStatus("Uploading lecture audio to server...");

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
      setStatus("Transcribing audio with OpenAI Whisper...");

      await apiRequest(
        `/transcribe/${encodeURIComponent(filename)}`,
        {
          method: "POST",
        }
      );

      // 3. Generate and save notes using Groq
      setStatus("Generating structured study notes with Groq LLM...");

      await apiRequest(`/lectures/${id}/generate-notes`, {
        method: "POST",
      });

      // 4. Retrieve saved notes from MySQL
      setStatus("Loading your final saved notes...");

      const savedNotes = await apiRequest(`/lectures/${id}/notes`);

      setNotes(formatNotes(savedNotes));
      setStatus("Your notes are ready!");
      showToast("Notes generated and saved successfully!");
      fetchLecturesAndStats();
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

      setStatus("Generating structured notes from your transcript...");

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
      showToast("Notes generated successfully!");
      fetchLecturesAndStats();
    } catch (err) {
      console.error("Transcript workflow error:", err);
      setError(err.message || "Failed to generate notes.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Open saved notes library
  const openMyNotes = async () => {
    if (loading || notesLoading) return;

    if (pathname !== "/lectures") {
      navigate("/lectures");
    }
    setView("my-notes");
    setMobileMenuOpen(false);
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

  // Reload Q&A Conversation
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

  // Submit Q&A question
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
      showToast("Question answered by AI Copilot");
    } catch (err) {
      console.error("Lecture question error:", err);
      setQuestionError(
        `${err.message || "Couldn’t send your question."} Your question is still here; try again.`
      );
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // Generate and open quiz
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

  // Delete saved notes
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
      showToast("Notes deleted successfully.");
    } catch (err) {
      console.error("Saved notes deletion error:", err);
      setDeleteError(err.message || "Couldn’t delete these saved notes.");
    } finally {
      setDeletingNotes(false);
    }
  };

  // General trigger for generate button
  const handleGenerate = () => {
    setError("");
    setStatus("");

    if (file) {
      handleAudioGenerate();
    } else if (transcript.trim()) {
      handleTranscriptGenerate();
    } else {
      setError("Please upload an audio file or enter a transcript first.");
    }
  };

  // Download notes as .txt
  const downloadNotes = () => {
    if (!notes) return;

    const text = [
      notes.title,
      "=".repeat(notes.title.length),
      "",
      "EXECUTIVE SUMMARY",
      notes.summary,
      "",
      "STRUCTURED SECTIONS",
      ...notes.sections.flatMap((section, index) => [
        "",
        `[${index + 1}] ${section.heading || `Section ${index + 1}`}`,
        section.content || "",
      ]),
      ...(notes.key_points.length
        ? ["", "KEY TAKEAWAYS & CONCEPTS", ...notes.key_points.map((point) => `• ${point}`)]
        : []),
      ...(notes.revision_questions.length
        ? [
            "",
            "CHECK YOUR UNDERSTANDING (REVISION QUESTIONS)",
            ...notes.revision_questions.map((question, index) => `${index + 1}. ${question}`),
          ]
        : []),
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${notes.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "lecture-notes"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Notes downloaded as text file!");
  };

  // Copy notes to clipboard
  const copyNotesToClipboard = async () => {
    if (!notes) return;
    const text = [
      `# ${notes.title}`,
      "",
      `> ${notes.summary}`,
      "",
      "## Sections",
      ...notes.sections.map((s, idx) => `### ${idx + 1}. ${s.heading}\n${s.content}`),
      "",
      "## Key Takeaways",
      ...notes.key_points.map((k) => `- ${k}`),
      "",
      "## Revision Questions",
      ...notes.revision_questions.map((q, idx) => `${idx + 1}. ${q}`)
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Notes copied to clipboard as Markdown!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy notes.");
    }
  };

  // Reset workspace
  const resetWorkspace = () => {
    if (loading) return;

    if (pathname !== "/dashboard") {
      navigate("/dashboard");
    }
    setFile(null);
    setTranscript("");
    setNotes("");
    setError("");
    setStatus("");
    setNotesError("");
    setSelectedLecture(null);
    setView("dashboard");
    setMobileMenuOpen(false);
  };

  // Load a sample transcript for testing
  const loadSample = (key) => {
    const sample = SAMPLE_TRANSCRIPTS[key];
    if (!sample) return;
    setInputTab("transcript");
    setTranscript(sample.text);
    setFile(null);
    setError("");
    setStatus("");
    showToast(`Loaded sample: ${sample.label}`);
  };

  // Drag and drop handlers for upload box
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setTranscript("");
      setError("");
      setNotes("");
      setStatus("");
      setInputTab("audio");
    }
  };

  const readerTitle =
    selectedLecture?.title
      ?.replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Note reader";
  const quizQuestions = quiz?.questions ?? [];
  const currentQuizQuestion = quizQuestions[quizQuestionIndex];
  const currentQuizAnswer = quizAnswers[quizQuestionIndex];

  // Filter lectures for library search
  const filteredLectures = lectures.filter((l) =>
    (l.title || "Untitled lecture").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubject = (lec) => {
    const title = (lec?.title || "").toLowerCase();
    if (title.includes("dbms") || title.includes("database") || title.includes("sql") || title.includes("concurrency")) return "DBMS";
    if (title.includes("ai") || title.includes("search") || title.includes("a*") || title.includes("intelligence")) return "Artificial Intelligence";
    if (title.includes("coa") || title.includes("architecture") || title.includes("memory") || title.includes("hierarchy")) return "Computer Architecture";
    if (title.includes("os") || title.includes("operating") || title.includes("thread") || title.includes("cpu") || title.includes("scheduling")) return "Operating Systems";
    if (title.includes("ml") || title.includes("gradient") || title.includes("machine learning") || title.includes("descent")) return "Machine Learning";
    if (title.includes("network") || title.includes("tcp") || title.includes("congestion") || title.includes("cn")) return "Computer Networks";
    if (title.includes("se") || title.includes("agile") || title.includes("scrum") || title.includes("software")) return "Software Engineering";
    if (title.includes("bio") || title.includes("cell") || title.includes("atp") || title.includes("respiration")) return "Cellular Biology";
    return "Computer Science";
  };

  const formatDuration = (sec) => {
    if (!sec || isNaN(sec)) return "45:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Oct 24, 2024";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Oct 24, 2024";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Oct 24, 2024";
    }
  };

  const totalLecturesCount = stats?.total_lectures ?? lectures.length;
  const readyCount = stats?.notes_ready ?? lectures.filter((l) => l.has_notes || l.status === "completed").length;
  const processingCount = lectures.filter((l) => l.status === "processing" || l.status === "transcribed" || l.status === "uploaded").length;
  const failedCount = lectures.filter((l) => l.status === "failed").length;
  const totalDurationSec = stats?.total_duration_seconds ?? lectures.reduce((acc, l) => acc + (l.duration_seconds || 2400), 0);
  const totalHoursText = `${Math.floor(totalDurationSec / 3600)}h ${Math.floor((totalDurationSec % 3600) / 60)}m`;
  const readyPct = totalLecturesCount > 0 ? Math.round((readyCount / totalLecturesCount) * 100) : 100;

  // Filter lectures for Recent Lectures table
  const filteredRecentLectures = lectures.filter((lec) => {
    const title = (lec.title || "Untitled lecture").toLowerCase();
    const query = recentLecturesSearch.toLowerCase().trim();
    const matchesQuery = !query || title.includes(query) || getSubject(lec).toLowerCase().includes(query);

    let matchesStatus = true;
    if (statusFilter === "Notes Ready") {
      matchesStatus = lec.has_notes || lec.status === "completed";
    } else if (statusFilter === "Processing") {
      matchesStatus = lec.status === "processing" || lec.status === "transcribed" || lec.status === "uploaded";
    } else if (statusFilter === "Failed") {
      matchesStatus = lec.status === "failed";
    }

    let matchesSubject = true;
    if (subjectFilter !== "all") {
      matchesSubject = getSubject(lec) === subjectFilter;
    }

    return matchesQuery && matchesStatus && matchesSubject;
  });

  const PROCESSING_STAGES = [
    { id: 1, name: "Audio Uploaded" },
    { id: 2, name: "Whisper Transcription" },
    { id: 3, name: "Transcript Cleaning" },
    { id: 4, name: "Topic Segmentation" },
    { id: 5, name: "Embedding Generation" },
    { id: 6, name: "Qdrant Storage" },
    { id: 7, name: "Groq Notes Generation" },
    { id: 8, name: "Coverage Validation" },
    { id: 9, name: "Completed" }
  ];

  const getActiveStep = (statusMsg) => {
    if (!statusMsg) return 1;
    const lower = statusMsg.toLowerCase();
    if (lower.includes("uploading") || lower.includes("upload")) return 1;
    if (lower.includes("whisper") || lower.includes("transcribing")) return 2;
    if (lower.includes("clean")) return 3;
    if (lower.includes("segment")) return 4;
    if (lower.includes("embed")) return 5;
    if (lower.includes("qdrant") || lower.includes("vector")) return 6;
    if (lower.includes("groq") || lower.includes("generating")) return 7;
    if (lower.includes("cover") || lower.includes("validat") || lower.includes("loading")) return 8;
    if (lower.includes("ready") || lower.includes("success")) return 9;
    return 7;
  };

  // 1. Loading screen
  if (isLoading) {
    return (
      <div className="auth-loading-screen" role="status">
        <div className="auth-loading-spinner" />
        <p>Loading SmartNotes AI workspace...</p>
      </div>
    );
  }

  // 2. Unauthenticated or public auth pages
  if (!isAuthenticated || ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"].includes(pathname)) {
    if (pathname === "/register") {
      return <RegisterPage />;
    }
    if (pathname === "/verify-email") {
      return <VerifyEmailPage />;
    }
    if (pathname === "/forgot-password") {
      return <ForgotPasswordPage />;
    }
    if (pathname === "/reset-password") {
      return <ResetPasswordPage />;
    }
    return <LoginPage />;
  }

  return (
    <div className="app">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Stitch Sidebar Navigation */}
      <aside className={`stitch-sidebar${mobileMenuOpen ? " is-open" : ""}`} aria-label="Workspace navigation">
        <div>
          {/* NoteFlow Brand */}
          <div className="stitch-brand">
            <div className="stitch-brand-logo">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="stitch-brand-title">NoteFlow</div>
              <div className="stitch-brand-sub">AI Lecture Notes</div>
            </div>
          </div>

          {/* New Notes / Upload Action */}
          <button
            type="button"
            className="stitch-primary-cta"
            style={{ marginBottom: "16px", padding: "10px 16px", fontSize: "0.85rem" }}
            onClick={resetWorkspace}
            aria-label="Create a new notes workspace"
          >
            <Plus size={16} aria-hidden="true" /> New Notes
          </button>

          {/* Primary Nav */}
          <nav aria-label="Primary Navigation">
            <div className="stitch-nav-group-title">Primary</div>
            <button
              type="button"
              className={`stitch-nav-item${view === "dashboard" ? " active" : ""}`}
              onClick={() => {
                setView("dashboard");
                navigate("/dashboard");
                setMobileMenuOpen(false);
              }}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`stitch-nav-item${view === "my-notes" ? " active" : ""}`}
              onClick={openMyNotes}
            >
              <FileText size={18} />
              <span>My Notes</span>
              {lectures.length > 0 && (
                <span className="stitch-nav-badge">{lectures.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`stitch-nav-item${pathname === "/lectures" ? " active" : ""}`}
              onClick={openMyNotes}
            >
              <Video size={18} />
              <span>Lectures</span>
            </button>

            <button
              type="button"
              className={`stitch-nav-item${view === "note-reader" ? " active" : ""}`}
              onClick={() => {
                if (notes) {
                  setView("note-reader");
                } else if (lectures.length > 0) {
                  openSavedNote(lectures[0]);
                } else {
                  openMyNotes();
                }
                setMobileMenuOpen(false);
              }}
            >
              <BookOpen size={18} />
              <span>Study Sheets</span>
            </button>

            <button
              type="button"
              className={`stitch-nav-item${view === "quiz" ? " active" : ""}`}
              onClick={() => {
                if (selectedLecture) {
                  startQuiz(selectedLecture.id);
                } else if (lectures.length > 0) {
                  startQuiz(lectures[0].id);
                } else {
                  showToast("Please select a lecture first to generate a quiz.");
                }
                setMobileMenuOpen(false);
              }}
            >
              <Brain size={18} />
              <span>Quizzes</span>
            </button>

            <button
              type="button"
              className="stitch-nav-item"
              onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
            >
              <Layers size={18} />
              <span>Workspace</span>
              <span className="stitch-nav-chevron">
                {workspaceExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </span>
            </button>

            {/* AI Tools */}
            <div className="stitch-nav-group-title">AI Tools</div>
            <button
              type="button"
              className="stitch-nav-item"
              onClick={() => {
                setView("dashboard");
                setInputTab("audio");
                navigate("/dashboard");
                setMobileMenuOpen(false);
              }}
            >
              <FileAudio size={18} />
              <span>Transcribe Audio</span>
            </button>

            <button
              type="button"
              className="stitch-nav-item"
              onClick={() => {
                setView("dashboard");
                setInputTab("transcript");
                navigate("/dashboard");
                setMobileMenuOpen(false);
              }}
            >
              <Sparkles size={18} />
              <span>Generate Notes</span>
            </button>

            <button
              type="button"
              className="stitch-nav-item"
              onClick={() => {
                if (selectedLecture) {
                  setView("note-reader");
                  setTimeout(() => questionInputRef.current?.focus(), 150);
                } else if (lectures.length > 0) {
                  openSavedNote(lectures[0]);
                  setTimeout(() => questionInputRef.current?.focus(), 150);
                } else {
                  showToast("Select or upload a lecture to chat with it.");
                }
                setMobileMenuOpen(false);
              }}
            >
              <MessageCircleQuestion size={18} />
              <span>Chat with Lecture</span>
            </button>

            {/* System */}
            <div className="stitch-nav-group-title">System</div>
            <button
              type="button"
              className={`stitch-nav-item${view === "security" ? " active" : ""}`}
              onClick={() => {
                setView("security");
                navigate("/settings/security");
                setMobileMenuOpen(false);
              }}
            >
              <Shield size={18} />
              <span>Security &amp; Account</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`stitch-nav-item${view === "admin" ? " active" : ""}`}
                style={{ color: "#c084fc" }}
                onClick={() => {
                  setView("admin");
                  navigate("/admin");
                  setMobileMenuOpen(false);
                }}
              >
                <ShieldAlert size={18} color="#c084fc" />
                <span>Admin Panel</span>
                <span className="stitch-nav-badge" style={{ background: "rgba(192, 132, 252, 0.2)", color: "#c084fc" }}>
                  ADMIN
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer / Upgrade Box / Profile */}
        <div className="stitch-sidebar-footer">
          <div className="stitch-theme-pill" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              Theme
            </span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </div>

          <div className="stitch-pro-card">
            <div className="stitch-pro-title">Upgrade to Pro</div>
            <div className="stitch-pro-desc">Unlimited AI transcriptions &amp; quizzes.</div>
            <button
              type="button"
              className="stitch-pro-btn"
              onClick={() => showToast("Pro subscription tier preview. Full features unlocked for your academic tier!")}
            >
              Upgrade Now
            </button>
          </div>

          <div className="stitch-profile-row">
            <div
              className="stitch-profile-info"
              onClick={() => {
                setView("security");
                navigate("/settings/security");
              }}
              style={{ cursor: "pointer" }}
              title="Open profile & security"
            >
              <div className="stitch-avatar">
                {(user?.full_name || user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="stitch-profile-name">
                  {user?.full_name || user?.name || "Student User"}
                </div>
                <div className="stitch-profile-sub">
                  {user?.role === "admin" ? "System Admin" : "CS Undergrad"}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="stitch-logout-btn"
              onClick={async (e) => {
                e.stopPropagation();
                await logout();
              }}
              title="Sign out of account"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main stitch-main-canvas" id="main">
        {/* Stitch Header / Topbar */}
        <header className="stitch-topbar">
          <div className="stitch-topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="stitch-breadcrumbs">
              <span className="crumb-root">Workspace</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">
                {view === "dashboard"
                  ? "Dashboard"
                  : view === "my-notes"
                  ? "My Notes"
                  : view === "quiz"
                  ? "Lecture Quiz"
                  : view === "security"
                  ? "Security & Account"
                  : view === "admin"
                  ? "Admin Command Center"
                  : "Note Reader"}
              </span>
            </div>
          </div>

          <div className="stitch-search-container">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search lectures, topics, or concepts..."
              value={recentLecturesSearch}
              onChange={(e) => setRecentLecturesSearch(e.target.value)}
              aria-label="Search knowledge base"
            />
          </div>

          <div className="stitch-topbar-right">
            <span
              className={`stitch-pipeline-chip${loading ? " is-active" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="dot" aria-hidden="true" />
              {loading
                ? status || "AI Synthesis Active"
                : "System Ready"}
            </span>

            <button
              type="button"
              className="stitch-icon-btn"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="stitch-notification-badge" />
            </button>

            <UserProfileMenu />
          </div>
        </header>

        {/* Content Body */}
        <div className="content stitch-content-container">
          {/* ================================================================
              VIEW 1: DASHBOARD (STUDIO & PREVIEW)
              ================================================================ */}
          {view === "dashboard" && (
            <div className="stitch-dashboard-stack">
              {/* Hero Banner */}
              <section className="stitch-hero">
                <div className="stitch-hero-content">
                  <div className="stitch-hero-badge">
                    <Sparkles size={14} />
                    <span>AI-Powered Study Intelligence</span>
                  </div>
                  <h1>Turn Lectures into <span className="gradient-text">Smart Study Notes</span></h1>
                  <p>
                    Upload audio or paste a transcript. NoteFlow transcribes, analyzes, and generates
                    structured notes, key concepts, and active-recall quizzes.
                  </p>
                  <div className="stitch-hero-chips">
                    <span className="stitch-chip"><Volume2 size={13} /> Whisper Audio Transcription</span>
                    <span className="stitch-chip"><Sparkles size={13} /> Groq Ultra-Fast LLM</span>
                    <span className="stitch-chip"><Brain size={13} /> Qdrant RAG Memory</span>
                  </div>
                </div>
              </section>

              {/* Bento Analytics Strip */}
              <section className="stitch-bento" aria-label="Study Metrics">
                <div className="stitch-bento-card">
                  <div className="card-top">
                    <span className="label">Total Lectures</span>
                    <div className="icon-wrapper primary"><BookOpen size={18} /></div>
                  </div>
                  <div className="val">{totalLecturesCount}</div>
                  <div className="trend">
                    <TrendingUp size={14} />
                    <span>{readyCount} processed successfully</span>
                  </div>
                </div>

                <div className="stitch-bento-card">
                  <div className="card-top">
                    <span className="label">Notes Generated</span>
                    <div className="icon-wrapper secondary"><FileText size={18} /></div>
                  </div>
                  <div className="val">{readyCount}</div>
                  <div className="trend">
                    <Sparkles size={14} />
                    <span>{readyPct}% completion rate</span>
                  </div>
                </div>

                <div className="stitch-bento-card">
                  <div className="card-top">
                    <span className="label">Study Time Indexed</span>
                    <div className="icon-wrapper accent"><Clock size={18} /></div>
                  </div>
                  <div className="val">{totalHoursText}</div>
                  <div className="trend">
                    <Activity size={14} />
                    <span>{stats?.total_words_indexed ? `${stats.total_words_indexed.toLocaleString()} words indexed` : "Audio & text indexed"}</span>
                  </div>
                </div>
              </section>

              {/* 9-Stage Processing Stepper Banner (Phase 4) */}
              {loading && (
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
                    {PROCESSING_STAGES.map((st, idx) => {
                      const activeIndex = getActiveStep(status);
                      const isComplete = idx < activeIndex;
                      const isCurrent = idx === activeIndex;
                      return (
                        <div
                          key={st.step}
                          className={`stitch-step-item${isComplete ? " complete" : ""}${isCurrent ? " current" : ""}`}
                        >
                          <div className="step-indicator">
                            {isComplete ? (
                              <Check size={14} strokeWidth={3} />
                            ) : isCurrent ? (
                              <LoaderCircle className="spin" size={14} />
                            ) : (
                              <span>{st.step}</span>
                            )}
                          </div>
                          <span className="step-name">{st.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Upload Workspace Section (Phase 3) */}
              <section className="stitch-workspace-wrapper">
                <div className="stitch-workspace-header">
                  <div>
                    <h2>Lecture Ingestion Studio</h2>
                    <p>Select your ingestion method to generate a structured study sheet</p>
                  </div>
                  <div className="stitch-tab-pills" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputTab === "audio"}
                      className={`stitch-tab-pill${inputTab === "audio" ? " active" : ""}`}
                      onClick={() => setInputTab("audio")}
                      disabled={loading}
                    >
                      <FileAudio size={16} />
                      Upload Audio
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputTab === "transcript"}
                      className={`stitch-tab-pill${inputTab === "transcript" ? " active" : ""}`}
                      onClick={() => setInputTab("transcript")}
                      disabled={loading}
                    >
                      <FileText size={16} />
                      Paste Transcript
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputTab === "youtube"}
                      className={`stitch-tab-pill${inputTab === "youtube" ? " active" : ""}`}
                      onClick={() => setInputTab("youtube")}
                      disabled={loading}
                    >
                      <Video size={16} />
                      YouTube Link
                    </button>
                  </div>
                </div>

                {/* Tab 1: Audio Upload */}
                {inputTab === "audio" && (
                  <div className="stitch-tab-content">
                    <div
                      className={`stitch-dropzone-box${file ? " has-file" : ""}${isDragging ? " is-dragging" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !file && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,.flac,.aac,audio/*,video/mp4"
                        disabled={loading}
                        aria-label="Choose lecture audio or video file"
                        onChange={(e) => {
                          setFile(e.target.files?.[0] || null);
                          setTranscript("");
                          setError("");
                          setNotes("");
                          setStatus("");
                        }}
                      />

                      {file ? (
                        <div className="stitch-file-preview-card" onClick={(e) => e.stopPropagation()}>
                          <div className="preview-left">
                            <div className="file-icon-badge">
                              <FileAudio size={24} />
                            </div>
                            <div className="file-info">
                              <strong className="file-name">{file.name}</strong>
                              <span className="file-subtext">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for Whisper transcription
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="stitch-remove-file-btn"
                            disabled={loading}
                            onClick={() => {
                              setFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="stitch-dropzone-idle">
                          <div className="stitch-upload-icon-circle">
                            <Upload size={28} />
                          </div>
                          <h4>Drag & drop your lecture recording here</h4>
                          <p>Supports MP3, WAV, M4A, OGG, WEBM up to 50 MB</p>
                          <span className="stitch-browse-btn">Browse files</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Paste Transcript */}
                {inputTab === "transcript" && (
                  <div className="stitch-tab-content">
                    <div className="stitch-transcript-box">
                      <div className="transcript-box-header">
                        <label htmlFor="stitch-transcript-input">Lecture Transcript Content</label>
                        <div className="sample-chips">
                          <span className="sample-label">Load sample:</span>
                          <button
                            type="button"
                            className="sample-chip-btn"
                            onClick={() => loadSample("ml")}
                            disabled={loading}
                          >
                            AI / Machine Learning
                          </button>
                          <button
                            type="button"
                            className="sample-chip-btn"
                            onClick={() => loadSample("bio")}
                            disabled={loading}
                          >
                            Cell Biology
                          </button>
                        </div>
                      </div>

                      <textarea
                        id="stitch-transcript-input"
                        className="stitch-textarea"
                        placeholder="Paste lecture transcription text, notes, or classroom dialogue here..."
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

                      <div className="stitch-textarea-footer">
                        <span>{transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : "0 words"}</span>
                        <span>{transcript.length} characters</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: YouTube Link (Phase 3 specification) */}
                {inputTab === "youtube" && (
                  <div className="stitch-tab-content">
                    <div className="stitch-youtube-box">
                      <div className="youtube-header">
                        <Video size={22} color="var(--stitch-primary)" />
                        <div>
                          <h4>Import Lecture from YouTube URL</h4>
                          <p>Paste a YouTube video link to extract audio & generate study notes</p>
                        </div>
                      </div>
                      <div className="youtube-input-group">
                        <input
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          disabled={loading}
                          className="stitch-input"
                        />
                      </div>
                      <div className="youtube-notice">
                        <Sparkles size={14} />
                        <span>
                          Direct YouTube URL processing runs through Cloud Ingestion. For instant processing today, upload audio or paste video transcript above.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div role="alert" className="stitch-error-banner">
                    <CircleX size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Generate Button Row */}
                <div className="stitch-workspace-actions">
                  <button
                    type="button"
                    className="stitch-primary-btn"
                    onClick={handleGenerate}
                    disabled={loading || (inputTab === "youtube" ? !youtubeUrl.trim() : (!file && !transcript.trim()))}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        <span>Synthesizing Study Notes…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Generate Study Notes</span>
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Study Sheet Studio Preview (When notes are generated) */}
              {notes && (
                <section className="stitch-notes-preview-section">
                  <div className="stitch-preview-header">
                    <div>
                      <span className="preview-tag">Study Sheet Ready</span>
                      <h2>Interactive Study Sheet</h2>
                      <p>Full structured synthesis, glossary terms, and active recall checks.</p>
                    </div>
                    <div className="preview-action-buttons">
                      <button
                        type="button"
                        className="stitch-secondary-btn"
                        onClick={copyNotesToClipboard}
                        title="Copy Markdown"
                      >
                        {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                        <span>{copied ? "Copied" : "Copy Notes"}</span>
                      </button>
                      <button
                        type="button"
                        className="stitch-secondary-btn"
                        onClick={downloadNotes}
                        title="Download Markdown"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        className="stitch-accent-btn"
                        onClick={generateAndOpenQuiz}
                        disabled={quizLoading}
                      >
                        <Brain size={16} />
                        <span>{quizLoading ? "Generating Quiz…" : "Take Quiz"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="stitch-notes-article-wrapper">
                    <NotesArticle notes={notes} />
                  </div>
                </section>
              )}

              {/* AI Study Tools Grid (Phase 3 specification) */}
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
                      <span>{notes ? "Active Sheet" : lectures.length > 0 ? "Open Latest Sheet" : "Generate Notes First"}</span>
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

              {/* Recent Lectures Section (Phase 3 specification) */}
              <section className="stitch-recent-section" aria-label="Recent Lectures">
                <div className="stitch-table-header-row">
                  <div>
                    <h3>Recent Lectures</h3>
                    <p>Real-time lecture repository synced with your persistent database</p>
                  </div>

                  <div className="stitch-table-filters">
                    <div className="stitch-filter-tabs">
                      <button
                        type="button"
                        className={`stitch-filter-pill${statusFilter === "all" ? " active" : ""}`}
                        onClick={() => setStatusFilter("all")}
                      >
                        All ({lectures.length})
                      </button>
                      <button
                        type="button"
                        className={`stitch-filter-pill${statusFilter === "ready" ? " active" : ""}`}
                        onClick={() => setStatusFilter("ready")}
                      >
                        Notes Ready ({readyCount})
                      </button>
                      <button
                        type="button"
                        className={`stitch-filter-pill${statusFilter === "processing" ? " active" : ""}`}
                        onClick={() => setStatusFilter("processing")}
                      >
                        Processing ({processingCount})
                      </button>
                      {failedCount > 0 && (
                        <button
                          type="button"
                          className={`stitch-filter-pill${statusFilter === "failed" ? " active" : ""}`}
                          onClick={() => setStatusFilter("failed")}
                        >
                          Failed ({failedCount})
                        </button>
                      )}
                    </div>

                    <div className="stitch-subject-dropdown-wrapper">
                      <Filter size={14} />
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="stitch-select"
                        aria-label="Filter by subject"
                      >
                        <option value="all">All Subjects</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Life Sciences">Life Sciences</option>
                        <option value="Engineering">Engineering</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Container */}
                <div className="stitch-table-card">
                  {notesLoading ? (
                    <div className="stitch-table-empty">
                      <LoaderCircle className="spin" size={24} />
                      <p>Loading lectures from database...</p>
                    </div>
                  ) : filteredRecentLectures.length === 0 ? (
                    <div className="stitch-table-empty">
                      <FileText size={32} color="var(--text-muted)" />
                      <h4>No lectures found</h4>
                      <p>
                        {recentLecturesSearch || statusFilter !== "all" || subjectFilter !== "all"
                          ? "No lectures match your current filters. Try resetting them."
                          : "Upload audio or paste a transcript to generate your first study sheet."}
                      </p>
                    </div>
                  ) : (
                    <div className="stitch-table-scroll">
                      <table className="stitch-table">
                        <thead>
                          <tr>
                            <th>Lecture Title</th>
                            <th>Subject</th>
                            <th>Duration</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecentLectures.map((lec) => {
                            const isReady = lec.has_notes || lec.notes;
                            const isFailed = lec.status === "failed";
                            const isProc = !isReady && !isFailed;
                            const subj = getSubject(lec.title);

                            return (
                              <tr key={lec.id}>
                                <td>
                                  <div className="table-title-cell">
                                    <div className="title-icon">
                                      <FileText size={16} />
                                    </div>
                                    <span className="title-text" title={lec.title || "Untitled Lecture"}>
                                      {lec.title || "Untitled Lecture"}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span className="stitch-subject-tag">{subj}</span>
                                </td>
                                <td className="stitch-mono-cell">
                                  {formatDuration(lec.duration_seconds)}
                                </td>
                                <td>
                                  <span className="stitch-date-cell">{formatDate(lec.created_at)}</span>
                                </td>
                                <td>
                                  {isReady ? (
                                    <span className="stitch-status-pill status-ready">
                                      <span className="dot" />
                                      Notes Ready
                                    </span>
                                  ) : isFailed ? (
                                    <span className="stitch-status-pill status-failed">
                                      <span className="dot" />
                                      Failed
                                    </span>
                                  ) : (
                                    <span className="stitch-status-pill status-processing">
                                      <span className="dot" />
                                      Processing
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <div className="table-actions-cell">
                                    <button
                                      type="button"
                                      className="stitch-table-btn"
                                      onClick={() => openSavedNote(lec)}
                                    >
                                      View Notes
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ================================================================
              VIEW 2: MY NOTES (LIBRARY)
              ================================================================ */}
          {view === "my-notes" && (
            <section className="library-card" aria-labelledby="my-notes-title">
              <div className="library-heading">
                <div>
                  <span className="preview-kicker">Study Repository</span>
                  <h1 id="my-notes-title" tabIndex={-1}>
                    My Saved Notes
                  </h1>
                  <p>Browse through all saved lecture summaries and study sheets.</p>
                </div>

                <button type="button" className="secondary-btn" onClick={resetWorkspace}>
                  <Plus size={17} aria-hidden="true" /> Add New Lecture
                </button>
              </div>

              {/* Instant Search Bar */}
              {!notesLoading && !notesError && lectures.length > 0 && (
                <div className="library-search-bar">
                  <Search size={18} color="var(--text-muted)" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search saved lectures by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search lectures"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {/* Status Notice */}
              {libraryNotice && (
                <p className="library-notice" role="status">
                  <CircleCheck size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                  {libraryNotice}
                </p>
              )}

              {/* Loading State */}
              {notesLoading && (
                <div className="library-state" role="status">
                  <LoaderCircle className="spin" size={32} color="var(--accent)" aria-hidden="true" />
                  <h2>Loading your study library</h2>
                  <p>Connecting to backend and fetching your saved lectures…</p>
                </div>
              )}

              {/* Error State */}
              {!notesLoading && notesError && (
                <div className="library-state error-state" role="alert">
                  <h2>Couldn’t load your notes</h2>
                  <p>{notesError}</p>
                  <button type="button" className="secondary-btn" onClick={openMyNotes}>
                    <RotateCcw size={16} /> Try again
                  </button>
                </div>
              )}

              {/* Empty Library State */}
              {!notesLoading && !notesError && lectures.length === 0 && (
                <div className="library-state">
                  <div className="empty-icon" aria-hidden="true">
                    <FileText size={32} />
                  </div>
                  <h2>No saved notes yet</h2>
                  <p>Generate notes from an audio recording or transcript, and they’ll be automatically preserved here.</p>
                  <button type="button" className="generate-btn compact-btn" onClick={resetWorkspace}>
                    <Plus size={18} aria-hidden="true" /> Generate your first notes
                  </button>
                </div>
              )}

              {/* Filtered Empty State */}
              {!notesLoading && !notesError && lectures.length > 0 && filteredLectures.length === 0 && (
                <div className="library-state">
                  <Search size={32} color="var(--text-muted)" />
                  <h2>No lectures match "{searchQuery}"</h2>
                  <p>Try searching for a different keyword or clear the search filter.</p>
                  <button type="button" className="secondary-btn" onClick={() => setSearchQuery("")}>
                    Clear search
                  </button>
                </div>
              )}

              {/* Lecture Cards Grid */}
              {!notesLoading && !notesError && filteredLectures.length > 0 && (
                <div className="lecture-grid">
                  {filteredLectures.map((lecture) => (
                    <button
                      type="button"
                      className="lecture-card"
                      key={lecture.id}
                      onClick={() => openSavedNote(lecture)}
                    >
                      <div className="lecture-card-header">
                        <div className="lecture-card-icon">
                          <FileText size={20} aria-hidden="true" />
                        </div>
                        <span className="lecture-card-date">
                          <Clock size={13} aria-hidden="true" />
                          {lecture.created_at ? new Date(lecture.created_at).toLocaleDateString() : "Saved lecture"}
                        </span>
                      </div>
                      <h3>{lecture.title || "Untitled Lecture"}</h3>
                      <div className="lecture-card-footer">
                        <span>Open Study Sheet</span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              VIEW 3: NOTE READER & ASK AI COPILOT
              ================================================================ */}
          {view === "note-reader" && (
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
                      <Clock size={13} /> Saved on {new Date(selectedLecture.created_at).toLocaleDateString()}
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
                    {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
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
                  <LoaderCircle className="spin" size={32} color="var(--accent)" aria-hidden="true" />
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
                        <p>Instant answers grounded strictly in this lecture’s transcript and notes.</p>
                      </div>
                    </div>

                    {/* Quick suggested questions */}
                    <div className="qa-chips-row">
                      <span className="qa-chips-label">
                        Suggested questions:
                      </span>
                      <button
                        type="button"
                        className="qa-chip"
                        onClick={() => {
                          setQuestion("What are the 3 most crucial takeaways from this lecture?");
                          jumpToQuestion();
                        }}
                      >
                        💡 3 Crucial Takeaways
                      </button>
                      <button
                        type="button"
                        className="qa-chip"
                        onClick={() => {
                          setQuestion("Explain the main concept in simple, beginner-friendly terms.");
                          jumpToQuestion();
                        }}
                      >
                        🧠 Explain in Simple Terms
                      </button>
                      <button
                        type="button"
                        className="qa-chip"
                        onClick={() => {
                          setQuestion("What potential exam questions could be asked based on this material?");
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
                        <button type="button" className="secondary-btn" onClick={reloadConversation}>
                          Retry loading conversation
                        </button>
                      </div>
                    )}

                    {!historyLoading && !historyError && conversation.length === 0 && (
                      <p className="qa-empty">
                        No questions asked yet. Ask about definitions, formulas, derivations, or confusing concepts!
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
                        aria-describedby={`question-hint${questionError ? " question-error" : ""}`}
                        disabled={questionSubmitting}
                        placeholder="Type your question about this lecture..."
                      />
                      <div className="qa-form-footer">
                        <span className="qa-hint" id="question-hint">
                          {question.length}/4000 characters · Answers grounded in lecture notes
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
                  <span className="preview-kicker danger-kicker">
                    Irreversible Action
                  </span>
                  <h2 id="delete-dialog-title">Delete saved notes?</h2>
                  <p id="delete-dialog-description">
                    This permanently removes generated note versions and Q&amp;A history for{" "}
                    <strong>{selectedLecture?.title || "this lecture"}</strong>. The original lecture audio
                    and transcript will remain safely preserved in your database.
                  </p>
                  {deleteError && <p className="qa-error" role="alert">{deleteError}</p>}
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
          )}

          {/* ================================================================
              VIEW 4: ACTIVE RECALL QUIZ
              ================================================================ */}
          {view === "quiz" && (
            <section className="quiz-page" aria-labelledby="quiz-title">
              <button
                type="button"
                className="back-btn"
                onClick={() => setView("note-reader")}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Lecture Notes
              </button>

              <header className="quiz-header">
                <div>
                  <span className="preview-kicker">Active Recall Arena</span>
                  <h1 id="quiz-title" tabIndex={-1}>
                    {quiz?.title || "Lecture Quiz"}
                  </h1>
                  <p className="quiz-subtitle">{readerTitle}</p>
                </div>
                {quiz && (
                  <span className="quiz-count">
                    <Brain size={18} aria-hidden="true" />
                    {quizQuestions.length} {quizQuestions.length === 1 ? "Question" : "Questions"}
                  </span>
                )}
              </header>

              {quizLoading && (
                <div className="library-state" role="status">
                  <LoaderCircle className="spin" size={32} color="var(--accent)" aria-hidden="true" />
                  <h2>Synthesizing Active Recall Quiz</h2>
                  <p>Groq AI is designing challenging comprehension and concept questions from your lecture…</p>
                </div>
              )}

              {!quizLoading && quizError && (
                <div className="library-state error-state" role="alert">
                  <h2>Couldn’t prepare the quiz</h2>
                  <p>{quizError}</p>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={generateAndOpenQuiz}
                    disabled={quizLoading}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    Try Again
                  </button>
                </div>
              )}

              {!quizLoading && quiz && !quizError && (
                quizSubmitted ? (
                  /* Quiz Score & Review View */
                  <div className="quiz-results">
                    <div className="quiz-score-card">
                      <div className="quiz-score-icon" aria-hidden="true">
                        <Brain size={34} />
                      </div>
                      <div>
                        <span className="preview-kicker">Quiz Evaluation Complete</span>
                        <h2 id="quiz-results-title" ref={quizResultsHeadingRef} tabIndex={-1}>
                          {getQuizScore()} <span>/ {quizQuestions.length}</span>
                        </h2>
                        <p className="quiz-score-desc">
                          {getQuizScore() === quizQuestions.length
                            ? "Outstanding mastery! You got every question correct."
                            : getQuizScore() >= Math.ceil(quizQuestions.length * 0.7)
                            ? "Great performance! Review the explanations below to solidify difficult areas."
                            : "Keep practicing! Review the detailed rationales below to master the concepts."}
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
                                <CircleCheck size={16} aria-hidden="true" />
                              ) : (
                                <CircleX size={16} aria-hidden="true" />
                              )}
                              <span>Question {index + 1} · {correct ? "Correct" : "Needs Review"}</span>
                            </div>
                            <h2>{item.question}</h2>
                            <p className="quiz-correct-answer">
                              Correct answer: <strong>{item.correct_answer}. {options[item.correct_answer]}</strong>
                            </p>
                            {!correct && (
                              <p className="quiz-selected-answer">
                                Your selection: <span className="danger-text">{selectedAnswer}. {options[selectedAnswer]}</span>
                              </p>
                            )}
                            {item.explanation && (
                              <div className="quiz-explanation">
                                <strong>
                                  Explanation &amp; Concept Rationale:
                                </strong>
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
                        Back to Lecture Notes
                      </button>
                      <button
                        type="button"
                        className="generate-btn compact-btn"
                        onClick={generateAndOpenQuiz}
                        disabled={quizLoading}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        Try a Fresh Quiz
                      </button>
                    </div>
                  </div>
                ) : currentQuizQuestion ? (
                  /* Active Question View */
                  <div className="quiz-active">
                    <div className="quiz-progress-copy" id="quiz-progress-label" aria-live="polite">
                      <span>Question {quizQuestionIndex + 1} of {quizQuestions.length}</span>
                      <span>{Math.round(((quizQuestionIndex + 1) / quizQuestions.length) * 100)}% Complete</span>
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
                        style={{ width: "auto" }}
                      >
                        {quizQuestionIndex === quizQuestions.length - 1 ? "Submit Quiz" : "Next Question"}
                        {quizQuestionIndex === quizQuestions.length - 1 ? (
                          <Sparkles size={17} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="library-state error-state" role="alert">
                    <h2>This quiz has no questions</h2>
                    <p>Try generating a fresh quiz from these lecture notes.</p>
                    <button type="button" className="secondary-btn" onClick={generateAndOpenQuiz}>
                      <RotateCcw size={16} aria-hidden="true" /> Generate another quiz
                    </button>
                  </div>
                )
              )}
            </section>
          )}

          {/* ================================================================
              VIEW 5: SECURITY & ACCOUNT
              ================================================================ */}
          {view === "security" && <SecurityPage />}

          {/* ================================================================
              VIEW 6: ADMIN COMMAND CENTER (Strictly for authenticated Admins)
              ================================================================ */}
          {view === "admin" && isAdmin && <AdminPanel />}
        </div>
      </main>

      {/* Floating Toast Feedback Notification */}
      {toastMessage && (
        <div className="toast-notice" role="status">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;