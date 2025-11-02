// frontend/src/components/forecast/MiniChartPreview.jsx
import React from 'react';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';

export default function MiniChartPreview({ 
  chartData, 
  isMinimized, 
  onToggle,
  chartTitle 
}) {
  if (!chartData) return null;

  const miniChartData = {
    labels: chartData.labels?.slice(0, 10) || [],
    datasets: [{
      data: chartData.values?.slice(0, 10) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  const miniOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      datalabels: { display: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div 
      className={`fixed ${
        window.innerWidth < 640 
          ? (isMinimized ? 'top-2 right-2 w-10 h-10' : 'top-2 right-2 left-2 h-40')
          : (isMinimized ? 'top-4 right-4 w-12 h-12' : 'top-4 right-4 w-80 h-56')
      } bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 transition-all duration-300 ease-in-out z-40 overflow-hidden`}
      style={{
        transform: isMinimized ? 'scale(1)' : 'scale(1)',
        opacity: 1
      }}
    >
      {/* Minimized State - Clickable Icon */}
      {isMinimized ? (
        <button
          onClick={onToggle}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 rounded-lg sm:rounded-xl cursor-pointer group"
          title="Expand chart preview"
        >
          <BarChart3 size={window.innerWidth < 640 ? 16 : 24} className="text-white group-hover:scale-110 transition-transform" />
        </button>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <BarChart3 size={14} className="sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                {chartTitle || 'Current Chart'}
              </span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-white/50 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
              title="Minimize"
            >
              <ChevronDown size={16} className="text-gray-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Chart Content */}
          <div className="p-2 sm:p-4 h-28 sm:h-44 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-slate-800/50 dark:to-slate-900/50">
            {chartData.values && chartData.values.length > 0 ? (
              <Bar data={miniChartData} options={miniOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <BarChart3 size={24} className="sm:w-8 sm:h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Chart preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
