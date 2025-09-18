// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(savedTheme);

    // Load user data
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setProfileData({
        name: parsedUser.name || "",
        email: parsedUser.email || "",
        phone: parsedUser.phone || ""
      });
    }
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(newTheme);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to update profile");
      }

      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage("Profile updated successfully!");
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <main className="mx-auto max-w-4xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-gray-800 dark:text-slate-200 mb-2">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Manage your account preferences and profile information
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.includes("successfully") 
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-8">
            {/* Theme Settings */}
            <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
              <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                Appearance
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    Theme Preference
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleThemeChange("light")}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        theme === "light"
                          ? "border-neonBlue bg-neonBlue/10 text-neonBlue"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div className="font-medium">Light Mode</div>
                    </button>
                    
                    <button
                      onClick={() => handleThemeChange("dark")}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        theme === "dark"
                          ? "border-neonBlue bg-neonBlue/10 text-neonBlue"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <div className="font-medium">Dark Mode</div>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Profile Settings */}
            {user && (
              <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                  Profile Information
                </h2>
                
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({...prev, name: e.target.value}))}
                      className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                    />
                  </div>

                  {profileData.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                        className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                      />
                    </div>
                  )}

                  {profileData.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({...prev, phone: e.target.value}))}
                        className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      loading
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-neonBlue text-white hover:bg-blue-600 shadow-lg hover:shadow-neon"
                    }`}
                  >
                    {loading ? "Updating..." : "Update Profile"}
                  </button>
                </form>
              </section>
            )}

            {/* Account Actions */}
            <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
              <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                Account
              </h2>
              
              <div className="space-y-4">
                {!user ? (
                  <div className="flex gap-4">
                    <Link
                      to="/login"
                      className="px-6 py-3 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="px-6 py-3 border border-neonBlue text-neonBlue rounded-lg hover:bg-neonBlue hover:text-white transition-colors duration-200 font-medium"
                    >
                      Create Account
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      window.location.href = "/";
                    }}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
