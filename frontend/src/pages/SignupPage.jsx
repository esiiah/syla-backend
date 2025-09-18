// frontend/src/pages/SignupPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const countryCodes = [
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+39", country: "IT" },
  { code: "+34", country: "ES" },
  { code: "+91", country: "IN" },
  { code: "+86", country: "CN" },
  { code: "+81", country: "JP" },
  { code: "+82", country: "KR" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+61", country: "AU" },
  { code: "+27", country: "ZA" },
  { code: "+234", country: "NG" },
  { code: "+260", country: "ZM" }, // Zambia
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactType, setContactType] = useState("email");
  const [countryCode, setCountryCode] = useState("+1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(savedTheme);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
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
      const finalContact = contactType === "phone" ? `${countryCode}${contact}` : contact;
      
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          contact: finalContact, 
          password,
          confirm_password: confirmPassword,
          contact_type: contactType
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
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
            Create Account
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Join Syla Analytics today
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

        <form onSubmit={handleSignup} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Contact Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Contact Method
            </label>
            <div className="flex rounded-lg border border-gray-300 dark:border-white/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setContactType("email")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  contactType === "email"
                    ? "bg-neonBlue text-white"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setContactType("phone")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  contactType === "phone"
                    ? "bg-neonBlue text-white"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Phone
              </button>
            </div>
          </div>

          {/* Contact Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {contactType === "email" ? "Email Address" : "Phone Number"}
            </label>
            
            {contactType === "phone" ? (
              <div className="flex">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="border border-gray-300 dark:border-white/20 rounded-l-lg px-3 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                >
                  {countryCodes.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.code} ({cc.country})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className="flex-1 border-t border-r border-b border-gray-300 dark:border-white/20 rounded-r-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            ) : (
              <input
                type="email"
                className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            )}
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
              placeholder="Create a password (min 6 characters)"
              required
              minLength="6"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent transition-all duration-200"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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
                Creating Account...
              </div>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-neonBlue hover:text-blue-600 font-semibold hover:underline transition-colors duration-200"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
