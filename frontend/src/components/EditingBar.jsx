// frontend/src/components/EditingBar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Menu, Settings, Palette, Type, Move, RotateCcw, RotateCw, 
  BarChart3, LineChart, PieChart, Circle, AreaChart, TrendingUp, 
  SortAsc, SortDesc, Grid, Layers, Eye, EyeOff, Sliders, 
  Plus, Minus, RefreshCw, Undo2, Redo2, Save, Download,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Copy, Trash2
} from "lucide-react";

export default function EditingBar({ 
  sidebarOpen, 
  setSidebarOpen, 
  chartOptions, 
  onOptionsChange, 
  onSave,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetView,
  onFitToScreen 
}) {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const chartTypes = [
    { type: "bar", icon: BarChart3, label: "Bar" },
    { type: "line", icon: LineChart, label: "Line" },
    { type: "area", icon: AreaChart, label: "Area" },
    { type: "pie", icon: PieChart, label: "Pie" },
    { type: "scatter", icon: Circle, label: "Scatter" }
  ];

  const colorPresets = [
    { name: "Blue", color: "#2563eb" },
    { name: "Green", color: "#059669" },
    { name: "Purple", color: "#7c3aed" },
    { name: "Orange", color: "#ea580c" },
    { name: "Pink", color: "#db2777" },
    { name: "Teal", color: "#0d9488" }
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

  return (
    <div className="bg-white dark:bg-slate-800 border-b-2 border-blue-500 shadow-lg">
      {/* Main Toolbar */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left Section - Sidebar Toggle & File Operations */}
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

        {/* Center Section - Chart Tools */}
        <div className="flex items-center gap-1">
          {/* Chart Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('chartType')}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === 'chartType' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title="Chart Type"
            >
              {chartTypes.find(t => t.type === chartOptions.type)?.icon 
                ? React.createElement(chartTypes.find(t => t.type === chartOptions.type).icon, { size: 18 })
                : <BarChart3 size={18} />
              }
            </button>
            {activeDropdown === 'chartType' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                {chartTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleChartTypeChange(type)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                      chartOptions.type === type ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color Picker Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('colors')}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === 'colors' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title="Colors"
            >
              <Palette size={18} />
            </button>
            {activeDropdown === 'colors' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 p-2">
                <div className="grid grid-cols-3 gap-2 mb-2">
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
                <input
                  type="color"
                  value={chartOptions.color || "#2563eb"}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-8 rounded border cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('sort')}
              className={`p-2 rounded-lg transition-colors ${
                activeDropdown === 'sort' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title="Sort Data"
            >
              <SortAsc size={18} />
            </button>
            {activeDropdown === 'sort' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                <button
                  onClick={() => handleSortChange('none')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === 'none' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <Grid size={16} />
                  No Sort
                </button>
                <button
                  onClick={() => handleSortChange('asc')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === 'asc' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <SortAsc size={16} />
                  Ascending
                </button>
                <button
                  onClick={() => handleSortChange('desc')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    chartOptions.sort === 'desc' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <SortDesc size={16} />
                  Descending
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-2" />

          {/* Toggle Options */}
          <button
            onClick={() => onOptionsChange({ showLabels: !chartOptions.showLabels })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.showLabels 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title="Toggle Data Labels"
          >
            {chartOptions.showLabels ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={() => onOptionsChange({ trendline: !chartOptions.trendline })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.trendline 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title="Toggle Trendline"
          >
            <TrendingUp size={18} />
          </button>

          <button
            onClick={() => onOptionsChange({ gradient: !chartOptions.gradient })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.gradient 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title="Toggle Gradient"
          >
            <Layers size={18} />
          </button>
        </div>

        {/* Right Section - View Controls & Settings */}
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
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
