// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
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

function Sidebar({ onReportChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const [reportType, setReportType] = useState("Bar");
  const [theme, setTheme] = useState("dark");

  // apply theme class to body
  useEffect(() => {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-black/30 border-r border-white/10 text-slate-200 flex flex-col transition-all duration-300 relative`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 z-10 p-1.5 rounded-full bg-black/50 border border-white/10 hover:bg-white/10 transition"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        )}
      </button>

      <div className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        {/* Overview */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <LayoutDashboard className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Overview</span>}
        </div>

        {/* Data Source */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <FolderOpen className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Data Source</span>}
        </div>

        {/* Reports with dropdown */}
        <div className="px-3">
          <div className="flex items-center rounded-lg hover:bg-white/5 group cursor-pointer mb-2">
            <BarChart className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
            {!collapsed && <span className="group-hover:text-white">Reports</span>}
          </div>
          {!collapsed && (
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                onReportChange?.(e.target.value);
              }}
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-200"
            >
              <option>Bar</option>
              <option>Line</option>
              <option>Pie</option>
              <option>Map</option>
            </select>
          )}
        </div>

        {/* Settings */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <Settings className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Settings</span>}
        </div>

        {/* Help */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <HelpCircle className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Help</span>}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-3" />

        {/* Upgrade */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <ArrowUpRight className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Upgrade</span>}
        </div>

        {/* Docs */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <BookOpen className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Docs</span>}
        </div>

        {/* Contact */}
        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer">
          <Mail className="w-4 h-4 mr-2 text-slate-300 group-hover:text-neonBlue transition" />
          {!collapsed && <span className="group-hover:text-white">Contact</span>}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-black/40 hover:bg-white/5 text-sm text-slate-200 transition"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 mr-2 text-yellow-400" />
              {!collapsed && "Light Mode"}
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2 text-slate-700" />
              {!collapsed && "Dark Mode"}
            </>
          )}
        </button>

        {/* Auth buttons */}
        <button className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-black/40 hover:bg-white/5 text-sm text-slate-200 transition">
          <LogIn className="w-4 h-4 mr-2" />
          {!collapsed && "Log in"}
        </button>
        <button className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-neonBlue text-white shadow-neon hover:animate-glow text-sm transition">
          <UserPlus className="w-4 h-4 mr-2" />
          {!collapsed && "Sign up"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
