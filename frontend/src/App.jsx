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
  LogOut
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
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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

function calculateReadingTime(notes) {
  if (!notes) return "1 min read";
  const words = [
    notes.title,
    notes.summary,
    ...notes.sections.map((s) => `${s.heading} ${s.content}`),
    ...notes.key_points,
    ...notes.revision_questions
  ].join(" ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function NotesArticle({ notes, headingLevel = 3, showTitle = true }) {
  const TitleHeading = `h${headingLevel}`;
  const SectionHeading = `h${headingLevel + 1}`;
  const readingTime = calculateReadingTime(notes);

  return (
    <div className="notes-article">
      {showTitle && (
        <div className="notes-header-bar">
          <TitleHeading className="notes-title">{notes.title}</TitleHeading>
          <span className="notes-read-time">
            <Clock size={14} aria-hidden="true" />
            {readingTime}
          </span>
        </div>
      )}

      {notes.summary && (
        <div className="notes-summary-card">
          <strong>
            <Sparkles size={14} aria-hidden="true" />
            Executive Summary
          </strong>
          <p className="notes-summary">{notes.summary}</p>
        </div>
      )}

      {notes.sections.length > 0 && (
        <div className="notes-sections">
          {notes.sections.map((section, index) => (
            <article className="note-section" key={`${section.heading || "section"}-${index}`}>
              <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="note-section-content">
                <SectionHeading>{section.heading || `Section ${index + 1}`}</SectionHeading>
                <p>{section.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {notes.key_points.length > 0 && (
        <section className="notes-keypoints" aria-labelledby="key-points-title">
          <SectionHeading id="key-points-title">
            <CheckCircle2 size={18} color="var(--success)" aria-hidden="true" />
            Key Takeaways & Core Concepts
          </SectionHeading>
          <ul>
            {notes.key_points.map((point, index) => (
              <li key={`key-${index}`}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {notes.revision_questions.length > 0 && (
        <section className="notes-questions" aria-labelledby="revision-questions-title">
          <SectionHeading id="revision-questions-title">
            <Brain size={18} color="var(--accent)" aria-hidden="true" />
            Check Your Understanding
          </SectionHeading>
          <ol>
            {notes.revision_questions.map((question, index) => (
              <li key={`question-${index}`}>{question}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function App() {
  const { user, token, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const { pathname, searchParams, params, navigate } = useRouter();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("noteflow_theme") || "dark";
  });

  // Navigation & Workspace State
  const [view, setView] = useState("dashboard"); // "dashboard" | "my-notes" | "note-reader" | "quiz" | "security"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inputTab, setInputTab] = useState("audio"); // "audio" | "transcript"
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
        const target = searchParams.get("redirect") || "/dashboard";
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
  }, [pathname, isAuthenticated, isLoading, searchParams, navigate]);

  // Load library or deep-linked lecture when routing directly
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    if (pathname === "/lectures" || pathname === "/notes") {
      apiRequest("/lectures")
        .then((result) => {
          if (Array.isArray(result?.lectures)) {
            setLectures(result.lectures);
          }
        })
        .catch(() => {});
    } else if (pathname.startsWith("/lecture/")) {
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

  // Form Inputs & Processing
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // My Notes / Library State
  const [lectures, setLectures] = useState([]);
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

      {/* Sidebar Navigation */}
      <aside className={`sidebar${mobileMenuOpen ? " is-open" : ""}`} aria-label="Workspace navigation">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div>
            <h2>SmartNotes</h2>
          </div>
          <span className="brand-badge">AI</span>
        </div>

        <button
          type="button"
          className="new-btn"
          onClick={resetWorkspace}
          aria-label="Create a new notes workspace"
        >
          <Plus size={18} aria-hidden="true" /> New Notes
        </button>

        <p className="nav-title">Workspace</p>

        <nav aria-label="Primary">
          <button
            type="button"
            className={`nav-item${view === "dashboard" ? " active" : ""}`}
            aria-current={view === "dashboard" ? "page" : undefined}
            onClick={() => {
              setView("dashboard");
              navigate("/dashboard");
              setMobileMenuOpen(false);
            }}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            Dashboard
          </button>

          <button
            type="button"
            className={`nav-item${view === "my-notes" || view === "note-reader" || view === "quiz" ? " active" : ""}`}
            aria-label="Open saved notes library"
            aria-current={view !== "dashboard" && view !== "security" ? "page" : undefined}
            onClick={openMyNotes}
          >
            <FileText size={18} aria-hidden="true" />
            My Notes
            {lectures.length > 0 && (
              <span className="nav-item-badge">{lectures.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`nav-item${view === "security" ? " active" : ""}`}
            aria-label="Account security and sessions"
            aria-current={view === "security" ? "page" : undefined}
            onClick={() => {
              setView("security");
              navigate("/settings/security");
              setMobileMenuOpen(false);
            }}
          >
            <Shield size={18} aria-hidden="true" />
            Security &amp; Account
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`nav-item${view === "admin" ? " active" : ""}`}
              aria-label="Admin command center"
              aria-current={view === "admin" ? "page" : undefined}
              style={{ color: "#c084fc" }}
              onClick={() => {
                setView("admin");
                navigate("/admin");
                setMobileMenuOpen(false);
              }}
            >
              <ShieldAlert size={18} aria-hidden="true" color="#c084fc" />
              Admin Panel
              <span className="brand-badge" style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", marginLeft: "auto", fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                ADMIN
              </span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          {/* Dark / Light Mode Switcher */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </span>
            <span className="theme-pill">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          <div className="profile-wrapper" style={{ display: "flex", alignItems: "center", width: "100%", gap: "6px" }}>
            <div
              className="profile"
              onClick={() => {
                setView("security");
                navigate("/settings/security");
              }}
              style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
              title="Open Security & Account settings"
            >
              <div className="avatar">
                {(user?.full_name || user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <strong>{user?.full_name || user?.name || "Student User"}</strong>
                <p>{user?.email || "Protected Account"}</p>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={async (e) => {
                e.stopPropagation();
                await logout();
              }}
              title="Sign out of account"
              aria-label="Sign out"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                padding: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 150ms ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ef4444";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main" id="main">
        {/* Topbar Header */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <span className="breadcrumb">
              <span className="breadcrumb-root">Workspace</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-active">
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
            </span>
          </div>

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              className={`status-badge${loading ? " is-loading" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="status-indicator-dot" aria-hidden="true" />
              {loading
                ? status || "Processing lecture with AI…"
                : "Ready for a new lecture"}
            </span>

            <UserProfileMenu />
          </div>
        </header>

        {/* Content Body */}
        <div className="content">
          {/* ================================================================
              VIEW 1: DASHBOARD (STUDIO & PREVIEW)
              ================================================================ */}
          {view === "dashboard" && (
            <>
              {/* Hero Banner */}
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <Sparkles size={13} aria-hidden="true" />
                    AI Lecture Intelligence
                  </span>
                  <h1>
                    Turn lectures into <span className="gradient-text">smart study notes.</span>
                  </h1>
                  <p>
                    Upload an audio recording or paste your transcript. NoteFlow
                    synthesizes structured notes, core concepts, and active-recall quizzes in seconds.
                  </p>
                  <div className="hero-tags">
                    <span className="hero-tag">
                      <Volume2 size={13} /> Whisper Audio Transcription
                    </span>
                    <span className="hero-tag">
                      <Sparkles size={13} /> Groq Ultra-Fast LLM
                    </span>
                    <span className="hero-tag">
                      <Brain size={13} /> Interactive Active Recall Quiz
                    </span>
                  </div>
                </div>

                <div className="hero-graphic" aria-hidden="true">
                  <div className="hero-graphic-badge">
                    <BookOpen size={50} />
                    <div className="sparkle-float">
                      <Sparkles size={17} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Workspace 2-Column Studio */}
              <section className="workspace">
                {/* Input Studio Card */}
                <div className="form-card">
                  {/* Segmented Mode Selector Tabs */}
                  <div className="input-mode-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputTab === "audio"}
                      className={`mode-tab-btn${inputTab === "audio" ? " active" : ""}`}
                      onClick={() => setInputTab("audio")}
                      disabled={loading}
                    >
                      <FileAudio size={16} aria-hidden="true" />
                      Upload Audio
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputTab === "transcript"}
                      className={`mode-tab-btn${inputTab === "transcript" ? " active" : ""}`}
                      onClick={() => setInputTab("transcript")}
                      disabled={loading}
                    >
                      <FileText size={16} aria-hidden="true" />
                      Paste Transcript
                    </button>
                  </div>

                  {/* Mode 1: Audio File Upload */}
                  {inputTab === "audio" && (
                    <div className="audio-upload-container">
                      <div
                        className={`upload-box${file ? " has-file" : ""}${isDragging ? " is-dragging" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !file && fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
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
                          <div className="selected-file-card" onClick={(e) => e.stopPropagation()}>
                            <div className="file-info-group">
                              <div className="file-icon-badge">
                                <FileAudio size={22} aria-hidden="true" />
                              </div>
                              <div className="file-details">
                                <strong className="file-name">{file.name}</strong>
                                <span className="file-meta">
                                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to transcribe
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="file-remove-btn"
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
                          <>
                            <div className="upload-icon-circle">
                              <Upload size={24} aria-hidden="true" />
                            </div>
                            <strong>Drag & drop your lecture audio here</strong>
                            <span className="upload-hint">
                              MP3, WAV, M4A, OGG or WEBM · Up to 50 MB
                            </span>
                            <span className="upload-browse-pill">Browse from device</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Transcript Input */}
                  {inputTab === "transcript" && (
                    <div className="transcript-section">
                      <div className="field-label-row">
                        <label className="field-label" htmlFor="transcript">
                          Lecture Transcript
                        </label>
                        <div className="sample-buttons-row">
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Try sample:
                          </span>
                          <button
                            type="button"
                            className="sample-pill-btn"
                            onClick={() => loadSample("ml")}
                            disabled={loading}
                          >
                            AI / ML
                          </button>
                          <button
                            type="button"
                            className="sample-pill-btn"
                            onClick={() => loadSample("bio")}
                            disabled={loading}
                          >
                            Biology
                          </button>
                        </div>
                      </div>

                      <textarea
                        id="transcript"
                        placeholder="Paste lecture transcription, discussion notes, or speech-to-text output here..."
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

                      <div className="textarea-footer">
                        <span>{transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : "0 words"}</span>
                        <span>{transcript.length} characters</span>
                      </div>
                    </div>
                  )}

                  {/* Errors and Status */}
                  {error && (
                    <div role="alert" aria-live="assertive" className="form-message error-message">
                      <CircleX size={18} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Processing Stepper when loading */}
                  {loading && (
                    <div className="progress-stepper" role="status" aria-live="polite">
                      <div className="stepper-header">
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <LoaderCircle className="spin" size={16} />
                          {file ? "Processing Audio Pipeline" : "Processing Transcript Pipeline"}
                        </span>
                        <span>In Progress</span>
                      </div>
                      <div className="stepper-bar">
                        <div className="stepper-bar-fill" />
                      </div>
                      <span className="stepper-status-text">
                        {status || "Analyzing content and creating structured study notes..."}
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={loading || (!file && !transcript.trim())}
                    aria-label="Generate smart notes from the provided lecture"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" size={20} aria-hidden="true" />
                        Generating Notes…
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} aria-hidden="true" />
                        Generate Study Notes
                      </>
                    )}
                  </button>
                </div>

                {/* Preview Studio Card */}
                <section className="preview-card" aria-labelledby="notes-preview-title">
                  <div className="preview-heading">
                    <div>
                      <span className="preview-kicker">Interactive Study Sheet</span>
                      <h2 id="notes-preview-title">
                        {notes ? "Notes Preview" : "Study Sheet Studio"}
                      </h2>
                      <p>
                        {notes
                          ? "Review, copy, or download your AI structured study sheet."
                          : "Your structured summary, key points, and revision questions will appear here."}
                      </p>
                    </div>

                    {notes && (
                      <div className="preview-actions">
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={copyNotesToClipboard}
                          title="Copy Markdown to Clipboard"
                          aria-label="Copy notes to clipboard"
                        >
                          {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={downloadNotes}
                          title="Download as Text File"
                          aria-label="Download generated notes"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {notes ? (
                    <div className="notes-output">
                      <NotesArticle notes={notes} />
                    </div>
                  ) : (
                    <div className="empty-preview">
                      <div className="empty-icon" aria-hidden="true">
                        <Wand2 size={32} />
                      </div>
                      <h3>Ready for your lecture</h3>
                      <p>
                        Provide an audio recording or paste transcript text on the left to generate
                        concise summaries, section outlines, and active-recall test questions.
                      </p>
                      <div className="empty-preview-hints">
                        <span className="hint-pill">⚡ Executive Summaries</span>
                        <span className="hint-pill">📌 Key Takeaways</span>
                        <span className="hint-pill">🎯 Self-Test Questions</span>
                        <span className="hint-pill">🧠 Interactive Quizzes</span>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            </>
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
                      <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", alignSelf: "center" }}>
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
                  <span className="preview-kicker" style={{ color: "var(--danger)" }}>
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
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{readerTitle}</p>
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
                        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
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
                                Your selection: <span style={{ color: "var(--danger)" }}>{selectedAnswer}. {options[selectedAnswer]}</span>
                              </p>
                            )}
                            {item.explanation && (
                              <div className="quiz-explanation">
                                <strong style={{ display: "block", marginBottom: "4px", color: "var(--text-primary)" }}>
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