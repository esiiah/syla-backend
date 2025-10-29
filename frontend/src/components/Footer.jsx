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
      <div className="mx-auto max-w-7xl px-4">
        
        {/* Top Row: Logo + Navigation Grid */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
          
          {/* Logo + Title */}
          <div className="flex items-center gap-3 lg:w-64">
            <img
              src="/favicon.png"
              alt="Syla logo"
              className="w-8 h-8"
            />
            <span className="font-display text-lg tracking-wide text-white">
              Syla <span className="text-neonBlue">Analytics</span>
            </span>
          </div>

          {/* Navigation Sections - Justified Grid */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 text-sm">
              
              {/* General */}
              <div>
                <h3 className="font-semibold text-gray-200 mb-3">
                  General
                </h3>
                <ul className="space-y-2">
                  <li><Link to="/help" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Help</Link></li>
                  <li><Link to="/pricing" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Pricing</Link></li>
                  <li><Link to="/docs" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Docs</Link></li>
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

              {/* File Tools - Split into 2 columns */}
              <div>
                <h3 className="font-semibold text-gray-200 mb-3">
                  PDF Tools
                </h3>
                <ul className="space-y-2">
                  <li><Link to="/tools/pdf-to-word" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">PDF → Word</Link></li>
                  <li><Link to="/tools/pdf-to-excel" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">PDF → Excel</Link></li>
                  <li><Link to="/tools/pdf-to-csv" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">PDF → CSV</Link></li>
                  <li><Link to="/tools/merge" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Merge PDF</Link></li>
                  <li><Link to="/tools/compress" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Compress PDF</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-3">
                  Converters
                </h3>
                <ul className="space-y-2">
                  <li><Link to="/tools/csv-to-excel" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">CSV → Excel</Link></li>
                  <li><Link to="/tools/excel-to-csv" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Excel → CSV</Link></li>
                  <li><Link to="/tools/csv-to-pdf" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">CSV → PDF</Link></li>
                  <li><Link to="/tools/excel-to-pdf" className="text-gray-300 hover:text-neonYellow transition-colors duration-200">Excel → PDF</Link></li>
                </ul>
              </div>
              
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-gray-600 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Syla Analytics. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
