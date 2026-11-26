import { Menu, X, Search, Bell } from "lucide-react";
import UserProfileMenu from "../auth/UserProfileMenu";

export default function Topbar({
  view,
  mobileMenuOpen,
  setMobileMenuOpen,
  loading,
  status,
  recentLecturesSearch,
  setRecentLecturesSearch,
  searchQuery,
  setSearchQuery,
}) {
  const showSearch = view === "dashboard" || view === "my-notes";
  const searchValue = view === "my-notes" ? searchQuery : recentLecturesSearch;
  const setSearchValue = view === "my-notes" ? setSearchQuery : setRecentLecturesSearch;
  const searchPlaceholder =
    view === "my-notes" ? "Search saved lectures..." : "Search recent lectures...";

  return (
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
              : view === "chat"
              ? "Chat with Lecture"
              : view === "quiz"
              ? "Lecture Quiz"
              : view === "security"
              ? "Security & Account"
              : view === "admin"
              ? "Admin Command Center"
              : "Study Sheets"}
          </span>
        </div>
      </div>

      {showSearch && (
        <div className="stitch-search-container">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue || ""}
            onChange={(e) => setSearchValue?.(e.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div className="stitch-topbar-right">
        <span
          className={`stitch-pipeline-chip${loading ? " is-active" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="dot" aria-hidden="true" />
          {loading ? status || "AI Synthesis Active" : "System Ready"}
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
  );
}
