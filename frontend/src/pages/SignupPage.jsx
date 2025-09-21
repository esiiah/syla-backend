// frontend/src/pages/SignupPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const countryCodes = [
  { code: "+1", name: "USA" }, { code: "+44", name: "UK" }, { code: "+91", name: "India" },
  { code: "+61", name: "Australia" }, { code: "+81", name: "Japan" }, { code: "+49", name: "Germany" },
  { code: "+33", name: "France" }, { code: "+55", name: "Brazil" }, { code: "+7", name: "Russia" },
  { code: "+86", name: "China" }, { code: "+27", name: "South Africa" }, { code: "+39", name: "Italy" },
  { code: "+34", name: "Spain" }, { code: "+82", name: "South Korea" }, { code: "+64", name: "New Zealand" },
  { code: "+65", name: "Singapore" }, { code: "+90", name: "Turkey" }, { code: "+31", name: "Netherlands" },
  { code: "+46", name: "Sweden" }, { code: "+41", name: "Switzerland" }, { code: "+351", name: "Portugal" },
  { code: "+352", name: "Luxembourg" }, { code: "+353", name: "Ireland" }, { code: "+358", name: "Finland" },
  { code: "+420", name: "Czech Republic" }, { code: "+421", name: "Slovakia" }, { code: "+48", name: "Poland" },
  { code: "+36", name: "Hungary" }, { code: "+971", name: "UAE" }, { code: "+972", name: "Israel" },
  { code: "+966", name: "Saudi Arabia" }, { code: "+20", name: "Egypt" }, { code: "+212", name: "Morocco" },
  { code: "+92", name: "Pakistan" }, { code: "+880", name: "Bangladesh" }, { code: "+974", name: "Qatar" },
  { code: "+965", name: "Kuwait" }
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
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
      if (typeof google === "undefined") throw new Error("Google Sign-In not loaded");

      google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed()) {
          setError("Google Sign-In popup blocked. Please allow popups.");
          setLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
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
        body: JSON.stringify({
          name,
          contact: contactType === "phone" ? countryCode + contact : contact,
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

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (typeof google !== "undefined") {
        google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: window.handleCredentialResponse,
        });
      }
    };
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
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-ink/90 rounded-2xl shadow-2xl border-2 border-neonBlue dark:border-neonYellow p-8 transform transition-transform duration-300 hover:scale-[1.02]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">
            Create Account
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Join Syla Analytics today</p>
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
            <div id="g_id_onload" data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID} data-auto_prompt="false"></div>
            <div id="googleSignInButton" className="w-full flex justify-center">
              <div id="g_id_signin" data-type="standard" data-size="large" data-theme="outline" data-text="signin_with" data-shape="rectangular"></div>
            </div>

            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
              <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
            </div>

            <button
              onClick={() => { setContactType("email"); setShowDetails(true); }}
              className="w-full px-4 py-3 rounded-lg font-medium bg-blue-500 text-white transition-all duration-200 hover:bg-blue-600 shadow-md"
            >
              Continue with Email
            </button>

            <button
              onClick={() => { setContactType("phone"); handlePhoneVerification(); }}
              className="w-full px-4 py-3 rounded-lg font-medium bg-blue-50 dark:bg-slate-800 border-2 border-neonBlue/30 transition-all duration-200 hover:border-neonBlue/60 hover:bg-blue-100 dark:hover:bg-slate-700"
            >
              Continue with Mobile
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setShowDetails(false)}
              className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
            >
              Back to options
            </button>

            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
                className="w-full border rounded-lg px-4 py-3"
              />

              {contactType === "phone" && (
                <div className="flex space-x-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="border rounded-lg px-3 py-2 max-h-40 overflow-y-auto"
                    size={5}
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone Number"
                    required
                    className="flex-1 border rounded-lg px-4 py-3"
                  />
                </div>
              )}

              {contactType === "email" && (
                <input
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full border rounded-lg px-4 py-3"
                />
              )}

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full border rounded-lg px-4 py-3"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className="w-full border rounded-lg px-4 py-3"
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-neonBlue dark:bg-neonYellow hover:opacity-90 shadow-md"
                }`}
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>
        )}

        {/* Login link */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-neonBlue dark:text-neonYellow font-semibold hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
