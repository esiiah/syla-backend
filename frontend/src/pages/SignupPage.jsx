// frontend/src/pages/SignupPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../config/firebase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "618939207673-gbevo0aok0bqufjch9mmr4sc9ma86qtm.apps.googleusercontent.com";

const countryCodes = [
  { code: "+1", name: "USA" }, { code: "+1", name: "Canada" }, { code: "+44", name: "UK" },  { code: "+91", name: "India" }, { code: "+61", name: "Australia" }, { code: "+81", name: "Japan" }, 
  { code: "+49", name: "Germany" }, { code: "+33", name: "France" }, { code: "+55", name: "Brazil" }, { code: "+7", name: "Russia" }, { code: "+86", name: "China" }, { code: "+27", name: "South Africa" }, 
  { code: "+39", name: "Italy" }, { code: "+34", name: "Spain" }, { code: "+82", name: "South Korea" }, { code: "+64", name: "New Zealand" }, { code: "+65", name: "Singapore" }, { code: "+90", name: "Turkey" }, 
  { code: "+31", name: "Netherlands" }, { code: "+46", name: "Sweden" }, { code: "+41", name: "Switzerland" }, { code: "+351", name: "Portugal" }, { code: "+352", name: "Luxembourg" }, { code: "+353", name: "Ireland" }, 
  { code: "+358", name: "Finland" }, { code: "+420", name: "Czech Republic" }, { code: "+421", name: "Slovakia" }, { code: "+48", name: "Poland" }, { code: "+36", name: "Hungary" }, { code: "+971", name: "UAE" }, 
  { code: "+972", name: "Israel" }, { code: "+966", name: "Saudi Arabia" }, { code: "+20", name: "Egypt" }, { code: "+212", name: "Morocco" }, { code: "+92", name: "Pakistan" }, { code: "+880", name: "Bangladesh" }, 
  { code: "+974", name: "Qatar" }, { code: "+965", name: "Kuwait" }, { code: "+260", name: "Zambia" }, { code: "+263", name: "Zimbabwe" }, { code: "+254", name: "Kenya" }, { code: "+234", name: "Nigeria" }, 
  { code: "+233", name: "Ghana" }, { code: "+255", name: "Tanzania" }, { code: "+256", name: "Uganda" }, { code: "+251", name: "Ethiopia" }, { code: "+231", name: "Liberia" }, { code: "+232", name: "Sierra Leone" },
  { code: "+237", name: "Cameroon" }, { code: "+225", name: "Ivory Coast" }, { code: "+221", name: "Senegal" }, { code: "+213", name: "Algeria" }, { code: "+216", name: "Tunisia" }, { code: "+218", name: "Libya" },
  { code: "+249", name: "Sudan" }, { code: "+252", name: "Somalia" }, { code: "+257", name: "Burundi" }, { code: "+258", name: "Mozambique" }, { code: "+264", name: "Namibia" }, { code: "+265", name: "Malawi" },
  { code: "+266", name: "Lesotho" }, { code: "+267", name: "Botswana" }, { code: "+268", name: "Eswatini" }, { code: "+350", name: "Gibraltar" }, { code: "+356", name: "Malta" }, { code: "+357", name: "Cyprus" },
  { code: "+370", name: "Lithuania" }, { code: "+371", name: "Latvia" }, { code: "+372", name: "Estonia" }, { code: "+374", name: "Armenia" }, { code: "+375", name: "Belarus" }, { code: "+380", name: "Ukraine" },
  { code: "+381", name: "Serbia" }, { code: "+382", name: "Montenegro" }, { code: "+383", name: "Kosovo" }, { code: "+385", name: "Croatia" }, { code: "+386", name: "Slovenia" }, { code: "+387", name: "Bosnia" },
  { code: "+389", name: "North Macedonia" }, { code: "+40", name: "Romania" }, { code: "+43", name: "Austria" }, { code: "+45", name: "Denmark" }, { code: "+47", name: "Norway" }, { code: "+60", name: "Malaysia" },
  { code: "+62", name: "Indonesia" }, { code: "+63", name: "Philippines" }, { code: "+66", name: "Thailand" }, { code: "+84", name: "Vietnam" }, { code: "+852", name: "Hong Kong" }, { code: "+853", name: "Macau" },
  { code: "+886", name: "Taiwan" }, { code: "+94", name: "Sri Lanka" }, { code: "+95", name: "Myanmar" }, { code: "+98", name: "Iran" }, { code: "+963", name: "Syria" }, { code: "+964", name: "Iraq" },
  { code: "+967", name: "Yemen" }, { code: "+968", name: "Oman" }, { code: "+973", name: "Bahrain" }, { code: "+975", name: "Bhutan" }, { code: "+976", name: "Mongolia" }, { code: "+977", name: "Nepal" },
  { code: "+992", name: "Tajikistan" }, { code: "+993", name: "Turkmenistan" }, { code: "+994", name: "Azerbaijan" }, { code: "+995", name: "Georgia" }, { code: "+996", name: "Kyrgyzstan" }, { code: "+998", name: "Uzbekistan" }
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);

  const filteredCountries = countryCodes.filter(country => 
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm)
  );

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log("reCAPTCHA solved");
          },
          'error-callback': (error) => {
            console.error("reCAPTCHA error:", error);
            setError("reCAPTCHA failed. Please try again.");
          }
        });
      } catch (error) {
        console.error("Failed to setup reCAPTCHA:", error);
        setError("Failed to initialize verification. Please refresh the page.");
      }
    }
  };

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
        throw new Error("Google Sign-In not loaded. Please refresh the page.");
      }
      
      const buttonContainer = document.getElementById("google-signin-button");
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
        google.accounts.id.renderButton(buttonContainer, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signup_with"
        });
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePhoneVerification = () => setShowDetails(true);

  const validatePassword = (pwd) => {
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return "Password must contain uppercase, lowercase, number and special character";
    }
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return null;
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

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // If phone, send OTP first
    if (contactType === "phone") {
      if (!contact || contact.length < 7) {
        setError("Please enter a valid phone number");
        setLoading(false);
        return;
      }

      if (!name.trim()) {
        setError("Please enter your name");
        setLoading(false);
        return;
      }

      try {
        setupRecaptcha();
        const phoneNumber = countryCode + contact;
        console.log("Sending OTP to:", phoneNumber);
        
        const appVerifier = window.recaptchaVerifier;
        
        const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        setConfirmationResult(result);
        setShowOtpInput(true);
        setError("");
        console.log("OTP sent successfully");
      } catch (err) {
        console.error("OTP Error:", err);
        
        let errorMessage = "Failed to send OTP. ";
        if (err.code === 'auth/operation-not-allowed') {
          errorMessage = "Phone authentication is not enabled. Please contact support.";
        } else if (err.code === 'auth/invalid-phone-number') {
          errorMessage = "Invalid phone number format. Please check and try again.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many requests. Please try again later.";
        } else {
          errorMessage += err.message || "Please try again.";
        }
        
        setError(errorMessage);
        
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (clearError) {
            console.error("Error clearing reCAPTCHA:", clearError);
          }
          window.recaptchaVerifier = null;
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Email signup
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
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Signup failed" }));
        throw new Error(data.detail || "Signup failed");
      }
      
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setOtpError("");

    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/firebase-phone-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firebase_token: firebaseToken,
          name: name,
          phone: countryCode + contact,
          password: password,
          confirm_password: confirmPassword
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Signup failed");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setOtpError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (country) => {
    setCountryCode(country.code);
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

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setContact(value);
  };

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
          client_id: GOOGLE_CLIENT_ID,
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

  useEffect(() => {
    let interval;
    if (showOtpInput && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpInput, otpTimer]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 relative">
      <div className="absolute top-6 left-6 flex items-center space-x-2 z-10">
        <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
        <span className="font-inter font-bold text-xl text-gray-800 dark:text-slate-200">
          Syla Analytics
        </span>
      </div>

      <div className="w-full max-w-md h-[85vh] bg-white dark:bg-ink/90 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-yellow-400 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl hover:border-blue-600 dark:hover:border-yellow-300 flex flex-col">
        
        <div className="text-center p-6 pb-0 flex-shrink-0">
          <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-slate-200 mb-1">
            Create Account
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Join Syla Analytics today</p>
          <div className="mt-3 w-16 h-1 bg-blue-500 dark:bg-yellow-400 rounded-full mx-auto"></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!showDetails ? (
            <div className="space-y-4">
              <div className="w-full">
                <div id="g_id_onload" data-client_id={GOOGLE_CLIENT_ID} data-auto_prompt="false"></div>
                <div id="google-signin-button" className="w-full flex justify-center"></div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-slate-400">or</span>
                <div className="flex-1 border-t border-gray-300 dark:border-white/20"></div>
              </div>

              <button
                onClick={() => { setContactType("email"); setShowDetails(true); }}
                className="w-full px-4 py-3 rounded-lg font-medium bg-blue-500 text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-lg hover:scale-[1.02] transform shadow-md"
              >
                Continue with Email
              </button>

              <button
                onClick={() => { setContactType("phone"); handlePhoneVerification(); }}
                className="w-full px-4 py-3 rounded-lg font-medium bg-blue-50 dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-400 text-blue-600 dark:text-blue-300 transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:shadow-lg hover:scale-[1.02] transform"
              >
                Continue with Mobile
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowDetails(false)}
                className="mb-4 flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors duration-200"
              >
                ← Back to options
              </button>

              <form onSubmit={handleSignup} className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />

                {contactType === "phone" && !showOtpInput && (
                  <div className="space-y-4">
                    <div className="flex space-x-2 relative" ref={dropdownRef}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 min-w-[100px] flex items-center justify-between"
                        >
                          <span className="text-sm">{countryCode}</span>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-hidden">
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
                            
                            <div className="max-h-40 overflow-y-auto">
                              {filteredCountries.map((country, idx) => (
                                <button
                                  key={`${country.code}-${idx}`}
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

                      <input
                        type="tel"
                        value={contact}
                        onChange={handlePhoneInput}
                        placeholder="Phone Number"
                        required
                        className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                        loading 
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                      }`}
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </button>
                    
                    <div id="recaptcha-container" className="flex justify-center"></div>
                  </div>
                )}

                {contactType === "phone" && showOtpInput && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-600">
                      <p className="text-sm text-gray-700 dark:text-slate-300 mb-1">
                        We've sent a 6-digit code to
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {countryCode} {contact}
                      </p>
                      {otpTimer > 0 && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                          Code expires in {otpTimer}s
                        </p>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength="6"
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />

                    {otpError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
                        {otpError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                        loading || otp.length !== 6
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                      }`}
                    >
                      {loading ? "Verifying..." : "Verify & Create Account"}
                    </button>

                    {canResendOtp && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtpInput(false);
                          setOtp("");
                          setOtpError("");
                          setOtpTimer(60);
                          setCanResendOtp(false);
                        }}
                        className="w-full text-sm text-blue-500 dark:text-yellow-400 hover:underline font-medium"
                      >
                        Resend OTP
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpInput(false);
                        setOtp("");
                        setOtpError("");
                        setOtpTimer(60);
                        setCanResendOtp(false);
                        if (window.recaptchaVerifier) {
                          window.recaptchaVerifier.clear();
                          window.recaptchaVerifier = null;
                        }
                      }}
                      className="w-full text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                    >
                      ← Change phone number
                    </button>
                  </div>
                )}

                {contactType === "email" && (
                  <>
                    <input
                      type="email"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                        loading 
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-blue-500 dark:bg-yellow-400 dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-yellow-300 hover:shadow-lg hover:scale-[1.02] shadow-md"
                      }`}
                    >
                      {loading ? "Creating..." : "Create Account"}
                    </button>
                  </>
                )}
              </form>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex-shrink-0 text-center text-sm text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700">
          Already have an account?{" "}
          <Link 
            to="/login" 
            className="text-blue-500 dark:text-yellow-400 font-semibold hover:underline transition-colors duration-200"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
