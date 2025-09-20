// frontend/src/components/export/ChartExportPanel.jsx
import React, { useState, useEffect, useRef } from "react";

export default function ChartExportPanel({ 
  onExportImage, 
  onExportCSV, 
  onExportJSON, 
  chartData = null,
  chartTitle = "Chart"
}) {
  const [position, setPosition] = useState({ x: window.innerWidth - 280, y: window.innerHeight * 0.35 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 260;
      const maxY = window.innerHeight - 300;
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - 260;
      const maxY = window.innerHeight - 300;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset]);
  
  const exportAsImage = (format) => {
    try {
      // Find the chart container (Recharts renders charts in SVG)
      const chartContainer = document.querySelector('.recharts-wrapper svg') || 
                           document.querySelector('canvas') ||
                           document.querySelector('.chart-container');
      
      if (!chartContainer) {
        alert('No chart found to export');
        return;
      }

      // Create canvas for export
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      const rect = chartContainer.getBoundingClientRect();
      canvas.width = rect.width * 2; // Higher resolution
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      if (chartContainer.tagName === 'SVG') {
        // Convert SVG to canvas
        const svgData = new XMLSerializer().serializeToString(chartContainer);
        const img = new Image();
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          
          // Download
          canvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.download = `${chartTitle}.${format}`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(url);
          }, `image/${format}`, 0.9);
        };
        
        img.src = url;
      } else if (chartContainer.tagName === 'CANVAS') {
        // Copy from existing canvas
        ctx.drawImage(chartContainer, 0, 0, rect.width, rect.height);
        
        chartContainer.toBlob((blob) => {
          const link = document.createElement('a');
          link.download = `${chartTitle}.${format}`;
          link.href = URL.createObjectURL(blob);
          link.click();
        }, `image/${format}`, 0.9);
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportAsCSV = () => {
    if (!chartData || !Array.isArray(chartData)) {
      alert('No data available to export');
      return;
    }
    
    try {
      // Convert data to CSV format
      const headers = Object.keys(chartData[0] || {});
      const csvContent = [
        headers.join(','), // Header row
        ...chartData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape values that contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.download = `${chartTitle}_data.csv`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSV export failed. Please try again.');
    }
  };

  const exportAsJSON = () => {
    if (!chartData) {
      alert('No data available to export');
      return;
    }
    
    try {
      const jsonContent = JSON.stringify(chartData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.download = `${chartTitle}_data.json`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('JSON export failed. Please try again.');
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 260,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="rounded-xl bg-white border-2 border-blue-200/50 shadow-2xl dark:bg-slate-800/95 dark:border-blue-400/30 backdrop-blur-sm">
        {/* Draggable Header */}
        <div className="drag-handle p-3 border-b border-gray-200 dark:border-white/10 cursor-move bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export Chart
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Panel Content */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button 
              onClick={() => exportAsImage('png')} 
              className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium transition-all duration-200 hover:shadow-md dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-300"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                PNG
              </div>
            </button>
            <button 
              onClick={() => exportAsImage('jpeg')} 
              className="px-3 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 text-sm font-medium transition-all duration-200 hover:shadow-md dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-300"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                JPEG
              </div>
            </button>
            <button 
              onClick={exportAsCSV} 
              className="px-3 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm font-medium transition-all duration-200 hover:shadow-md dark:bg-orange-900/30 dark:hover:bg-orange-800/40 dark:text-orange-300"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </div>
            </button>
            <button 
              onClick={exportAsJSON} 
              className="px-3 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-sm font-medium transition-all duration-200 hover:shadow-md dark:bg-purple-900/30 dark:hover:bg-purple-800/40 dark:text-purple-300"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                JSON
              </div>
            </button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-slate-400 text-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Click to download chart or data
          </div>
        </div>
      </div>
    </div>
  );
}
