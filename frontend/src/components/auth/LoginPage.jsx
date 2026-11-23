import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Eye, EyeOff, AlertCircle, ArrowRight, LoaderCircle, BookOpen, Shield, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { navigate, searchParams } = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);

  // Open-Redirect Protection: strictly sanitize redirect destination
  const rawRedirect = searchParams.get("redirect");
  const sanitizeRedirect = (target) => {
    if (!target || typeof target !== "string") return "/dashboard";
    const trimmed = target.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
      return "/dashboard";
    }
    if (trimmed === "/login" || trimmed === "/register") {
      return "/dashboard";
    }
    return trimmed;
  };
  const redirectTarget = sanitizeRedirect(rawRedirect);

  const handlePasswordKey = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  const handleFieldChange = (setter, val) => {
    setter(val);
    setSelectedDemo(null);
    if (errorMessage) setErrorMessage("");
  };

  const handleDemoSelect = (role) => {
    if (role === "student") {
      setEmail("regular.student@university.edu");
      setPassword("Std#P@ssword2026!");
      setSelectedDemo("student");
    } else if (role === "admin") {
      setEmail("admin.super@smartnotes.ai");
      setPassword("Admin#P@ssword2026!");
      setSelectedDemo("admin");
    }
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login(trimmedEmail, password);
      navigate(redirectTarget);
    } catch (err) {
      const msg = err?.message || "";
      if (
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror") ||
        msg.toLowerCase().includes("connection refused")
      ) {
        setErrorMessage(
          "Cannot connect to the backend server. Please verify backend service availability."
        );
      } else {
        setErrorMessage(msg || "Email or password is incorrect.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const shakeAnimation = shouldReduceMotion
    ? {}
    : {
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.4 }
      };

  return (
    <div className="auth-viewport">
      {/* Subtle atmospheric background */}
      <div className="auth-ambient-bg" aria-hidden="true">
        <div className="auth-ambient-glow" />
        <div className="auth-grid-pattern" />
      </div>

      <main className="auth-container" id="main-content">
        {/* Brand Header */}
        <motion.div
          className="auth-brand-header"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="auth-brand-logo">
            <div className="auth-logo-badge">
              <Sparkles size={20} className="auth-logo-icon" />
            </div>
            <h1 className="auth-brand-name">SmartNotes AI</h1>
          </div>
          <p className="auth-brand-tagline">Turn lectures into knowledge.</p>
        </motion.div>

        {/* Card Form */}
        <motion.div
          className="auth-card"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
        >
          <header className="auth-card-header">
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-subtitle">
              Sign in to access your lecture notes, summaries, and flashcards.
            </p>
          </header>

          {/* Error Message with Shake & Guidance */}
          {errorMessage && (
            <motion.div
              id="auth-error-desc"
              className="auth-error-banner"
              role="alert"
              aria-live="polite"
              animate={shakeAnimation}
            >
              <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
              <div className="auth-error-content">
                <span className="auth-error-title">{errorMessage}</span>
                {errorMessage.toLowerCase().includes("incorrect") && (
                  <span className="auth-error-hint">
                    Check your password or click one of the demo buttons below for one-click credentials.
                  </span>
                )}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email Field */}
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck="false"
                autoComplete="email"
                required
                className="auth-input"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                disabled={isSubmitting}
                aria-describedby={errorMessage ? "auth-error-desc" : undefined}
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => navigate("/forgot-password")}
                  tabIndex={0}
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  className="auth-input has-action"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handleFieldChange(setPassword, e.target.value)}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Caps Lock Indicator */}
              {capsLockActive && (
                <div className="auth-caps-warning" role="status" aria-live="polite">
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>

            {/* Enhanced Quick Demo Fill */}
            <div className="auth-quick-fill">
              <span className="auth-quick-fill-label">Instant Demo:</span>
              <button
                type="button"
                className={`auth-quick-fill-btn ${selectedDemo === "student" ? "active" : ""}`}
                onClick={() => handleDemoSelect("student")}
                title="Fill regular student credentials"
              >
                <BookOpen size={13} aria-hidden="true" />
                <span>Student</span>
                {selectedDemo === "student" && <Check size={12} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className={`auth-quick-fill-btn ${selectedDemo === "admin" ? "active" : ""}`}
                onClick={() => handleDemoSelect("admin")}
                title="Fill platform administrator credentials"
              >
                <Shield size={13} aria-hidden="true" />
                <span>Admin</span>
                {selectedDemo === "admin" && <Check size={12} aria-hidden="true" />}
              </button>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
              whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="spinner-icon" size={18} aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={17} className="arrow-icon" aria-hidden="true" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer Navigation */}
          <footer className="auth-card-footer">
            <p className="auth-switch-text">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() =>
                  navigate(
                    redirectTarget !== "/dashboard"
                      ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
                      : "/register"
                  )
                }
              >
                Sign up
              </button>
            </p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
