// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [contactType, setContactType] = useState("email");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      if (typeof google === "undefined") throw new Error("Google Sign-In not loaded");
      const response = await new Promise((resolve, reject) => {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) reject(new Error("Popup blocked"));
        });
        window.handleCredentialResponse = (response) => resolve(response);
      });
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google authentication failed");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid credentials");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = () => {
    setContactType("phone");
    setShowDetails(true);
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () =>
      google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: window.handleCredentialResponse,
      });
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-6 relative">
      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 flex items-center space-x-2">
        <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
        <span className="font-inter font-bold text-xl text-gray-800 dark:text-slate-200">
          Syla Analytics
        </span>
      </div>

      {/* Panel */}
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-2xl shadow-2xl border-2 border-neonBlue dark:border-neonYellow p-8 transform transition-transform duration-300 hover:scale-[1.02]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Sign in to your Syla Analytics account
          </p>
          <div className="mt-3 w-16 h-1 bg-neonBlue dark:bg-neonYellow rounded-full mx-auto"></div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {!showDetails ? (
          <div className="space-y-4">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 dark:border-white/20 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/google-logo.png" alt="Google" className="w-5 h-5" />
              <span className="text-gray-700 dark:text-slate-300 font-medium">
                {loading ? "Loading..." : "Continue with Google"}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
            </div>

            {/* Continue with Email */}
            <button
              onClick={() => {
                setContactType("email");
                setShowDetails(true);
              }}
              className="w-full px-4 py-3 rounded-lg font-medium bg-blue-500 text-white transition-all duration-200 hover:bg-blue-600 shadow-md"
            >
              Continue with Email
            </button>

            {/* Continue with Phone */}
            <button
              onClick={handlePhoneLogin}
              className="w-full px-4 py-3 rounded-lg font-medium bg-blue-50 dark:bg-slate-800 border-2 border-neonBlue/30 transition-all duration-200 hover:border-neonBlue/60 hover:bg-blue-100 dark:hover:bg-slate-700"
            >
              Continue with Phone
            </button>

            {/* Link to Signup */}
            <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="text-neonBlue dark:text-neonYellow font-semibold hover:underline"
              >
                Create one here
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setShowDetails(false)}
              className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
            >
              Back to options
            </button>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type={contactType === "email" ? "email" : "tel"}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={contactType === "email" ? "Email" : "Phone"}
                required
                className="w-full border rounded-lg px-4 py-3"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full border rounded-lg px-4 py-3"
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-neonBlue dark:bg-neonYellow hover:opacity-90 shadow-md"
                }`}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
