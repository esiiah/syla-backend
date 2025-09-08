/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all relevant files for Tailwind classes
  content: ["./index.html", "./public/index.html", "./src/**/*.{js,jsx,ts,tsx,html}"],

  // Dark mode controlled by <body class="dark"> (set in App.jsx)
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        midnight: "#0f172a", // deep slate
        ink: "#0b1220", // darker panel bg
        neonBlue: "#2563eb", // primary blue
        neonYellow: "#facc15", // accent yellow
      },
      fontFamily: {
        display: ["Orbitron", "Inter", "system-ui"],
        body: ["Inter", "system-ui"],
      },
      boxShadow: {
        neon: "0 0 12px rgba(37, 99, 235, 0.45), 0 0 28px rgba(250, 204, 21, 0.25)",
        soft: "0 10px 25px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(37,99,235,.45)" },
          "50%": { boxShadow: "0 0 24px rgba(250,204,21,.45)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        glow: "glowPulse 2.6s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 1.75s linear infinite",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
      // Keep Tailwind’s default radius scale intact
    },
  },

  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography"), require("@tailwindcss/aspect-ratio")],
};
