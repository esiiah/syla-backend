// frontend/src/components/Sidebar.jsx
import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart,
  Settings,
  HelpCircle,
  ArrowUpRight,
  BookOpen,
  Mail,
  LogIn,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

function Sidebar({ onReportChange, theme, setTheme }) {
  const [collapsed, setCollapsed] = useState(false);
  const [reportType, setReportType] = useState("Bar");

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } flex flex-col transition-all duration-300 relative
      bg-white text-gray-900 border-r border-gray-200
      dark:bg-black/30 dark:text-slate-200 dark:border-white/10`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 z-10 p-1.5 rounded-full
        bg-gray-200 dark:bg-black/50 border border-gray-300 dark:border-white/10
        hover:bg-gray-300 dark:hover:bg-white/10 transition"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-700 dark:text-slate-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-slate-300" />
        )}
      </button>

      {/* Nav links */}
      <div className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        {/* Overview */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <LayoutDashboard className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Overview</span>}
        </div>

        {/* Data Source */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <FolderOpen className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Data Source</span>}
        </div>

        {/* Reports with dropdown */}
        <div className="px-3">
          <div className="flex items-center rounded-lg cursor-pointer mb-2
          hover:bg-gray-100 dark:hover:bg-white/5 group">
            <BarChart className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
            {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Reports</span>}
          </div>
          {!collapsed && (
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                onReportChange?.(e.target.value);
              }}
              className="w-full mt-1 rounded-lg px-2 py-1 text-sm
              bg-gray-100 border border-gray-300 text-gray-800
              dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
            >
              <option>Bar</option>
              <option>Line</option>
              <option>Pie</option>
              <option>Map</option>
            </select>
          )}
        </div>

        {/* Settings */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <Settings className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Settings</span>}
        </div>

        {/* Help */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <HelpCircle className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Help</span>}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-white/10 my-3" />

        {/* Upgrade */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <ArrowUpRight className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Upgrade</span>}
        </div>

        {/* Docs */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <BookOpen className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Docs</span>}
        </div>

        {/* Contact */}
        <div className="flex items-center px-3 py-2 rounded-lg cursor-pointer
        hover:bg-gray-100 dark:hover:bg-white/5 group">
          <Mail className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300 group-hover:text-neonBlue" />
          {!collapsed && <span className="group-hover:text-black dark:group-hover:text-white">Contact</span>}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-white/10 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg
          bg-gray-100 hover:bg-gray-200 text-sm text-gray-800
          dark:bg-black/40 dark:hover:bg-white/5 dark:text-slate-200 transition"
        >
          {theme === "dark" ? (
            <>
              <Moon className="w-4 h-4 mr-2" />
              {!collapsed && "Dark Mode"}
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 mr-2 text-yellow-500" />
              {!collapsed && "Light Mode"}
            </>
          )}
        </button>

        {/* Auth buttons */}
        <button className="w-full flex items-center justify-center px-3 py-2 rounded-lg
        bg-gray-100 hover:bg-gray-200 text-sm text-gray-800
        dark:bg-black/40 dark:hover:bg-white/5 dark:text-slate-200 transition">
          <LogIn className="w-4 h-4 mr-2" />
          {!collapsed && "Log in"}
        </button>
        <button className="w-full flex items-center justify-center px-3 py-2 rounded-lg
        bg-neonBlue text-white shadow-neon hover:animate-glow text-sm transition">
          <UserPlus className="w-4 h-4 mr-2" />
          {!collapsed && "Sign up"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
