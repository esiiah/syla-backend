// frontend/src/components/ChartOptions.jsx
import React from "react";
import {
  Settings,
  Palette,
  LineChart,
  Type,
  SortAsc,
  Ruler,
  Download,
  BarChart,
  TrendingUp,
} from "lucide-react";

function ChartOptions({ options, setOptions }) {
  const toggle = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="mt-4 rounded-2xl bg-white border border-gray-200 shadow-sm
      dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <h3 className="font-display text-sm flex items-center gap-2">
          <Settings size={16} className="text-neonBlue" /> Chart Options
        </h3>
      </div>

      <div className="p-4 space-y-4 text-sm text-gray-700 dark:text-slate-300">
        {/* Chart Type */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <BarChart size={14} /> Chart Type
          </label>
          <select
            value={options.type}
            onChange={(e) => update("type", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm
            dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>
        </div>

        {/* Color Picker */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <Palette size={14} /> Chart Color
          </label>
          <input
            type="color"
            value={options.color}
            onChange={(e) => update("color", e.target.value)}
            className="w-16 h-8 border rounded cursor-pointer"
          />
          <label className="ml-2 text-xs">
            <input
              type="checkbox"
              checked={options.gradient}
              onChange={() => toggle("gradient")}
              className="mr-1"
            />
            Gradient Fill
          </label>
        </div>

        {/* Labels toggle */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Type size={14} /> Show Labels
            <input
              type="checkbox"
              checked={options.showLabels}
              onChange={() => toggle("showLabels")}
              className="ml-auto"
            />
          </label>
        </div>

        {/* Trendline toggle */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <TrendingUp size={14} /> Show Trendline
            <input
              type="checkbox"
              checked={options.trendline}
              onChange={() => toggle("trendline")}
              className="ml-auto"
            />
          </label>
        </div>

        {/* Sorting */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <SortAsc size={14} /> Sorting
          </label>
          <select
            value={options.sort}
            onChange={(e) => update("sort", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm
            dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
          >
            <option value="none">None</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        {/* Axis scale */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Ruler size={14} /> Log Scale
            <input
              type="checkbox"
              checked={options.logScale}
              onChange={() => toggle("logScale")}
              className="ml-auto"
            />
          </label>
        </div>

        {/* Export */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Download size={14} /> Export Chart
          </label>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => alert("Export PNG coming soon")}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              PNG
            </button>
            <button
              onClick={() => alert("Export CSV coming soon")}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartOptions;
