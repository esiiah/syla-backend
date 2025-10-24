// frontend/src/components/RowSelectionModal.jsx
import React, { useState, useEffect } from "react";
import { X, AlertTriangle, RotateCcw } from "lucide-react";
import RowPreviewList from "./RowPreviewList";
import ChartView from "./ChartView";
import { getTopNRows, getBottomNRows, getRandomSample, detectMobileViewport } from "../utils/rowSelectionUtils";

export default function RowSelectionModal({
  isOpen,
  onClose,
  data = [],
  columns = [],
  chartData = {},
  onApply = () => {}
}) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const isMobile = detectMobileViewport();
  const maxRows = isMobile ? 10 : 20;

  useEffect(() => {
    if (isOpen) {
      // Initialize with current selection or default top N
      const initial = chartData.selectedRowIndices || 
        Array.from({ length: Math.min(maxRows, data.length) }, (_, i) => i);
      setSelectedIndices(initial);
    }
  }, [isOpen, chartData.selectedRowIndices, maxRows, data.length]);

  useEffect(() => {
    setShowWarning(selectedIndices.length > 20);
  }, [selectedIndices]);

  const handleQuickSelect = (type) => {
    let newSelection = [];
    const numericColumn = columns.find(col => 
      typeof data[0]?.[col] === 'number'
    ) || columns[1];

    switch (type) {
      case "top10":
        newSelection = getTopNRows(data, numericColumn, 10).map(r => r._originalIndex);
        break;
      case "bottom10":
        newSelection = getBottomNRows(data, numericColumn, 10).map(r => r._originalIndex);
        break;
      case "first20":
        newSelection = Array.from({ length: Math.min(20, data.length) }, (_, i) => i);
        break;
      case "last20":
        newSelection = Array.from({ length: Math.min(20, data.length) }, (_, i) => data.length - 20 + i);
        break;
      case "random":
        newSelection = getRandomSample(data, Math.min(20, data.length)).map(r => r._originalIndex);
        break;
      default:
        break;
    }
    setSelectedIndices(newSelection);
  };

  const handleReset = () => {
    const defaultSelection = Array.from({ length: Math.min(maxRows, data.length) }, (_, i) => i);
    setSelectedIndices(defaultSelection);
  };

  const handleApply = () => {
    if (selectedIndices.length === 0) {
      alert("Please select at least one row");
      return;
    }
    onApply(selectedIndices);
    onClose();
  };

  // Prepare preview data
  const previewData = data.filter((_, index) => selectedIndices.includes(index));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-600">
          <h2 className="text-xl font-semibold">Select Rows to Display</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning banner */}
        {showWarning && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle size={18} />
              <span className="text-sm">
                You've selected {selectedIndices.length} rows. For optimal visualization, we recommend 20 or fewer rows.
              </span>
            </div>
          </div>
        )}

        {/* Quick select buttons */}
        <div className="p-4 border-b dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleQuickSelect("top10")} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              Top 10
            </button>
            <button onClick={() => handleQuickSelect("bottom10")} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              Bottom 10
            </button>
            <button onClick={() => handleQuickSelect("first20")} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              First 20
            </button>
            <button onClick={() => handleQuickSelect("last20")} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              Last 20
            </button>
            <button onClick={() => handleQuickSelect("random")} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              Random Sample
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Row list */}
          <div className="w-1/2 border-r dark:border-slate-600 overflow-hidden">
            <RowPreviewList
              data={data}
              columns={columns}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              maxHeight="100%"
            />
          </div>

          {/* Right: Live preview */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Live Preview ({previewData.length} rows)
              </h3>
            </div>
            {previewData.length > 0 ? (
              <div style={{ height: "400px" }}>
                <ChartView
                  data={previewData}
                  columns={columns}
                  types={chartData.types}
                  options={chartData.chartOptions}
                  xAxis={chartData.xAxis}
                  yAxis={chartData.yAxis}
                  chartTitle={chartData.chartTitle}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Select rows to see preview
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-600 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            <RotateCcw size={16} />
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIndices.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
