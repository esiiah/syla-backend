// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload.jsx";
import ChartView from "./components/ChartView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import "./App.css";

function App() {
  const [data, setData] = useState([]);       // cleaned rows
  const [columns, setColumns] = useState([]); // column names
  const [types, setTypes] = useState({});     // {"col": "numeric" | "categorical" | "datetime"}
  const [summary, setSummary] = useState({}); // numeric stats

  // Sidebar + theme state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // install prompt handling
    let deferredPrompt;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    // initial theme
    document.body.classList.add("dark");
  }, []);

  // Apply theme when toggled
  useEffect(() => {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen overflow-x-hidden relative bg-ink/90">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        theme={theme}
        setTheme={setTheme}
        onReportChange={() => {}}
      />

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-0" : "ml-0"
        }`}
      >
        {/* NAVBAR */}
        <nav className="sticky top-0 z-20 backdrop-blur bg-ink/80 border-b border-white/5 shadow-soft">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Syla logo"
                className="w-8 h-8 animate-float"
              />
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg tracking-wide">
                  Syla <span className="text-neonBlue">Analytics</span>
                </span>
                <span className="text-xs text-slate-400 -mt-0.5">
                  Futuristic Data Intelligence
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a
                href="#"
                className="text-slate-300 hover:text-neonYellow transition"
              >
                Docs
              </a>
              <a
                href="#"
                className="text-slate-300 hover:text-neonYellow transition"
              >
                Templates
              </a>
              <a
                href="#"
                className="text-slate-300 hover:text-neonYellow transition"
              >
                Pricing
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-200 hover:text-white hover:border-neonBlue/60 transition">
                Log in
              </button>
              <button className="px-4 py-1.5 rounded-xl bg-neonBlue text-white shadow-neon hover:animate-glow transition">
                Sign up
              </button>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          {/* Hero */}
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl tracking-wide">
              Upload. Clean.{" "}
              <span className="text-neonYellow">Visualize.</span>
            </h1>
            <p className="text-slate-300 mt-2 max-w-2xl">
              A next-gen analytics studio. Drop your files, explore instant
              insights, and export visuals — all in an AI-tech, cyberpunk
              inspired interface.
            </p>
          </header>

          {/* Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Panel */}
            <section className="lg:col-span-1 rounded-2xl bg-ink/80 border border-white/5 shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-1">Upload Data</h2>
                <p className="text-slate-400 text-sm mb-4">
                  CSV now. (PDF/ZIP coming next.) Preview & progress included.
                </p>
                <FileUpload
                  onData={setData}
                  onColumns={setColumns}
                  onTypes={setTypes}
                  onSummary={setSummary}
                />
              </div>
            </section>

            {/* Chart Panel */}
            <section className="lg:col-span-2 rounded-2xl bg-ink/80 border border-white/5 shadow-soft neon-border">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg">Visualization</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Chart:</span>
                    <div className="relative">
                      <select
                        className="appearance-none bg-ink/80 border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-neonBlue/50"
                        defaultValue="bar"
                        onChange={() => {}}
                      >
                        <option value="bar">Bar</option>
                        <option value="line" disabled>
                          Line (soon)
                        </option>
                        <option value="scatter" disabled>
                          Scatter (soon)
                        </option>
                        <option value="map" disabled>
                          Map (soon)
                        </option>
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>

                <ChartView data={data} columns={columns} types={types} />
              </div>
            </section>
          </div>

          {/* Summary Panel */}
          {Object.keys(summary).length > 0 && (
            <section className="mt-6 rounded-2xl bg-ink/80 border border-white/5 shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-2">Summary</h2>
                <pre className="text-sm overflow-auto bg-black/30 p-3 rounded-xl">
                  {JSON.stringify(summary, null, 2)}
                </pre>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
