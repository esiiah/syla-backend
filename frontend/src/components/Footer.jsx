// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  // All file tool shortcuts
  const tools = [
    { title: "PDF → Word", path: "/tools/pdf-to-word" },
    { title: "PDF → Excel", path: "/tools/pdf-to-excel" },
    { title: "Merge PDF", path: "/tools/merge" },
    { title: "Compress PDF", path: "/tools/compress" },
    { title: "CSV → Excel", path: "/tools/csv-to-excel" },
    { title: "Excel → CSV", path: "/tools/excel-to-csv" },
    { title: "CSV → PDF", path: "/tools/csv-to-pdf" },
    { title: "Excel → PDF", path: "/tools/excel-to-pdf" },
    { title: "PDF → CSV", path: "/tools/pdf-to-csv" },
  ];

  return (
    <footer className="mt-16 border-t border-gray-300 bg-gray-700 dark:bg-slate-900 py-10">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-start justify-between gap-10">
        
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="Syla logo"
            className="w-8 h-8"
          />
          <span className="font-display text-lg tracking-wide text-white">
            Syla <span className="text-neonBlue">Analytics</span>
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* General */}
          <div>
            <h3 className="font-semibold text-gray-200 mb-3">
              General
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Help</a></li>
              <li><a href="#" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Pricing</a></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-gray-200 mb-3">
              Account
            </h3>
            <ul className="space-y-2">
              <li><Link to="/settings" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Settings</Link></li>
              <li><Link to="/login" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Log in</Link></li>
              <li><Link to="/signup" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Sign up</Link></li>
            </ul>
          </div>

          {/* File Tools */}
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-200 mb-3">
              File Tools
            </h3>
            <ul className="grid grid-cols-2 gap-y-2 gap-x-6">
              {tools.map((t, i) => (
                <li key={i}>
                  <Link
                    to={t.path}
                    className="text-gray-300 hover:text-neonYellow transition-colors duration-200"
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-10 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Syla Analytics. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
