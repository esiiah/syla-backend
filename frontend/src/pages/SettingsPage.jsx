// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ProfilePage from "./ProfilePage";
import { Palette, User, Settings, Shield, Bell } from "lucide-react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("appearance");

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
    }
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(newTheme);
  };

  const handlePasswordChange = async (currentPassword, newPassword) => {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to change password");
      }

      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to change password");
      }

      setMessage("Password changed successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearUserFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to clear files");
      }

      const res = await fetch("/api/filetools/clear-user-files", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to clear files");
      }

      setMessage("All files cleared successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const tabs = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "profile", label: "Profile", icon: User },
    { id: "account", label: "Account", icon: Settings },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-gray-800 dark:text-slate-200 mb-2">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Manage your account preferences and application settings
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

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Settings Navigation */}
            <div className="lg:w-64">
              <nav className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-2 shadow-soft">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 ${
                        activeTab === tab.id
                          ? "bg-neonBlue text-white shadow-lg"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1">
              {activeTab === "appearance" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Appearance Preferences
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
                        Theme Preference
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => handleThemeChange("light")}
                          className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                            theme === "light"
                              ? "border-neonBlue bg-neonBlue/10 text-neonBlue ring-2 ring-neonBlue/20"
                              : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center mb-3 p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div className="font-semibold text-lg mb-1">Light Mode</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              Clean and bright interface
                            </div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => handleThemeChange("dark")}
                          className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                            theme === "dark"
                              ? "border-neonBlue bg-neonBlue/10 text-neonBlue ring-2 ring-neonBlue/20"
                              : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center mb-3 p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            </div>
                            <div className="font-semibold text-lg mb-1">Dark Mode</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              Easy on the eyes
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "profile" && (
                <div className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Profile Information
                  </h2>
                  {user ? (
                    <ProfilePage />
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                        Sign in to access your profile
                      </h3>
                      <p className="text-gray-600 dark:text-slate-400 mb-6">
                        Create an account or sign in to manage your profile information
                      </p>
                      <div className="flex justify-center gap-4">
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
                    </div>
                  )}
                </div>
              )}

              {activeTab === "account" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Account Management
                  </h2>
                  
                  <div className="space-y-6">
                    {!user ? (
                      <div className="text-center py-8">
                        <div className="mb-6">
                          <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                            Sign in to access account features
                          </h3>
                          <p className="text-gray-600 dark:text-slate-400">
                            Create an account or sign in to manage your profile and preferences
                          </p>
                        </div>
                        <div className="flex justify-center gap-4">
                          <Link
                            to="/login"
                            className="px-6 py-3 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium shadow-lg hover:shadow-neon"
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
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Account Status</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Signed in as <strong>{user.email || user.phone}</strong>
                          </p>
                        </div>

                        <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                          <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-3">Password & Security</h3>
                          <button
                            onClick={() => {
                              const currentPassword = prompt("Enter your current password:");
                              const newPassword = prompt("Enter your new password:");
                              if (currentPassword && newPassword) {
                                if (newPassword.length < 6) {
                                  alert("New password must be at least 6 characters long");
                                  return;
                                }
                                handlePasswordChange(currentPassword, newPassword);
                              }
                            }}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                              loading
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-gray-500 text-white hover:bg-gray-600"
                            }`}
                          >
                            {loading ? "Changing..." : "Change Password"}
                          </button>
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                          <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-3">Account Actions</h3>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to sign out?")) {
                                localStorage.removeItem("token");
                                localStorage.removeItem("user");
                                window.location.href = "/";
                              }
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "privacy" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Data & Privacy
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Data Usage Policy
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your uploaded files are processed securely and are automatically deleted after processing. 
                        We don't store your data permanently and use industry-standard encryption.
                      </p>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                      <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-3">File Management</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                        Remove all your uploaded files from our servers. This action cannot be undone.
                      </p>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to clear all your uploaded files? This cannot be undone.")) {
                            clearUserFiles();
                          }
                        }}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium"
                      >
                        Clear All Uploaded Files
                      </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                      <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-3">Data Export</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                        Request a copy of your personal data stored on our platform.
                      </p>
                      <button
                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/5 transition-colors duration-200 font-medium"
                        onClick={() => alert("Data export functionality will be available soon.")}
                      >
                        Request Data Export
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "notifications" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Notification Preferences
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email Notifications
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          Receive updates about your account and new features
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Processing Notifications
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          Get notified when file processing is complete
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Security Alerts
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          Receive notifications about security events
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
