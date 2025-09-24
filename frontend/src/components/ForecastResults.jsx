// frontend/src/components/ForecastResults.jsx
import React, { useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Download, FileText, AlertTriangle } from "lucide-react";

// register chart.js pieces
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

/**
 * Props:
 *  - result: the forecast response object (expected shape: { forecast: { forecast: number[], lower?: number[], upper?: number[], timestamps?: string[] }, explanation?: string, meta?: {} })
 *  - targetColumn: string
 *  - onExport: callback(type) -> void
 */
export default function ForecastResults({ result = {}, targetColumn = "", onExport = () => {} }) {
  const chartRef = useRef(null);
  const [showTechnical, setShowTechnical] = useState(false);

  // Safely extract forecast arrays
  const { forecast: fObj = {} } = result || {};
  const forecastArr = Array.isArray(fObj?.forecast) ? fObj.forecast : [];
  const lowerArr = Array.isArray(fObj?.lower) ? fObj.lower : null;
  const upperArr = Array.isArray(fObj?.upper) ? fObj.upper : null;
  const timestamps = Array.isArray(fObj?.timestamps) ? fObj.timestamps : null;

  // If timestamps are missing, synthesize simple labeled periods
  const labels = useMemo(() => {
    if (timestamps && timestamps.length === forecastArr.length) return timestamps;
    // fallback: Period 1, Period 2...
    return forecastArr.map((_, i) => `P${i + 1}`);
  }, [timestamps, forecastArr]);

  // Basic stats
  const stats = useMemo(() => {
    if (!forecastArr.length) return {};
    const numbers = forecastArr.map(Number).filter((n) => !Number.isNaN(n));
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = numbers.length ? sum / numbers.length : 0;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const next = numbers[0] ?? null; // assume the first forecast entry is the next period
    return {
      next,
      average: avg,
      min,
      max,
      range: max - min,
      count: numbers.length
    };
  }, [forecastArr]);

  // Chart datasets & options (memoized)
  const chartData = useMemo(() => {
    const mainColor = "#2563eb"; // Tailwind blue-600
    const forecastDataset = {
      label: `${targetColumn || "Forecast"}`,
      data: forecastArr,
      borderColor: mainColor,
      backgroundColor: "rgba(37,99,235,0.08)",
      tension: 0.35,
      pointRadius: 3,
      fill: false
    };

    // confidence area: include when both lower & upper present
    const confidenceDatasets = (lowerArr && upperArr && lowerArr.length === forecastArr.length && upperArr.length === forecastArr.length)
      ? [
          // Upper: we set fill so area appears between upper and lower
          {
            label: "Upper Bound",
            data: upperArr,
            borderColor: "rgba(59,130,246,0.28)",
            backgroundColor: "rgba(59,130,246,0.06)",
            tension: 0.35,
            pointRadius: 0,
            fill: "+1" // attempt to fill to the next dataset (we'll place lower afterwards)
          },
          {
            label: "Lower Bound",
            data: lowerArr,
            borderColor: "rgba(59,130,246,0.28)",
            backgroundColor: "rgba(59,130,246,0.06)",
            tension: 0.35,
            pointRadius: 0,
            fill: false
          }
        ]
      : [];

    // We will place forecast dataset first so the bounds sit behind/on top as desired.
    // Ordering: [forecast, ...confidenceDatasets]
    const datasets = [forecastDataset, ...confidenceDatasets];
    return { labels, datasets };
  }, [labels, forecastArr, lowerArr, upperArr, targetColumn]);

  const chartOptions = useMemo(() => {
    const textColor = document?.body?.classList?.contains("dark") ? "#E6EEF8" : "#0f172a";
    return {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor, boxWidth: 12 } },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y;
              const idx = ctx.dataIndex;
              const lines = [`${ctx.dataset.label}: ${typeof val === "number" ? val.toFixed(2) : val}`];
              if (lowerArr && upperArr && lowerArr[idx] != null && upperArr[idx] != null) {
                lines.push(`CI: ${lowerArr[idx].toFixed(2)} — ${upperArr[idx].toFixed(2)}`);
              }
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { display: false }
        },
        y: {
          ticks: { color: textColor },
          grid: { color: "rgba(15,23,42,0.06)" }
        }
      }
    };
  }, [lowerArr, upperArr]);

  // Export: image
  const downloadChart = (format = "png") => {
    try {
      const chart = chartRef.current;
      if (!chart || typeof chart.toBase64Image !== "function") {
        alert("Chart not ready for export.");
        return;
      }
      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const url = chart.toBase64Image(mime);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forecast_${targetColumn || "series"}.${format}`;
      a.click();
      onExport(`image:${format}`);
    } catch (err) {
      console.error("Export chart failed", err);
      alert("Export failed.");
    }
  };

  // Export: CSV
  const downloadData = (filename = `forecast_${targetColumn || "series"}.csv`) => {
    if (!forecastArr.length) return;
    const rows = [];
    const headers = ["Date", "Forecast"];
    if (lowerArr && upperArr) headers.push("Lower", "Upper");
    rows.push(headers.join(","));
    for (let i = 0; i < forecastArr.length; i++) {
      const row = [
        labels[i] ?? `P${i + 1}`,
        (typeof forecastArr[i] === "number") ? forecastArr[i].toFixed(2) : String(forecastArr[i])
      ];
      if (lowerArr && upperArr) {
        row.push(
          (typeof lowerArr[i] === "number") ? lowerArr[i].toFixed(2) : "",
          (typeof upperArr[i] === "number") ? upperArr[i].toFixed(2) : ""
        );
      }
      rows.push(row.join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onExport("csv");
  };

  // Graceful handling of empty result
  if (!forecastArr.length) {
    return (
      <div className="rounded-lg p-4 bg-yellow-50 dark:bg-amber-900/10 border dark:border-amber-700/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-600" />
          <div>
            <div className="font-medium">No forecast data</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">The AI returned no forecast array. Check the server response or try a different scenario.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart + exports */}
      <div className="rounded-2xl bg-white dark:bg-ink/80 border dark:border-white/5 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium">{targetColumn || "Forecast"}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-300">Interactive forecast chart</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => downloadChart("png")} className="flex items-center gap-2 px-3 py-1.5 rounded border hover:bg-gray-50 dark:hover:bg-white/5">
              <Download size={14} /> PNG
            </button>
            <button onClick={() => downloadChart("jpeg")} className="flex items-center gap-2 px-3 py-1.5 rounded border hover:bg-gray-50 dark:hover:bg-white/5">
              <Download size={14} /> JPEG
            </button>
            <button onClick={() => downloadData()} className="flex items-center gap-2 px-3 py-1.5 rounded border hover:bg-gray-50 dark:hover:bg-white/5">
              <FileText size={14} /> CSV
            </button>
          </div>
        </div>

        <div className="mt-3" style={{ height: 264 }}>
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* AI Analysis */}
      <div className="rounded-2xl p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700">
        <h5 className="font-medium text-blue-700 dark:text-blue-200">AI analysis</h5>
        <p className="text-sm text-slate-700 dark:text-slate-200 mt-2">
          {result?.explanation || result?.analysis || "The AI provided this forecast based on your scenario and historical data. Key insights will appear here when available."}
        </p>
      </div>

      {/* Metrics + Scenario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key metrics */}
        <div className="rounded-2xl p-4 border bg-white dark:bg-ink/80">
          <h6 className="font-medium mb-2">Key forecast metrics</h6>
          <div className="text-sm space-y-1">
            <div>Next period: <strong>{stats.next != null ? stats.next.toFixed(2) : "—"}</strong></div>
            <div>Average (forecast): <strong>{stats.average != null ? stats.average.toFixed(2) : "—"}</strong></div>
            <div>Range: <strong>{stats.range != null ? stats.range.toFixed(2) : "—"}</strong></div>
            <div>Min / Max: <strong>{stats.min != null ? stats.min.toFixed(2) : "—"} / {stats.max != null ? stats.max.toFixed(2) : "—"}</strong></div>
          </div>
        </div>

        {/* scenario applied */}
        <div className="rounded-2xl p-4 border bg-white dark:bg-ink/80">
          <h6 className="font-medium mb-2">Scenario applied</h6>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <div><strong>Horizon:</strong> {forecastArr.length} periods</div>
            <div className="mt-1"><strong>Confidence provided:</strong> {result?.meta?.confidence_level ?? "n/a"}</div>
            <div className="mt-2"><strong>Notes:</strong> {result?.meta?.notes || "No technical notes provided by model."}</div>
          </div>
        </div>
      </div>

      {/* Technical details (collapsible) */}
      <div className="rounded-2xl p-3 border bg-white dark:bg-ink/80">
        <button
          onClick={() => setShowTechnical((s) => !s)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-medium">Technical details</span>
          <span>{showTechnical ? <ChevronUpIcon /> : <ChevronDownIcon />}</span>
        </button>

        {showTechnical && (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-black/20 p-3 rounded">{JSON.stringify(result?.meta || {}, null, 2)}</pre>
            <div>Historical rows used: {result?.meta?.historical_rows ?? "unknown"}</div>
            <div>Model used: {result?.meta?.model_used ?? "unknown"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* small local helper icons (to avoid extra imports) */
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
      <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronUpIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
      <path d="M6 12l4-4 4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
