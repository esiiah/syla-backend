// frontend/src/components/forecast/ForecastPagination.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ForecastChartGrid from './ForecastChartGrid';

export default function ForecastPagination({ forecastData, onChartClick, selectedChart }) {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Chart types split into 3 pages: 4 + 4 + 4
  const chartPages = [
    ['bar', 'line', 'area', 'pie'],          // Page 1
    ['scatter', 'column', 'doughnut', 'radar'], // Page 2
    ['bubble', 'comparison', 'stacked_bar', 'gauge']  // Page 3
  ];
  
  const currentCharts = chartPages[currentPage];
  
  return (
    <div className="space-y-4">
      <ForecastChartGrid
        forecastData={forecastData}
        onChartClick={onChartClick}
        selectedChart={selectedChart}
        chartTypes={currentCharts}
      />
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        
        <div className="flex items-center gap-2">
          {chartPages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-10 h-10 rounded-full font-medium transition-all ${
                currentPage === index
                  ? 'bg-blue-600 text-white shadow-lg scale-110'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setCurrentPage(Math.min(chartPages.length - 1, currentPage + 1))}
          disabled={currentPage === chartPages.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Page Indicator */}
      <div className="text-center text-sm text-gray-600 dark:text-slate-400">
        Page {currentPage + 1} of {chartPages.length} • {currentCharts.length} charts
      </div>
    </div>
  );
}