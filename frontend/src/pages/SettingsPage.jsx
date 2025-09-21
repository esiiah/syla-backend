// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Camera } from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function SettingsPage() {
  const { user, setUser } = useContext(UserContext);
  const [theme, setTheme] = useState("dark");
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load initial data
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(savedTheme);

    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || ""
      });
      setAvatarPreview(user.avatar_url || "");
    }
  }, [user]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(newTheme);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in to update profile");

      const formData = new FormData();
      formData.append("name", profileData.name);
      formData.append("email", profileData.email);
      formData.append("phone", profileData.phone);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await fetch("/api/profile/", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update profile");
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

  const handlePasswordChange = async () => {
    const currentPassword = prompt("Enter current password:");
    const newPassword = prompt("Enter new password:");
    if (!currentPassword || !newPassword) return;

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to change password");
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

          {user && (
            <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
              <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-4">
                Profile Information
              </h2>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1 bg-neonBlue text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Profile Picture</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Upload JPG, PNG, or GIF up to 5MB
                    </p>
                  </div>
                </div>

                {/* Name, Email, Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent"
                    />
                  </div>
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

              <div className="mt-6">
                <button
                  onClick={handlePasswordChange}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
                >
                  Change Password
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
