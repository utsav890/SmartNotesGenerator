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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 14px",
            background: "#192237",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "9999px",
            color: "#f8fafc",
            cursor: "pointer",
            fontSize: "13px"
          }}
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
    <div
      className="user-profile-menu-container"
      ref={menuRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        type="button"
        className="user-profile-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 12px 4px 5px",
          height: "36px",
          backgroundColor: "#192237",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "9999px",
          color: "#f8fafc",
          fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: "13.5px",
          fontWeight: 600,
          letterSpacing: "-0.015em",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
          transition: "all 150ms ease"
        }}
      >
        <div
          className="user-avatar-circle"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
            color: "#ffffff",
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: "11px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(99, 102, 241, 0.4)",
            flexShrink: 0
          }}
        >
          <span>{initials}</span>
        </div>
        <span
          className="user-trigger-name"
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
            fontSize: "13.5px",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "#f8fafc",
            maxWidth: "140px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1
          }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: isOpen ? "#818cf8" : "#94a3b8",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease, color 150ms ease",
            flexShrink: 0
          }}
        />
      </button>

      {isOpen && (
        <div
          className="user-dropdown-panel"
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "260px",
            backgroundColor: "#111726",
            background: "rgba(17, 23, 38, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "14px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            padding: "8px",
            zIndex: 99999,
            animation: "slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div
            className="user-dropdown-header"
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 6px" }}
          >
            <div
              className="user-avatar-large"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <span>{initials}</span>
            </div>
            <div className="user-dropdown-info" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <strong
                className="user-dropdown-name"
                style={{
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#f8fafc",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {displayName}
              </strong>
              <span
                className="user-dropdown-email"
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: "12px",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "1px"
                }}
              >
                {user.email}
              </span>
              <div className="user-dropdown-badge-row" style={{ marginTop: "4px" }}>
                {isAdmin && (
                  <span
                    className="user-mini-badge"
                    style={{
                      background: "rgba(168, 85, 247, 0.2)",
                      color: "#c084fc",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      fontWeight: 700,
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}
                  >
                    ADMIN
                  </span>
                )}
                {user.is_verified ? (
                  <span
                    className="user-mini-badge verified"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      marginLeft: isAdmin ? "4px" : 0
                    }}
                  >
                    <Check size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} /> Verified
                  </span>
                ) : (
                  <span
                    className="user-mini-badge unverified clickable"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/verify-email");
                    }}
                    title="Click to verify your email"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginLeft: isAdmin ? "4px" : 0
                    }}
                  >
                    <AlertTriangle size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} /> Verify Email
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "6px 0" }} />

          <div className="user-dropdown-items" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {isAdmin && (
              <button
                type="button"
                className="user-dropdown-item"
                role="menuitem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  background: "rgba(168, 85, 247, 0.12)",
                  border: "1px solid rgba(168, 85, 247, 0.25)",
                  borderRadius: "8px",
                  color: "#c084fc",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "4px"
                }}
                onClick={() => {
                  setIsOpen(false);
                  navigate("/admin");
                }}
              >
                <ShieldAlert size={16} color="#c084fc" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              type="button"
              className="user-dropdown-item"
              role="menuitem"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left"
              }}
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left"
              }}
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left"
              }}
              onClick={() => {
                setIsOpen(false);
                navigate("/settings/security");
              }}
            >
              <Shield size={16} />
              <span>Security & Account</span>
            </button>
          </div>

          <div className="user-dropdown-divider" style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "6px 0" }} />

          <button
            type="button"
            className="user-dropdown-item logout"
            role="menuitem"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left"
            }}
            onClick={handleLogout}
          >
            <LogOut size={16} color="#ef4444" />
            <span style={{ color: "#fca5a5" }}>Sign out</span>
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
