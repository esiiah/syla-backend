// frontend/src/pages/ForecastPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Brain, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import ForecastResults from "../components/ForecastResults";
import aiApi from "../services/aiApi"; // matches your exported aiApi service
// note: your aiApi.createWhatIfForecast(...) is used (see uploaded file for signature). :contentReference[oaicite:2]{index=2}

export default function ForecastPage() {
  // --- state ---
  const [uploadedData, setUploadedData] = useState([]);
  const [columns, setColumns] = useState([]);
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

  // Example scenarios
  const exampleScenarios = [
    "Assume a 10% month-over-month promotional uplift for the next 6 months.",
    "Reduce marketing spend by 20% starting month 3; estimate revenue impact over next 12 months.",
    "Introduce a loyalty discount from next quarter expected to increase repeat purchases by 15%."
  ];

  // Load data & columns from localStorage on mount (common pattern in this app)
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("uploadedData") || "null");
      const cols = JSON.parse(localStorage.getItem("uploadedColumns") || "null");

      if (Array.isArray(data)) setUploadedData(data);
      if (Array.isArray(cols)) {
        setColumns(cols);
        // set sensible defaults
        if (!targetColumn && cols.length > 0) setTargetColumn(cols[cols.length - 1]);
        if (!dateColumn && cols.length > 1) setDateColumn(cols[0]);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Validation helper
  const validateForm = () => {
    const errs = [];
    if (!uploadedData || !Array.isArray(uploadedData) || uploadedData.length === 0) {
      errs.push("No uploaded data found — please upload a CSV first.");
    }
    if (!targetColumn) errs.push("Please select a target column to forecast.");
    if (!scenario || scenario.trim().length === 0) errs.push("Please enter a scenario description.");
    if (scenario.length > 500) errs.push("Scenario length must be 500 characters or less.");
    if (!["hybrid", "prophet", "gpt", "auto"].includes(modelPreference)) errs.push("Invalid model selection.");
    if (periodsAhead < 1 || periodsAhead > 365) errs.push("Periods ahead must be between 1 and 365.");
    if (confidenceLevel < 0.5 || confidenceLevel > 0.99) errs.push("Confidence level must be between 0.5 and 0.99.");
    return errs;
  };

  // Submit handler
  const handleSubmit = async () => {
    setError("");
    const errs = validateForm();
    if (errs.length) {
      setError(errs.join(" • "));
      return;
    }

    const payload = {
      csv_data: uploadedData,
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
      // call your ai API wrapper (server endpoint is /api/forecast/whatif)
      const res = await aiApi.createWhatIfForecast(payload);
      // api returns a forecast-like object (see server router/service). store it.
      setForecastResult(res);
    } catch (e) {
      console.error("Forecast error", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // quick helpers
  const applyExample = (txt) => setScenario(txt);

  // UX: whether submit should be disabled
  const canSubmit = uploadedData && uploadedData.length > 0 && !loading;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <Brain size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">AI-Powered Forecasting</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Create natural-language what-if forecasts from your uploaded CSV</p>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Input Panel */}
        <div className="lg:w-1/3 rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 p-5 shadow-sm">
          <h2 className="font-medium mb-3">Input</h2>

          {/* Column selectors */}
          <div className="space-y-3">
            <label className="text-xs font-medium">Target column</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">-- select target --</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="text-xs font-medium">Date column (optional)</label>
            <select
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">-- no date column / synthetic --</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Scenario textarea */}
          <div className="mt-4">
            <label className="text-xs font-medium">Scenario (natural language)</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              maxLength={500}
              rows={6}
              placeholder="E.g. Increase marketing budget by 15% starting next month..."
              className="w-full mt-2 rounded-lg border p-3 text-sm min-h-[120px] resize-none"
            />
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{scenario.length}/500</span>
              <div className="flex gap-2">
                {exampleScenarios.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => applyExample(ex)}
                    className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                    type="button"
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model selection */}
          <div className="mt-4">
            <label className="text-xs font-medium">Model</label>
            <select
              value={modelPreference}
              onChange={(e) => setModelPreference(e.target.value)}
              className="w-full mt-2 rounded-lg border px-3 py-2"
            >
              <option value="hybrid">Hybrid (recommended)</option>
              <option value="prophet">Prophet (statistical)</option>
              <option value="gpt">GPT (LLM-driven)</option>
              <option value="auto">Auto (let server decide)</option>
            </select>
          </div>

          {/* Advanced settings */}
          <div className="mt-4 border-t pt-4">
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-medium">Advanced settings</span>
              {showAdvanced ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <label className="text-xs font-medium">Periods ahead</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={periodsAhead}
                  onChange={(e) => setPeriodsAhead(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <label className="text-xs font-medium">Confidence level</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.5}
                  max={0.99}
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            )}
          </div>

          {/* Submit + status */}
          <div className="mt-5 flex gap-3 items-center">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-2 rounded-xl font-medium transition ${
                canSubmit ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Generating forecast…" : "Run Forecast"}
            </button>

            {/* small status */}
            <div className="w-10 h-10 flex items-center justify-center">
              {loading ? (
                <svg className="w-6 h-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : (
                <div className="text-xs text-slate-400">Ready</div>
              )}
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mt-4 rounded-lg border px-3 py-2 bg-rose-50 dark:bg-rose-900/20 flex gap-2 items-start">
              <AlertTriangle className="text-rose-600" />
              <div className="text-sm text-rose-700 dark:text-rose-200">{error}</div>
            </div>
          )}

          {/* small footer hint */}
          <div className="mt-4 text-xs text-slate-400">
            Tip: we load the last uploaded CSV from localStorage. Make sure you uploaded the file in the Upload panel.
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:w-2/3">
          <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 p-5 shadow-sm min-h-[320px]">
            <h3 className="font-medium mb-3">Results</h3>

            {loading && (
              <div className="flex items-center justify-center h-48">
                <svg className="w-12 h-12 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              </div>
            )}

            {!loading && !forecastResult && (
              <div className="text-center text-sm text-slate-500 p-10">
                No forecast yet. Configure inputs on the left and click <strong>Run Forecast</strong>.
              </div>
            )}

            {!loading && forecastResult && (
              <ForecastResults
                result={forecastResult}
                targetColumn={targetColumn}
                onExport={(type) => {
                  // bubble up export notifications (e.g. analytics)
                  console.log("Forecast exported:", type);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
