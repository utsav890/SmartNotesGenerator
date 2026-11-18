import React, { useState, useRef, useEffect } from "react";
import { User as UserIcon, Shield, ShieldAlert, LogOut, ChevronDown, Check, AlertTriangle, BookOpen, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

class ProfileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.error("Profile menu error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="user-profile-trigger"
        >
          <span>Account (Reload)</span>
        </button>
      );
    }
    return this.props.children;
  }
}

function UserProfileMenuInner() {
  const { user, logout, isAdmin } = useAuth();
  const { navigate } = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!user) return null;

  const displayName = user.full_name || user.name || user.email?.split("@")[0] || "User";

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SN";

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="user-profile-menu-container" ref={menuRef}>
      <button
        type="button"
        className="user-profile-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="user-avatar-circle">
          <span>{initials}</span>
        </div>
        <span className="user-trigger-name">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`user-chevron ${isOpen ? "open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="user-dropdown-panel" role="menu">
          <div className="user-dropdown-header">
            <div className="user-avatar-large">
              <span>{initials}</span>
            </div>
            <div className="user-dropdown-info">
              <strong className="user-dropdown-name">
                {displayName}
              </strong>
              <span className="user-dropdown-email">
                {user.email}
              </span>
              <div className="user-dropdown-badge-row">
                {isAdmin && (
                  <span className="user-mini-badge admin-badge">
                    ADMIN
                  </span>
                )}
                {user.is_verified ? (
                  <span className="user-mini-badge verified">
                    <Check size={11} /> Verified
                  </span>
                ) : (
                  <span
                    className="user-mini-badge unverified clickable"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/verify-email");
                    }}
                    title="Click to verify your email"
                  >
                    <AlertTriangle size={11} /> Verify Email
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          <div className="user-dropdown-items">
            {isAdmin && (
              <button
                type="button"
                className="user-dropdown-item admin-item"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/admin");
                }}
              >
                <ShieldAlert size={16} />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              type="button"
              className="user-dropdown-item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/dashboard");
              }}
            >
              <LayoutDashboard size={16} />
              <span>Workspace Dashboard</span>
            </button>

            <button
              type="button"
              className="user-dropdown-item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/lectures");
              }}
            >
              <BookOpen size={16} />
              <span>My Lectures & Notes</span>
            </button>

            <button
              type="button"
              className="user-dropdown-item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/settings/security");
              }}
            >
              <Shield size={16} />
              <span>Security & Account</span>
            </button>
          </div>

          <div className="user-dropdown-divider" />

          <button
            type="button"
            className="user-dropdown-item logout"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserProfileMenu() {
  return (
    <ProfileErrorBoundary>
      <UserProfileMenuInner />
    </ProfileErrorBoundary>
  );
}
