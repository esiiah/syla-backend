// frontend/src/pages/ForecastPage.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, Upload, BarChart3, TrendingDown } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ForecastResults from "../components/ForecastResults";
import ChartView from "../components/ChartView";
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
  const [showChart, setShowChart] = useState(true);

  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const exampleScenarios = [
    "Assume a 10% month-over-month promotional uplift for the next 6 months due to increased marketing spend.",
    "Reduce marketing budget by 20% starting month 3; estimate revenue impact over next 12 months with cost optimization.",
    "Introduce a loyalty discount program from next quarter expected to increase repeat purchases by 15% but reduce margins by 5%.",
    "Economic recession scenario: assume 15% decrease in customer spending power starting in 6 months.",
    "Market expansion: enter 2 new countries with 25% revenue uplift expectation in months 8-12."
  ];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (isDataLoaded && hasData) {
      // Set intelligent defaults
      if (chartData.yAxis && chartData.columns.includes(chartData.yAxis)) {
        setTargetColumn(chartData.yAxis);
      } else if (chartData.columns.includes("Revenue")) {
        setTargetColumn("Revenue");
      } else {
        const numericCols = chartData.columns.filter(col => {
          return chartData.data.slice(0, 5).some(row => typeof row[col] === 'number' || !isNaN(Number(row[col])));
        });
        setTargetColumn(numericCols[0] || chartData.columns[0] || "");
      }

      // Auto-detect date column
      const potentialDateCols = chartData.columns.filter(col => 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('time') || 
        col.toLowerCase().includes('month')
      );
      setDateColumn(potentialDateCols[0] || "");
    }
  }, [user, hasData, isDataLoaded, chartData, navigate]);

  const validateForm = () => {
    const errors = [];
    
    if (!hasData) {
      errors.push("No data available. Please upload a CSV file first.");
    }
    
    if (!targetColumn) {
      errors.push("Please select a target column to forecast.");
    }
    
    if (!scenario || scenario.trim().length === 0) {
      errors.push("Please enter a scenario description.");
    }
    
    if (scenario.length > 500) {
      errors.push("Scenario description must be 500 characters or less.");
    }
    
    if (!["hybrid", "prophet", "gpt", "auto"].includes(modelPreference)) {
      errors.push("Invalid model selection.");
    }
    
    if (periodsAhead < 1 || periodsAhead > 365) {
      errors.push("Periods ahead must be between 1 and 365.");
    }
    
    if (confidenceLevel < 0.5 || confidenceLevel > 0.99) {
      errors.push("Confidence level must be between 0.5 and 0.99.");
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Please sign in to use forecasting features.");
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
      setShowChart(false); // Minimize chart when forecast starts
      
      const result = await aiApi.createWhatIfForecast(payload);
      setForecastResult(result);
      
      localStorage.setItem("lastForecast", JSON.stringify({
        result,
        timestamp: new Date().toISOString(),
        scenario: scenario,
        targetColumn: targetColumn
      }));
      
    } catch (error) {
      console.error("Forecast error:", error);
      setError(error.message || "Forecast generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyExampleScenario = (exampleText) => {
    setScenario(exampleText);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        <div className="flex-1">
          <Navbar user={user} />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Brain size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-gray-600 mb-6">You need to be signed in to access AI forecasting features.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => navigate("/signup")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
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
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                  <Brain size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-slate-200">
                    AI-Powered Forecasting
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Create natural-language what-if forecasts from your data
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-slate-400">
                <span>Data: <strong>{chartData.data.length.toLocaleString()}</strong> rows</span>
                <span>Columns: <strong>{chartData.columns.length}</strong></span>
                {targetColumn && (
                  <span>Target: <strong className="text-blue-600 dark:text-blue-400">{targetColumn}</strong></span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
                >
                  <Upload size={16} />
                  Upload Data
                </button>
                <button
                  onClick={() => navigate("/editing")}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
                >
                  <BarChart3 size={16} />
                  Edit Chart
                </button>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 p-8 text-center shadow-sm">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">
                No Data Available
              </h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Upload a CSV file first to start generating forecasts.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload CSV Data
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Chart Preview */}
              {showChart && (
                <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 shadow-sm">
                  <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 dark:text-slate-200">Current Data Visualization</h3>
                    <button
                      onClick={() => setShowChart(false)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                      title="Minimize Chart"
                    >
                      <TrendingDown size={16} />
                    </button>
                  </div>
                  <div className="p-4">
                    <ChartView
                      data={chartData.data}
                      columns={chartData.columns}
                      options={chartData.chartOptions}
                      chartTitle={chartData.chartTitle}
                      xAxis={chartData.xAxis}
                      yAxis={chartData.yAxis}
                      setXAxis={() => {}}
                      setYAxis={() => {}}
                    />
                  </div>
                </div>
              )}

              {!showChart && (
                <button
                  onClick={() => setShowChart(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Click to show current chart visualization
                </button>
              )}

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Input Panel */}
                <div className="lg:w-1/3">
                  <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 p-6 shadow-sm">
                    <h2 className="font-semibold text-lg mb-4 text-gray-800 dark:text-slate-200">
                      Forecast Configuration
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Target Column to Forecast
                        </label>
                        <select
                          value={targetColumn}
                          onChange={(e) => setTargetColumn(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                        >
                          <option value="">-- Select target column --</option>
                          {chartData.columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Date Column (Optional)
                        </label>
                        <select
                          value={dateColumn}
                          onChange={(e) => setDateColumn(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                        >
                          <option value="">-- Auto-generate dates --</option>
                          {chartData.columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          If not selected, we'll create synthetic monthly periods
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Scenario Description
                      </label>
                      <textarea
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        maxLength={500}
                        rows={6}
                        placeholder="Describe your what-if scenario in natural language. E.g., 'Increase marketing budget by 15% starting next month and expect 10% revenue boost...'"
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {scenario.length}/500 characters
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Examples:</span>
                          <div className="flex gap-1">
                            {exampleScenarios.slice(0, 3).map((example, i) => (
                              <button
                                key={i}
                                onClick={() => applyExampleScenario(example)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/40"
                                title={example}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        AI Model
                      </label>
                      <select
                        value={modelPreference}
                        onChange={(e) => setModelPreference(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                      >
                        <option value="hybrid">Hybrid (Recommended) - Combines statistical and AI models</option>
                        <option value="prophet">Prophet - Statistical time series model</option>
                        <option value="gpt">GPT - Pure language model forecasting</option>
                        <option value="auto">Auto - Let the system choose best model</option>
                      </select>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700 dark:text-slate-300"
                      >
                        <span>Advanced Settings</span>
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {showAdvanced && (
                        <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                              Periods Ahead
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={periodsAhead}
                              onChange={(e) => setPeriodsAhead(Number(e.target.value))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                              Confidence Level
                            </label>
                            <input
                              type="range"
                              min={0.5}
                              max={0.99}
                              step={0.01}
                              value={confidenceLevel}
                              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>50%</span>
                              <span className="font-medium">{Math.round(confidenceLevel * 100)}%</span>
                              <span>99%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={handleSubmit}
                        disabled={!hasData || loading}
                        className={`w-full px-4 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                          hasData && !loading
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg" 
                            : "bg-gray-300 cursor-not-allowed dark:bg-slate-600"
                        }`}
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating Forecast...
                          </div>
                        ) : (
                          "Generate AI Forecast"
                        )}
                      </button>
                    </div>

                    {error && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Tips</h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Be specific about percentages, timeframes, and business context</li>
                        <li>• Mention external factors like seasonality, marketing campaigns, or market conditions</li>
                        <li>• Include assumptions about customer behavior or competitive landscape</li>
                        <li>• For best results, have at least 12 months of historical data</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="lg:w-2/3">
                  <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 shadow-sm min-h-[500px]">
                    <div className="p-6 border-b border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-slate-200">
                        Forecast Results
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        AI-generated predictions based on your scenario
                      </p>
                    </div>

                    <div className="p-6">
                      {loading && (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-slate-400">
                              Analyzing your scenario and generating forecast...
                            </p>
                          </div>
                        </div>
                      )}

                      {!loading && !forecastResult && (
                        <div className="text-center py-20 text-gray-500 dark:text-slate-400">
                          <Brain size={48} className="mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">Ready to Generate Forecast</p>
                          <p className="text-sm">
                            Configure your scenario on the left and click "Generate AI Forecast"
                          </p>
                        </div>
                      )}

                      {!loading && forecastResult && (
                        <ForecastResults
                          result={forecastResult}
                          targetColumn={targetColumn}
                          onExport={(type) => {
                            console.log("Forecast exported:", type);
                          }}
                        />
                      )}
                    </div>
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
