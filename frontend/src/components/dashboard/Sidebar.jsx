import {
  BookOpen,
  LayoutDashboard,
  FileText,
  Brain,
  FileAudio,
  Sparkles,
  MessageCircleQuestion,
  Sun,
  Moon,
  Shield,
  ShieldAlert,
  LogOut
} from "lucide-react";

export default function Sidebar({
  view,
  setView,
  mobileMenuOpen,
  setMobileMenuOpen,
  theme,
  toggleTheme,
  user,
  logout,
  isAdmin,
  resetWorkspace,
  openMyNotes,
}) {
  const handleNav = (targetView, action) => {
    if (action) {
      action();
    } else if (targetView) {
      setView(targetView);
    }
    setMobileMenuOpen(false);
  };

  return (
    <aside
      className={`stitch-sidebar${mobileMenuOpen ? " is-open" : ""}`}
      aria-label="Workspace navigation"
    >
      <div>
        {/* Brand Header */}
        <div className="stitch-brand-container">
          <div className="stitch-brand-logo">
            <BookOpen size={22} color="#ffffff" />
          </div>
          <div className="stitch-brand-info">
            <h2>
              NoteFlow <span className="stitch-brand-tag">AI</span>
            </h2>
            <p>Smart Lecture Synthesizer</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="stitch-nav-group">
          <div className="stitch-nav-section-title">Workspace</div>
          <button
            type="button"
            className={`stitch-nav-item${view === "dashboard" ? " active" : ""}`}
            onClick={() => handleNav("dashboard", resetWorkspace)}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`stitch-nav-item${view === "my-notes" ? " active" : ""}`}
            onClick={() => handleNav("my-notes", openMyNotes)}
          >
            <FileText size={18} />
            <span>My Notes</span>
          </button>
          <button
            type="button"
            className={`stitch-nav-item${view === "note-reader" ? " active" : ""}`}
            onClick={() => handleNav("note-reader")}
          >
            <FileText size={18} />
            <span>Study Sheets</span>
          </button>
          <button
            type="button"
            className={`stitch-nav-item${view === "quiz" ? " active" : ""}`}
            onClick={() => handleNav("quiz")}
          >
            <Brain size={18} />
            <span>Quizzes</span>
          </button>

          <div className="stitch-nav-section-title">AI Study Tools</div>
          <button
            type="button"
            className="stitch-nav-item"
            onClick={() => handleNav("dashboard", resetWorkspace)}
          >
            <FileAudio size={18} />
            <span>Transcribe Audio</span>
          </button>
          <button
            type="button"
            className="stitch-nav-item"
            onClick={() => handleNav("dashboard", resetWorkspace)}
          >
            <Sparkles size={18} />
            <span>Generate Notes</span>
          </button>
          <button
            type="button"
            className="stitch-nav-item"
            onClick={() => {
              if (view === "note-reader") {
                const el = document.getElementById("lecture-question");
                if (el) el.focus();
              } else {
                handleNav("my-notes", openMyNotes);
              }
            }}
          >
            <MessageCircleQuestion size={18} />
            <span>Chat with Lecture</span>
          </button>

          <div className="stitch-nav-section-title">System</div>
          <button
            type="button"
            className="stitch-nav-item"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            type="button"
            className={`stitch-nav-item${view === "security" ? " active" : ""}`}
            onClick={() => handleNav("security")}
          >
            <Shield size={18} />
            <span>Security &amp; Account</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`stitch-nav-item${view === "admin" ? " active" : ""}`}
              onClick={() => handleNav("admin")}
            >
              <ShieldAlert size={18} color="var(--stitch-primary)" />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="stitch-sidebar-footer">
        {/* User Profile Row */}
        <div className="stitch-user-profile-row">
          <div className="stitch-avatar-circle">
            {(
              (user?.full_name || user?.name || user?.email || "U")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2) || "U"
            ).toUpperCase()}
          </div>
          <div className="stitch-user-info-text">
            <span className="user-name">{user?.full_name || user?.name || "Student"}</span>
            <span className="user-email">{user?.email || "student@noteflow.ai"}</span>
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
  );
}
