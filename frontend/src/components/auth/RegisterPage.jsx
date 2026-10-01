import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, LoaderCircle, Check, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

function calculatePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };

  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>\-_=+/\\~`\[\]]/.test(pwd)
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  if (passedCount <= 2) {
    return { score: 1, label: "Weak", color: "var(--strength-weak, #EF4444)", checks };
  } else if (passedCount === 3) {
    return { score: 2, label: "Fair", color: "var(--strength-fair, #F59E0B)", checks };
  } else if (passedCount === 4) {
    return { score: 3, label: "Good", color: "var(--strength-good, #3B82F6)", checks };
  } else {
    return { score: 4, label: "Strong", color: "var(--strength-strong, #10B981)", checks };
  }
}

export default function RegisterPage() {
  const { register } = useAuth();
  const { navigate, searchParams } = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (strength.score < 4) {
      setErrorMessage("Please fulfill all password requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await register(fullName, email, password, confirmPassword);
      setSuccessMessage("Account created successfully.");

      // If backend returned a verification token in dev mode, pass it via URL
      const verifyUrl = res.verification_token
        ? `/verify-email?token=${encodeURIComponent(res.verification_token)}`
        : "/verify-email";

      setTimeout(() => {
        navigate(verifyUrl);
      }, 1100);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create account. Please try again.");
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
      <div className="auth-ambient-bg" aria-hidden="true">
        <div className="auth-ambient-glow" />
        <div className="auth-grid-pattern" />
      </div>

      <main className="auth-container" id="main-content">
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
          <p className="auth-brand-tagline">Create your research & lecture workspace.</p>
        </motion.div>

        <motion.div
          className="auth-card"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
        >
          <header className="auth-card-header">
            <h2 className="auth-card-title">Create your account</h2>
            <p className="auth-card-subtitle">
              Start transforming speech and lectures into structured study guides.
            </p>
          </header>

          {errorMessage && (
            <motion.div
              className="auth-error-banner"
              role="alert"
              aria-live="polite"
              animate={shakeAnimation}
            >
              <AlertCircle size={18} className="auth-error-icon" aria-hidden="true" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              className="auth-success-banner"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={18} className="auth-success-icon" aria-hidden="true" />
              <span>{successMessage} Redirecting to verification...</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Full Name Field */}
            <div className="auth-field">
              <label htmlFor="reg-name" className="auth-label">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                name="name"
                autoComplete="name"
                required
                className="auth-input"
                placeholder="Ada Lovelace"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field */}
            <div className="auth-field">
              <label htmlFor="reg-email" className="auth-label">
                Email
              </label>
              <input
                id="reg-email"
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

            {/* Password Field */}
            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
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

              {/* Password Strength Meter */}
              {password && (
                <div className="auth-strength-container" aria-live="polite">
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

                  {/* Requirements List */}
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

            {/* Confirm Password Field */}
            <div className="auth-field">
              <label htmlFor="reg-confirm-password" className="auth-label">
                Confirm Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="reg-confirm-password"
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </motion.button>
          </form>

          <footer className="auth-card-footer">
            <p className="auth-switch-text">
              Already have an account?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            </p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
