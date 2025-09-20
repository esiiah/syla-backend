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
      if (typeof google === 'undefined') throw new Error("Google Sign-In not loaded");
      const response = await new Promise((resolve, reject) => {
        google.accounts.id.prompt((notification) => { if (notification.isNotDisplayed()) reject(new Error("Popup blocked")); });
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

  const handlePhoneLogin = () => { setContactType("phone"); setShowDetails(true); };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => google.accounts.id.initialize({ client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID, callback: window.handleCredentialResponse });
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-ink/90 rounded-2xl border-2 border-neonBlue/20 shadow-2xl p-8 neon-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Sign in to your Syla Analytics account</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>}

        {!showDetails ? (
          <div className="space-y-4">
            <button onClick={handleGoogleSignIn} disabled={loading} className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg">Continue with Google</button>
            <div className="flex items-center mb-4"><div className="flex-1 border-t border-gray-300 dark:border-white/20"></div><span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span><div className="flex-1 border-t border-gray-300 dark:border-white/20"></div></div>
            <button onClick={() => { setContactType("email"); setShowDetails(true); }}>Continue with Email</button>
            <button onClick={handlePhoneLogin}>Continue with Phone</button>
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">Don't have an account? <Link to="/signup">Create one here</Link></p>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setShowDetails(false)}>Back to options</button>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type={contactType === "email" ? "email" : "tel"} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={contactType === "email" ? "Email" : "Phone"} required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" disabled={loading}>{loading ? "Signing In..." : "Sign In"}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
