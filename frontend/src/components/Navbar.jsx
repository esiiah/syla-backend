// frontend/src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Settings, LogOut, Bell, Search, Menu, 
  ChevronDown, Sun, Moon, HelpCircle, Zap
} from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const { logout, theme, setTheme } = useContext(UserContext);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const response = await fetch(`/api/search?q=${searchQuery}`);
  const results = await response.json();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setShowUserMenu(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const mockNotifications = [
    { id: 1, title: "Chart Analysis Complete", message: "Your sales forecast is ready", time: "2m ago" },
    { id: 2, title: "Data Export Ready", message: "CSV file has been generated", time: "1h ago" },
    { id: 3, title: "Weekly Report", message: "Your analytics summary is available", time: "1d ago" }
  ];

  if (!user) {
    return (
      <nav className="bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Syla Analytics Logo"
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                  Syla Analytics
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Futuristic Data Intelligence
                </p>
              </div>
            </Link>

            {/* Right side - Auth buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
              >
                Sign In
              </Link>
              
              <Link
                to="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Syla Analytics Logo"
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                Syla Analytics
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Futuristic Data Intelligence
              </p>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search charts, data, or ask questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Help */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Help & Support"
            >
              <HelpCircle size={20} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Notifications"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-slate-600">
                    <h3 className="font-medium text-gray-800 dark:text-slate-200">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {mockNotifications.map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                        <div className="font-medium text-sm text-gray-800 dark:text-slate-200">
                          {notification.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                          {notification.time}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <Link to="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {user.name}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-slate-600">
                    <div className="font-medium text-gray-800 dark:text-slate-200">{user.name}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">{user.email}</div>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-slate-600 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
