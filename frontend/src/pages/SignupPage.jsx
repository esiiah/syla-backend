// frontend/src/pages/SignupPage.jsx
import React, { useState, useEffect } from "react";
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      if (typeof google === 'undefined') throw new Error("Google Sign-In not loaded");
      const response = await new Promise((resolve, reject) => {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) reject(new Error("Google Sign-In popup blocked"));
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

  const handlePhoneVerification = () => setShowDetails(true);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (password !== confirmPassword) return setError("Passwords do not match"), setLoading(false);
    if (password.length < 6) return setError("Password must be at least 6 characters long"), setLoading(false);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, contact, password, confirm_password: confirmPassword, contact_type: contactType }),
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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => google.accounts.id.initialize({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      callback: window.handleCredentialResponse
    });
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (
    <div className="min-h-screen flex flex-col sm:flex-row items-start sm:items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 flex items-center space-x-2">
        <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
        <span className="font-inter font-bold text-xl text-gray-800 dark:text-slate-200">Syla Analytics</span>
      </div>

      {/* Panel */}
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-t-3xl rounded-b-lg shadow-2xl border-2 border-neonBlue dark:border-neonYellow p-8 mt-16 sm:mt-0">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">Create Account</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Join Syla Analytics today</p>
          <div className="mt-3 w-16 h-1 bg-neonBlue dark:bg-neonYellow rounded-full mx-auto"></div>
        </div>

        {/* Error */}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>}

        {!showDetails ? (
          <div className="space-y-4">
            <button onClick={handleGoogleSignIn} disabled={loading} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 dark:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <img src="/google-logo.png" alt="Google" className="w-5 h-5"/>
              <span className="text-gray-700 dark:text-slate-300 font-medium">{loading ? "Loading..." : "Continue with Google"}</span>
            </button>

            <div className="flex items-center mb-4"><div className="flex-1 border-t border-gray-300 dark:border-white/20"></div><span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span><div className="flex-1 border-t border-gray-300 dark:border-white/20"></div></div>

            <button onClick={() => { setContactType("email"); setShowDetails(true); }} className="w-full px-4 py-3 border-2 border-neonBlue/30 rounded-lg hover:border-neonBlue/60 transition-all duration-200 bg-blue-50 dark:bg-slate-800">Continue with Email</button>
            <button onClick={() => { setContactType("phone"); handlePhoneVerification(); }} className="w-full px-4 py-3 border-2 border-neonBlue/30 rounded-lg hover:border-neonBlue/60 transition-all duration-200 bg-blue-50 dark:bg-slate-800">Continue with Mobile</button>

            <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
              Already have an account? <Link to="/login" className="text-neonBlue dark:text-neonYellow font-semibold hover:underline">Log in</Link>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setShowDetails(false)} className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200">Back to options</button>
            <form onSubmit={handleSignup} className="space-y-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required className="w-full border rounded-lg px-4 py-3"/>
              <input type={contactType === "email" ? "email" : "tel"} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={contactType === "email" ? "Email" : "Phone"} required className="w-full border rounded-lg px-4 py-3"/>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full border rounded-lg px-4 py-3"/>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required className="w-full border rounded-lg px-4 py-3"/>
              <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? "bg-gray-400" : "bg-neonBlue dark:bg-neonYellow"}`}>
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
