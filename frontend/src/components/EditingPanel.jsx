// frontend/src/components/EditingPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import RowSelectionModal from "./RowSelectionModal";
import { Edit3, Trash2, Square } from "lucide-react";
import ChartView from "./ChartView";
import ChartOptions from "./ChartOptions";
import { useChartData } from "../context/ChartDataContext";

// Editable Text Component
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
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
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
        style={{ minWidth: '200px' }}
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
      title="Double-click to edit"
    >
      {value || placeholder}
      <Edit3 size={14} className="opacity-50" />
    </span>
  );
};

export default function EditingPanel({ 
  sidebarOpen, 
  onTitleEdit,
  onExport,
  onForecast,
  selectedBars,
  onBarClick,
  onSelectionDelete,
  onSelectionClear
}) {
  const { chartData, updateChartData } = useChartData();
  const [showRowSelectionModal, setShowRowSelectionModal] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setShowRowSelectionModal(true);
    window.addEventListener('openRowSelectionModal', handleOpenModal);
    return () => window.removeEventListener('openRowSelectionModal', handleOpenModal);
  }, []);

  const handleRowSelectionApply = (selectedIndices) => {
    updateChartData({ 
      selectedRowIndices: selectedIndices,
      rowSelectionMode: "custom",
      totalRowCount: chartData.data.length
    });
  };

  const updateAxes = (xAxis, yAxis) => {
    updateChartData({ xAxis, yAxis });
  };

  const handleTitleSave = (newTitle) => {
    updateChartData({ chartTitle: newTitle });
    onTitleEdit?.(newTitle);
  };

  const handleAxisLabelSave = (axis, newLabel) => {
    const updates = {};
    if (axis === 'x') {
      updates.xAxisLabel = newLabel;
    } else if (axis === 'y') {
      updates.yAxisLabel = newLabel;
    }
    updateChartData(updates);
  };

  if (!chartData.data.length) {
    return (
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        <div className="mx-2 sm:mx-4 mt-2 sm:mt-4 mb-2 sm:mb-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm min-h-[calc(100vh-8rem)]">
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
      className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'} overflow-auto`}
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <div className="mx-2 sm:mx-4 mt-2 sm:mt-4 mb-2 sm:mb-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm min-h-[calc(100vh-8rem)]">
        {/* Chart Area */}
        <div className="p-3 sm:p-6 h-full">
          {/* Title and Data Info Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-6">
              {/* Editable Title */}
              <div className="flex items-center">
                <EditableText
                  value={chartData.chartTitle}
                  onSave={handleTitleSave}
                  className="text-xl font-semibold text-gray-800 dark:text-slate-200"
                  placeholder="Untitled Chart"
                  maxLength={100}
                />
              </div>
              
              {/* Data info */}
              <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                {chartData.data.length.toLocaleString()} rows • {chartData.columns.length} columns
              </div>
            </div>
          </div>

          {/* Axis Controls with Selection Mode */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 mb-4 sm:mb-6 items-stretch sm:items-center">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial">
              <div className="flex items-center gap-2">
                <EditableText
                  value={chartData.xAxisLabel || "X-Axis"}
                  onSave={(label) => handleAxisLabelSave('x', label)}
                  className="text-sm font-medium text-gray-600 dark:text-slate-400"
                  placeholder="X-Axis Label"
                  maxLength={50}
                />
                <span className="text-gray-400">:</span>
              </div>
              <select
                value={chartData.xAxis || ""}
                onChange={(e) => updateAxes(e.target.value, chartData.yAxis)}
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 w-full sm:min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chartData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial">
              <div className="flex items-center gap-2">
                <EditableText
                  value={chartData.yAxisLabel || "Y-Axis"}
                  onSave={(label) => handleAxisLabelSave('y', label)}
                  className="text-sm font-medium text-gray-600 dark:text-slate-400"
                  placeholder="Y-Axis Label"
                  maxLength={50}
                />
                <span className="text-gray-400">:</span>
              </div>
              <select
                value={chartData.yAxis || ""}
                onChange={(e) => updateAxes(chartData.xAxis, e.target.value)}
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 w-full sm:min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chartData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Selection Mode Button */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                  selectionMode 
                    ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                } dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`}
              >
                <Square size={16} />
                {selectionMode ? 'Exit Selection' : 'Select Mode'}
              </button>
            </div>
          </div>

          {/* Selection Info */}
          {selectedBars?.length > 0 && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedBars.length} item(s) selected
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={onSelectionDelete}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs sm:text-sm"
                  >
                    <Trash2 size={14} />
                    Delete Selected
                  </button>
                  <button 
                    onClick={onSelectionClear}
                    className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs sm:text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectionMode && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
              <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                <strong>Selection Mode Active:</strong> Click on chart elements to select them for bulk operations.
              </div>
            </div>
          )}

          {/* Chart Component */}
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-black/20 dark:to-black/10 rounded-lg sm:rounded-xl p-2 sm:p-4 border dark:border-white/10" style={{ 
            minHeight: '550px',
            overflow: 'visible' 
          }}> 
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
          {/* ADD THIS SECTION */}
          <ChartOptions
            options={chartData.chartOptions}
            setOptions={(newOptions) => {
              updateChartData({ chartOptions: { ...chartData.chartOptions, ...newOptions } });
            }}
            columns={chartData.columns}
            data={chartData.data}
          />
        </div>
      </div>
      
      <RowSelectionModal
        isOpen={showRowSelectionModal}
        onClose={() => setShowRowSelectionModal(false)}
        data={chartData.data}
        columns={chartData.columns}
        chartData={chartData}
        onApply={handleRowSelectionApply}
      />
      
    </div>
  );
}
