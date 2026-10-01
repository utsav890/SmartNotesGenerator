import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    return localStorage.getItem("smartnotes_token") || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Base authenticated fetch utility
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {})
      };

      const currentToken = token || localStorage.getItem("smartnotes_token");
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
      }

      if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: "include"
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    },
    [token]
  );

  // Initialize and check user session on mount
  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem("smartnotes_token");
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const data = await authFetch("/api/auth/me");
      if (data?.user) {
        setUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn("Session check failed or expired:", err.message);
      // Invalidate local token if session expired on backend
      localStorage.removeItem("smartnotes_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [authFetch]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = async (email, password) => {
    setAuthError("");
    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (res.token) {
        localStorage.setItem("smartnotes_token", res.token);
        setToken(res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Registration handler
  const register = async (fullName, email, password, confirmPassword) => {
    setAuthError("");
    try {
      const res = await authFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword
        })
      });

      if (res.token) {
        localStorage.setItem("smartnotes_token", res.token);
        setToken(res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Backend logout notification failed:", err.message);
    } finally {
      localStorage.removeItem("smartnotes_token");
      setToken(null);
      setUser(null);
      // Hard reload to /login wipes all React state, audio buffers, and caches
      window.location.href = "/login";
    }
  };

  // Email verification handler
  const verifyEmail = async (verificationToken) => {
    const res = await authFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: verificationToken })
    });
    // Refresh user state to mark verified
    if (user) {
      setUser((prev) => (prev ? { ...prev, is_verified: true } : null));
    }
    return res;
  };

  // Resend verification email handler
  const resendVerification = async (email) => {
    return await authFetch("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: email || user?.email || undefined })
    });
  };

  // Forgot password handler
  const forgotPassword = async (email) => {
    return await authFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() })
    });
  };

  // Reset password handler
  const resetPassword = async (resetToken, password, confirmPassword) => {
    return await authFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password,
        confirm_password: confirmPassword
      })
    });
  };

  // Change password handler
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    return await authFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
  };

  // Security overview handler
  const getSecurityOverview = async () => {
    return await authFetch("/api/auth/security");
  };

  // Revoke session handler
  const revokeSession = async (sessionId) => {
    return await authFetch(`/api/auth/sessions/${sessionId}`, {
      method: "DELETE"
    });
  };

  // Revoke other sessions handler
  const revokeOtherSessions = async () => {
    return await authFetch("/api/auth/sessions/revoke-others", {
      method: "POST"
    });
  };

  // Delete account handler
  const deleteAccount = async (password) => {
    const res = await authFetch("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password })
    });
    localStorage.removeItem("smartnotes_token");
    setToken(null);
    setUser(null);
    return res;
  };

  // Admin APIs
  const getAdminOverview = async () => {
    return await authFetch("/api/admin/overview");
  };

  const getAdminUsers = async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
    );
    const q = new URLSearchParams(cleanParams).toString();
    return await authFetch(`/api/admin/users${q ? `?${q}` : ""}`);
  };

  const updateUserRole = async (userId, role) => {
    return await authFetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  };

  const updateUserStatus = async (userId, payload) => {
    return await authFetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  };

  const deleteAdminUser = async (userId) => {
    return await authFetch(`/api/admin/users/${userId}`, {
      method: "DELETE"
    });
  };

  const deleteAdminUserByEmail = async (email) => {
    return await authFetch(`/api/admin/users/by-email/${encodeURIComponent(email)}`, {
      method: "DELETE"
    });
  };

  const getAdminLectures = async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
    );
    const q = new URLSearchParams(cleanParams).toString();
    return await authFetch(`/api/admin/lectures${q ? `?${q}` : ""}`);
  };

  const deleteAdminLecture = async (lectureId) => {
    return await authFetch(`/api/admin/lectures/${lectureId}`, {
      method: "DELETE"
    });
  };

  const getAdminAuditLogs = async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "" && v !== null)
    );
    const q = new URLSearchParams(cleanParams).toString();
    return await authFetch(`/api/admin/audit-logs${q ? `?${q}` : ""}`);
  };

  const promoteUserByEmail = async (email) => {
    return await authFetch("/api/admin/promote-by-email", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() })
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isAdmin: Boolean(user?.is_admin || user?.role === "admin"),
    isLoading,
    authError,
    setAuthError,
    authFetch,
    login,
    register,
    logout,
    refreshUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    getSecurityOverview,
    revokeSession,
    revokeOtherSessions,
    deleteAccount,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
