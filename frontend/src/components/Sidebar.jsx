import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  FilePlus,
  FileText,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";

function Sidebar({ onReportChange, theme, setTheme }) {
  const [collapsed, setCollapsed] = useState(true);
  const [reportType, setReportType] = useState("Bar");
  const [toolsOpen, setToolsOpen] = useState(false);

  // Updated tool ordering
  const tools = [
    { title: "PDF → Word", path: "/tools/pdf-to-word", icon: FileText },
    { title: "PDF → Excel", path: "/tools/pdf-to-excel", icon: FileSpreadsheet },
    { title: "Merge PDF", path: "/tools/merge", icon: FilePlus },
    { title: "Compress PDF", path: "/tools/compress", icon: FileArchive },
    { title: "CSV → Excel", path: "/tools/csv-to-excel", icon: FileSpreadsheet },
    { title: "Excel → CSV", path: "/tools/excel-to-csv", icon: FileText },
    { title: "CSV → PDF", path: "/tools/csv-to-pdf", icon: FileText },
    { title: "Excel → PDF", path: "/tools/excel-to-pdf", icon: FileText },
    { title: "PDF → Excel (alt)", path: "/tools/pdf-to-excel", icon: FileSpreadsheet },
    { title: "PDF → CSV", path: "/tools/pdf-to-csv", icon: FileText },
  ];

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} flex flex-col transition-all duration-300 relative
      bg-white text-gray-900 border-r border-gray-200
      dark:bg-ink/80 dark:text-slate-200 dark:border-white/5 rounded-r-2xl shadow-soft neon-border`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 z-10 p-1.5 rounded-full
        bg-gray-200 dark:bg-black/50 border border-gray-300 dark:border-white/10
        hover:bg-gray-300 dark:hover:bg-white/10 transition"
      >
        {collapsed ? (
          <svg className="w-4 h-4 text-gray-700 dark:text-slate-300" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        ) : (
          <svg className="w-4 h-4 text-gray-700 dark:text-slate-300" viewBox="0 0 24 24"><path d="M16 19V5L5 12z" /></svg>
        )}
      </button>

      {/* Nav links */}
      <div className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        <Link to="/" className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
          <LayoutDashboard className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
          {!collapsed && <span>Overview</span>}
        </Link>

        <div className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
          <FolderOpen className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
          {!collapsed && <span>Data Source</span>}
        </div>

        <div className="px-3">
          <div className="flex items-center rounded-lg cursor-pointer mb-2 hover:bg-gray-100 dark:hover:bg-white/5 group">
            <BarChart className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
            {!collapsed && <span>Reports</span>}
          </div>
          {!collapsed && (
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                onReportChange?.(e.target.value);
              }}
              className="w-full mt-1 rounded-lg px-2 py-1 text-sm bg-gray-100 border border-gray-300 text-gray-800 dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
            >
              <option>Bar</option>
              <option>Line</option>
              <option>Pie</option>
              <option>Map</option>
            </select>
          )}
        </div>

        {/* File Tools Section */}
        <div className="mt-3 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FilePlus className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
              {!collapsed && <span className="font-medium">File Tools</span>}
            </div>
            {!collapsed && (
              <button onClick={() => setToolsOpen(!toolsOpen)} className="text-xs px-2 py-1 rounded border">
                {toolsOpen ? "Hide" : "Show"}
              </button>
            )}
          </div>

          {!collapsed && toolsOpen && (
            <div className="mt-2 space-y-1">
              {tools.map((t, i) => (
                <Link key={i} to={t.path} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/5">
                  <t.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">{t.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings + Help */}
        <div className="mt-4 px-3">
          <div className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
            <Settings className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
            {!collapsed && <span>Settings</span>}
          </div>
          <div className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
            <HelpCircle className="w-4 h-4 mr-2 text-gray-600 dark:text-slate-300" />
            {!collapsed && <span>Help</span>}
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-white/10 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-800 dark:bg-black/40 dark:hover:bg-white/5 dark:text-slate-200 transition"
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

        {/* Login / Signup */}
        <Link
          to="/login"
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-800 dark:bg-black/40 dark:hover:bg-white/5 dark:text-slate-200 transition"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"/></svg>
          {!collapsed && "Log in"}
        </Link>

        <Link
          to="/signup"
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-neonBlue text-white shadow-neon hover:animate-glow text-sm transition"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M12 2v20"/></svg>
          {!collapsed && "Sign up"}
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
