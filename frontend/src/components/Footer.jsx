// src/components/Footer.jsx
import React from "react";

function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-white/10 py-10">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="Syla logo"
            className="w-8 h-8 animate-float"
          />
          <span className="font-display text-lg tracking-wide">
            Syla <span className="text-neonBlue">Analytics</span>
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
          <a
            href="#"
            className="text-gray-600 hover:text-neonYellow transition
                       dark:text-slate-300 dark:hover:text-neonYellow"
          >
            Docs
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-neonYellow transition
                       dark:text-slate-300 dark:hover:text-neonYellow"
          >
            Templates
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-neonYellow transition
                       dark:text-slate-300 dark:hover:text-neonYellow"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-neonYellow transition
                       dark:text-slate-300 dark:hover:text-neonYellow"
          >
            Help
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-500 dark:text-slate-400">
          © {new Date().getFullYear()} Syla Analytics. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
