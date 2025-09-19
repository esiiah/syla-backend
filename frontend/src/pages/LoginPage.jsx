// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(savedTheme);

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: handleGoogleResponse,
          auto_select: true,
          cancel_on_tap_outside: false,
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("Google One Tap not available");
          }
        });
      }
    };

    return () => document.head.removeChild(script);
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: response.credential }),
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

  const handleGoogleSignIn = () => {
    if (window.google) window.google.accounts.id.prompt();
    else setError("Google Sign-In not available");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-2xl border-2 border-neonBlue/20 shadow-2xl p-8 neon-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Sign in to your Syla Analytics account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-6 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 dark:border-white/20"
        >
          <span className="text-gray-700 dark:text-slate-300 font-medium">Continue with Google</span>
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
          <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
          <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Email or Phone Number</label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Enter your email or phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-neonBlue hover:bg-blue-600 shadow-lg hover:shadow-neon transform hover:-translate-y-0.5"
            }`}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-neonBlue hover:text-blue-600 font-semibold hover:underline transition-colors duration-200">
              Create one here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors duration-200">
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
}
