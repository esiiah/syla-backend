// src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";

function Navbar({ user }) {
  return (
    <nav className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-wide">
              Syla <span className="text-neonBlue">Analytics</span>
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400 -mt-0.5">
              Futuristic Data Intelligence
            </span>
          </div>
        </div>

        {/* Right Side - moved pricing here */}
        <div className="flex items-center gap-3">
          <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow hidden md:block">
            Pricing
          </a>
          
          {!user ? (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 dark:border-white/10 dark:text-slate-200 dark:hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded-xl bg-neonBlue text-white shadow-neon hover:animate-glow transition"
              >
                Sign up
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || "/default-avatar.png"}
                alt="User avatar"
                className="w-8 h-8 rounded-full border border-gray-300 dark:border-white/10"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                {user.name || "Profile"}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
