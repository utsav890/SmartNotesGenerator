import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  BookOpen,
  Activity,
  CheckCircle2,
  XCircle,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  Search,
  RefreshCw,
  AlertTriangle,
  Mail,
  Calendar,
  Lock,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";
import "../../Admin.css";

export default function AdminPanel() {
  const {
    user: currentUser,
    isAdmin,
    getAdminOverview,
    getAdminUsers,
    updateUserRole,
    updateUserStatus,
    deleteAdminUser,
    deleteAdminUserByEmail,
    getAdminLectures,
    deleteAdminLecture,
    getAdminAuditLogs,
    promoteUserByEmail
  } = useAuth();
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState("overview"); // overview | users | lectures | logs
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "info" });

  // Overview state
  const [overview, setOverview] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Lectures state
  const [lectures, setLectures] = useState([]);
  const [lectureSearch, setLectureSearch] = useState("");

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("all");

  // Quick promote state
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoting, setPromoting] = useState(false);

  // Quick remove state
  const [deleteEmail, setDeleteEmail] = useState("");

  // Delete modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "", // 'user' | 'user-email' | 'lecture'
    id: null,
    title: ""
  });

  const showToast = (text, type = "info") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: "", type: "info" }), 4000);
  };

  // Fetch overview data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await getAdminOverview();
      setOverview(data);
    } catch (err) {
      showToast(err.message || "Failed to load admin overview.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch users list
  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userSearch.trim()) params.search = userSearch.trim();
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const data = await getAdminUsers(params);
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message || "Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch lectures list
  const loadLectures = async () => {
    try {
      setLoading(true);
      const params = {};
      if (lectureSearch.trim()) params.search = lectureSearch.trim();

      const data = await getAdminLectures(params);
      setLectures(data.lectures || []);
    } catch (err) {
      showToast(err.message || "Failed to load lectures.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit logs
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (logFilter !== "all") params.status = logFilter;

      const data = await getAdminAuditLogs(params);
      setAuditLogs(data.logs || []);
    } catch (err) {
      showToast(err.message || "Failed to load audit logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reload current tab content
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "overview") loadOverview();
    else if (activeTab === "users") loadUsers();
    else if (activeTab === "lectures") loadLectures();
    else if (activeTab === "logs") loadAuditLogs();
  }, [activeTab, isAdmin]);

  // Handle Promote by Email
  const handlePromoteEmail = async (e) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;

    try {
      setPromoting(true);
      const res = await promoteUserByEmail(promoteEmail);
      showToast(res.message || "Admin access granted!", "success");
      setPromoteEmail("");
      loadOverview();
    } catch (err) {
      showToast(err.message || "Promotion failed.", "error");
    } finally {
      setPromoting(false);
    }
  };

  // Toggle user role
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(targetUser.id, newRole);
      showToast(`User role updated to ${newRole}.`, "success");
      loadUsers();
    } catch (err) {
      showToast(err.message || "Failed to update role.", "error");
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (targetUser) => {
    const newStatus = !targetUser.is_active;
    try {
      await updateUserStatus(targetUser.id, { is_active: newStatus });
      showToast(`User ${newStatus ? "reactivated" : "deactivated"}.`, "success");
      loadUsers();
    } catch (err) {
      showToast(err.message || "Failed to update status.", "error");
    }
  };

  // Toggle user verification
  const handleToggleVerification = async (targetUser) => {
    const newVerification = !targetUser.is_verified;
    try {
      await updateUserStatus(targetUser.id, { is_verified: newVerification });
      showToast(`User marked as ${newVerification ? "verified" : "unverified"}.`, "success");
      loadUsers();
    } catch (err) {
      showToast(err.message || "Failed to update verification.", "error");
    }
  };

  // Quick Remove by email submit handler
  const handleQuickDeleteEmail = (e) => {
    e.preventDefault();
    const clean = deleteEmail.trim();
    if (!clean) return;
    setConfirmModal({
      isOpen: true,
      type: "user-email",
      id: clean,
      title: clean
    });
  };

  // Confirm delete execution
  const executeDelete = async () => {
    const { type, id } = confirmModal;
    setConfirmModal({ isOpen: false, type: "", id: null, title: "" });

    try {
      if (type === "user") {
        await deleteAdminUser(id);
        showToast("User account and associated lectures deleted successfully.", "success");
        loadUsers();
        if (activeTab === "overview") loadOverview();
      } else if (type === "user-email") {
        await deleteAdminUserByEmail(id);
        showToast(`User account '${id}' permanently removed.`, "success");
        setDeleteEmail("");
        if (activeTab === "overview") loadOverview();
        if (activeTab === "users") loadUsers();
      } else if (type === "lecture") {
        await deleteAdminLecture(id);
        showToast("Lecture deleted successfully.", "success");
        loadLectures();
      }
    } catch (err) {
      showToast(err.message || "Deletion failed.", "error");
    }
  };

  // Non-admin fallback view
  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <div style={{ color: "#ef4444", marginBottom: "1rem" }}>
            <Lock size={48} style={{ margin: "0 auto" }} />
          </div>
          <h2 style={{ color: "#f8fafc", margin: "0 0 0.5rem 0" }}>Administrator Access Required</h2>
          <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 auto 1.5rem auto" }}>
            You do not have administrative permissions to view or manage the SmartNotes AI Command Center.
          </p>
          <div>
            <button
              type="button"
              className="admin-btn-primary"
              style={{ margin: "0 auto" }}
              onClick={() => navigate("/dashboard")}
            >
              Return to Workspace <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-title-area">
          <h1>
            <ShieldAlert size={28} color="#818cf8" />
            Admin Command Center
            <span className="admin-badge">Admin Mode</span>
          </h1>
          <p className="admin-subtitle">
            System health, user governance, lecture moderation, and platform security.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => {
            if (activeTab === "overview") loadOverview();
            else if (activeTab === "users") loadUsers();
            else if (activeTab === "lectures") loadLectures();
            else if (activeTab === "logs") loadAuditLogs();
          }}
          disabled={loading}
          title="Refresh current data"
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
        </button>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs" aria-label="Admin Sections">
        <button
          type="button"
          className={`admin-tab${activeTab === "overview" ? " active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={17} /> Overview
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === "users" ? " active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={17} /> User Governance {overview?.stats?.total_users ? `(${overview.stats.total_users})` : ""}
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === "lectures" ? " active" : ""}`}
          onClick={() => setActiveTab("lectures")}
        >
          <BookOpen size={17} /> Lectures Oversight {overview?.stats?.total_lectures ? `(${overview.stats.total_lectures})` : ""}
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === "logs" ? " active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <ShieldAlert size={17} /> Security & Audit Logs
        </button>
      </nav>

      {/* Feedback banner */}
      {feedback.text && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: feedback.type === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${feedback.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            color: feedback.type === "error" ? "#fca5a5" : "#6ee7b7",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem"
          }}
        >
          {feedback.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ====================================================================
          TAB 1: OVERVIEW
          ==================================================================== */}
      {activeTab === "overview" && (
        <>
          {/* KPI Stat Cards */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Total Users</span>
                <span className="kpi-icon"><Users size={18} /></span>
              </div>
              <div className="kpi-value">{overview?.stats?.total_users ?? "—"}</div>
              <p className="kpi-subtext">{overview?.stats?.verified_users ?? 0} verified accounts</p>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Total Lectures</span>
                <span className="kpi-icon"><BookOpen size={18} /></span>
              </div>
              <div className="kpi-value">{overview?.stats?.total_lectures ?? "—"}</div>
              <p className="kpi-subtext">{overview?.stats?.total_notes ?? 0} notes synthesized</p>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Active Sessions</span>
                <span className="kpi-icon"><Activity size={18} /></span>
              </div>
              <div className="kpi-value">{overview?.stats?.active_sessions ?? "—"}</div>
              <p className="kpi-subtext">Online active browser sessions</p>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Admins</span>
                <span className="kpi-icon"><Crown size={18} /></span>
              </div>
              <div className="kpi-value">{overview?.stats?.total_admins ?? "—"}</div>
              <p className="kpi-subtext">Platform administrators</p>
            </div>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="admin-grid-two">
            {/* Quick Promote Card */}
            <div className="admin-card">
              <h3 className="admin-card-title">
                <Crown size={18} color="#c084fc" /> Quick Grant Admin Access
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.86rem", margin: 0, lineHeight: 1.5 }}>
                Instantly grant full administrator privileges to any registered user account by their email address.
              </p>
              <form className="promote-form" onSubmit={handlePromoteEmail}>
                <input
                  type="email"
                  placeholder="Enter email to grant admin..."
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  className="promote-input"
                  required
                />
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={promoting || !promoteEmail.trim()}
                >
                  <Crown size={15} />
                  <span>{promoting ? "Granting..." : "Promote to Admin"}</span>
                </button>
              </form>
            </div>

            {/* Quick Remove User Card */}
            <div className="admin-card danger-card">
              <h3 className="admin-card-title" style={{ color: "#f87171" }}>
                <UserX size={18} color="#ef4444" /> Quick Remove User Account
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.86rem", margin: 0, lineHeight: 1.5 }}>
                Permanently delete any registered user and cascade-remove all their lectures, notes, transcripts, and sessions.
              </p>
              <form className="promote-form" onSubmit={handleQuickDeleteEmail}>
                <input
                  type="email"
                  placeholder="Enter user email to remove permanently..."
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  className="promote-input danger-input"
                  required
                />
                <button
                  type="submit"
                  className="admin-btn-danger-submit"
                  disabled={!deleteEmail.trim()}
                >
                  <Trash2 size={15} />
                  <span>Remove User</span>
                </button>
              </form>
            </div>
          </div>

          {/* Recent Registrations Table */}
          <div className="admin-card">
            <h3 className="admin-card-title">
              <Users size={18} color="#818cf8" /> Recent User Registrations
            </h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.recent_users?.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <span className="user-cell-name">
                            {u.full_name} {u.id === currentUser?.id ? "(You)" : ""}
                          </span>
                          <span className="user-cell-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-pill ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.is_active ? "active" : "inactive"}`}>
                          {u.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td style={{ color: "#94a3b8" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ color: "#94a3b8" }}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="admin-btn-table-danger"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: "user",
                                id: u.id,
                                title: `${u.full_name} (${u.email})`
                              })
                            }
                            title="Permanently remove user"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!overview?.recent_users || overview.recent_users.length === 0) && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                        No user registrations recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          TAB 2: USER GOVERNANCE
          ==================================================================== */}
      {activeTab === "users" && (
        <div className="admin-card">
          <div className="admin-filter-bar">
            <div className="admin-search-wrapper">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              />
            </div>

            <div className="admin-filter-selects">
              <select
                className="admin-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins only</option>
                <option value="user">Regular Users</option>
              </select>

              <select
                className="admin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="inactive">Deactivated</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>

              <button
                type="button"
                className="admin-btn-secondary"
                onClick={loadUsers}
              >
                Apply Filter
              </button>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Lectures</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell-name">
                          {u.full_name} {u.id === currentUser?.id ? "(You)" : ""}
                        </span>
                        <span className="user-cell-email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`role-pill ${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${u.is_active ? "active" : "inactive"}`}>
                        {u.is_active ? "Active" : "Banned"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${u.is_verified ? "verified" : "pending"}`}>
                        {u.is_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>{u.lectures_count ?? 0}</td>
                    <td style={{ color: "#94a3b8" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {/* Role toggle */}
                        <button
                          type="button"
                          className="admin-icon-btn promote"
                          onClick={() => handleToggleRole(u)}
                          title={u.role === "admin" ? "Demote to regular user" : "Promote to Admin"}
                          disabled={u.id === currentUser?.id}
                        >
                          <Crown size={14} />
                        </button>

                        {/* Status toggle */}
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active ? "Deactivate / ban user" : "Reactivate user"}
                          disabled={u.id === currentUser?.id}
                        >
                          {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>

                        {/* Verification toggle */}
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => handleToggleVerification(u)}
                          title={u.is_verified ? "Mark unverified" : "Mark verified"}
                        >
                          <CheckCircle2 size={14} />
                        </button>

                        {/* Delete user */}
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="admin-btn-table-danger"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: "user",
                                id: u.id,
                                title: `${u.full_name} (${u.email})`
                              })
                            }
                            title="Permanently delete user and cascade lectures"
                          >
                            <Trash2 size={13} />
                            <span>Remove User</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7">
                      <div className="admin-empty-state">
                        <Users size={36} style={{ margin: "0 auto", opacity: 0.4 }} />
                        <h3>No users matched your filter criteria</h3>
                        <p>Try modifying your search query or reset status filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: LECTURES OVERSIGHT
          ==================================================================== */}
      {activeTab === "lectures" && (
        <div className="admin-card">
          <div className="admin-filter-bar">
            <div className="admin-search-wrapper">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search lectures by title or author email..."
                value={lectureSearch}
                onChange={(e) => setLectureSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadLectures()}
              />
            </div>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={loadLectures}
            >
              Search
            </button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Lecture Title</th>
                  <th>Author</th>
                  <th>Audio Path</th>
                  <th>Notes</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lectures.map((l) => (
                  <tr key={l.id}>
                    <td>#{l.id}</td>
                    <td style={{ fontWeight: 600, color: "#f8fafc" }}>{l.title}</td>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell-name">{l.author_name}</span>
                        <span className="user-cell-email">{l.author_email}</span>
                      </div>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.audio_path || "Transcript Only"}
                    </td>
                    <td>
                      <span className={`status-pill ${l.has_notes ? "active" : "pending"}`}>
                        {l.has_notes ? "Generated" : "Pending"}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-icon-btn danger"
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            type: "lecture",
                            id: l.id,
                            title: `Lecture #${l.id}: ${l.title}`
                          })
                        }
                        title="Delete lecture"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {lectures.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7">
                      <div className="admin-empty-state">
                        <BookOpen size={36} style={{ margin: "0 auto", opacity: 0.4 }} />
                        <h3>No lectures found</h3>
                        <p>No lectures in the system match your search term.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: AUDIT LOGS
          ==================================================================== */}
      {activeTab === "logs" && (
        <div className="admin-card">
          <div className="admin-filter-bar">
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                className="admin-select"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="success">Successful Logins</option>
                <option value="failed">Failed Login Attempts</option>
              </select>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={loadAuditLogs}
              >
                Filter
              </button>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event Status</th>
                  <th>Target Email</th>
                  <th>IP Address</th>
                  <th>Device / User Agent</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`status-pill ${log.status === "success" ? "active" : "inactive"}`}>
                        {log.status === "success" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {log.status === "success" ? "Success" : "Failed Attempt"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#f8fafc" }}>{log.email}</td>
                    <td style={{ color: "#94a3b8" }}>{log.ip_address || "127.0.0.1"}</td>
                    <td style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.user_agent || "Browser"}
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-empty-state">
                        <Activity size={36} style={{ margin: "0 auto", opacity: 0.4 }} />
                        <h3>No audit events found</h3>
                        <p>No events recorded matching the selected filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmModal({ isOpen: false, type: "", id: null, title: "" })}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title" style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
              <Trash2 size={20} color="#ef4444" />
              {confirmModal.type === "lecture" ? "Delete Lecture?" : "Delete User Account?"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{confirmModal.title}</strong>?
              {(confirmModal.type === "user" || confirmModal.type === "user-email") && (
                <span style={{ display: "block", marginTop: "8px", color: "#fca5a5" }}>
                  ⚠️ This will permanently erase the user account, all their lecture recordings, transcripts, summaries, active-recall quizzes, and active sessions.
                </span>
              )}
              <span style={{ display: "block", marginTop: "4px", fontWeight: 600 }}>This action cannot be undone.</span>
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setConfirmModal({ isOpen: false, type: "", id: null, title: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={executeDelete}
              >
                Confirm Delete {confirmModal.type === "lecture" ? "Lecture" : "User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
