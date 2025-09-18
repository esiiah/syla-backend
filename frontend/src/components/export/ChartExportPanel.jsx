// frontend/src/components/export/ChartExportPanel.jsx
import React from "react";

export default function ChartExportPanel({ 
  onExportImage, 
  onExportCSV, 
  onExportJSON, 
  chartData = null,
  chartTitle = "Chart"
}) {
  
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
    <div style={{ position: "fixed", right: 20, top: "35%", width: 260, zIndex: 80 }}>
      <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-lg dark:bg-slate-800/90 dark:border-white/10 backdrop-blur-sm">
        <div className="text-sm font-medium mb-3 text-gray-800 dark:text-slate-200">Export Chart</div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button 
            onClick={() => exportAsImage('png')} 
            className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-300"
          >
            PNG
          </button>
          <button 
            onClick={() => exportAsImage('jpeg')} 
            className="px-3 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 text-sm font-medium transition-colors dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-300"
          >
            JPEG
          </button>
          <button 
            onClick={exportAsCSV} 
            className="px-3 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm font-medium transition-colors dark:bg-orange-900/30 dark:hover:bg-orange-800/40 dark:text-orange-300"
          >
            CSV
          </button>
          <button 
            onClick={exportAsJSON} 
            className="px-3 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-sm font-medium transition-colors dark:bg-purple-900/30 dark:hover:bg-purple-800/40 dark:text-purple-300"
          >
            JSON
          </button>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Click to download chart or data
        </div>
      </div>
    </div>
  );
}
