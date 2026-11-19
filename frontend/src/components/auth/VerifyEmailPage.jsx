import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

export default function VerifyEmailPage() {
  const { user, verifyEmail, resendVerification, refreshUser } = useAuth();
  const { navigate, searchParams } = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const urlToken = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerification = async (tokenToVerify) => {
    const cleanToken = (tokenToVerify || tokenInput).trim();
    if (!cleanToken) {
      setErrorMessage("Please enter the verification code or token.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const res = await verifyEmail(cleanToken);
      setIsSuccess(true);
      setStatusMessage(res.message || "Your email address has been verified successfully.");
      await refreshUser();
    } catch (err) {
      setErrorMessage(err.message || "Invalid or expired verification token.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (urlToken && !isSuccess && !isVerifying) {
      handleVerification(urlToken);
    }
  }, [urlToken]);

  const handleResend = async () => {
    setIsResending(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const res = await resendVerification(user?.email);
      setStatusMessage(res.message || "A new verification link has been sent to your email.");
      // In dev mode, if backend returned token, populate it for instant testing
      if (res.verification_token) {
        setTokenInput(res.verification_token);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to resend verification email.");
    } finally {
      setIsResending(false);
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
          className="auth-card verify-card"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Header Icon */}
          <div className="verify-icon-wrapper">
            {isSuccess ? (
              <CheckCircle2 size={44} className="verify-icon success" />
            ) : (
              <Mail size={40} className="verify-icon" />
            )}
          </div>

          <header className="auth-card-header text-center">
            <h1 className="auth-card-title">
              {isSuccess ? "Email verified" : "Verify your email"}
            </h1>
            <p className="auth-card-subtitle">
              {isSuccess
                ? "Your email has been confirmed. You now have full access to SmartNotes AI."
                : `We sent a verification link to ${user?.email ? user.email : "your email address"}. Please check your inbox to confirm your account.`}
            </p>
          </header>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="auth-success-banner" role="status">
              <CheckCircle2 size={18} className="auth-success-icon" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* If verified successfully, give direct CTA to dashboard */}
          {isSuccess ? (
            <div className="verify-success-actions">
              <motion.button
                type="button"
                className="auth-submit-btn"
                onClick={() => navigate("/dashboard")}
                whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
              >
                <span>Continue to Dashboard</span>
                <ArrowRight size={17} aria-hidden="true" />
              </motion.button>
            </div>
          ) : (
            <>
              {/* Token validation form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerification();
                }}
                className="auth-form"
              >
                <div className="auth-field">
                  <label htmlFor="verify-token" className="auth-label">
                    Verification Code / Token
                  </label>
                  <input
                    id="verify-token"
                    type="text"
                    className="auth-input"
                    placeholder="Paste your verification token"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    disabled={isVerifying}
                  />
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isVerifying || !tokenInput.trim()}
                  whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                >
                  {isVerifying ? (
                    <>
                      <LoaderCircle className="spinner-icon" size={18} aria-hidden="true" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Verification</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Action Buttons */}
              <div className="verify-actions-row">
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  <RefreshCw
                    size={16}
                    className={isResending ? "spinner-icon" : ""}
                    aria-hidden="true"
                  />
                  <span>Resend verification email</span>
                </button>

                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={() => navigate("/register")}
                >
                  <span>Change email</span>
                </button>
              </div>
            </>
          )}

          <footer className="auth-card-footer">
            <p className="auth-switch-text">
              Want to do this later?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </button>
            </p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
