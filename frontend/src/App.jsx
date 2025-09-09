// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload.jsx";
import ChartView from "./components/ChartView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Features from "./components/Features.jsx";
import Footer from "./components/Footer.jsx";
import { Settings } from "lucide-react";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [types, setTypes] = useState({});
  const [summary, setSummary] = useState({});
  const [chartTitle, setChartTitle] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");

  const [theme, setTheme] = useState("dark");
  const [chartOptions, setChartOptions] = useState({
    type: "bar",
    color: "#2563eb",
    gradient: false,
    showLabels: false,
    trendline: false,
    sort: "none",
    logScale: false,
  });
  const [showOptions, setShowOptions] = useState(false);

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
        <nav className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
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

            <div className="hidden md:flex items-center gap-6">
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Docs</a>
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Templates</a>
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Pricing</a>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 dark:border-white/10 dark:text-slate-200 dark:hover:text-white">
                Log in
              </button>
              <button className="px-4 py-1.5 rounded-xl bg-neonBlue text-white shadow-neon hover:animate-glow transition">
                Sign up
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl tracking-wide">
              Upload. Clean. <span className="text-neonYellow">Visualize.</span>
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl dark:text-slate-300">
              A next-gen analytics studio. Drop your files, explore instant insights, and export
              visuals — all in an AI-tech, cyberpunk inspired interface.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Panel */}
            <section className="lg:col-span-1 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-1">Upload Data</h2>
                <p className="text-gray-500 text-sm mb-4 dark:text-slate-400">
                  CSV only. Preview & progress included.
                </p>
                <FileUpload
                  onData={setData}
                  onColumns={setColumns}
                  onTypes={setTypes}
                  onSummary={setSummary}
                  onChartTitle={setChartTitle}
                  onXAxis={setXAxis}
                  onYAxis={setYAxis}
                />

                {/* Mini Chart Preview in Upload Panel */}
                {data.length > 0 && xAxis && yAxis && (
                  <div className="mt-4">
                    <ChartView
                      data={data}
                      columns={columns}
                      types={types}
                      options={chartOptions}
                      chartTitle="Preview"
                      xAxis={xAxis}
                      yAxis={yAxis}
                    />
                  </div>
                )}
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
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Chart Options */}
                    <label className="flex flex-col">
                      Chart Type
                      <select value={chartOptions.type} onChange={e => setChartOptions({...chartOptions, type: e.target.value})} className="mt-1 border rounded px-2 py-1">
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="pie">Pie</option>
                        <option value="scatter">Scatter</option>
                      </select>
                    </label>

                    <label className="flex flex-col">
                      Color
                      <input type="color" value={chartOptions.color} onChange={e => setChartOptions({...chartOptions, color: e.target.value})} className="mt-1 w-full h-8" />
                    </label>

                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={chartOptions.gradient} onChange={e => setChartOptions({...chartOptions, gradient: e.target.checked})} />
                      Gradient
                    </label>

                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={chartOptions.showLabels} onChange={e => setChartOptions({...chartOptions, showLabels: e.target.checked})} />
                      Show Labels
                    </label>

                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={chartOptions.trendline} onChange={e => setChartOptions({...chartOptions, trendline: e.target.checked})} />
                      Trendline
                    </label>

                    <label className="flex flex-col mt-2">
                      Sort
                      <select value={chartOptions.sort} onChange={e => setChartOptions({...chartOptions, sort: e.target.value})} className="mt-1 border rounded px-2 py-1">
                        <option value="none">None</option>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={chartOptions.logScale} onChange={e => setChartOptions({...chartOptions, logScale: e.target.checked})} />
                      Log Scale
                    </label>
                  </div>
                )}

                <ChartView
                  data={data}
                  columns={columns}
                  types={types}
                  options={chartOptions}
                  chartTitle={chartTitle}
                  xAxis={xAxis}
                  yAxis={yAxis}
                />
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
