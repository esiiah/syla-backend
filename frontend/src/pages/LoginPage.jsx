import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      // if you already integrated Google Identity Services,
      // obtain the id_token here and POST it:
      // const id_token = await yourGoogleGetIdToken();
      // await fetch("/api/auth/google",{method:"POST",
      //  headers:{"Content-Type":"application/json"},
      //  body:JSON.stringify({id_token}),credentials:"include"});

      // fallback: server-side redirect flow
      window.location.href = "/api/auth/google";
    } catch (err) {
      setError(err.message || "Google authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-ink p-8 rounded-2xl shadow-soft w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-display text-center mb-2">Login</h1>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <input
          type="text"
          placeholder="Email or phone"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-neonBlue text-white rounded-md button-glow"
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 mt-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Continue with Google
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          No account?{" "}
          <Link to="/signup" className="text-neonBlue hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
