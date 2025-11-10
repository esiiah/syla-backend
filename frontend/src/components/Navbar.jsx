// frontend/src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Settings, LogOut, Bell, Menu, 
  ChevronDown, HelpCircle, DollarSign
} from "lucide-react";
import { UserContext } from "../context/UserContext";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar"; // NEW IMPORT

const Logo = () => {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        SA
      </div>
    );
  }
  
  return (
    <img
      src="/favicon.png"
      alt="Syla Analytics Logo"
      className="w-8 h-8 rounded-xl flex-shrink-0"
      onError={() => setImageError(true)}
    />
  );
};

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useContext(UserContext);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

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

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

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

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getUserDisplay = () => {
    if (user?.avatar_url) {
      const avatarUrl = user.avatar_url.startsWith('http') 
        ? user.avatar_url 
        : user.avatar_url;
      
      return (
        <img 
          src={avatarUrl} 
          alt={user.name || 'User'} 
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          key={user.avatar_url}
          onError={(e) => {
            console.error("Avatar failed to load:", avatarUrl);
            e.target.style.display = 'none';
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex';
            }
          }}
        />
      );
    }
    
    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
        {initial}
      </div>
    );
  };

  if (!user) {
    return (
      <nav className="bg-white dark:bg-slate-900 shadow-sm" style={{ zIndex: 'var(--z-navbar)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
              <Logo />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 dark:text-slate-200 leading-tight truncate">
                  Syla Analytics
                </h1>
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 leading-tight truncate">
                  Futuristic Data Intelligence
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/login"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors rounded-md border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
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
    <>
      <nav className="bg-white dark:bg-slate-900 shadow-sm" style={{ zIndex: 'var(--z-navbar)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
              <Logo />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 dark:text-slate-200 leading-tight truncate">
                  Syla Analytics
                </h1>
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 leading-tight truncate">
                  Futuristic Data Intelligence
                </p>
              </div>
            </Link>

            {/* REPLACE OLD SEARCH WITH NEW SEARCHBAR COMPONENT */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <SearchBar />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Menu"
              >
                <Menu size={20} />
              </button>

              <div className="hidden md:flex items-center gap-1">
                <Link to="/help" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <HelpCircle size={18} className="text-gray-600 dark:text-slate-300" />
                </Link>

                <Link to="/pricing" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <DollarSign size={18} className="text-gray-600 dark:text-slate-300" />
                </Link>
              </div>        

              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div 
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg"  
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

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {getUserDisplay()}
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-slate-300 max-w-[80px] sm:max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className="hidden sm:block text-gray-500 flex-shrink-0" />
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

      {showSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
          
          <div className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 z-50 lg:hidden shadow-xl transform transition-transform duration-300">
            <Sidebar 
              onReportChange={() => {}} 
              theme={theme} 
              setTheme={setTheme}
              isMobile={true}
              onClose={() => setShowSidebar(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
