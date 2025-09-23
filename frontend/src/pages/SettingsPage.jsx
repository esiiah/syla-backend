// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Palette, User, Settings, Shield, Bell } from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function SettingsPage() {
  const { user, theme, setTheme, logout } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("appearance");
  const navigate = useNavigate();

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handlePasswordChange = async (currentPassword, newPassword) => {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in to change password");

      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
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
      if (!token) throw new Error("Please log in to clear files");

      const res = await fetch("/api/filetools/clear-user-files", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to clear files");

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
    { id: "notifications", label: "Notifications", icon: Bell },
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
            <div
              className={`mb-6 p-4 rounded-lg border ${
                message.includes("successfully")
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Tabs Navigation */}
            <div className="lg:w-64">
              <nav className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-2 shadow-soft">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
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
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tabs Content */}
            <div className="flex-1">
              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Appearance Preferences
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleThemeChange("light")}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                        theme === "light"
                          ? "border-neonBlue bg-neonBlue/10 text-neonBlue ring-2 ring-neonBlue/20"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                      }`}
                    >
                      Light Mode
                    </button>
                    <button
                      onClick={() => handleThemeChange("dark")}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                        theme === "dark"
                          ? "border-neonBlue bg-neonBlue/10 text-neonBlue ring-2 ring-neonBlue/20"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-slate-300"
                      }`}
                    >
                      Dark Mode
                    </button>
                  </div>
                </section>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  {user ? (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 mx-auto text-neonBlue mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                        Manage Your Profile
                      </h3>
                      <button
                        onClick={() => navigate("/profile")}
                        className="px-6 py-3 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium shadow-lg hover:shadow-neon"
                      >
                        Go to Profile Settings
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                        Sign in to access your profile
                      </h3>
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

              {/* Account Tab */}
              {activeTab === "account" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Account Management
                  </h2>
                  {!user ? (
                    <div className="text-center py-8">
                      <div className="mb-6">
                        <svg
                          className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
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
                            loading ? "bg-gray-400 text-gray-600 cursor-not-allowed" : "bg-gray-500 text-white hover:bg-gray-600"
                          }`}
                        >
                          {loading ? "Changing..." : "Change Password"}
                        </button>
                      </div>

                      <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                        <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-3">Account Actions</h3>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to sign out?")) logout();
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Privacy & Notifications Tabs remain unchanged */}
              {activeTab === "privacy" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  {/* ...existing privacy content unchanged */}
                </section>
              )}

              {activeTab === "notifications" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  {/* ...existing notifications content unchanged */}
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
