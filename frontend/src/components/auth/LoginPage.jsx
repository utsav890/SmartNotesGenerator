import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Eye, EyeOff, AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
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

  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
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
      await login(email, password);
      // Successful login -> navigate to intended destination
      navigate(redirectTarget);
    } catch (err) {
      setErrorMessage(err.message || "Email or password is incorrect.");
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

          {/* Error Message with Shake */}
          {errorMessage && (
            <motion.div
              id="auth-error-desc"
              className="auth-error-banner"
              role="alert"
              aria-live="polite"
              animate={shakeAnimation}
            >
              <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
              <span>{errorMessage}</span>
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
                autoComplete="email"
                required
                className="auth-input"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
