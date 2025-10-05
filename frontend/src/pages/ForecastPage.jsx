// frontend/src/pages/ForecastPage.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, Upload, BarChart3, Sparkles } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ForecastResults from "../components/ForecastResults";
import { UserContext } from "../context/UserContext";
import { useChartData } from "../context/ChartDataContext";
import aiApi from "../services/aiApi";

export default function ForecastPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const { chartData, hasData, isDataLoaded } = useChartData();
  
  const [targetColumn, setTargetColumn] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [scenario, setScenario] = useState("");
  const [modelPreference, setModelPreference] = useState("hybrid");
  const [periodsAhead, setPeriodsAhead] = useState(12);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const exampleScenarios = [
    "10% month-over-month promotional uplift for 6 months due to marketing spend increase",
    "20% budget reduction in month 3; estimate revenue impact over 12 months with cost optimization",
    "Loyalty program from Q2 increases repeat purchases 15% but reduces margins 5%",
    "Economic recession: 15% decrease in customer spending power starting in 6 months",
    "Market expansion: 2 new countries with 25% revenue uplift in months 8-12"
  ];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (isDataLoaded && hasData) {
      const yCol = chartData.yAxis || chartData.columns.find(c => 
        chartData.data.slice(0, 5).some(r => !isNaN(Number(r[c])))
      ) || chartData.columns[0];
      setTargetColumn(yCol);

      const dateCol = chartData.columns.find(c => 
        c.toLowerCase().includes('date') || 
        c.toLowerCase().includes('time') || 
        c.toLowerCase().includes('month')
      ) || "";
      setDateColumn(dateCol);
    }
  }, [user, hasData, isDataLoaded, chartData, navigate]);

  const validateForm = () => {
    const errors = [];
    if (!hasData) errors.push("No data available. Upload CSV first.");
    if (!targetColumn) errors.push("Select a target column.");
    if (!scenario || scenario.trim().length === 0) errors.push("Enter scenario description.");
    if (scenario.length > 500) errors.push("Scenario must be ≤500 characters.");
    if (!["hybrid", "prophet", "gpt", "auto"].includes(modelPreference)) errors.push("Invalid model.");
    if (periodsAhead < 1 || periodsAhead > 365) errors.push("Periods must be 1-365.");
    if (confidenceLevel < 0.5 || confidenceLevel > 0.99) errors.push("Confidence must be 0.5-0.99.");
    return errors;
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Sign in to use forecasting.");
      return;
    }

    setError("");
    const errors = validateForm();
    if (errors.length) {
      setError(errors.join(" • "));
      return;
    }

    const payload = {
      csv_data: chartData.data,
      scenario_text: scenario,
      target_column: targetColumn,
      date_column: dateColumn || undefined,
      model_preference: modelPreference === "auto" ? undefined : modelPreference,
      periods_ahead: periodsAhead,
      confidence_level: confidenceLevel
    };

    try {
      setLoading(true);
      setForecastResult(null);
      
      const result = await aiApi.createWhatIfForecast(payload);
      setForecastResult(result);
      
      localStorage.setItem("lastForecast", JSON.stringify({
        result,
        timestamp: new Date().toISOString(),
        scenario,
        targetColumn
      }));
    } catch (err) {
      console.error("Forecast error:", err);
      setError(err.message || "Forecast failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getHistoricalData = () => {
    if (!chartData.data.length || !targetColumn) return [];
    return chartData.data.map(row => {
      const val = row[targetColumn];
      return typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
    }).filter(v => !isNaN(v));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        <div className="flex-1">
          <Navbar user={user} />
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md p-8">
              <Brain size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">AI Forecasting</h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Sign in to access AI-powered forecasting with natural language scenarios.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => navigate("/signup")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Sign Up
                </button>
                <button onClick={() => navigate("/login")} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1">
        <Navbar user={user} />
        
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-lg border hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800">
                <ArrowLeft size={20} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                  <Brain size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">AI-Powered Forecasting</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Natural language what-if scenarios</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-slate-400">
                <span>Data: <strong>{chartData.data.length.toLocaleString()}</strong> rows</span>
                <span>Columns: <strong>{chartData.columns.length}</strong></span>
                {targetColumn && <span>Target: <strong className="text-blue-600 dark:text-blue-400">{targetColumn}</strong></span>}
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => navigate("/")} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800">
                  <Upload size={16} />
                  Upload Data
                </button>
                <button onClick={() => navigate("/editing")} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800">
                  <BarChart3 size={16} />
                  Edit Chart
                </button>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="rounded-2xl bg-white dark:bg-ink/80 border p-8 text-center">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">Upload CSV to start forecasting.</p>
              <button onClick={() => navigate("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Upload CSV
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl bg-white dark:bg-ink/80 border p-6 sticky top-6">
                  <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-blue-600" />
                    Configuration
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Target Column</label>
                      <select value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800">
                        <option value="">-- Select --</option>
                        {chartData.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Date Column (Optional)</label>
                      <select value={dateColumn} onChange={(e) => setDateColumn(e.target.value)} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800">
                        <option value="">-- Auto-generate --</option>
                        {chartData.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Auto-generates monthly periods if not selected</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Scenario Description</label>
                      <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} maxLength={500} rows={5} placeholder="Describe your what-if scenario..." className="w-full rounded-lg border p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800" />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{scenario.length}/500</span>
                        <button onClick={() => setScenario(exampleScenarios[Math.floor(Math.random() * exampleScenarios.length)])} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                          Try Example
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">AI Model</label>
                      <select value={modelPreference} onChange={(e) => setModelPreference(e.target.value)} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800">
                        <option value="hybrid">Hybrid (Recommended)</option>
                        <option value="prophet">Prophet</option>
                        <option value="gpt">GPT</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div>
                      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full py-2 text-sm font-medium">
                        <span>Advanced Settings</span>
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {showAdvanced && (
                        <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium mb-2">Periods Ahead</label>
                            <input type="number" min={1} max={365} value={periodsAhead} onChange={(e) => setPeriodsAhead(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700" />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Confidence Level</label>
                            <input type="range" min={0.5} max={0.99} step={0.01} value={confidenceLevel} onChange={(e) => setConfidenceLevel(Number(e.target.value))} className="w-full" />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>50%</span>
                              <span className="font-medium">{Math.round(confidenceLevel * 100)}%</span>
                              <span>99%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button onClick={handleSubmit} disabled={!hasData || loading} className={`w-full px-4 py-3 rounded-xl font-medium text-white transition-all ${hasData && !loading ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg" : "bg-gray-300 cursor-not-allowed dark:bg-slate-600"}`}>
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Generating...
                        </div>
                      ) : (
                        "Generate Forecast"
                      )}
                    </button>

                    {error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Tips</h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Be specific about percentages and timeframes</li>
                        <li>• Mention external factors like seasonality</li>
                        <li>• Include customer behavior assumptions</li>
                        <li>• Best with 12+ months historical data</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl bg-white dark:bg-ink/80 border min-h-[600px]">
                  <div className="p-6 border-b">
                    <h3 className="font-semibold text-lg">Forecast Results</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">AI-generated predictions</p>
                  </div>

                  <div className="p-6">
                    {loading && (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600 dark:text-slate-400">Analyzing scenario...</p>
                        </div>
                      </div>
                    )}

                    {!loading && !forecastResult && (
                      <div className="text-center py-20 text-gray-500 dark:text-slate-400">
                        <Brain size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">Ready to Generate</p>
                        <p className="text-sm">Configure your scenario and click "Generate Forecast"</p>
                      </div>
                    )}

                    {!loading && forecastResult && (
                      <ForecastResults
                        result={forecastResult}
                        targetColumn={targetColumn}
                        historicalData={getHistoricalData()}
                        onExport={(type) => console.log("Exported:", type)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
