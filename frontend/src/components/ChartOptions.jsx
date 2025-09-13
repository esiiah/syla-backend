// frontend/src/components/ChartOptions.jsx
import React, { useState, useEffect } from "react";
import { Settings, Palette, BarChart, TrendingUp, SortAsc, Ruler, Download } from "lucide-react";

function ChartOptions({ options = {}, setOptions = () => {}, columns = [] }) {
  const [local, setLocal] = useState({ ...options });
  useEffect(() => setLocal({ ...options }), [options]);

  const commit = (patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    setOptions(prev => ({ ...prev, ...patch }));
  };

  // gradient stops editing helpers
  const addStop = () => {
    if (!local.gradientStops || local.gradientStops.length >= 5) return;
    const arr = [...(local.gradientStops || []), '#ffffff'];
    commit({ gradientStops: arr, gradient: true });
  };
  const removeStop = () => {
    if (!local.gradientStops || local.gradientStops.length <= 2) return;
    const arr = local.gradientStops.slice(0, -1);
    commit({ gradientStops: arr });
  };
  const updateStop = (idx, val) => {
    const arr = [...(local.gradientStops || [])];
    arr[idx] = val;
    commit({ gradientStops: arr, gradient: true });
  };

  const chartType = local.type || "bar";
  const supportsCompare = chartType !== "pie" && chartType !== "scatter";
  const supportsTrendline = chartType === "bar" || chartType === "line";
  const supportsLog = chartType === "bar" || chartType === "line";

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
            value={local.type}
            onChange={(e) => commit({ type: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>
        </div>

        {/* Color + gradient */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <Palette size={14} /> Chart Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={local.color || "#2563eb"}
              onChange={(e) => commit({ color: e.target.value })}
              className="w-12 h-8 p-0 border rounded"
            />
            <label className="ml-2 text-xs inline-flex items-center">
              <input
                type="checkbox"
                checked={!!local.gradient}
                onChange={(e) => commit({ gradient: e.target.checked })}
                className="mr-1"
              />
              Gradient
            </label>
          </div>

          {local.gradient && (
            <div className="mt-2">
              <div className="text-xs mb-1">Gradient stops (2–5)</div>
              <div className="flex gap-2 items-center">
                {(local.gradientStops || ['#2563eb', '#ff6b6b']).map((col, i) => (
                  <input
                    key={i}
                    type="color"
                    value={col}
                    onChange={(e) => updateStop(i, e.target.value)}
                  />
                ))}
                <button onClick={addStop} className="px-2 py-1 border rounded text-xs">+ stop</button>
                <button onClick={removeStop} className="px-2 py-1 border rounded text-xs">- stop</button>
              </div>
            </div>
          )}
        </div>

        {/* Labels */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            Show Data Labels
            <input
              type="checkbox"
              checked={!!local.showLabels}
              onChange={(e) => commit({ showLabels: e.target.checked })}
              className="ml-auto"
            />
          </label>
          <div className="text-xs text-gray-500 mt-1">
            Data labels appear on bars/pie slices only when enabled. Axis labels remain visible by default.
          </div>
        </div>

        {/* Trendline */}
        {supportsTrendline && (
          <div>
            <label className="flex items-center gap-2 font-medium">
              <TrendingUp size={14} /> Trendline
              <input
                type="checkbox"
                checked={!!local.trendline}
                onChange={(e) => commit({ trendline: e.target.checked })}
                className="ml-auto"
              />
            </label>
          </div>
        )}
        {!supportsTrendline && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            ⚠ Trendline not available for {chartType} charts
          </div>
        )}

        {/* Sorting */}
        <div>
          <label className="flex items-center gap-2 font-medium mb-1">
            <SortAsc size={14} /> Sorting
          </label>
          <select
            value={local.sort}
            onChange={(e) => commit({ sort: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="none">None</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        {/* Log scale */}
        {supportsLog && (
          <div>
            <label className="flex items-center gap-2 font-medium">
              <Ruler size={14} /> Log Scale
              <input
                type="checkbox"
                checked={!!local.logScale}
                onChange={(e) => commit({ logScale: e.target.checked })}
                className="ml-auto"
              />
            </label>
            {local.logScale && (
              <div className="mt-2 text-xs">
                <label className="flex items-center gap-2">
                  Min for log (optional)
                  <input
                    type="number"
                    value={local.logMin || ''}
                    onChange={(e) => commit({ logMin: e.target.value })}
                    className="ml-2 border rounded px-2 py-1 w-28 text-xs"
                    placeholder="auto"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Chart will replace zeros/negatives with a small positive fallback for plotting (originals shown in tooltips).
                </div>
              </div>
            )}
          </div>
        )}
        {!supportsLog && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            ⚠ Log scale not available for {chartType} charts
          </div>
        )}

        {/* Compare field */}
        {supportsCompare && (
          <div>
            <label className="flex items-center gap-2 font-medium mb-1">
              Compare (second metric)
            </label>
            <select
              value={local.compareField || ""}
              onChange={(e) => commit({ compareField: e.target.value || "" })}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              When set, a second dataset is rendered for quick comparison (placed on a secondary axis).
            </div>
          </div>
        )}
        {!supportsCompare && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            ⚠ Compare not available for Pie or Scatter
          </div>
        )}

        {/* Exports */}
        <div>
          <label className="flex items-center gap-2 font-medium">
            <Download size={14} /> Quick Export (Client-side)
          </label>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportChart', { detail: { format: 'png' } }))}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              PNG
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportChart', { detail: { format: 'jpeg' } }))}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              JPEG
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportData', { detail: { format: 'csv' } }))}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              CSV
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportData', { detail: { format: 'json' } }))}
              className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-white/10"
            >
              JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartOptions;
