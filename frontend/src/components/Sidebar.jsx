import React from "react";
import {
  Home,
  Database,
  BarChart2,
  Settings,
  HelpCircle
} from "lucide-react";

function Sidebar({ open }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-ink/90 border-r border-white/5 shadow-lg backdrop-blur-lg transition-all duration-300 
      ${open ? "w-64" : "w-16"}`}
    >
      <div className="flex flex-col h-full">
        {/* Menu Items */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink/60 text-slate-200 transition"
          >
            <Home className="w-5 h-5 text-neonBlue" />
            {open && <span>Overview</span>}
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink/60 text-slate-200 transition"
          >
            <Database className="w-5 h-5 text-neonYellow" />
            {open && <span>Data Source</span>}
          </a>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink/60 text-slate-200 transition">
            <BarChart2 className="w-5 h-5 text-green-400" />
            {open && (
              <select
                defaultValue="bar"
                className="bg-ink/80 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-neonBlue/50"
              >
                <option value="bar">Bar</option>
                <option value="line" disabled>Line (soon)</option>
                <option value="scatter" disabled>Scatter (soon)</option>
                <option value="map" disabled>Map (soon)</option>
              </select>
            )}
          </div>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink/60 text-slate-200 transition"
          >
            <Settings className="w-5 h-5 text-pink-400" />
            {open && <span>Settings</span>}
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink/60 text-slate-200 transition"
          >
            <HelpCircle className="w-5 h-5 text-red-400" />
            {open && <span>Help</span>}
          </a>
        </nav>

        {/* Bottom Links */}
        <div className="px-3 py-4 border-t border-white/10">
          {open ? (
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <a href="#" className="hover:text-neonBlue">Upgrade</a>
              <a href="#" className="hover:text-neonBlue">Docs</a>
              <a href="#" className="hover:text-neonBlue">Contact</a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-400 text-xs">
              <span>↑</span>
              <span>?</span>
              <span>⚙</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
