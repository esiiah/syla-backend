// frontend/src/components/EditingPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { Edit3, TrendingUp, Download } from "lucide-react";
import ChartView from "./ChartView";
import { useChartData } from "../context/ChartDataContext";

export default function EditingPanel({ 
  sidebarOpen, 
  onTitleEdit,
  onExport,
  onForecast,
  selectedBars,
  onBarClick 
}) {
  const { chartData, updateChartData } = useChartData();
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(chartData.chartTitle || "");
  const panelRef = useRef(null);

  useEffect(() => {
    setLocalTitle(chartData.chartTitle || "");
  }, [chartData.chartTitle]);

  const handleTitleSave = () => {
    updateChartData({ chartTitle: localTitle });
    setEditingTitle(false);
    onTitleEdit?.(localTitle);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setLocalTitle(chartData.chartTitle || "");
      setEditingTitle(false);
    }
  };

  const updateAxes = (xAxis, yAxis) => {
    updateChartData({ xAxis, yAxis });
  };

  const handleOptionsChange = (newOptions) => {
    updateChartData({ 
      chartOptions: { ...chartData.chartOptions, ...newOptions }
    });
  };

  if (!chartData.data.length) {
    return (
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="mx-4 mt-4 mb-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">
                No Chart Data Available
              </h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Upload a CSV file to start creating and editing charts
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back to Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'} overflow-auto`}
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <div className="mx-4 mt-4 mb-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            {/* Editable Title */}
            <div className="flex items-center gap-3">
              {editingTitle ? (
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyPress}
                  className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none min-w-[200px] text-gray-800 dark:text-slate-200"
                  autoFocus
                  placeholder="Enter chart title..."
                />
              ) : (
                <h1 
                  className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 text-gray-800 dark:text-slate-200"
                  onClick={() => setEditingTitle(true)}
                >
                  {localTitle || "Untitled Chart"}
                  <Edit3 size={16} className="opacity-50" />
                </h1>
              )}
              
              {/* Data info */}
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {chartData.data.length.toLocaleString()} rows • {chartData.columns.length} columns
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onForecast}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <TrendingUp size={16} />
                Forecast
              </button>
              
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-6">
          {/* Axis Selectors */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-slate-400">
                X-Axis:
              </label>
              <select
                value={chartData.xAxis || ""}
                onChange={(e) => updateAxes(e.target.value, chartData.yAxis)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chartData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Y-Axis:
              </label>
              <select
                value={chartData.yAxis || ""}
                onChange={(e) => updateAxes(chartData.xAxis, e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chartData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Info */}
          {selectedBars?.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedBars.length} item(s) selected
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm">
                    Delete Selected
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm">
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chart Component */}
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-black/20 dark:to-black/10 rounded-xl p-4 border dark:border-white/10">
            <ChartView
              data={chartData.data}
              columns={chartData.columns}
              types={chartData.types}
              options={chartData.chartOptions}
              chartTitle={localTitle}
              xAxis={chartData.xAxis}
              yAxis={chartData.yAxis}
              setXAxis={(xAxis) => updateAxes(xAxis, chartData.yAxis)}
              setYAxis={(yAxis) => updateAxes(chartData.xAxis, yAxis)}
              onBarClick={onBarClick}
              selectedBars={selectedBars}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
