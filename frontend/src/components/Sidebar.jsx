import React from "react";

function Sidebar({ open = true }) {
  const sections = [
    { name: "Overview", icon: "📊", active: true },
    { name: "Data Source", icon: "📂" },
    { name: "Reports", icon: "📝" },
    { name: "Settings", icon: "⚙️" },
    { name: "Help", icon: "❓" },
  ];

  return (
    <aside
      className={`fixed right-0 top-0 h-full w-20 lg:w-60 bg-ink/90 border-l border-white/5 shadow-soft transition-all duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col items-center lg:items-start px-2 lg:px-4 py-6 space-y-4">
        {/* Logo */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <img src="/favicon.png" alt="Syla Logo" className="w-8 h-8 animate-float" />
          <span className="font-display text-neonBlue text-lg tracking-wide">
            Syla
          </span>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <button
            key={section.name}
            className={`flex items-center w-full px-3 py-2 rounded-xl transition-all duration-200
              ${section.active ? "bg-neonBlue/20 text-neonBlue" : "text-slate-400 hover:bg-neonBlue/10 hover:text-neonYellow"}
              `}
          >
            <span className="text-lg mr-2">{section.icon}</span>
            <span className="hidden lg:inline font-medium">{section.name}</span>
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Footer Links */}
        <div className="hidden lg:flex flex-col space-y-2 text-slate-400 text-sm">
          <a href="#" className="hover:text-neonYellow transition">Upgrade</a>
          <a href="#" className="hover:text-neonYellow transition">Docs</a>
          <a href="#" className="hover:text-neonYellow transition">Contact</a>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
