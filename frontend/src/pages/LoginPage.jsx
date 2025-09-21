// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect, useRef } from "react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [contactType, setContactType] = useState("email");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCode, setSelectedCode] = useState("+1");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filter countries based on search term
  const filteredCountries = countryCodes.filter(country => 
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm)
  );

  // Handle Google Credential Response
  window.handleCredentialResponse = async (response) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google sign-in failed");
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
    setLoading(true);
    setError("");
    try {
      if (typeof google === "undefined") {
        throw new Error("Google Sign-In not loaded");
      }
      // Trigger the Google One Tap
      google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed()) {
          setError("Google Sign-In popup blocked. Please allow popups.");
          setLoading(false);
        } else if (notification.isSkippedMoment()) {
          setLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loginContact = contactType === "phone" ? selectedCode + contact : contact;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact: loginContact, password }),
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

  const handleCountrySelect = (country) => {
    setSelectedCode(country.code);
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const handleDropdownKeyDown = (e) => {
    if (e.key === 'Enter' && filteredCountries.length > 0) {
      handleCountrySelect(filteredCountries[0]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setSearchTerm("");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          auto_select: false,
          cancel_on_tap_outside: false,
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 relative">
      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 flex items-center space-x-2 z-10">
        <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
        <span className="font-inter font-bold text-xl text-gray-800 dark:text-slate-200">
          Syla Analytics
        </span>
      </div>

      {/* Main Panel - Fixed dimensions to prevent viewport overflow */}
      <div className="w-full max-w-md h-[85vh] bg-white dark:bg-ink/90 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-yellow-400 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl hover:border-blue-600 dark:hover:border-yellow-300 flex flex-col">
        
        {/* Header - Fixed */}
        <div className="text-center p-6 pb-0 flex-shrink-0">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Sign in to your Syla Analytics account</p>
          <div className="mt-3 w-16 h-1 bg-blue-500 dark:bg-yellow-400 rounded-full mx-auto"></div>
        </div>

        {/* Scrollable Inner Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!showDetails ? (
            <div className="space-y-4">
              {/* Google Sign In */}
              <div className="w-full">
                <div id="g_id_onload" data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID} data-auto_prompt="false"></div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? "Please wait..." : "Continue with Google"}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
                <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
              </div>

              {/* Email Button */}
              <button
                onClick={() => { setContactType("email"); setShowDetails(true); }}
                className="w-full px-4 py-3 rounded-lg font-medium bg-blue-500 text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-lg hover:scale-[1.02] transform shadow-md"
              >
                Continue with Email
              </button>

              {/* Phone Button */}
              <button
                onClick={handlePhoneLogin}
                className="w-full px-4 py-3 rounded-lg font-medium bg-blue-50 dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-400 text-blue-600 dark:text-blue-300 transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:shadow-lg hover:scale-[1.02] transform"
              >
                Continue with Phone
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back Button */}
              <button
                onClick={() => setShowDetails(false)}
                className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors duration-200"
              >
                ← Back to options
              </button>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Phone Input with Country Code */}
                {contactType === "phone" && (
                  <div className="flex space-x-2 relative" ref={dropdownRef}>
                    {/* Country Code Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 min-w-[100px] flex items-center justify-between"
                      >
                        <span className="text-sm">{selectedCode}</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-hidden">
                          {/* Search Input */}
                          <div className="p-2 border-b border-gray-200 dark:border-slate-600">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyDown={handleDropdownKeyDown}
                              placeholder="Search country..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          
                          {/* Countries List */}
                          <div className="max-h-40 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => handleCountrySelect(country)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-150 flex justify-between items-center"
                              >
                                <span className="text-gray-900 dark:text-slate-100">{country.name}</span>
                                <span className="text-gray-500 dark:text-slate-400">{country.code}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                                No countries found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phone Number Input */}
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Phone Number"
                      required
                      className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                )}

                {/* Email Input */}
                {contactType === "email" && (
                  <input
                    type="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                )}

                {/* Password Input */}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                    loading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                  }`}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 pt-0 flex-shrink-0 text-center text-sm text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700">
          Don't have an account?{" "}
          <Link 
            to="/signup" 
            className="text-blue-500 dark:text-yellow-400 font-semibold hover:underline transition-colors duration-200"
          >
            Create one here
          </Link>
        </div>
      </div>
    </div>
  );
}
