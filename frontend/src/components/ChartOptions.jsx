// frontend/src/components/ChartOptions.jsx
import React, { useState, useEffect } from "react";
import { 
  Settings, Palette, BarChart, TrendingUp, SortAsc, Ruler, Download, 
  Filter, Sliders, Grid, Eye, Save, RefreshCw, ChevronDown, ChevronUp,
  BarChart2, LineChart, AreaChart, PieChart, Circle, Target, Layers, Gauge
} from "lucide-react";

import { CHART_TYPES, CHART_FEATURES, getChartConfig } from '../utils/chartConfigs';

function ChartOptions({ 
  options = {}, 
  setOptions = () => {}, 
  columns = [],
  data = [],
  onSaveChart = () => {},
  onLoadPreset = () => {}
}) {
  const [local, setLocal] = useState({ ...options });
  const [activeTab, setActiveTab] = useState("display");
  const [expandedSections, setExpandedSections] = useState({
    filters: true,
    display: true,
    colors: false,
    advanced: false
  });

  useEffect(() => setLocal({ ...options }), [options]);

  const commit = (patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    setOptions(updated);
  };

  // Get numeric and categorical columns
  const numericColumns = columns.filter(col => {
    if (!data.length) return true;
    const sample = data.slice(0, 100);
    return sample.some(row => typeof row[col] === 'number' || !isNaN(Number(row[col])));
  });

  const categoricalColumns = columns.filter(col => !numericColumns.includes(col));
  
  // Get unique values for filter dropdowns
  const getUniqueValues = (column) => {
    if (!data.length) return [];
    const values = [...new Set(data.map(row => row[column]).filter(v => v != null))];
    return values.slice(0, 50); // Limit to prevent UI overflow
  };

  // Gradient management
  const addGradientStop = () => {
    const currentStops = local.gradientStops || [local.color || '#2563eb', '#ffffff'];
    if (currentStops.length >= 5) return;
  
    // Add a new color between the last two
    const newColor = currentStops[currentStops.length - 1];
    commit({ gradientStops: [...currentStops, newColor], gradient: true });
  };

  const removeGradientStop = (index) => {
    const currentStops = local.gradientStops || [];
    if (currentStops.length <= 2) return;
  
    const newStops = currentStops.filter((_, i) => i !== index);
    commit({ gradientStops: newStops });
  };

  const updateGradientStop = (idx, color) => {
    const stops = [...(local.gradientStops || [])];
    stops[idx] = color;
    commit({ gradientStops: stops, gradient: true });
  };

  // Color presets
  const colorPresets = [
    { name: "Blue", colors: ['#2563eb', '#3b82f6', '#60a5fa'] },
    { name: "Green", colors: ['#059669', '#10b981', '#34d399'] },
    { name: "Purple", colors: ['#7c3aed', '#8b5cf6', '#a78bfa'] },
    { name: "Orange", colors: ['#ea580c', '#f97316', '#fb923c'] },
    { name: "Pink", colors: ['#db2777', '#ec4899', '#f472b6'] },
    { name: "Teal", colors: ['#0d9488', '#14b8a6', '#5eead4'] }
  ];

  const applyColorPreset = (preset) => {
    commit({ 
      color: preset.colors[0],
      gradientStops: preset.colors,
      gradient: preset.colors.length > 1
    });
  };

  // Validation and chart type compatibility
  const allChartTypes = [
    { value: CHART_TYPES.BAR, label: "Bar", icon: BarChart },
    { value: CHART_TYPES.LINE, label: "Line", icon: LineChart },
    { value: CHART_TYPES.AREA, label: "Area", icon: AreaChart },
    { value: CHART_TYPES.PIE, label: "Pie", icon: PieChart },
    { value: CHART_TYPES.SCATTER, label: "Scatter", icon: Circle },
    { value: CHART_TYPES.COLUMN, label: "Column", icon: BarChart2 },
    { value: CHART_TYPES.DOUGHNUT, label: "Doughnut", icon: PieChart },
    { value: CHART_TYPES.BUBBLE, label: "Bubble", icon: Circle },
    { value: CHART_TYPES.RADAR, label: "Radar", icon: Target },
    { value: CHART_TYPES.COMPARISON, label: "Compare", icon: BarChart },
    { value: CHART_TYPES.STACKED_BAR, label: "Stacked", icon: Layers },
    { value: CHART_TYPES.GAUGE, label: "Gauge", icon: Gauge },
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const resetToDefaults = () => {
    const defaults = {
      type: "bar",
      color: "#2563eb",
      gradient: false,
      gradientStops: ["#2563eb", "#ff6b6b"],
      showLabels: false,
      trendline: false,
      sort: "none",
      logScale: false,
      compareField: "",
      topN: 0,
      groupOthers: false
    };
    commit(defaults);
  };

  const tabs = [
    { id: "filters", label: "Filters", icon: Filter },
    { id: "display", label: "Display", icon: BarChart },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "advanced", label: "Advanced", icon: Settings }
  ];

  const chartConfig = getChartConfig(local.type) || {};
  const features = chartConfig.features || {};
 
  return (
    <div className="mt-4 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <h3 className="font-display text-sm flex items-center gap-2 font-medium">
          <Settings size={16} className="text-neonBlue" />
          Chart Options
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Reset to defaults"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => onSaveChart(local)}
            className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Save configuration"
          >
            <Save size={14} />
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Filters Tab */}
        {activeTab === "filters" && (
          <div className="space-y-4">
            {/* Dataset selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Dataset Source
              </label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
                <option>Current uploaded data</option>
                <option>Load from saved dataset...</option>
              </select>
            </div>

            {/* Country filter */}
            {categoricalColumns.includes('Country') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Country Filter
                </label>
                <select
                  multiple
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  style={{ minHeight: '80px' }}
                >
                  {getUniqueValues('Country').map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            )}

            {/* Company filter */}
            {categoricalColumns.includes('Company') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Company Filter
                </label>
                <select
                  multiple
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  style={{ minHeight: '80px' }}
                >
                  {getUniqueValues('Company').map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Campaign filter with search */}
            {categoricalColumns.includes('Campaign') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Campaign Filter
                </label>
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 dark:border-slate-600 dark:bg-slate-800"
                />
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50 dark:bg-slate-700">
                  {getUniqueValues('Campaign').map(campaign => (
                    <label key={campaign} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>{campaign}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        ({data.filter(row => row.Campaign === campaign).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date range picker */}
            {columns.includes('Date') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Numeric filters */}
            {numericColumns.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Numeric Filters
                </label>
                {numericColumns.slice(0, 2).map(col => (
                  <div key={col} className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">{col} Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Display Tab */}
        {activeTab === "display" && (
          <div className="space-y-4">
            {/* Aggregation settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Group By
                </label>
                <select
                  value={local.aggregateBy || ""}
                  onChange={e => {
                    const value = e.target.value;
                    commit({ aggregateBy: value });
                    setOptions({ ...local, aggregateBy: value }); // Force immediate update
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">No grouping</option>
                  {categoricalColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Metric
                </label>
                <select
                  value={local.metric || ""}
                  onChange={e => {
                    const value = e.target.value;
                    commit({ metric: value });
                    setOptions({ ...local, metric: value });
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Function
                </label>
                <select
                  value={local.aggregateFunction || "sum"}
                  onChange={e => {
                    const value = e.target.value;
                    commit({ aggregateFunction: value });
                    setOptions({ ...local, aggregateFunction: value });
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="sum">Sum</option>
                  <option value="mean">Average</option>
                  <option value="median">Median</option>
                  <option value="count">Count</option>
                </select>
              </div>
            </div>

            {/* Chart type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
               Chart Type
              </label>

              {/* Chart type buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2">
               {allChartTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                   <button
                     key={type.value}
                      onClick={() => commit({ type: type.value })}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl text-sm font-medium transition-all ${
                       local.type === type.value
                         ? "border-blue-500 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg"
                          : "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500 bg-gradient-to-br from-blue-400/40 to-blue-600/40 text-white shadow-md"
                      }`}
                    >
                      <Icon size={24} className="mb-1 drop-shadow-lg" />
                     {type.label}
                    </button>
                  );
               })}
             </div>
            </div>


            {/* Display options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Orientation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => commit({ orientation: "horizontal" })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm ${
                      local.orientation === "horizontal"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700"
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    onClick={() => commit({ orientation: "vertical" })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm ${
                      local.orientation !== "horizontal"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700"
                    }`}
                  >
                    Vertical
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sort By
                </label>
                <select
                  value={local.sort || "none"}
                  onChange={e => commit({ sort: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="none">None</option>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            {/* Top N selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Show Top N Groups
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={local.topN || 0}
                  onChange={e => commit({ topN: parseInt(e.target.value) || 0 })}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="All"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={local.groupOthers || false}
                    onChange={e => commit({ groupOthers: e.target.checked })}
                    className="rounded"
                  />
                  Group remainder as "Others"
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">0 = show all groups</p>
            </div>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === "colors" && (
          <div className="space-y-4">
            {/* Color presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Color Presets
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {colorPresets.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyColorPreset(preset)}
                    className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500 transition-colors"
                  >
                    <div className="flex gap-1 justify-center mb-2">
                      {preset.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={local.color || "#2563eb"}
                  onChange={e => commit({ color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300"
                />
                <input
                  type="text"
                  value={local.color || "#2563eb"}
                  onChange={e => commit({ color: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono dark:border-slate-600 dark:bg-slate-800"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            {/* Gradient toggle */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={local.gradient || false}
                  onChange={e => commit({ gradient: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Enable Gradient</span>
              </label>
            </div>

            {/* Gradient stops */}
            {local.gradient && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Gradient Colors ({(local.gradientStops || []).length} / 5)
                  </label>
              </div>
    
                {/* Color stop inputs */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {(local.gradientStops || [local.color || '#2563eb', '#ffffff']).map((color, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={e => updateGradientStop(i, e.target.value)}
                          className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => removeGradientStop(i)}
                        disabled={(local.gradientStops || []).length <= 2}
                        className="w-full px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      > 
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add color button */}
                <button
                  onClick={addGradientStop}
                  disabled={(local.gradientStops || []).length >= 5}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  + Add Color Stop
                </button>

                {/* Gradient preview */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-2">Preview</label>
                  <div 
                    className="h-12 rounded-lg border-2 border-gray-300"
                    style={{
                      background: local.gradientStops && local.gradientStops.length > 1
                        ? `linear-gradient(to right, ${local.gradientStops.join(', ')})`
                        : `linear-gradient(to right, ${local.color || '#2563eb'}, #60a5fa)`
                    }}
                  />
                </div>
            </div>
            )}

            {/* Per-series colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Series Colors
              </label>
              <div className="text-xs text-gray-500 mb-2">
                Click on chart elements to customize individual colors
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div className="text-sm">Interactive color editing:</div>
                <ul className="text-xs text-gray-600 dark:text-slate-400 mt-1 space-y-1">
                  <li>• Click any bar/point to open color picker</li>
                  <li>• Use "Apply to all" to extend color to similar items</li>
                  <li>• Save color profiles for reuse</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === "advanced" && (
          <div className="space-y-4">
          {/* Interactive features */}
            <div>
              <h4 className="font-medium text-gray-700 dark:text-slate-300 mb-3">Interactivity</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={local.showLabels || false}
                    onChange={e => commit({ showLabels: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Show Data Labels</span>
                </label>

                {(local.type === 'line' || local.type === 'bar' || local.type === 'area') && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={local.trendline || false}
                      onChange={e => commit({ trendline: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Show Trendline</span>
                  </label>
                )}

                {(local.type === 'bar' || local.type === 'line' || local.type === 'scatter') && (
                  <div>
                    <label className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={local.logScale || false}
                        onChange={e => commit({ logScale: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Logarithmic Scale</span>
                    </label>
                    {local.logScale && (
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={local.logMin || ""}
                        onChange={e => commit({ logMin: parseFloat(e.target.value) || undefined })}
                        placeholder="Min value (auto)"
                        className="ml-6 w-32 rounded border px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                      />
                    )}
                  </div>
                )}

                {/* 3D Effect with Enhanced Controls */}
                {(local.type === CHART_TYPES.BAR || 
                  local.type === CHART_TYPES.COLUMN || 
                  local.type === CHART_TYPES.PIE || 
                  local.type === CHART_TYPES.DOUGHNUT ||
                  local.type === CHART_TYPES.COMPARISON ||
                  local.type === CHART_TYPES.STACKED_BAR) && (
                  <div className="space-y-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={local.enable3D || false}
                        onChange={e => commit({ enable3D: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Enable 3D Effect</span>
                    </label>
                    
                    {local.enable3D && (
                      <div className="ml-6 space-y-4 pt-2">
                        {/* Depth Intensity */}
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2">
                            3D Depth: {local.shadow3DDepth || (
                              local.type === CHART_TYPES.PIE || local.type === CHART_TYPES.DOUGHNUT ? 20 : 8
                            )}px
                          </label>
                          <input
                            type="range"
                            min={local.type === CHART_TYPES.PIE || local.type === CHART_TYPES.DOUGHNUT ? 10 : 5}
                            max={local.type === CHART_TYPES.PIE || local.type === CHART_TYPES.DOUGHNUT ? 40 : 20}
                            value={local.shadow3DDepth || (
                              local.type === CHART_TYPES.PIE || local.type === CHART_TYPES.DOUGHNUT ? 20 : 8
                            )}
                            onChange={e => commit({ shadow3DDepth: parseInt(e.target.value) })}
                            className="w-full accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Subtle</span>
                            <span>Dramatic</span>
                          </div>
                        </div>

                        {/* Shadow Position - Only for Bar/Column charts */}
                        {(local.type === CHART_TYPES.BAR || 
                          local.type === CHART_TYPES.COLUMN ||
                          local.type === CHART_TYPES.COMPARISON ||
                          local.type === CHART_TYPES.STACKED_BAR) && (
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2">
                              Shadow Direction
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'bottom-right', label: 'Bottom Right ↘', icon: '↘' },
                                { value: 'bottom-left', label: 'Bottom Left ↙', icon: '↙' },
                                { value: 'top-right', label: 'Top Right ↗', icon: '↗' },
                                { value: 'top-left', label: 'Top Left ↖', icon: '↖' }
                              ].map(pos => (
                                <button
                                  key={pos.value}
                                  onClick={() => commit({ shadow3DPosition: pos.value })}
                                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    (local.shadow3DPosition || 'bottom-right') === pos.value
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:border-blue-400'
                                  }`}
                                >
                                  <span className="text-lg mr-1">{pos.icon}</span>
                                  <span className="hidden sm:inline">{pos.label.split(' ')[0]}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3D Preview Indicator */}
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-indigo-200 dark:border-indigo-700">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded shadow-lg transform rotate-3"></div>
                          <div className="text-xs text-gray-600 dark:text-slate-400">
                            {local.type === CHART_TYPES.PIE || local.type === CHART_TYPES.DOUGHNUT
                              ? '3D depth effect will create layered circular slices'
                              : '3D depth effect creates realistic bar depth and shadows'
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Compare Mode Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
              <h4 className="font-medium text-gray-700 dark:text-slate-300 mb-3">Compare Parameters</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={local.compareMode || false}
                    onChange={e => commit({ compareMode: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Compare Mode (Simultaneous)</span>
                </label>

                {local.compareMode && (
                  <div className="ml-6 space-y-4">
                    {/* Parameter 1 */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Parameter 1
                      </label>
                      <select
                        value={local.compareParam1 || ''}
                        onChange={e => commit({ compareParam1: e.target.value })}
                        className="w-full rounded border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 mb-2"
                      >
                        <option value="">Select parameter...</option>
                        {numericColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      
                      {local.compareParam1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Color:</span>
                          <input
                            type="color"
                            value={local.compareParam1Color || '#2563eb'}
                            onChange={e => commit({ compareParam1Color: e.target.value })}
                            className="w-10 h-8 rounded border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={local.compareParam1Color || '#2563eb'}
                            onChange={e => commit({ compareParam1Color: e.target.value })}
                            className="flex-1 rounded border px-2 py-1 text-xs font-mono dark:border-slate-600 dark:bg-slate-800"
                          />
                        </div>
                      )}
                    </div>

                    {/* Parameter 2 */}
                    <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Parameter 2
                      </label>
                      <select
                        value={local.compareParam2 || ''}
                        onChange={e => commit({ compareParam2: e.target.value })}
                        className="w-full rounded border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 mb-2"
                      >
                        <option value="">Select parameter...</option>
                        {numericColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      
                      {local.compareParam2 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Color:</span>
                          <input
                            type="color"
                            value={local.compareParam2Color || '#10b981'}
                            onChange={e => commit({ compareParam2Color: e.target.value })}
                            className="w-10 h-8 rounded border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={local.compareParam2Color || '#10b981'}
                            onChange={e => commit({ compareParam2Color: e.target.value })}
                            className="flex-1 rounded border px-2 py-1 text-xs font-mono dark:border-slate-600 dark:bg-slate-800"
                          />
                        </div>
                      )}
                    </div>

                    {local.compareParam1 && local.compareParam2 && (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-slate-400">
                          ✓ Both parameters will be displayed side-by-side on the same chart for direct comparison.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Export settings */}
            <div>
              <h4 className="font-medium text-gray-700 dark:text-slate-300 mb-3">Export Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Default Format</label>
                  <select
                    value={local.exportFormat || "png"}
                    onChange={e => commit({ exportFormat: e.target.value })}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                 >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV (data)</option>
                   </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DPI</label>
                  <input
                    type="number"
                    min="72"
                    max="600"
                    value={local.exportDPI || 300}
                    onChange={e => commit({ exportDPI: parseInt(e.target.value) || 300 })}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h4 className="font-medium text-gray-700 dark:text-slate-300 mb-3">Performance</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={local.enableAnimations !== false}
                    onChange={e => commit({ enableAnimations: e.target.checked })}
                    className="rounded"
                  />
                 <span className="text-sm">Enable Animations</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={local.enableTooltips !== false}
                    onChange={e => commit({ enableTooltips: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Tooltips</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {data.length > 0 && `${data.length.toLocaleString()} data points`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportChart', { detail: { format: 'png' } }))}
              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('exportData', { detail: { format: 'csv' } }))}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartOptions;
