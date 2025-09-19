// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Camera, Upload } from "lucide-react";

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
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

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
      setAvatarPreview(parsedUser.avatar_url || "");
    }
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(newTheme);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
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

      // Create FormData for file upload if avatar is present
      const formData = new FormData();
      formData.append("name", profileData.name);
      formData.append("email", profileData.email);
      formData.append("phone", profileData.phone);
      
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update profile");
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

  const handlePasswordChange = async (currentPassword, newPassword) => {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to change password");
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
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
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1 bg-neonBlue text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Profile Picture</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Upload a profile picture. JPG, PNG or GIF up to 5MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

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
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const currentPassword = prompt("Enter your current password:");
                        const newPassword = prompt("Enter your new password:");
                        if (currentPassword && newPassword) {
                          handlePasswordChange(currentPassword, newPassword);
                        }
                      }}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
                    >
                      Change Password
                    </button>
                    
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
                  </div>
                )}
              </div>
            </section>

            {/* Data & Privacy */}
            <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
              <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                Data & Privacy
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Data Usage</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your uploaded files are processed securely and are automatically deleted after processing. 
                    We don't store your data permanently.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all your uploaded files? This cannot be undone.")) {
                      // Call API to clear user files
                      fetch("/api/filetools/clear-user-files", {
                        method: "DELETE",
                        headers: {
                          "Authorization": `Bearer ${localStorage.getItem("token")}`
                        }
                      }).then(() => {
                        setMessage("All files cleared successfully!");
                      }).catch(() => {
                        setMessage("Failed to clear files.");
                      });
                    }
                  }}
                  className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium"
                >
                  Clear All Uploaded Files
                </button>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
              <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                Notifications
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Email Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Receive updates about your account and new features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Processing Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Get notified when file processing is complete</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
