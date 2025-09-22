// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "./components/FileUpload.jsx";
import ChartView from "./components/ChartView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Features from "./components/Features.jsx";
import Footer from "./components/Footer.jsx";
import Navbar from "./components/Navbar";
import ChartOptions from "./components/ChartOptions.jsx";
import { Settings } from "lucide-react";
import "./App.css";

const LoginRequiredModal = ({ onClose, onSignup, onLogin }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-ink rounded-2xl p-6 max-w-md w-full border-2 border-neonBlue/20 shadow-xl">
      <h2 className="text-xl font-display font-bold text-gray-800 dark:text-slate-200 mb-3">
        Sign In Required
      </h2>
      <p className="text-gray-600 dark:text-slate-400 mb-6">
        You need to create an account or sign in to use the visualization features.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onSignup}
          className="flex-1 px-4 py-2 bg-neonBlue text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          Sign Up
        </button>
        <button
          onClick={onLogin}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-white/20 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Log In
        </button>
      </div>
      <button
        onClick={onClose}
        className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Cancel
      </button>
    </div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [types, setTypes] = useState({});
  const [summary, setSummary] = useState({});
  const [chartTitle, setChartTitle] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [theme, setTheme] = useState("light");

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

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme === "light" ? "light" : "dark");
  }, [theme]);

  const handleSignupNavigation = () => {
    navigate("/signup");
    setShowLoginModal(false);
  };

  const handleLoginNavigation = () => {
    navigate("/login");
    setShowLoginModal(false);
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden relative">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />

      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          {/* Hero Section */}
          <div className="hero-section w-screen -mx-4 relative">
            <div className="hero-gradient-bg"></div>
            <div className="hero-content">
              {user ? (
                <>
                  <h1 className="font-body text-4xl md:text-5xl tracking-wide mb-6 text-gray-800 dark:text-slate-200">
                    Hi, <span className="text-neonYellow font-bold">{user.name}</span>. Welcome Back!
                  </h1>
                  <p className="text-lg text-gray-700 dark:text-slate-300 max-w-3xl mx-auto">
                    Ready to dive into your data? Upload files for cleaning and visualization, 
                    or use our powerful file conversion tools.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-body text-4xl md:text-5xl tracking-wide mb-6 text-gray-800 dark:text-slate-200">
                    From raw data to <span className="text-red-500 font-semibold">smart decisions</span>
                    <br />
                    all powered by <span className="text-neonYellow font-semibold">Syla</span>.
                  </h1>
                  <p className="text-xl text-gray-700 dark:text-slate-300 mb-8 max-w-4xl mx-auto">
                    Clean, visualize, and convert your data with intelligent automation.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleSignupNavigation}
                      className="px-8 py-3 bg-neonBlue text-white rounded-xl font-semibold hover:bg-blue-600 shadow-lg hover:shadow-neon transition-all duration-300"
                    >
                      Get Started - Sign Up
                    </button>
                    <button
                      onClick={handleLoginNavigation}
                      className="px-8 py-3 border-2 border-neonBlue text-neonBlue rounded-xl font-semibold hover:bg-neonBlue hover:text-white transition-all duration-300"
                    >
                      Already have an account? Log In
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Upload Panel */}
            <section className="lg:col-span-1 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <h2 className="font-display text-lg mb-1">Upload Data</h2>
                <p className="text-gray-500 text-sm mb-4 dark:text-slate-400">
                  CSV / Excel only. Preview & progress included.
                </p>
                <FileUpload
                  onData={(d) => {
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    setData(d);
                  }}
                  onColumns={setColumns}
                  onTypes={setTypes}
                  onSummary={setSummary}
                  onChartTitle={setChartTitle}
                  onXAxis={setXAxis}
                  onYAxis={setYAxis}
                />
              </div>
            </section>

            {/* Chart Panel */}
            <section className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg">Visualization</h2>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-black/30 transition"
                    onClick={() => setShowOptions((prev) => !prev)}
                  >
                    <Settings size={18} className="text-gray-600 dark:text-slate-400" />
                  </button>
                </div>

                {showOptions && (
                  <div className="mb-4">
                    <ChartOptions options={chartOptions} setOptions={setChartOptions} columns={columns} />
                  </div>
                )}

                {user && data.length > 0 ? (
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
                ) : !user ? (
                  <div className="rounded-2xl p-8 bg-gray-50 dark:bg-black/20 text-center text-gray-500">
                    <div className="text-lg font-medium mb-2">Sign in to visualize</div>
                    <div className="text-sm">Create an account or sign in to unlock visualization features.</div>
                    <div className="mt-4">
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-6 py-2 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 bg-gray-50 dark:bg-black/20 text-center text-gray-500">
                    <div className="text-lg font-medium">Upload to visualize</div>
                    <div className="text-sm mt-2">
                      Upload a CSV / Excel file on the left to enable the visualization tools.
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Summary Section */}
          {Object.keys(summary).length > 0 && user && (
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
                            ) : String(details)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Features Section */}
          <div className="mt-12">
            <Features />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginRequiredModal
          onClose={() => setShowLoginModal(false)}
          onSignup={handleSignupNavigation}
          onLogin={handleLoginNavigation}
        />
      )}
    </div>
  );
}

export default App;
