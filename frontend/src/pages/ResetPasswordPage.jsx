// frontend/src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [contact, setContact] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      setValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/auth/validate-reset-token/${token}`, {
        credentials: "include"
      });
      
      if (res.ok) {
        const data = await res.json();
        setTokenValid(true);
        setContact(data.contact);
      } else {
        setError("This reset link has expired or is invalid. Please request a new password reset.");
      }
    } catch (err) {
      setError("Unable to validate reset link. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password reset failed");
      
      // Store user data and redirect
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 relative">
      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 flex items-center space-x-2 z-10">
        <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
        <span className="font-inter font-bold text-xl text-gray-800 dark:text-slate-200">
          Syla Analytics
        </span>
      </div>

      {/* Main Panel */}
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-yellow-400 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl hover:border-blue-600 dark:hover:border-yellow-300">
        
        {/* Header */}
        <div className="text-center p-6 pb-4">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">
            Reset Password
          </h1>
          {contact && (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Reset password for {contact}
            </p>
          )}
          <div className="mt-3 w-16 h-1 bg-blue-500 dark:bg-yellow-400 rounded-full mx-auto"></div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Loading state */}
          {validating && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Validating reset link...</p>
            </div>
          )}

          {/* Error state */}
          {!validating && !tokenValid && (
            <div className="text-center py-4">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
                {error}
              </div>
              <div className="space-y-3">
                <Link 
                  to="/forgot-password" 
                  className="block w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
                >
                  Request New Reset Link
                </Link>
                <Link 
                  to="/login" 
                  className="block text-blue-500 dark:text-yellow-400 hover:underline font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* Reset form */}
          {!validating && tokenValid && (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                    loading || !newPassword || !confirmPassword
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                  }`}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 pt-4">
            Remember your password?{" "}
            <Link 
              to="/login" 
              className="text-blue-500 dark:text-yellow-400 font-semibold hover:underline transition-colors duration-200"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
