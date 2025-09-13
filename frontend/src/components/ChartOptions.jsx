// frontend/src/components/ChartOptions.jsx
import React, { useState } from "react";
import {
  Settings,
  Palette,
  BarChart,
  SortAsc,
  Ruler,
  Download,
  TrendingUp,
  Type,
} from "lucide-react";

export default function ChartOptions({ options, setOptions, columns = [] }) {
  const [gradientCount, setGradientCount] = useState(options.gradientColors?.length || 2);

  const toggle = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  const update = (key, value) => setOptions(prev => ({ ...prev, [key]: value }));

  const handleGradientColorChange = (index, color) => {
    const newColors = options.gradientColors ? [...options.gradientColors] : Array(gradientCount).fill("#2563eb");
    newColors[index] = color;
    update("gradientColors", newColors);
  };

  return (
    <div className="mt-4 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
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
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>
        </div>

        {/* Axis selection */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 font-medium">X-Axis</label>
            <select
              value={options.xAxis || ""}
              onChange={(e) => update("xAxis", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
            >
              <option value="">Select X</option>
              {columns.map((col, i) => <option key={i} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Y-Axis</label>
            <select
              value={options.yAxis || ""}
              onChange={(e) => update("yAxis", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
            >
              <option value="">Select Y</option>
              {columns.map((col, i) => <option key={i} value={col}>{col}</option>)}
            </select>
          </div>
        </div>

        {/* Base color */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <Palette size={14} /> Base Color
          </label>
          <input
            type="color"
            value={options.color || "#2563eb"}
            onChange={(e) => update("color", e.target.value)}
            className="w-16 h-8 border rounded cursor-pointer"
          />
        </div>

        {/* Gradient */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <input
              type="checkbox"
              checked={options.gradient || false}
              onChange={() => toggle("gradient")}
              className="mr-2"
            />
            Gradient Fill
          </label>

          {options.gradient && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs">Number of colors:</label>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={gradientCount}
                  onChange={(e) => {
                    const val = Math.max(2, Math.min(5, Number(e.target.value)));
                    setGradientCount(val);
                    const newColors = Array(val).fill("#2563eb");
                    update("gradientColors", newColors);
                  }}
                  className="w-12 border rounded px-1 text-xs dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: gradientCount }).map((_, i) => (
                  <input
                    key={i}
                    type="color"
                    value={options.gradientColors?.[i] || "#2563eb"}
                    onChange={(e) => handleGradientColorChange(i, e.target.value)}
                    className="w-10 h-8 border rounded cursor-pointer"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Show Labels */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Type size={14} /> Show Labels
            <input
              type="checkbox"
              checked={options.showLabels || false}
              onChange={() => toggle("showLabels")}
              className="ml-auto"
            />
          </label>
        </div>

        {/* Trendline */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <TrendingUp size={14} /> Show Trendline
            <input
              type="checkbox"
              checked={options.trendline || false}
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
            value={options.sort || "none"}
            onChange={(e) => update("sort", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:bg-black/40 dark:border-white/10 dark:text-slate-200"
          >
            <option value="none">None</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        {/* Log scale */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Ruler size={14} /> Log Scale
            <input
              type="checkbox"
              checked={options.logScale || false}
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
