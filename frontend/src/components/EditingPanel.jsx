// frontend/src/components/EditingPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { Edit3, Trash2, Square } from "lucide-react";
import ChartView from "./ChartView";
import { useChartData } from "../context/ChartDataContext";

/**
 * EditableText
 * Small in-place editor used for title and axis labels.
 */
const EditableText = ({
  value,
  onSave,
  className = "",
  placeholder = "Click to edit...",
  multiline = false,
  maxLength = 100
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) inputRef.current.select();
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    // keep local state in sync if parent value changes
    setTempValue(value || "");
  }, [value]);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <InputComponent
        ref={inputRef}
        type={multiline ? undefined : "text"}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-b-2 border-blue-500 focus:outline-none ${className}`}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={multiline ? 2 : undefined}
        style={{ minWidth: "200px" }}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 ${className}`}
      onClick={() => {
        setTempValue(value || "");
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {value || placeholder}
      <Edit3 size={14} className="opacity-50" />
    </span>
  );
};


export default function EditingPanel({
  sidebarOpen,
  onTitleEdit,
  // onExport, onForecast removed per your request - keep props present but unused won't break callers
  onExport,
  onForecast,
  selectedBars,
  onBarClick,
  onSelectionDelete,
  onSelectionClear
}) {
  const { chartData, updateChartData } = useChartData();
  const [selectionMode, setSelectionMode] = useState(false);
  const panelRef = useRef(null);

  const updateAxes = (xAxis, yAxis) => {
    updateChartData({ xAxis, yAxis });
  };

  const handleTitleSave = (newTitle) => {
    updateChartData({ chartTitle: newTitle });
    onTitleEdit?.(newTitle);
  };

  const handleAxisLabelSave = (axis, newLabel) => {
    const updates = {};
    if (axis === "x") updates.xAxisLabel = newLabel;
    else if (axis === "y") updates.yAxisLabel = newLabel;
    updateChartData(updates);
  };

  // No-data state
  if (!chartData?.data?.length) {
    return (
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <div className="mx-4 mt-4 mb-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">No Chart Data Available</h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">Upload a CSV file to start creating and editing charts</p>
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

  // Main two-column layout: left controls, right chart
  return (
    <div ref={panelRef} className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"} overflow-hidden`}>
      <div className="mx-4 mt-4 mb-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm">
        {/* Wrap content in a flex container so chart can grow */}
        <div className="flex flex-col md:flex-row gap-0">
          {/* Left column: control strip (keeps minimal width, collapses on small screens) */}
          <div className="w-full md:w-[360px] lg:w-[380px] p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 bg-transparent">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <EditableText
                    value={chartData.chartTitle}
                    onSave={handleTitleSave}
                    className="text-lg md:text-xl font-semibold text-gray-800 dark:text-slate-200"
                    placeholder="Untitled Chart"
                    maxLength={100}
                  />
                  <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {chartData.data.length.toLocaleString()} rows • {chartData.columns.length} columns
                  </div>
                </div>
                {/* small toolbar area (no export/forecast per your request) */}
              </div>

              {/* Axis pickers + selection toggle (moved to axis row as requested) */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <EditableText
                      value={chartData.xAxisLabel || "X-Axis"}
                      onSave={(label) => handleAxisLabelSave("x", label)}
                      className="text-sm font-medium text-gray-600 dark:text-slate-400"
                      placeholder="X-Axis Label"
                      maxLength={50}
                    />
                    <span className="text-gray-400">:</span>
                    <select
                      value={chartData.xAxis || ""}
                      onChange={(e) => updateAxes(e.target.value, chartData.yAxis)}
                      className="ml-2 border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {chartData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <EditableText
                      value={chartData.yAxisLabel || "Y-Axis"}
                      onSave={(label) => handleAxisLabelSave("y", label)}
                      className="text-sm font-medium text-gray-600 dark:text-slate-400"
                      placeholder="Y-Axis Label"
                      maxLength={50}
                    />
                    <span className="text-gray-400">:</span>
                    <select
                      value={chartData.yAxis || ""}
                      onChange={(e) => updateAxes(chartData.xAxis, e.target.value)}
                      className="ml-2 border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {chartData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selection mode moved next to axis controls */}
                  <div className="ml-auto">
                    <button
                      onClick={() => setSelectionMode(!selectionMode)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                        selectionMode
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      } dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`}
                    >
                      <Square size={14} />
                      <span className="text-sm">{selectionMode ? "Exit Selection" : "Select Mode"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selection info & actions */}
              {selectedBars?.length > 0 && (
                <div className="mb-0 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {selectedBars.length} item(s) selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={onSelectionDelete}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <button
                        onClick={onSelectionClear}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectionMode && (
                <div className="mb-0 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    <strong>Selection Mode Active:</strong> Click on chart elements to select them for bulk operations.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column: chart area - IMPORTANT: flex-1 so it fills remaining width */}
          <div className="flex-1 p-6 min-h-[420px]">
            {/* Outer chart box: make it stretch horizontally and vertically */}
            <div
              className="rounded-xl p-4 border dark:border-white/10 bg-gradient-to-b from-gray-50 to-white dark:from-black/20 dark:to-black/10 h-full flex flex-col"
              style={{ minHeight: "calc(100vh - 200px)" }}
            >
              {/* ChartView should be allowed to expand. Use a container that grows. */}
              <div className="flex-1 w-full h-full overflow-hidden">
                <ChartView
                  data={chartData.data}
                  columns={chartData.columns}
                  types={chartData.types}
                  options={chartData.chartOptions}
                  chartTitle={chartData.chartTitle}
                  xAxis={chartData.xAxis}
                  yAxis={chartData.yAxis}
                  setXAxis={(xAxis) => updateAxes(xAxis, chartData.yAxis)}
                  setYAxis={(yAxis) => updateAxes(chartData.xAxis, yAxis)}
                  onBarClick={onBarClick}
                  selectedBars={selectedBars}
                  selectionMode={selectionMode}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
