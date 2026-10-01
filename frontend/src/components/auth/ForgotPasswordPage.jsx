import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { navigate } = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await forgotPassword(email);
      setIsSubmitted(true);
      if (res.reset_token) {
        setDevResetToken(res.reset_token);
      }
    } catch {
      // Regardless of failure, always show generic message to avoid leaking user existence
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-ambient-bg" aria-hidden="true">
        <div className="auth-ambient-glow" />
        <div className="auth-grid-pattern" />
      </div>

      <main className="auth-container" id="main-content">
        <motion.div
          className="auth-card"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="verify-icon-wrapper">
            <KeyRound size={36} className="verify-icon" />
          </div>

          <header className="auth-card-header text-center">
            <h1 className="auth-card-title">Forgot your password?</h1>
            <p className="auth-card-subtitle">
              Enter your email and we&apos;ll send you instructions to reset your password.
            </p>
          </header>

          {isSubmitted ? (
            <div className="forgot-submitted-box">
              <div className="auth-success-banner" role="status">
                <CheckCircle2 size={18} className="auth-success-icon" aria-hidden="true" />
                <span>
                  If an account exists for this email, you&apos;ll receive a password reset link.
                </span>
              </div>

              {/* Dev mode helper */}
              {devResetToken && (
                <div className="dev-token-notice">
                  <p className="dev-token-title">Local Development Link:</p>
                  <button
                    type="button"
                    className="auth-secondary-btn dev-reset-cta"
                    onClick={() =>
                      navigate(`/reset-password?token=${encodeURIComponent(devResetToken)}`)
                    }
                  >
                    <span>Proceed with Reset Token</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}

              <div style={{ marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="auth-secondary-btn full-width"
                  onClick={() => setIsSubmitted(false)}
                >
                  <span>Try another email</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {errorMessage && (
                <div className="auth-error-banner" role="alert">
                  <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="forgot-email" className="auth-label">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="auth-input"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

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
                    <span>Sending instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </motion.button>
            </form>
          )}

          <footer className="auth-card-footer">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to sign in</span>
            </button>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
