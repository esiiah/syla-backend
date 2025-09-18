// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload.jsx";
import ChartView from "./components/ChartView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Features from "./components/Features.jsx";
import Footer from "./components/Footer.jsx";
import Navbar from "./components/Navbar";
import ChartOptions from "./components/ChartOptions.jsx";
import { Settings } from "lucide-react";
import "./App.css";

function App() {
  // User state (null = not logged in)
  const [user, setUser] = useState(null);

  const [data, setData] = useState([]);            // array of objects (CSV rows)
  const [columns, setColumns] = useState([]);      // array of column names
  const [types, setTypes] = useState({});          // inferred types
  const [summary, setSummary] = useState({});      // summary object
  const [chartTitle, setChartTitle] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");

  const [theme, setTheme] = useState("light");

  // central chart options state
  const [chartOptions, setChartOptions] = useState({
    type: "bar",
    color: "#2563eb",
    gradient: false,
    gradientStops: ["#2563eb", "#ff6b6b"],
    showLabels: false,
    trendline: false,
    sort: "none",
    logScale: false,
    logMin: 1,
    compareField: "",
  });

  const [showOptions, setShowOptions] = useState(false);

  // Apply theme to body
  useEffect(() => {
    if (typeof window !== "undefined" && document && document.body) {
      document.body.classList.remove("dark", "light");
      document.body.classList.add(theme === "light" ? "light" : "dark");
    }
  }, [theme]);
  
  return (
    <div className="flex min-h-screen overflow-x-hidden relative">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      <div className="flex-1 transition-all duration-300">

        {/* Navbar */}
        {user ? (
          <Navbar user={user} />   // post-login navbar with profile
        ) : (
          <Navbar />               // pre-login navbar
        )}

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl tracking-wide">
              Upload. Clean. <span className="text-neonYellow">Visualize.</span>
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl dark:text-slate-300">
              A next-gen analytics studio. Drop your files, explore instant insights, and export visuals — all in an AI-tech, cyberpunk inspired interface.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Panel */}
            <section className="lg:col-span-1 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-1">Upload Data</h2>
                <p className="text-gray-500 text-sm mb-4 dark:text-slate-400">
                  CSV / Excel only. Preview & progress included.
                </p>
                <FileUpload
                  onData={(d) => { setData(d); }}
                  onColumns={(cols) => { setColumns(cols); }}
                  onTypes={(t) => setTypes(t)}
                  onSummary={(s) => setSummary(s)}
                  onChartTitle={(t) => setChartTitle(t)}
                  onXAxis={(x) => setXAxis(x)}
                  onYAxis={(y) => setYAxis(y)}
                />
              </div>
            </section>

            {/* Chart Panel */}
            <section className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg">Visualization</h2>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-black/30 transition" onClick={() => setShowOptions(prev => !prev)}>
                    <Settings size={18} className="text-gray-600 dark:text-slate-400" />
                  </button>
                </div>

                {showOptions && (
                  <div className="mb-4">
                    <ChartOptions options={chartOptions} setOptions={setChartOptions} columns={columns} />
                  </div>
                )}

                {/* Only show actual chart when data exists */}
                {data && data.length > 0 ? (
                  <ChartView
                    data={data}
                    columns={columns}
                    types={types}
                    options={chartOptions}
                    chartTitle={chartTitle}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    setXAxis={setXAxis}
                    setYAxis={setYAxis}
                  />
                ) : (
                  <div className="rounded-2xl p-8 bg-gray-50 dark:bg-black/20 text-center text-gray-500">
                    <div className="text-lg font-medium">Upload to visualise</div>
                    <div className="text-sm mt-2">Upload a CSV / Excel file on the left to enable the visualisation tools.</div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Summary Panel */}
          {Object.keys(summary).length > 0 && (
            <section className="mt-6 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-4">Summary</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-black/30">
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Column</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary).map(([col, details], i) => (
                        <tr key={i} className="odd:bg-gray-50 dark:odd:bg-black/20 border-b border-gray-200 dark:border-white/5 align-top">
                          <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-slate-200">{col}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300">
                            {details && typeof details === "object" ? (
                              <table className="min-w-[200px] border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <tbody>
                                  {Object.entries(details).map(([k, v], j) => (
                                    <tr key={j} className="odd:bg-gray-100 dark:odd:bg-black/30">
                                      <td className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 border-r border-gray-200 dark:border-white/10">{k}</td>
                                      <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300">{String(v)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              String(details)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <div className="mt-12">
            <Features />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default App;
