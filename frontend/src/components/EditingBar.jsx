// frontend/src/components/EditingBar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHART_TYPES } from "../utils/chartConfigs";
import {
  Menu, Settings, Palette, BarChart3, LineChart, PieChart, Circle, AreaChart,
  TrendingUp, SortAsc, SortDesc, Grid, Layers, Eye, EyeOff, Download, Save,
  RefreshCw, Undo2, Redo2, Maximize2, BarChart2, Target, Gauge, BarChart
} from "lucide-react";

export default function EditingBar({
  sidebarOpen, setSidebarOpen, chartOptions, onOptionsChange,
  onSave, onExport, onUndo, onRedo, canUndo, canRedo,
  onResetView, onFitToScreen, className = ""
}) {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const chartTypes = [
    { type: CHART_TYPES.BAR, icon: BarChart3, label: "Bar" },
    { type: CHART_TYPES.LINE, icon: LineChart, label: "Line" },
    { type: CHART_TYPES.AREA, icon: AreaChart, label: "Area" },
    { type: CHART_TYPES.PIE, icon: PieChart, label: "Pie" },
    { type: CHART_TYPES.SCATTER, icon: Circle, label: "Scatter" },
    { type: CHART_TYPES.COLUMN, icon: BarChart2, label: "Column" },
    { type: CHART_TYPES.DOUGHNUT, icon: PieChart, label: "Doughnut" },
    { type: CHART_TYPES.BUBBLE, icon: Circle, label: "Bubble" },
    { type: CHART_TYPES.RADAR, icon: Target, label: "Radar" },
    { type: CHART_TYPES.COMPARISON, icon: BarChart, label: "Compare" },
    { type: CHART_TYPES.STACKED_BAR, icon: Layers, label: "Stacked" },
    { type: CHART_TYPES.GAUGE, icon: Gauge, label: "Gauge" },
  ];

  const colorPresets = [
    { name: "Blue", color: "#2563eb" },
    { name: "Green", color: "#059669" },
    { name: "Purple", color: "#7c3aed" },
    { name: "Orange", color: "#ea580c" },
    { name: "Pink", color: "#db2777" },
    { name: "Teal", color: "#0d9488" },
  ];

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleChartTypeChange = (type) => {
    onOptionsChange({ type });
    setActiveDropdown(null);
  };

  const handleColorChange = (color) => {
    onOptionsChange({ color });
    setActiveDropdown(null);
  };

  const handleSortChange = (sort) => {
    onOptionsChange({ sort });
    setActiveDropdown(null);
  };

  const handleGradientToggle = () => {
    const newGradient = !chartOptions.gradient;
    const updates = { gradient: newGradient };
    if (newGradient && !chartOptions.gradientStops) {
      updates.gradientStops = [chartOptions.color || "#2563eb", "#60a5fa"];
    }
    onOptionsChange(updates);
  };

  const addGradientStop = () => {
    const stops = chartOptions.gradientStops || [chartOptions.color || "#2563eb", "#60a5fa"];
    if (stops.length >= 5) return;
    const newColor = stops[Math.floor(stops.length / 2)];
    onOptionsChange({ gradientStops: [...stops, newColor] });
  };

  const removeGradientStop = (index) => {
    const stops = chartOptions.gradientStops || [];
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    onOptionsChange({ gradientStops: newStops });
  };

  const updateGradientStop = (index, color) => {
    const stops = [...(chartOptions.gradientStops || [])];
    stops[index] = color;
    onOptionsChange({ gradientStops: stops });
  };

  return (
    <div className={`bg-white dark:bg-slate-800 shadow-lg ${className}`} style={{ zIndex: 30 }}>
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left section: Sidebar, Save, Export */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-2" />

          <button
            onClick={onSave}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Save Chart"
          >
            <Save size={18} />
          </button>

          <button
            onClick={onExport}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Export Chart"
          >
            <Download size={18} />
          </button>
        </div>

        {/* Middle section: chart options */}
        <div className="flex items-center gap-1">
          {/* Chart Type */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("chartType")}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === "chartType"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title="Chart Type"
            >
              {chartTypes.find((t) => t.type === chartOptions.type)?.icon
                ? React.createElement(chartTypes.find((t) => t.type === chartOptions.type).icon, { size: 18 })
                : <BarChart3 size={18} />}
            </button>

            {activeDropdown === "chartType" && (
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[120px]"
                style={{ zIndex: 70 }}
              >
                {chartTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleChartTypeChange(type)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                      chartOptions.type === type ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : ""
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color settings */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("colors")}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === "colors"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title="Colors"
            >
              <Palette size={18} />
            </button>

            {activeDropdown === "colors" && (
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 min-w-[280px]"
                style={{ zIndex: 70 }}
              >
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {colorPresets.map(({ name, color }) => (
                    <button
                      key={name}
                      onClick={() => handleColorChange(color)}
                      className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                  ))}
                </div>

                <div className="mb-3">
                  <input
                    type="color"
                    value={chartOptions.color || "#2563eb"}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-8 rounded border cursor-pointer"
                  />
                </div>

                <div className="mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={chartOptions.gradient || false}
                      onChange={handleGradientToggle}
                      className="rounded"
                    />
                    <span>Enable Gradient</span>
                  </label>
                </div>

                {chartOptions.gradient && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(chartOptions.gradientStops || [chartOptions.color || "#2563eb", "#60a5fa"]).map(
                        (stop, index) => (
                          <div key={index} className="flex flex-col items-center gap-1">
                            <input
                              type="color"
                              value={stop}
                              onChange={(e) => updateGradientStop(index, e.target.value)}
                              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                              title={`Color ${index + 1}`}
                            />
                            <button
                              onClick={() => removeGradientStop(index)}
                              disabled={chartOptions.gradientStops?.length <= 2}
                              className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove color"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <button
                        onClick={addGradientStop}
                        disabled={chartOptions.gradientStops?.length >= 5}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>+</span> Add Color
                      </button>
                      <span className="text-xs text-gray-500">
                        {chartOptions.gradientStops?.length || 2} / 5 colors
                      </span>
                    </div>

                    <div
                      className="h-8 rounded-lg border"
                      style={{
                        background: chartOptions.gradientStops
                          ? `linear-gradient(to right, ${chartOptions.gradientStops.join(", ")})`
                          : `linear-gradient(to right, ${chartOptions.color || "#2563eb"}, #60a5fa)`,
                      }}
                      title="Gradient preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggle 3D - Show only for supported chart types */}
          {(chartOptions.type === CHART_TYPES.BAR || 
            chartOptions.type === CHART_TYPES.COLUMN ||
            chartOptions.type === CHART_TYPES.PIE ||
            chartOptions.type === CHART_TYPES.DOUGHNUT ||
            chartOptions.type === CHART_TYPES.COMPARISON ||
            chartOptions.type === CHART_TYPES.STACKED_BAR) && (
            <button
              onClick={() => onOptionsChange({ enable3D: !chartOptions.enable3D })}
              className={`p-2 rounded-lg transition-colors ${
                chartOptions.enable3D
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title={`Toggle 3D Effect (${chartOptions.enable3D ? 'ON' : 'OFF'})`}
            >
              <Layers size={18} />
            </button>
          )}

          {/* Toggle Log scale */}
          <button
            onClick={() => onOptionsChange({ logScale: !chartOptions.logScale })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.logScale
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                : "hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Toggle Logarithmic Scale"
          >
            <BarChart2 size={18} />
          </button>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("sort")}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === "sort"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title="Sort Data"
            >
              <SortAsc size={18} />
            </button>

            {activeDropdown === "sort" && (
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[120px]"
                style={{ zIndex: 70 }}
              >
                <button
                  onClick={() => handleSortChange("none")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === "none" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <Grid size={16} />
                  No Sort
                </button>
                <button
                  onClick={() => handleSortChange("asc")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === "asc" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <SortAsc size={16} />
                  Ascending
                </button>
                <button
                  onClick={() => handleSortChange("desc")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === "desc" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <SortDesc size={16} />
                  Descending
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-2" />

          {/* Show Labels */}
          <button
            onClick={() => onOptionsChange({ showLabels: !chartOptions.showLabels })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.showLabels
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                : "hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Toggle Data Labels"
          >
            {chartOptions.showLabels ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          {/* Trendline */}
          <button
            onClick={() => onOptionsChange({ trendline: !chartOptions.trendline })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.trendline
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                : "hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Toggle Trendline"
          >
            <TrendingUp size={18} />
          </button>
        </div>

        {/* Right section: Undo/Redo and View */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-2" />

          <button
            onClick={onFitToScreen}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 size={18} />
          </button>

          <button
            onClick={onResetView}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Reset View"
          >
            <RefreshCw size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-2" />

          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}
    </div>
  );
}
