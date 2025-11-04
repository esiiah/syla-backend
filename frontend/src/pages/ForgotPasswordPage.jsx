// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      
      setMessage(data.message);
      setSubmitted(true);
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
            Forgot Password?
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Enter your email or phone to reset your password
          </p>
          <div className="mt-3 w-16 h-1 bg-blue-500 dark:bg-yellow-400 rounded-full mx-auto"></div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Success Message */}
          {submitted && message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-sm">
              <div className="font-medium mb-1">Instructions Sent!</div>
              <div>{message}</div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <Link 
                  to="/login" 
                  className="text-green-600 dark:text-green-400 hover:underline font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Enter your email or phone number"
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !contact.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                  loading || !contact.trim()
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                }`}
              >
                {loading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </form>
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
