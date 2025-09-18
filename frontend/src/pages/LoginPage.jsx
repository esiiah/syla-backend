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
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid credentials");
      }

      // Store auth data
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/"); // redirect to dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-2xl border-2 border-neonBlue/20 shadow-2xl p-8 neon-border">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Sign in to your Syla Analytics account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email/Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Email or Phone Number
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Enter your email or phone number"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-neonBlue hover:bg-blue-600 shadow-lg hover:shadow-neon transform hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Don't have an account?{" "}
            <Link 
              to="/signup" 
              className="text-neonBlue hover:text-blue-600 font-semibold hover:underline transition-colors duration-200"
            >
              Create one here
            </Link>
          </p>
        </div>

        {/* Forgot Password */}
        <div className="mt-4 text-center">
          <a 
            href="#" 
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors duration-200"
          >
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
}
