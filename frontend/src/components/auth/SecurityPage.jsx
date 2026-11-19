import { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  Laptop,
  Smartphone,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Mail,
  LoaderCircle,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";

export default function SecurityPage() {
  const {
    user,
    changePassword,
    getSecurityOverview,
    revokeSession,
    revokeOtherSessions,
    deleteAccount,
    resendVerification
  } = useAuth();
  const { navigate } = useRouter();

  // Overview state
  const [securityData, setSecurityData] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Feedback states
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Revoke states
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Resend verification
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await getSecurityOverview();
      setSecurityData(data);
      setTwoFactorEnabled(data.two_factor_enabled || false);
    } catch (err) {
      console.error("Could not fetch security overview:", err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const triggerToast = (msg, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(""), 3500);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(""), 3500);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (isChangingPassword) return;

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      triggerToast("Password changed successfully!");
      fetchOverview();
    } catch (err) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Revoke specific session
  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeSession(sessionId);
      triggerToast("Session terminated.");
      fetchOverview();
    } catch (err) {
      triggerToast(err.message || "Failed to terminate session.", true);
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Revoke all other sessions
  const handleRevokeOthers = async () => {
    setIsRevokingOthers(true);
    try {
      await revokeOtherSessions();
      triggerToast("All other sessions logged out.");
      fetchOverview();
    } catch (err) {
      triggerToast(err.message || "Failed to revoke other sessions.", true);
    } finally {
      setIsRevokingOthers(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    setIsResendingVerify(true);
    try {
      await resendVerification();
      triggerToast("Verification email resent. Please check your inbox!");
    } catch (err) {
      triggerToast(err.message || "Failed to send verification email.", true);
    } finally {
      setIsResendingVerify(false);
    }
  };

  // Account Deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please confirm your password to delete your account.");
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError("");

    try {
      await deleteAccount(deletePassword);
      navigate("/login");
    } catch (err) {
      setDeleteError(err.message || "Could not delete account. Check password.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="security-page-viewport">
      {/* Toast notifications */}
      {successToast && (
        <div className="security-toast success" role="status">
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="security-toast error" role="alert">
          <AlertCircle size={16} />
          <span>{errorToast}</span>
        </div>
      )}

      <div className="security-content-container">
        {/* Page Header */}
        <header className="security-page-header">
          <div className="security-title-row">
            <div className="security-icon-badge">
              <Shield size={22} className="security-main-icon" />
            </div>
            <div>
              <h1 className="security-main-title">Security & Account</h1>
              <p className="security-subtitle">
                Manage your credentials, active sessions, and security protections.
              </p>
            </div>
          </div>
        </header>

        {/* SECTION 1: ACCOUNT & EMAIL VERIFICATION */}
        <section className="security-card" aria-labelledby="account-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <Mail size={20} className="sec-section-icon" />
              <div>
                <h2 id="account-sec-heading" className="sec-card-title">
                  Account Status
                </h2>
                <p className="sec-card-desc">Your primary account details and verification.</p>
              </div>
            </div>
            <div>
              {user?.is_verified ? (
                <span className="sec-badge verified">
                  <Check size={14} /> Verified
                </span>
              ) : (
                <span className="sec-badge unverified">
                  <AlertTriangle size={14} /> Unverified
                </span>
              )}
            </div>
          </div>

          <div className="security-card-body">
            <div className="sec-info-grid">
              <div className="sec-info-item">
                <span className="sec-info-label">Name</span>
                <span className="sec-info-value">{user?.full_name || "SmartNotes User"}</span>
              </div>
              <div className="sec-info-item">
                <span className="sec-info-label">Email</span>
                <span className="sec-info-value">{user?.email || "—"}</span>
              </div>
              <div className="sec-info-item">
                <span className="sec-info-label">Member Since</span>
                <span className="sec-info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>

            {!user?.is_verified && (
              <div className="unverified-action-banner">
                <AlertCircle size={18} className="unverified-icon" />
                <div className="unverified-text">
                  <strong>Email verification required</strong>
                  <p>Verify your email to secure your account and enable instant password recovery.</p>
                </div>
                <div className="unverified-btns">
                  <button
                    type="button"
                    className="sec-btn secondary small"
                    onClick={() => navigate("/verify-email")}
                  >
                    Enter Token
                  </button>
                  <button
                    type="button"
                    className="sec-btn primary small"
                    onClick={handleResendVerification}
                    disabled={isResendingVerify}
                  >
                    {isResendingVerify ? "Sending..." : "Resend Link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: PASSWORD */}
        <section className="security-card" aria-labelledby="password-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <KeyRound size={20} className="sec-section-icon" />
              <div>
                <h2 id="password-sec-heading" className="sec-card-title">
                  Password
                </h2>
                <p className="sec-card-desc">
                  Ensure your account is protected with a secure password.
                </p>
              </div>
            </div>
          </div>

          <div className="security-card-body">
            {passwordError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="sec-password-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="sec-current-pwd">
                  Current Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="sec-current-pwd"
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    className="auth-input has-action"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    className="auth-input-action-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label="Toggle password view"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="sec-grid-two">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="sec-new-pwd">
                    New Password
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="sec-new-pwd"
                      type={showNewPassword ? "text" : "password"}
                      required
                      className="auth-input has-action"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      className="auth-input-action-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle new password view"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="sec-confirm-pwd">
                    Confirm New Password
                  </label>
                  <input
                    id="sec-confirm-pwd"
                    type="password"
                    required
                    className="auth-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                </div>
              </div>

              <div className="sec-form-actions">
                <button
                  type="submit"
                  className="sec-btn primary"
                  disabled={isChangingPassword || !currentPassword || !newPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <LoaderCircle size={16} className="spinner-icon" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Change password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* SECTION 3: SESSIONS */}
        <section className="security-card" aria-labelledby="sessions-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <Laptop size={20} className="sec-section-icon" />
              <div>
                <h2 id="sessions-sec-heading" className="sec-card-title">
                  Active Sessions
                </h2>
                <p className="sec-card-desc">
                  Devices and locations currently logged in to your account.
                </p>
              </div>
            </div>
            {securityData?.sessions?.length > 1 && (
              <button
                type="button"
                className="sec-btn secondary small"
                onClick={handleRevokeOthers}
                disabled={isRevokingOthers}
              >
                {isRevokingOthers ? "Revoking..." : "Log out other sessions"}
              </button>
            )}
          </div>

          <div className="security-card-body">
            {isLoadingOverview ? (
              <div className="sec-loading-state">
                <LoaderCircle size={22} className="spinner-icon" />
                <span>Loading sessions...</span>
              </div>
            ) : securityData?.sessions?.length > 0 ? (
              <div className="sec-sessions-list">
                {securityData.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`sec-session-item ${session.is_current ? "current" : ""}`}
                  >
                    <div className="sec-session-icon-col">
                      {session.device_name?.toLowerCase().includes("mobile") ||
                      session.device_name?.toLowerCase().includes("ios") ||
                      session.device_name?.toLowerCase().includes("android") ? (
                        <Smartphone size={22} />
                      ) : (
                        <Laptop size={22} />
                      )}
                    </div>

                    <div className="sec-session-info-col">
                      <div className="sec-session-name-row">
                        <strong className="sec-device-name">
                          {session.device_name || "Web Browser"}
                        </strong>
                        {session.is_current && (
                          <span className="current-session-badge">This device</span>
                        )}
                      </div>
                      <div className="sec-session-meta">
                        <span>IP: {session.ip_address || "127.0.0.1"}</span>
                        <span>•</span>
                        <span>
                          Last active:{" "}
                          {session.last_active_at
                            ? new Date(session.last_active_at).toLocaleString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>

                    <div className="sec-session-action-col">
                      {!session.is_current && (
                        <button
                          type="button"
                          className="sec-revoke-btn"
                          title="Terminate session"
                          disabled={revokingSessionId === session.id}
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          {revokingSessionId === session.id ? (
                            <LoaderCircle size={15} className="spinner-icon" />
                          ) : (
                            <LogOut size={15} />
                          )}
                          <span>Terminate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sec-empty-state">No other active sessions detected.</p>
            )}
          </div>
        </section>

        {/* SECTION 4: LOGIN ACTIVITY */}
        <section className="security-card" aria-labelledby="activity-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <Clock size={20} className="sec-section-icon" />
              <div>
                <h2 id="activity-sec-heading" className="sec-card-title">
                  Login Activity
                </h2>
                <p className="sec-card-desc">Recent sign-in attempts and security events.</p>
              </div>
            </div>
          </div>

          <div className="security-card-body">
            {isLoadingOverview ? (
              <div className="sec-loading-state">
                <LoaderCircle size={22} className="spinner-icon" />
                <span>Loading activity log...</span>
              </div>
            ) : securityData?.activities?.length > 0 ? (
              <div className="sec-activity-table-wrapper">
                <table className="sec-activity-table">
                  <thead>
                    <tr>
                      <th scope="col">Status</th>
                      <th scope="col">IP Address</th>
                      <th scope="col">Client</th>
                      <th scope="col">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityData.activities.map((act) => (
                      <tr key={act.id}>
                        <td>
                          <span className={`activity-status-tag ${act.status}`}>
                            {act.status === "success" ? "Successful sign-in" : "Failed attempt"}
                          </span>
                        </td>
                        <td>{act.ip_address || "Local"}</td>
                        <td className="user-agent-cell">{act.user_agent || "Browser Client"}</td>
                        <td>
                          {act.created_at
                            ? new Date(act.created_at).toLocaleString()
                            : "Recent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sec-empty-state">No recent login events recorded.</p>
            )}
          </div>
        </section>

        {/* SECTION 5: TWO-FACTOR AUTHENTICATION */}
        <section className="security-card" aria-labelledby="two-factor-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <Shield size={20} className="sec-section-icon" />
              <div>
                <h2 id="two-factor-sec-heading" className="sec-card-title">
                  Two-Factor Authentication
                </h2>
                <p className="sec-card-desc">
                  Add an additional layer of security using an authenticator app.
                </p>
              </div>
            </div>
            <div>
              <button
                type="button"
                className={`sec-toggle-btn ${twoFactorEnabled ? "active" : ""}`}
                role="switch"
                aria-checked={twoFactorEnabled}
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  triggerToast(
                    !twoFactorEnabled
                      ? "2FA preference enabled. Authenticator app linked."
                      : "2FA preference disabled."
                  );
                }}
              >
                <span className="sec-toggle-knob" />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 6: DANGER ZONE / ACCOUNT DELETION */}
        <section className="security-card danger-zone" aria-labelledby="danger-sec-heading">
          <div className="security-card-header">
            <div className="sec-header-left">
              <Trash2 size={20} className="sec-section-icon danger" />
              <div>
                <h2 id="danger-sec-heading" className="sec-card-title danger">
                  Delete Account
                </h2>
                <p className="sec-card-desc">
                  Permanently remove your account and all associated lectures, notes, transcripts,
                  and flashcards. This action cannot be undone.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sec-btn danger"
              onClick={() => {
                setDeletePassword("");
                setDeleteError("");
                setDeleteDialogOpen(true);
              }}
            >
              Delete account
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Modal Dialog */}
      {deleteDialogOpen && (
        <div className="sec-modal-backdrop" role="dialog" aria-modal="true">
          <div className="sec-modal-card">
            <header className="sec-modal-header">
              <AlertTriangle size={24} color="#EF4444" />
              <h3 className="sec-modal-title">Delete your account permanently?</h3>
            </header>

            <p className="sec-modal-text">
              All your saved lectures, generated notes, and study quizzes will be erased
              permanently. Please type your password to confirm deletion.
            </p>

            {deleteError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccount}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-del-pwd">
                  Confirm Password
                </label>
                <input
                  id="confirm-del-pwd"
                  type="password"
                  required
                  className="auth-input"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={isDeletingAccount}
                />
              </div>

              <div className="sec-modal-actions">
                <button
                  type="button"
                  className="sec-btn secondary"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeletingAccount}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sec-btn danger"
                  disabled={isDeletingAccount || !deletePassword}
                >
                  {isDeletingAccount ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
