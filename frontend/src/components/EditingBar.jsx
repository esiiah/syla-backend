// frontend/src/components/EditingBar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHART_TYPES } from '../utils/chartConfigs';
import { 
  Menu, Settings, Palette, Type, Move, RotateCcw, RotateCw, 
  BarChart3, LineChart, PieChart, Circle, AreaChart, TrendingUp, 
  SortAsc, SortDesc, Grid, Layers, Eye, EyeOff, Sliders, 
  Plus, Minus, RefreshCw, Undo2, Redo2, Save, Download,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Copy, Trash2, BarChart2, Target, Gauge, BarChart
} from "lucide-react";

export default function EditingBar({ 
  sidebarOpen, setSidebarOpen, chartOptions, onOptionsChange, 
  onSave, onExport, onUndo, onRedo, canUndo, canRedo,
  onResetView, onFitToScreen, className = ""
}) {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [gradientBarRef, setGradientBarRef] = useState(null);

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
    { type: CHART_TYPES.GAUGE, icon: Gauge, label: "Gauge" }
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

  const handleGradientToggle = () => {
    const newGradient = !chartOptions.gradient;
    const updates = { gradient: newGradient };
    
    if (newGradient && !chartOptions.gradientStops) {
      updates.gradientStops = [chartOptions.color || "#2563eb", "#60a5fa"];
    }
    
    onOptionsChange(updates);
  };

  const handleGradientBarClick = (event) => {
    if (!gradientBarRef) return;
    
    const rect = gradientBarRef.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    const newColor = interpolateColor(chartOptions.gradientStops || [], position);
    
    const stops = [...(chartOptions.gradientStops || [])];
    const insertIndex = Math.floor(position * stops.length);
    stops.splice(insertIndex, 0, newColor);
    
    onOptionsChange({ gradientStops: stops });
  };

  const removeGradientStop = (index) => {
    if (!chartOptions.gradientStops || chartOptions.gradientStops.length <= 2) return;
    
    const stops = [...chartOptions.gradientStops];
    stops.splice(index, 1);
    onOptionsChange({ gradientStops: stops });
  };

  const updateGradientStop = (index, color) => {
    const stops = [...(chartOptions.gradientStops || [])];
    stops[index] = color;
    onOptionsChange({ gradientStops: stops });
  };

  const interpolateColor = (stops, position) => {
    if (stops.length < 2) return stops[0] || "#2563eb";
    
    const segmentSize = 1 / (stops.length - 1);
    const segmentIndex = Math.min(Math.floor(position / segmentSize), stops.length - 2);
    const segmentPosition = (position - segmentIndex * segmentSize) / segmentSize;
    
    return stops[segmentIndex];
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 shadow-lg ${className}`}
      style={{ zIndex: 30 }}
    >
      <div className="px-4 py-2 flex items-center justify-between">
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

        <div className="flex items-center gap-1">
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
              <div 
                className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[120px]"
                style={{ zIndex: 70 }}
              >
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
                  <div className="space-y-2">
                    <div 
                      ref={setGradientBarRef}
                      className="relative h-6 rounded cursor-pointer border"
                      style={{
                        background: chartOptions.gradientStops 
                          ? `linear-gradient(to right, ${chartOptions.gradientStops.join(', ')})`
                          : `linear-gradient(to right, ${chartOptions.color || '#2563eb'}, #60a5fa)`
                      }}
                      onClick={handleGradientBarClick}
                      title="Click to add gradient stop"
                    >
                      {(chartOptions.gradientStops || []).map((stop, index) => (
                        <div
                          key={index}
                          className="absolute top-0 w-3 h-3 border-2 border-white rounded-full cursor-pointer transform -translate-y-1 hover:scale-125 transition-transform"
                          style={{ 
                            backgroundColor: stop,
                            left: `${(index / Math.max(1, (chartOptions.gradientStops?.length || 1) - 1)) * 100}%`,
                            transform: 'translateX(-50%) translateY(-25%)'
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            removeGradientStop(index);
                          }}
                          title="Double-click to remove"
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Click to add stops • Double-click stops to remove
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onOptionsChange({ enable3D: !chartOptions.enable3D })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.enable3D 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title="Toggle 3D Effect"
          >
            <Layers size={18} />
          </button>

          <button
            onClick={() => onOptionsChange({ logScale: !chartOptions.logScale })}
            className={`p-2 rounded-lg transition-colors ${
              chartOptions.logScale 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title="Toggle Logarithmic Scale"
          >
            <BarChart2 size={18} />
          </button>

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
              <div 
                className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[120px]"
                style={{ zIndex: 70 }}
              >
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
        </div>

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

      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
