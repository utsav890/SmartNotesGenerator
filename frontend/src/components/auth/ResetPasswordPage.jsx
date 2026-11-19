import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, LoaderCircle, Check, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

function calculatePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };

  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>\-_=+/\\~`[\]]/.test(pwd)
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  if (passedCount <= 2) {
    return { score: 1, label: "Weak", color: "#EF4444", checks };
  } else if (passedCount === 3) {
    return { score: 2, label: "Fair", color: "#F59E0B", checks };
  } else if (passedCount === 4) {
    return { score: 3, label: "Good", color: "#3B82F6", checks };
  } else {
    return { score: 4, label: "Strong", color: "#10B981", checks };
  }
}

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const { navigate, searchParams } = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!token.trim()) {
      setErrorMessage("Reset token is missing. Please check your reset link.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (strength.score < 4) {
      setErrorMessage("Please meet all password security requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await resetPassword(token.trim(), password, confirmPassword);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || "Failed to reset password. Link may have expired.");
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
            <ShieldCheck size={38} className={isSuccess ? "verify-icon success" : "verify-icon"} />
          </div>

          <header className="auth-card-header text-center">
            <h1 className="auth-card-title">
              {isSuccess ? "Password updated" : "Create new password"}
            </h1>
            <p className="auth-card-subtitle">
              {isSuccess
                ? "Your password has been updated. You can now sign in with your new credentials."
                : "Choose a strong, secure password for your SmartNotes AI account."}
            </p>
          </header>

          {isSuccess ? (
            <div className="verify-success-actions">
              <motion.button
                type="button"
                className="auth-submit-btn"
                onClick={() => navigate("/login")}
                whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
              >
                <span>Sign in</span>
                <ArrowRight size={17} aria-hidden="true" />
              </motion.button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {errorMessage && (
                <div className="auth-error-banner" role="alert">
                  <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Show token input if not present in URL */}
              {!tokenParam && (
                <div className="auth-field">
                  <label htmlFor="reset-token" className="auth-label">
                    Reset Token
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    required
                    className="auth-input"
                    placeholder="Paste reset token from email"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="new-password" className="auth-label">
                  New Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    name="new_password"
                    autoComplete="new-password"
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
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength & requirements */}
                {password && (
                  <div className="auth-strength-container">
                    <div className="auth-strength-header">
                      <span className="auth-strength-title">Password strength:</span>
                      <span
                        className="auth-strength-badge"
                        style={{ color: strength.color, fontWeight: 600 }}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="auth-strength-bars">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="auth-strength-bar"
                          style={{
                            backgroundColor:
                              strength.score >= level ? strength.color : "rgba(255, 255, 255, 0.1)"
                          }}
                        />
                      ))}
                    </div>

                    <ul className="auth-requirements-list">
                      <li className={strength.checks?.length ? "met" : "unmet"}>
                        {strength.checks?.length ? <Check size={13} /> : <X size={13} />}
                        At least 8 characters
                      </li>
                      <li className={strength.checks?.upper ? "met" : "unmet"}>
                        {strength.checks?.upper ? <Check size={13} /> : <X size={13} />}
                        Uppercase letter
                      </li>
                      <li className={strength.checks?.lower ? "met" : "unmet"}>
                        {strength.checks?.lower ? <Check size={13} /> : <X size={13} />}
                        Lowercase letter
                      </li>
                      <li className={strength.checks?.number ? "met" : "unmet"}>
                        {strength.checks?.number ? <Check size={13} /> : <X size={13} />}
                        Number
                      </li>
                      <li className={strength.checks?.special ? "met" : "unmet"}>
                        {strength.checks?.special ? <Check size={13} /> : <X size={13} />}
                        Special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-new-password" className="auth-label">
                  Confirm New Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    autoComplete="new-password"
                    required
                    className="auth-input has-action"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-input-action-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Update password</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </motion.button>
            </form>
          )}

          <footer className="auth-card-footer">
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate("/login")}
            >
              Back to sign in
            </button>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
