// frontend/src/pages/NotificationPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { UserContext } from "../context/UserContext";
import { Bell, BellOff, Check, CheckCheck, Trash2, Archive, Filter, Search, Calendar, Clock, AlertCircle, Info, CheckCircle, XCircle,
  Settings, MoreVertical, Eye, EyeOff, Star, RefreshCw, ExternalLink, Download, FileText, Upload, TrendingUp
} from "lucide-react";

export default function NotificationPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState("all"); // all, unread, read, archived
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, priority
  const [showActions, setShowActions] = useState(false);
  const [stats, setStats] = useState(null);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
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
      } else {
        console.error('Failed to fetch notifications:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification statistics
  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    let filtered = notifications;

    // Filter by status
    if (filter === "unread") {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === "read") {
      filtered = filtered.filter(n => n.read);
    } else if (filter === "archived") {
      filtered = filtered.filter(n => n.archived);
    } else {
      filtered = filtered.filter(n => !n.archived);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return 0;
    });

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchQuery, sortBy]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "processing":
        return <RefreshCw className="w-4 h-4" />;
      case "export":
        return <Download className="w-4 h-4" />;
      case "upload":
        return <Upload className="w-4 h-4" />;
      case "report":
        return <FileText className="w-4 h-4" />;
      case "forecast":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diff = now - notificationTime;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const markAsRead = async (notificationIds) => {
    try {
      await fetch('/api/notifications/bulk-action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'read'
        })
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const markAsUnread = async (notificationIds) => {
    try {
      await fetch('/api/notifications/bulk-action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'unread'
        })
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => notificationIds.includes(n.id) ? { ...n, read: false } : n)
      );
    } catch (error) {
      console.error('Failed to mark notifications as unread:', error);
    }
  };

  const archiveNotifications = async (notificationIds) => {
    try {
      await fetch('/api/notifications/bulk-action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'archive'
        })
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => notificationIds.includes(n.id) ? { ...n, archived: true } : n)
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to archive notifications:', error);
    }
  };

  const unarchiveNotifications = async (notificationIds) => {
    try {
      await fetch('/api/notifications/bulk-action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'unarchive'
        })
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => notificationIds.includes(n.id) ? { ...n, archived: false } : n)
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to unarchive notifications:', error);
    }
  };

  const deleteNotifications = async (notificationIds) => {
    if (!confirm(`Are you sure you want to delete ${notificationIds.length} notification(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await fetch('/api/notifications/bulk-action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'delete'
        })
      });

      // Remove from local state
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  };

  const handleBulkAction = (action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    switch (action) {
      case "read":
        markAsRead(ids);
        break;
      case "unread":
        markAsUnread(ids);
        break;
      case "archive":
        archiveNotifications(ids);
        break;
      case "unarchive":
        unarchiveNotifications(ids);
        break;
      case "delete":
        deleteNotifications(ids);
        break;
    }
    setShowActions(false);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead([notification.id]);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      // Handle different types of action URLs
      if (notification.action_url.startsWith('http')) {
        // External URL
        window.open(notification.action_url, '_blank');
      } else {
        // Internal navigation
        navigate(notification.action_url);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        
        <div className="flex-1 transition-all duration-300">
          <Navbar />
          
          <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
            <div className="text-center py-16">
              <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">
                Sign In Required
              </h1>
              <p className="text-gray-600 dark:text-slate-400 mb-8">
                Please sign in to view your notifications and activity updates.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors duration-200 font-medium"
                >
                  Create Account
                </Link>
              </div>
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
        <Navbar />
        
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl text-gray-800 dark:text-slate-200 mb-2 flex items-center gap-3">
                <Bell className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-sm sm:text-base">
                Stay updated with your latest activity and system updates
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">Read All</span>
                </button>
              )}
              <button
                onClick={() => {
                  fetchNotifications();
                  fetchStats();
                }}
                className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-2 text-gray-700 dark:text-slate-300 text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Cards - Mobile Responsive */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600">
                <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-slate-200">{stats.total}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Total</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.unread}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Unread</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.read}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Read</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600">
                <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.archived}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Archived</div>
              </div>
            </div>
          )}

          {/* Controls Bar - Mobile Responsive */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 sm:p-6 mb-6 shadow-sm">
            <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-full lg:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Active</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">By Priority</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                  >
                    Actions ({selectedIds.size})
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                      <button
                        onClick={() => handleBulkAction("read")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Mark as Read
                      </button>
                      <button
                        onClick={() => handleBulkAction("unread")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300 text-sm"
                      >
                        <EyeOff className="w-4 h-4" />
                        Mark as Unread
                      </button>
                      {filter === "archived" ? (
                        <button
                          onClick={() => handleBulkAction("unarchive")}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300 text-sm"
                        >
                          <Archive className="w-4 h-4" />
                          Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBulkAction("archive")}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300 text-sm"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3 sm:space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-slate-400">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm">
                <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                  {searchQuery ? "No matching notifications" : filter === "archived" ? "No archived notifications" : "No notifications"}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm sm:text-base">
                  {searchQuery ? "Try adjusting your search terms." : filter === "archived" ? "Archived notifications will appear here." : "You're all caught up! New notifications will appear here."}
                </p>
              </div>
            ) : (
              <>
                {/* Select All */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredNotifications.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Select All ({filteredNotifications.length})
                  </span>
                </div>

                {/* Notification Items */}
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer ${
                      !notification.read ? 'ring-2 ring-blue-100 dark:ring-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Selection checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(notification.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelect(notification.id);
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        )}

                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-0">
                            <h3 className="font-semibold text-gray-900 dark:text-slate-200 text-sm sm:text-base line-clamp-2">
                              {notification.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 flex-shrink-0">
                              {notification.priority === "high" && (
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
                              )}
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              {formatTimestamp(notification.created_at)}
                            </div>
                          </div>
                          
                          <p className="text-gray-700 dark:text-slate-300 mb-3 text-sm sm:text-base line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                notification.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                notification.type === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                notification.type === "error" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}>
                                {getCategoryIcon(notification.category)}
                                {notification.category}
                              </span>
                              {!notification.read && (
                                <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                                  New
                                </span>
                              )}
                            </div>

                            {notification.action_url && (
                              <div className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium">
                                <span>View Details</span>
                                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Load More / Pagination could go here if needed */}
        </main>
      </div>
    </div>
  );
}
