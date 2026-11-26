import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Download,
  FileDown,
  Brain,
  Volume2
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

// Modular Dashboard, Notes, Quiz, and Library Components
import Sidebar from "./components/dashboard/Sidebar";
import Topbar from "./components/dashboard/Topbar";
import BentoMetrics from "./components/dashboard/BentoMetrics";
import ProcessingStepper from "./components/dashboard/ProcessingStepper";
import WorkspaceStudio from "./components/dashboard/WorkspaceStudio";
import AIToolsGrid from "./components/dashboard/AIToolsGrid";
import RecentLecturesTable from "./components/dashboard/RecentLecturesTable";
import NotesArticle from "./components/notes/NotesArticle";
import { formatNotes } from "./utils/notesFormatter";
import NoteReaderView from "./components/notes/NoteReaderView";
import QuizView from "./components/quiz/QuizView";
import MyNotesView from "./components/library/MyNotesView";
import ChatView from "./components/chat/ChatView";
import {
  SAMPLE_TRANSCRIPTS,
  PROCESSING_STAGES,
  apiRequest,
  buildNotesExportText,
  formatDate,
  formatDuration,
  getActiveStep,
  getSubject,
  isLectureProcessing,
  isLectureReady,
  validateMediaFile
} from "./utils/lectureUtils";

function App() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const { pathname, searchParams, navigate } = useRouter();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("noteflow_theme") || "dark";
  });

  // Navigation & Workspace State
  const [view, setView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inputTab, setInputTab] = useState("audio");
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [recentLecturesSearch, setRecentLecturesSearch] = useState("");

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
      } else if (pathname === "/account" || pathname === "/settings" || pathname === "/settings/security") {
        setView("security");
      } else if (pathname === "/admin") {
        if (!isAdmin) {
          navigate("/dashboard", { replace: true });
        } else {
          setView("admin");
        }
      } else if (pathname === "/notes" || pathname === "/lectures") {
        setView("my-notes");
      } else if (pathname === "/study-sheets") {
        setView("note-reader");
        if (!searchParams.get("lectureId")) {
          setSelectedLecture(null);
          setNotes("");
          setNotesError("");
        }
      } else if (pathname.startsWith("/lecture/")) {
        setView("note-reader");
      } else if (pathname === "/chat") {
        setView("chat");
        if (!searchParams.get("lectureId")) {
          setSelectedLecture(null);
          setConversation([]);
          setHistoryError("");
        }
      } else if (pathname === "/quizzes") {
        setView("quiz");
        if (!searchParams.get("lectureId")) {
          setQuiz(null);
          setQuizError("");
        }
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
    setView("note-reader");

    // If lecture is still processing, do not attempt to fetch notes yet; polling will auto-load when done
    if (
      lecture.status === "processing" ||
      lecture.status === "uploaded" ||
      lecture.status === "transcribed"
    ) {
      setNotes("");
      setNotesLoading(false);
      setHistoryLoading(false);
      return;
    }

    if (lecture.status === "failed") {
      setNotes("");
      setNotesError(lecture.error_message || "Lecture synthesis failed.");
      setNotesLoading(false);
      setHistoryLoading(false);
      return;
    }

    setNotesLoading(true);
    setHistoryLoading(true);

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

  // Retry failed or stuck lecture synthesis
  const handleRetryLecture = async (lectureId, e) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    try {
      showToast("Retrying lecture synthesis...", "info");
      await apiRequest(`/lectures/${lectureId}/retry`, { method: "POST" });
      await fetchLecturesAndStats();
      if (selectedLecture && selectedLecture.id === lectureId) {
        setSelectedLecture((prev) => ({
          ...prev,
          status: "processing",
          error_message: null
        }));
        setNotesError("");
      }
      showToast("Synthesis retry initiated! Pipeline running in background.", "success");
    } catch (err) {
      showToast(err.message || "Failed to retry synthesis.", "error");
    }
  };

  // Load library, stats, or deep-linked lecture
  const fetchLecturesAndStats = async () => {
    try {
      const result = await apiRequest("/lectures", { skipAuthRedirect: true });
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

  // Polling: background poll every 4s whenever any lecture in library is processing
  useEffect(() => {
    if (!isAuthenticated || isLoading || !lectures.some(isLectureProcessing)) return;
    const intervalId = setInterval(fetchLecturesAndStats, 4000);
    return () => clearInterval(intervalId);
  }, [lectures, isAuthenticated, isLoading]);

  // Polling: active poll every 4s when viewing a lecture in note-reader that is processing
  useEffect(() => {
    if (!isAuthenticated || isLoading || view !== "note-reader" || !isLectureProcessing(selectedLecture)) return;

    const intervalId = setInterval(async () => {
      try {
        const updated = await apiRequest(`/lectures/${selectedLecture.id}`);
        if (!updated?.id) return;

        if (updated.status !== selectedLecture.status || updated.has_notes !== selectedLecture.has_notes) {
          setSelectedLecture(updated);
          if (isLectureReady(updated)) {
            const notesResult = await apiRequest(`/lectures/${updated.id}/notes`);
            const savedNote = Array.isArray(notesResult?.notes) ? notesResult.notes[0] : null;
            if (savedNote) {
              setNotes(formatNotes(savedNote));
              setNotesError("");
            }
            fetchLecturesAndStats();
          } else if (updated.status === "failed") {
            setNotesError(updated.error_message || "Lecture synthesis failed.");
            fetchLecturesAndStats();
          }
        }
      } catch {
        // silent catch on network hiccups
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [selectedLecture, view, isAuthenticated, isLoading]);

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

  // Audio pipeline
  const handleAudioGenerate = async () => {
    if (!file) {
      setError("Please select an audio or MP4 file first.");
      return;
    }
    const fileError = validateMediaFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotes("");

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
        throw new Error("Upload response is missing lecture_id or saved_filename.");
      }

      // Immediately sync the newly uploaded lecture into Recent Lectures as Processing (1)
      setLectures((prev) => {
        if (prev.some((l) => l.id === id)) return prev;
        return [
          {
            id,
            title: file.name,
            status: "processing",
            has_notes: false,
            created_at: new Date().toISOString(),
            audio_format: file.name.split(".").pop()?.toUpperCase() || "AUDIO",
          },
          ...prev,
        ];
      });
      fetchLecturesAndStats();

      setStatus("Transcribing audio with Whisper...");
      await apiRequest(`/transcribe/${encodeURIComponent(filename)}`, {
        method: "POST",
      });

      setStatus("Generating structured study notes with Gemini AI...");
      await apiRequest(`/lectures/${id}/generate-notes`, {
        method: "POST",
      });

      setStatus("Loading your final saved notes...");
      const savedNotes = await apiRequest(`/lectures/${id}/notes`);

      setNotes(formatNotes(savedNotes));
      setSelectedLecture({
        id,
        title: file.name,
        status: "completed",
        has_notes: true,
        audio_format: file.name.split(".").pop()?.toUpperCase() || "AUDIO",
      });
      setStatus("Your notes are ready!");
      showToast("Notes generated and saved successfully!");
      fetchLecturesAndStats();
    } catch (err) {
      console.error("Audio workflow error:", err);
      setError(err.message || "Failed to generate notes.");
      setStatus("");
      fetchLecturesAndStats();
    } finally {
      setLoading(false);
    }
  };

  // Pasted transcript pipeline
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
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

    if (pathname !== "/notes") {
      navigate("/notes");
    }
    setView("my-notes");
    setMobileMenuOpen(false);
    setNotesError("");
    setLibraryNotice("");
    if (lectures.length === 0) {
      setNotesLoading(true);
    }

    try {
      const result = await apiRequest("/lectures");
      setLectures(Array.isArray(result.lectures) ? result.lectures : []);
    } catch (err) {
      console.error("Saved notes list error:", err);
      if (lectures.length === 0) {
        setNotesError(err.message || "Failed to load your saved notes.");
      }
    } finally {
      setNotesLoading(false);
    }
  };

  // Select lecture & load Q&A thread inside dedicated Chat view
  const selectChatLecture = async (lecture) => {
    if (!lecture || !lecture.id) return;
    setSelectedLecture(lecture);
    setConversation([]);
    setHistoryError("");
    setQuestionError("");
    setQuestion("");
    setHistoryLoading(true);
    setView("chat");

    if (pathname !== "/chat" || searchParams.get("lectureId") !== String(lecture.id)) {
      navigate(`/chat?lectureId=${lecture.id}`);
    }

    try {
      const result = await apiRequest(`/lectures/${lecture.id}/questions`);
      setConversation(Array.isArray(result.messages) ? result.messages : []);
    } catch (err) {
      console.error("Chat history loading error:", err);
      setHistoryError("Couldn’t load saved questions. Try again.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Study Sheets selector / reader view
  const openStudySheets = () => {
    if (loading || notesLoading) return;
    if (pathname !== "/study-sheets") {
      navigate("/study-sheets");
    }
    setSelectedLecture(null);
    setNotes("");
    setNotesError("");
    setConversation([]);
    setHistoryError("");
    setView("note-reader");
    setMobileMenuOpen(false);
    fetchLecturesAndStats();
  };

  // Open Quizzes selector view
  const openQuizzes = () => {
    if (loading || quizLoading) return;
    if (pathname !== "/quizzes") {
      navigate("/quizzes");
    }
    setSelectedLecture(null);
    setQuiz(null);
    setQuizError("");
    setQuizAnswers({});
    setQuizQuestionIndex(0);
    setQuizSubmitted(false);
    setView("quiz");
    setMobileMenuOpen(false);
    fetchLecturesAndStats();
  };

  // Open dedicated RAG Chat view
  const openChatView = (lectureArg = null) => {
    if (loading) return;
    const validArg =
      lectureArg && typeof lectureArg === "object" && "id" in lectureArg && lectureArg.id
        ? lectureArg
        : null;
    setMobileMenuOpen(false);
    setView("chat");
    fetchLecturesAndStats();

    if (validArg && isLectureReady(validArg)) {
      selectChatLecture(validArg);
      return;
    }

    if (pathname !== "/chat") {
      navigate("/chat");
    }
    setSelectedLecture(null);
    setConversation([]);
    setHistoryError("");
    setQuestionError("");
  };

  // Reload Q&A Conversation
  const reloadConversation = async () => {
    if (!selectedLecture || historyLoading) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const result = await apiRequest(`/lectures/${selectedLecture.id}/questions`);
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
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
      const result = await apiRequest(`/lectures/${selectedLecture.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

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
      setQuestionError(`${err.message || "Couldn’t send your question."} Your question is still here; try again.`);
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // Generate and open quiz
  const generateAndOpenQuiz = async (lectureArg) => {
    const validArg =
      lectureArg && typeof lectureArg === "object" && "id" in lectureArg && lectureArg.id
        ? lectureArg
        : null;
    const targetLecture = validArg || (selectedLecture?.id ? selectedLecture : null);
    if (quizLoading) return;

    if (!targetLecture) {
      openQuizzes();
      return;
    }

    setSelectedLecture(targetLecture);
    setView("quiz");
    setQuiz(null);
    setQuizLoading(true);
    setQuizError("");
    setQuizAnswers({});
    setQuizQuestionIndex(0);
    setQuizSubmitted(false);

    if (pathname !== "/quizzes" || searchParams.get("lectureId") !== String(targetLecture.id)) {
      navigate(`/quizzes?lectureId=${targetLecture.id}`);
    }

    try {
      const result = await apiRequest(`/lectures/${targetLecture.id}/quiz`, { method: "POST" });
      if (!result || typeof result !== "object") {
        throw new Error("The quiz response was invalid. Try generating a new quiz.");
      }

      const questions = Array.isArray(result.questions) ? result.questions : [];
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

  // Sync deep links and library state on route change
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    fetchLecturesAndStats();

    const queryLectureId = parseInt(searchParams.get("lectureId") || "", 10);
    const routeTargetId = pathname.startsWith("/lecture/")
      ? parseInt(pathname.split("/lecture/")[1], 10)
      : queryLectureId;

    if (!routeTargetId || (selectedLecture?.id === routeTargetId)) return;

    const handlers = {
      "/study-sheets": { run: openSavedNote, onErr: (msg) => setNotesError(msg || "Failed to load lecture") },
      "/chat": { run: selectChatLecture, onErr: (msg) => setHistoryError(msg || "Failed to load lecture conversation") },
      "/quizzes": {
        skip: quizLoading,
        run: generateAndOpenQuiz,
        onErr: (msg) => setQuizError(msg || "Could not prepare quiz for this lecture.")
      }
    };
    const handler = pathname.startsWith("/lecture/") ? handlers["/study-sheets"] : handlers[pathname];
    if (!handler || handler.skip) return;

    apiRequest(`/lectures/${routeTargetId}`)
      .then((lectureData) => {
        if (lectureData?.id) handler.run(lectureData);
      })
      .catch((err) => handler.onErr(err.message));
  }, [pathname, searchParams, isAuthenticated, isLoading]);

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
      (score, item, index) => score + (quizAnswers[index] === item.correct_answer ? 1 : 0),
      0
    );
  };

  // Permanently delete lecture, notes, Q&A, quizzes, and vectors
  const deleteSavedNotes = async (lectureArg) => {
    const validArg =
      lectureArg && typeof lectureArg === "object" && "id" in lectureArg && lectureArg.id
        ? lectureArg
        : null;
    const targetLecture = validArg || selectedLecture;
    if (!targetLecture || deletingNotes) return false;

    setDeletingNotes(true);
    setDeleteError("");

    try {
      await apiRequest(`/lectures/${targetLecture.id}`, {
        method: "DELETE",
      });

      const deletedId = targetLecture.id;
      const deletedTitle = targetLecture.title || "this lecture";

      setLectures((prev) => prev.filter((l) => l.id !== deletedId));
      setStats((prev) => {
        if (!prev) return prev;
        const wasReady = targetLecture.has_notes || targetLecture.status === "completed";
        const dur = Number(targetLecture.duration_seconds) || 0;
        return {
          ...prev,
          total_lectures: Math.max(0, (prev.total_lectures || 0) - 1),
          notes_ready: Math.max(0, (prev.notes_ready || 0) - (wasReady ? 1 : 0)),
          total_duration_seconds: Math.max(0, (prev.total_duration_seconds || 0) - dur),
        };
      });

      if (selectedLecture?.id === deletedId) {
        setSelectedLecture(null);
        setNotes("");
        setConversation([]);
        setQuiz(null);
        setQuestion("");
      }

      setDeleteDialogOpen(false);
      setLibraryNotice(`"${deletedTitle}" was permanently deleted from your workspace.`);
      showToast("Lecture deleted permanently.");

      if (pathname.startsWith("/lecture/")) {
        navigate("/notes", { replace: true });
        setView("my-notes");
      }

      await fetchLecturesAndStats();
      return true;
    } catch (err) {
      console.error("Lecture deletion error:", err);
      const errMsg = err.message || "Couldn’t delete this lecture.";
      setDeleteError(errMsg);
      showToast(errMsg);
      return false;
    } finally {
      setDeletingNotes(false);
    }
  };

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

  const downloadNotes = () => {
    const text = buildNotesExportText(notes, { markdown: false });
    if (!text) return;
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

  const copyNotesToClipboard = async () => {
    const text = buildNotesExportText(notes, { markdown: true });
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Notes copied to clipboard as Markdown!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy notes.");
    }
  };

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
      const fileError = validateMediaFile(droppedFile);
      if (fileError) {
        setFile(null);
        setError(fileError);
        setInputTab("audio");
        return;
      }
      setFile(droppedFile);
      setTranscript("");
      setError("");
      setNotes("");
      setStatus("");
      setInputTab("audio");
    }
  };

  const readerTitle =
    selectedLecture?.title?.replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Note reader";
  const quizQuestions = quiz?.questions ?? [];
  const currentQuizQuestion = quizQuestions[quizQuestionIndex];

  const filteredLectures = lectures.filter((l) =>
    (l.title || "Untitled lecture").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLecturesCount = stats?.total_lectures ?? lectures.length;
  const readyCount = stats?.notes_ready ?? lectures.filter(isLectureReady).length;
  const processingCount = lectures.filter(isLectureProcessing).length;
  const failedCount = lectures.filter((l) => l.status === "failed").length;
  const totalDurationSec =
    stats?.total_duration_seconds ??
    lectures.reduce((acc, l) => acc + (Number(l.duration_seconds) || 0), 0);
  const totalHoursText = `${Math.floor(totalDurationSec / 3600)}h ${Math.floor((totalDurationSec % 3600) / 60)}m`;
  const readyPct = totalLecturesCount > 0 ? Math.round((readyCount / totalLecturesCount) * 100) : 0;

  const filteredRecentLectures = lectures.filter((lec) => {
    const title = (lec.title || "Untitled lecture").toLowerCase();
    const query = recentLecturesSearch.toLowerCase().trim();
    const matchesQuery = !query || title.includes(query) || getSubject(lec).toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "ready"
        ? isLectureReady(lec)
        : statusFilter === "processing"
        ? isLectureProcessing(lec)
        : statusFilter === "failed"
        ? lec.status === "failed"
        : true;

    const matchesSubject = subjectFilter === "all" || getSubject(lec) === subjectFilter;
    return matchesQuery && matchesStatus && matchesSubject;
  });

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
    if (pathname === "/register") return <RegisterPage />;
    if (pathname === "/verify-email") return <VerifyEmailPage />;
    if (pathname === "/forgot-password") return <ForgotPasswordPage />;
    if (pathname === "/reset-password") return <ResetPasswordPage />;
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

      {/* Stitch Sidebar */}
      <Sidebar
        view={view}
        setView={setView}
        navigate={navigate}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        logout={logout}
        isAdmin={isAdmin}
        resetWorkspace={resetWorkspace}
        openMyNotes={openMyNotes}
        openStudySheets={openStudySheets}
        openQuizzes={openQuizzes}
        openChatView={openChatView}
      />

      {/* Main Container */}
      <main className="main stitch-main-canvas" id="main">
        {/* Stitch Topbar */}
        <Topbar
          view={view}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          loading={loading}
          status={status}
          recentLecturesSearch={recentLecturesSearch}
          setRecentLecturesSearch={setRecentLecturesSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Content Body */}
        <div className="content stitch-content-container">
          {/* VIEW 1: DASHBOARD */}
          {view === "dashboard" && (
            <div className="stitch-dashboard-stack">
              {/* Hero Banner */}
              <section className="stitch-hero">
                <div className="stitch-hero-content">
                  <div className="stitch-hero-badge">
                    <Sparkles size={14} />
                    <span>AI-Powered Study Intelligence</span>
                  </div>
                  <h1 className="stitch-hero-title">
                    Turn Lectures into <span className="gradient-text">Smart Study Notes</span>
                  </h1>
                  <p className="stitch-hero-desc">
                    Upload audio or paste a transcript. NoteFlow transcribes, analyzes, and generates
                    structured notes, key concepts, and active-recall quizzes.
                  </p>
                  <div className="stitch-hero-badges stitch-hero-chips">
                    <span className="stitch-chip stitch-hero-badge">
                      <Volume2 size={13} /> Whisper Audio Transcription
                    </span>
                    <span className="stitch-chip stitch-hero-badge">
                      <Sparkles size={13} /> Gemini AI Synthesis
                    </span>
                    <span className="stitch-chip stitch-hero-badge">
                      <Brain size={13} /> Qdrant RAG Memory
                    </span>
                  </div>
                </div>
              </section>

              {/* Bento Analytics Strip */}
              <BentoMetrics
                totalLecturesCount={totalLecturesCount}
                readyCount={readyCount}
                readyPct={readyPct}
                totalHoursText={totalHoursText}
                stats={stats}
              />

              {/* 9-Stage Processing Stepper Banner */}
              {loading && (
                <ProcessingStepper
                  status={status}
                  stages={PROCESSING_STAGES}
                  getActiveStep={getActiveStep}
                />
              )}

              {/* Ingestion Studio */}
              <WorkspaceStudio
                inputTab={inputTab}
                setInputTab={setInputTab}
                file={file}
                setFile={setFile}
                transcript={transcript}
                setTranscript={setTranscript}
                isDragging={isDragging}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                fileInputRef={fileInputRef}
                loadSample={loadSample}
                error={error}
                setError={setError}
                loading={loading}
                handleGenerate={handleGenerate}
                setNotes={setNotes}
                setStatus={setStatus}
              />

              {/* Notes Preview when generated */}
              {notes && (
                <section className="preview-card">
                  <div className="preview-heading">
                    <div>
                      <span className="preview-kicker">Study Sheet Ready</span>
                      <h2>Interactive Study Sheet</h2>
                      <p>Full structured synthesis, glossary terms, and active recall checks.</p>
                    </div>
                    <div className="preview-actions no-print">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => window.print()}
                        title="Print or Save as PDF"
                      >
                        <FileDown size={16} />
                        <span>Download PDF</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={copyNotesToClipboard}
                        title="Copy as Markdown"
                      >
                        {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={downloadNotes}
                        title="Download text file"
                      >
                        <Download size={16} />
                        <span>.TXT</span>
                      </button>
                      <button
                        type="button"
                        className="stitch-primary-btn"
                        onClick={generateAndOpenQuiz}
                        disabled={quizLoading}
                      >
                        <Brain size={16} />
                        <span>{quizLoading ? "Generating Quiz…" : "Take Quiz"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="stitch-notes-article-wrapper">
                    <NotesArticle
                      notes={notes}
                      sourceLabel={
                        selectedLecture?.audio_filename
                          ? selectedLecture.audio_filename.toLowerCase().endsWith(".mp4")
                            ? "MP4 Lecture"
                            : "Audio Lecture"
                          : file
                            ? file.name.toLowerCase().endsWith(".mp4")
                              ? "MP4 Lecture"
                              : "Audio Lecture"
                            : "Lecture Transcript"
                      }
                      durationSeconds={selectedLecture?.duration_seconds}
                      createdAt={selectedLecture?.created_at}
                    />
                  </div>
                </section>
              )}

              {/* AI Study Tools Grid */}
              <AIToolsGrid
                notes={notes}
                lectures={lectures}
                openSavedNote={openSavedNote}
                generateAndOpenQuiz={generateAndOpenQuiz}
                openStudySheets={openStudySheets}
                openQuizzes={openQuizzes}
                openChatView={openChatView}
                openMyNotes={openMyNotes}
                setView={setView}
                selectedLecture={selectedLecture}
              />

              {/* Recent Lectures Table */}
              <RecentLecturesTable
                lectures={lectures}
                filteredRecentLectures={filteredRecentLectures}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                subjectFilter={subjectFilter}
                setSubjectFilter={setSubjectFilter}
                readyCount={readyCount}
                processingCount={processingCount}
                failedCount={failedCount}
                notesLoading={notesLoading}
                openSavedNote={openSavedNote}
                formatDuration={formatDuration}
                formatDate={formatDate}
                getSubject={getSubject}
                recentLecturesSearch={recentLecturesSearch}
                handleRetryLecture={handleRetryLecture}
              />
            </div>
          )}

          {/* VIEW 2: MY NOTES */}
          {view === "my-notes" && (
            <MyNotesView
              lectures={lectures}
              filteredLectures={filteredLectures}
              notesLoading={notesLoading}
              notesError={notesError}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              libraryNotice={libraryNotice}
              resetWorkspace={resetWorkspace}
              openSavedNote={openSavedNote}
              openMyNotes={openMyNotes}
              handleRetryLecture={handleRetryLecture}
              handleDeleteLecture={deleteSavedNotes}
            />
          )}

          {/* VIEW 3: NOTE READER */}
          {view === "note-reader" && (
            <NoteReaderView
              selectedLecture={selectedLecture}
              readerTitle={readerTitle}
              notes={notes}
              notesLoading={notesLoading}
              notesError={notesError}
              openMyNotes={openMyNotes}
              generateAndOpenQuiz={generateAndOpenQuiz}
              jumpToQuestion={jumpToQuestion}
              copyNotesToClipboard={copyNotesToClipboard}
              downloadNotes={downloadNotes}
              copied={copied}
              quizLoading={quizLoading}
              questionSubmitting={questionSubmitting}
              conversation={conversation}
              historyLoading={historyLoading}
              historyError={historyError}
              question={question}
              setQuestion={setQuestion}
              questionError={questionError}
              setQuestionError={setQuestionError}
              submitQuestion={submitQuestion}
              reloadConversation={reloadConversation}
              questionInputRef={questionInputRef}
              deleteTriggerRef={deleteTriggerRef}
              deleteDialogRef={deleteDialogRef}
              setDeleteDialogOpen={setDeleteDialogOpen}
              deleteError={deleteError}
              setDeleteError={setDeleteError}
              deletingNotes={deletingNotes}
              deleteSavedNotes={deleteSavedNotes}
              openSavedNote={openSavedNote}
              lectures={lectures}
              resetWorkspace={resetWorkspace}
              setView={setView}
              handleRetryLecture={handleRetryLecture}
            />
          )}

          {/* VIEW 3B: DEDICATED CHAT WITH LECTURE (RAG) */}
          {view === "chat" && (
            <ChatView
              lectures={lectures}
              selectedLecture={selectedLecture}
              selectChatLecture={selectChatLecture}
              conversation={conversation}
              historyLoading={historyLoading}
              historyError={historyError}
              question={question}
              setQuestion={setQuestion}
              questionSubmitting={questionSubmitting}
              questionError={questionError}
              setQuestionError={setQuestionError}
              submitQuestion={submitQuestion}
              reloadConversation={reloadConversation}
              questionInputRef={questionInputRef}
              resetWorkspace={resetWorkspace}
              setView={setView}
            />
          )}

          {/* VIEW 4: QUIZ */}
          {view === "quiz" && (
            <QuizView
              quiz={quiz}
              quizLoading={quizLoading}
              quizError={quizError}
              quizSubmitted={quizSubmitted}
              quizQuestions={quizQuestions}
              currentQuizQuestion={currentQuizQuestion}
              quizQuestionIndex={quizQuestionIndex}
              setQuizQuestionIndex={setQuizQuestionIndex}
              quizAnswers={quizAnswers}
              selectQuizAnswer={selectQuizAnswer}
              advanceQuiz={advanceQuiz}
              getQuizScore={getQuizScore}
              generateAndOpenQuiz={generateAndOpenQuiz}
              setView={setView}
              readerTitle={readerTitle}
              quizQuestionHeadingRef={quizQuestionHeadingRef}
              quizResultsHeadingRef={quizResultsHeadingRef}
              lectures={lectures}
              openSavedNote={openSavedNote}
              resetWorkspace={resetWorkspace}
            />
          )}

          {/* VIEW 5: SECURITY & ACCOUNT */}
          {view === "security" && <SecurityPage />}

          {/* VIEW 6: ADMIN PANEL */}
          {view === "admin" && isAdmin && <AdminPanel />}
        </div>
      </main>

      {/* Floating Toast Notification */}
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
