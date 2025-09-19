// frontend/src/pages/SignupPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactType, setContactType] = useState("email");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      // This would be implemented based on your Google OAuth setup
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

  // Phone verification handler
  const handlePhoneVerification = () => {
    // For now, just show the form
    setShowDetails(true);
    // TODO: Implement actual phone verification
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          contact,
          password,
          confirm_password: confirmPassword,
          contact_type: contactType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");

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
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">
            Create Account
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Join Syla Analytics today</p>
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

        {!showDetails ? (
          // Simple 3-option view
          <div className="space-y-4">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 dark:border-white/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-700 dark:text-slate-300 font-medium">Continue with Google</span>
            </button>

            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
            </div>

            {/* Email Option */}
            <button
              onClick={() => {setContactType("email"); setShowDetails(true);}}
              className="w-full px-4 py-4 border-2 border-neonBlue/30 rounded-lg hover:border-neonBlue/60 transition-all duration-200 flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:bg-gradient-to-r dark:from-slate-800/50 dark:to-slate-900/50"
            >
              <svg className="w-5 h-5 text-neonBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700 dark:text-slate-300 font-medium">Continue with Email</span>
            </button>

            {/* Phone Option */}
            <button
              onClick={() => {setContactType("phone"); handlePhoneVerification();}}
              className="w-full px-4 py-4 border-2 border-neonBlue/30 rounded-lg hover:border-neonBlue/60 transition-all duration-200 flex items-center justify-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:bg-gradient-to-r dark:from-slate-800/50 dark:to-slate-900/50"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-700 dark:text-slate-300 font-medium">Continue with Phone</span>
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Already have an account?{" "}
                <Link to="/login" className="text-neonBlue hover:text-blue-600 font-semibold hover:underline transition-colors duration-200">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        ) : (
          // Detailed form view
          <div>
            <button
              onClick={() => setShowDetails(false)}
              className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to options
            </button>

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Contact Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {contactType === "email" ? "Email Address" : "Phone Number"}
                </label>
                <input
                  type={contactType === "email" ? "email" : "tel"}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={contactType === "email" ? "Enter your email address" : "Enter your phone number"}
                  required
                  className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  required
                  minLength="6"
                  className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-neonBlue hover:bg-blue-600 shadow-lg hover:shadow-neon transform hover:-translate-y-0.5"
                }`}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
