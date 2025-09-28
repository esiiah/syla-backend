// frontend/src/pages/NotificationPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { UserContext } from "../context/UserContext";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  Filter,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Settings,
  MoreVertical,
  Eye,
  EyeOff,
  Star,
  RefreshCw
} from "lucide-react";

export default function NotificationPage() {
  const { user, theme, setTheme } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState("all"); // all, unread, read, archived
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, priority
  const [showActions, setShowActions] = useState(false);

  // Mock notifications data - replace with actual API calls
  const mockNotifications = [
    {
      id: 1,
      type: "success",
      title: "Chart Analysis Complete",
      message: "Your sales forecast visualization has been generated successfully. The data shows a 15% growth trend for Q4.",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      read: false,
      archived: false,
      priority: "high",
      category: "processing",
      actionUrl: "/charts/sales-forecast"
    },
    {
      id: 2,
      type: "info",
      title: "Data Export Ready",
      message: "Your CSV export containing 1,247 records is ready for download.",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      read: false,
      archived: false,
      priority: "medium",
      category: "export",
      actionUrl: "/exports/csv-1247"
    },
    {
      id: 3,
      type: "warning",
      title: "File Processing Delayed",
      message: "Your Excel file 'Q3_Reports.xlsx' is taking longer than expected due to high server load. Estimated completion in 5 minutes.",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: true,
      archived: false,
      priority: "medium",
      category: "processing"
    },
    {
      id: 4,
      type: "success",
      title: "Weekly Report Generated",
      message: "Your automated weekly analytics report is now available with insights from the past 7 days.",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      read: true,
      archived: false,
      priority: "low",
      category: "report",
      actionUrl: "/reports/weekly"
    },
    {
      id: 5,
      type: "error",
      title: "File Upload Failed",
      message: "Failed to upload 'large_dataset.csv'. File size exceeds the 50MB limit. Please compress or split the file.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      archived: false,
      priority: "high",
      category: "upload"
    },
    {
      id: 6,
      type: "info",
      title: "Account Security Update",
      message: "Your password was successfully changed. If this wasn't you, please contact support immediately.",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      read: true,
      archived: true,
      priority: "medium",
      category: "security"
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setNotifications(mockNotifications);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

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
        return b.timestamp - a.timestamp;
      } else if (sortBy === "oldest") {
        return a.timestamp - b.timestamp;
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

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
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

  const handleMarkAsRead = (ids) => {
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
    );
  };

  const handleMarkAsUnread = (ids) => {
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, read: false } : n)
    );
  };

  const handleArchive = (ids) => {
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, archived: true } : n)
    );
    setSelectedIds(new Set());
  };

  const handleUnarchive = (ids) => {
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, archived: false } : n)
    );
    setSelectedIds(new Set());
  };

  const handleDelete = (ids) => {
    if (confirm(`Are you sure you want to delete ${ids.length} notification(s)? This action cannot be undone.`)) {
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = (action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    switch (action) {
      case "read":
        handleMarkAsRead(ids);
        break;
      case "unread":
        handleMarkAsUnread(ids);
        break;
      case "archive":
        handleArchive(ids);
        break;
      case "unarchive":
        handleUnarchive(ids);
        break;
      case "delete":
        handleDelete(ids);
        break;
    }
    setShowActions(false);
  };

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        
        <div className="flex-1 transition-all duration-300">
          <Navbar user={user} />
          
          <main className="mx-auto max-w-4xl px-6 py-8">
            <div className="text-center py-16">
              <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-slate-200 mb-2">
                Sign In Required
              </h1>
              <p className="text-gray-600 dark:text-slate-400 mb-8">
                Please sign in to view your notifications and activity updates.
              </p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-gray-800 dark:text-slate-200 mb-2 flex items-center gap-3">
                <Bell className="w-8 h-8 text-neonBlue" />
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-slate-400">
                Stay updated with your latest activity and system updates
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 sm:mt-0 px-4 py-2 bg-white dark:bg-ink/80 border border-gray-200 dark:border-white/5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200 flex items-center gap-2 text-gray-700 dark:text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Controls Bar */}
          <div className="bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 p-6 mb-6 shadow-soft">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neonBlue focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neonBlue dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Active</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neonBlue dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
                    className="px-4 py-2 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2"
                  >
                    Actions ({selectedIds.size})
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                      <button
                        onClick={() => handleBulkAction("read")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300"
                      >
                        <Eye className="w-4 h-4" />
                        Mark as Read
                      </button>
                      <button
                        onClick={() => handleBulkAction("unread")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300"
                      >
                        <EyeOff className="w-4 h-4" />
                        Mark as Unread
                      </button>
                      {filter === "archived" ? (
                        <button
                          onClick={() => handleBulkAction("unarchive")}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300"
                        >
                          <Archive className="w-4 h-4" />
                          Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBulkAction("archive")}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-300"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
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
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-slate-400">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-soft">
                <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                  {searchQuery ? "No matching notifications" : filter === "archived" ? "No archived notifications" : "No notifications"}
                </h3>
                <p className="text-gray-600 dark:text-slate-400">
                  {searchQuery ? "Try adjusting your search terms." : filter === "archived" ? "Archived notifications will appear here." : "You're all caught up! New notifications will appear here."}
                </p>
              </div>
            ) : (
              <>
                {/* Select All */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredNotifications.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-neonBlue focus:ring-neonBlue"
                  />
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Select All ({filteredNotifications.length})
                  </span>
                </div>

                {/* Notification Items */}
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-soft overflow-hidden transition-all duration-200 hover:shadow-md ${
                      !notification.read && !notification.archived ? 'ring-2 ring-blue-100 dark:ring-blue-900/50' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Selection checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(notification.id)}
                          onChange={() => handleSelect(notification.id)}
                          className="mt-1 rounded border-gray-300 text-neonBlue focus:ring-neonBlue"
                        />

                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-slate-200 truncate">
                              {notification.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                              {notification.priority === "high" && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                              <Clock className="w-4 h-4" />
                              {formatTimestamp(notification.timestamp)}
                            </div>
                          </div>
                          
                          <p className="text-gray-700 dark:text-slate-300 mb-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                notification.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                notification.type === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                notification.type === "error" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}>
                                {notification.category}
                              </span>
                              {!notification.read && (
                                <span className="px-2 py-1 bg-neonBlue/10 text-neonBlue rounded text-xs font-medium">
                                  New
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {notification.actionUrl && (
                                <Link
                                  to={notification.actionUrl}
                                  className="text-neonBlue hover:text-blue-600 text-sm font-medium"
                                >
                                  View Details
                                </Link>
                              )}
                              
                              {/* Individual actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMarkAsRead([notification.id])}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                  title={notification.read ? "Mark as unread" : "Mark as read"}
                                >
                                  {notification.read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                
                                <button
                                  onClick={() => notification.archived ? handleUnarchive([notification.id]) : handleArchive([notification.id])}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                  title={notification.archived ? "Unarchive" : "Archive"}
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handleDelete([notification.id])}
                                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Pagination could go here if needed */}
        </main>
      </div>
    </div>
  );
}
