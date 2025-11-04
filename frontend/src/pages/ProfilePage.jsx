// frontend/src/pages/ProfilePage.jsx
import React, { useContext, useState, useRef, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { 
  User, Camera, Save, Trash2, Eye, EyeOff, MapPin, Briefcase, Globe, Calendar,Mail,Phone,Building, FileText, Languages, Clock
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser, loading: userLoading } = useContext(UserContext);
  const [theme, setTheme] = useState("dark");

  // Profile form states
  const [formData, setFormData] = useState({
    name: "",  email: "", phone: "", bio: "", location: "", website: "", company: "", job_title: "",
    birth_date: "", gender: "", language: "en", timezone: "UTC"
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const fileInputRef = useRef(null);

// Load theme and user data on component mount
useEffect(() => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);

  if (user) {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      company: user.company || "",
      job_title: user.job_title || "",
      birth_date: user.birth_date || "",
      gender: user.gender || "",
      language: user.language || "en",
      timezone: user.timezone || "UTC"
    });
  }
}, [user]);

useEffect(() => {
  // Wait for user context to load properly
  const timer = setTimeout(() => {
    if (!userLoading) setLoading(false);
  }, 500);
  return () => clearTimeout(timer);
}, [userLoading]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage("Invalid file type. Please select an image file (JPEG, PNG, GIF, WebP).");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setMessage("File too large. Please select an image smaller than 5MB.");
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Also update the removeAvatar function:
  const removeAvatar = async () => {
    try {
     const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
       const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to remove avatar");
     }

      const updatedUser = await response.json();
    
     // CRITICAL FIX: Update context
     setUser(updatedUser);
    
      setAvatarFile(null);
      setAvatarPreview(null);
     setMessage("Avatar removed successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
     setMessage(`Failed to remove avatar: ${error.message}`);
    }
  };
  
  const saveProfile = async () => {
   setLoading(true);
    setMessage("");

    try {
      const formDataToSend = new FormData();
    
      // Add all form fields
     Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value || "");
     });

      // Add avatar if selected
     if (avatarFile) {
       formDataToSend.append("avatar", avatarFile);
     }

      const response = await fetch("/api/profile", {
        method: "PUT",
       body: formDataToSend,
       credentials: "include"
     });

     if (!response.ok) {
       const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to update profile");
      }

      const updatedUser = await response.json();
    
     // CRITICAL FIX: Update context to trigger re-render across all components
     setUser(updatedUser);
    
      setMessage("Profile updated successfully!");
     setAvatarFile(null);
      setAvatarPreview(null);
    
     setTimeout(() => setMessage(""), 3000);
   } catch (error) {
     setMessage(`Failed to update profile: ${error.message}`);
    } finally {
     setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage("New passwords don't match!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage("New password must be at least 6 characters long!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("current_password", passwordData.currentPassword);
      formData.append("new_password", passwordData.newPassword);

      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to change password");
      }

      setMessage("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`Failed to change password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (userLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        <div className="flex-1 transition-all duration-300">
          <Navbar user={user} />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto border-4 border-neonBlue border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-slate-400">Loading profile...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        <div className="flex-1 transition-all duration-300">
          <Navbar user={user} />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <div className="text-center py-16">
              <User className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-200 mb-2">
                Sign in to access your profile
              </h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Please sign in to view and manage your profile settings
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-gray-800 dark:text-slate-200 mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Manage your personal information and account preferences
            </p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.includes("successfully") || message.includes("Success")
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            }`}>
              {message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Profile Navigation */}
            <div className="lg:w-64">
              <nav className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-2 shadow-soft sticky top-8">
                <button
                  onClick={() => setActiveTab("personal")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 mb-2 ${
                    activeTab === "personal"
                      ? "bg-neonBlue text-white shadow-lg"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <User className="w-5 h-5" />
                  Personal Info
                </button>
                
                <button
                  onClick={() => setActiveTab("professional")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 mb-2 ${
                    activeTab === "professional"
                      ? "bg-neonBlue text-white shadow-lg"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  Professional
                </button>
                
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 ${
                    activeTab === "security"
                      ? "bg-neonBlue text-white shadow-lg"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  Security
                </button>
              </nav>
            </div>

            {/* Profile Content */}
            <div className="flex-1">
              {activeTab === "personal" && (
                <div className="space-y-8">
                  {/* Avatar Section */}
                  <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                    <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                      Profile Photo
                    </h2>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-white/10 shadow-lg">
                          <img
                            src={avatarPreview || user.avatar_url || "/default-avatar.png"}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-neonBlue text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors duration-200"
                        >
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                      
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-medium text-gray-900 dark:text-slate-200 mb-2">
                          Update your photo
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                          Choose a photo that represents you well. Max file size: 5MB
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors duration-200 font-medium"
                          >
                            Choose File
                          </button>
                          {(user.avatar_url || avatarPreview) && (
                            <button
                              onClick={removeAvatar}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Basic Information */}
                  <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                    <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                      Basic Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                          placeholder="Enter your email address"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <MapPin className="w-4 h-4 inline mr-2" />
                          Location
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                          placeholder="City, Country"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => handleInputChange("birth_date", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => handleInputChange("gender", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <Globe className="w-4 h-4 inline mr-2" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => handleInputChange("website", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        <FileText className="w-4 h-4 inline mr-2" />
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200 resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </section>
                  
                  {/* Preferences */}
                  <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                    <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                      Preferences
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <Languages className="w-4 h-4 inline mr-2" />
                          Language
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) => handleInputChange("language", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="zh">Chinese</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Timezone
                        </label>
                        <select
                          value={formData.timezone}
                          onChange={(e) => handleInputChange("timezone", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Asia/Shanghai">Shanghai (CST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT)</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "professional" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Professional Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        <Building className="w-4 h-4 inline mr-2" />
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        placeholder="Your company name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        <Briefcase className="w-4 h-4 inline mr-2" />
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.job_title}
                        onChange={(e) => handleInputChange("job_title", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                        placeholder="Your job title"
                      />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "security" && (
                <section className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-soft">
                  <h2 className="font-display text-xl text-gray-800 dark:text-slate-200 mb-6">
                    Security Settings
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-1">
                        Password Security
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Keep your account secure by using a strong password and changing it regularly.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                            placeholder="Enter your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Password must be at least 6 characters long
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-neonBlue focus:border-transparent bg-white dark:bg-white/5 text-gray-900 dark:text-slate-200 transition-colors duration-200"
                          placeholder="Confirm your new password"
                        />
                      </div>
                      
                      <button
                        onClick={changePassword}
                        disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                          loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl"
                        }`}
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        {loading ? "Changing Password..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Save Button */}
              {(activeTab === "personal" || activeTab === "professional") && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={loading}
                    className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-neonBlue text-white hover:bg-blue-600 shadow-lg hover:shadow-neon"
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}                 
