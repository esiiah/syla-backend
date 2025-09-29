// frontend/src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Settings, LogOut, Bell, Search, Menu, 
  ChevronDown, Sun, Moon, HelpCircle, Zap
} from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useContext(UserContext);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Initial notification fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Fetch search results
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
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

  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ read: true })
      });

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setShowNotifications(false);
  };

  const handleSearchResultClick = (result) => {
    if (result.url) {
      navigate(result.url);
    }
    setShowSearchResults(false);
    setSearchQuery("");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get user avatar/initial
  const getUserDisplay = () => {
    if (user?.avatar_url) {
      return (
        <img 
          src={user.avatar_url} 
          alt={user.name || 'User'} 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    
    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
        {initial}
      </div>
    );
  };

  if (!user) {
    return (
      <nav className="bg-white dark:bg-slate-900 shadow-sm" style={{ zIndex: 'var(--z-navbar)' }}>
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
    <nav className="bg-white dark:bg-slate-900 shadow-sm" style={{ zIndex: 'var(--z-navbar)' }}>
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
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search charts, data, or ask questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div 
                  className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                  style={{ zIndex: 'var(--z-dropdowns)' }}
                >
                  {loading ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-slate-200">
                          {result.title}
                        </div>
                        {result.description && (
                          <div className="text-sm text-gray-600 dark:text-slate-400">
                            {result.description}
                          </div>
                        )}
                        {result.type && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {result.type}
                          </div>
                        )}
                      </button>
                    ))
                  ) : searchQuery && (
                    <div className="p-3 text-center text-gray-500">
                      No results found
                    </div>
                  )}
                </div>
              )}
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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg" 
                  style={{ zIndex: 'var(--z-dropdowns)' }}
                >
                  <div className="p-3 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 dark:text-slate-200">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-3 text-left border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                            !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800 dark:text-slate-200">
                                {notification.title}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">
                                {notification.message}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200 dark:border-slate-600">
                    <Link 
                      to="/notifications" 
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => setShowNotifications(false)}
                    >
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
                {getUserDisplay()}
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {user.name}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg" 
                  style={{ zIndex: 'var(--z-dropdowns)' }}
                >
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
