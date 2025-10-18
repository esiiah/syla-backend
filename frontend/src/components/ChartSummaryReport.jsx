// frontend/src/components/ChartSummaryReport.jsx

import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ChartSummaryReport({ summary = {}, data = [], chartTitle = "" }) {

  const [isMinimized, setIsMinimized] = useState(false);
  
  // Safety check: ensure summary is a valid object
  const safeSummary = React.useMemo(() => {
    if (!summary || typeof summary !== 'object') {
      return {};
    }
    
    // Deep clean summary to prevent object rendering errors
    const cleaned = {};
    Object.entries(summary).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        cleaned[key] = 'N/A';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Clean nested objects
        const nestedCleaned = {};
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue === null || nestedValue === undefined) {
            nestedCleaned[nestedKey] = 'N/A';
          } else if (typeof nestedValue === 'object') {
            nestedCleaned[nestedKey] = JSON.stringify(nestedValue);
          } else {
            nestedCleaned[nestedKey] = nestedValue;
          }
        });
        cleaned[key] = nestedCleaned;
      } else {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  }, [summary]);
  
  const formatNumber = (value) => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Handle objects - don't render them directly
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      }
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    // Handle everything else as string
    return String(value);
  };
  
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Data Summary Report', pageWidth / 2, 25, { align: 'center' });
    
    // Date & Time
    doc.setFontSize(9);
    doc.setTextColor(220, 220, 220);
    const now = new Date();
    doc.text(
      `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      pageWidth / 2,
      33,
      { align: 'center' }
    );
    
    doc.setTextColor(40, 40, 40);
    
    // Summary
    let yPos = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Overview', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const summaryText = `This report contains statistical analysis of ${data.length} data points across ${Object.keys(safeSummary).length} columns. The data shows various metrics including numerical summaries and categorical breakdowns.`;
    const splitText = doc.splitTextToSize(summaryText, pageWidth - 28);
    doc.text(splitText, 14, yPos);
    yPos += splitText.length * 5 + 15;
    
    // Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Detailed Statistics', 14, yPos);
    yPos += 10;
    
    const tableData = [];
    Object.entries(safeSummary).forEach(([col, details]) => {
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        Object.entries(details).forEach(([key, value]) => {
          // Safe value conversion for PDF
          let safeValue;
          if (value === null || value === undefined) {
            safeValue = 'N/A';
          } else if (typeof value === 'object') {
            safeValue = JSON.stringify(value);
          } else {
            safeValue = formatNumber(value);
          }
          tableData.push([col, String(key), safeValue]);
        });
      } else {
        // Handle primitive values
        const safeValue = details === null || details === undefined ? 'N/A' : formatNumber(details);
        tableData.push([col, 'Value', safeValue]);
      }
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Column', 'Metric', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 60 },
        2: { halign: 'right', cellWidth: 'auto' }
      }
    });
    
    // Conclusion
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Conclusion & Next Steps', 14, finalY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const conclusion = doc.splitTextToSize(
      'This summary provides a snapshot of your data. For deeper insights and predictive analytics, consider using our AI Forecasting feature to project future trends and scenarios.',
      pageWidth - 28
    );
    doc.text(conclusion, 14, finalY + 8);
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Generated by Syla Analytics • © 2025 • Visit sylaanalytics.com',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    doc.save(`summary-report-${chartTitle.replace(/\s+/g, '-') || 'data'}-${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  return (
    <div className="mt-6 rounded-2xl bg-white border border-gray-200 shadow-lg dark:bg-slate-900 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity flex-1"
        >
          <FileText size={24} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Data Summary
              <span className="text-sm font-normal text-blue-100">
                {isMinimized ? '(Click to expand)' : '(Click to minimize)'}
              </span>
            </h2>
            <p className="text-sm text-blue-100">
              {isMinimized ? 'Statistical overview hidden' : 'Statistical overview of your data'}
            </p>
          </div>
        </button>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex-shrink-0"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>
      
      {!isMinimized && (
        <>
      {/* Table */}
      <div className="p-5 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-200 dark:border-blue-700">
            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                Column
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(safeSummary).map(([col, details], i) => (
              <tr 
                key={i} 
                className={`border-b border-gray-200 dark:border-slate-700 transition-colors hover:bg-blue-50 dark:hover:bg-slate-800 ${
                  i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-900/50'
                }`}
              >
                <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-slate-200 align-top">
                  {col}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                  {details && typeof details === "object" && !Array.isArray(details) ? (
                    <table className="min-w-[300px] border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden shadow-sm">
                      <tbody>
                      {Object.entries(details).map(([k, v], j) => {
                        // Safe rendering - convert any value to string
                        const safeKey = String(k);
                        let safeValue;
                        
                        if (v === null || v === undefined) {
                          safeValue = 'N/A';
                        } else if (typeof v === 'object') {
                          // Handle nested objects by converting to JSON string
                          safeValue = JSON.stringify(v);
                        } else {
                          safeValue = formatNumber(v);
                        }
                        
                        return (
                          <tr 
                            key={j} 
                            className={`${
                              j % 2 === 0 
                                  ? 'bg-gray-100 dark:bg-slate-800' 
                                : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <td className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 border-r border-gray-300 dark:border-slate-600 uppercase tracking-wide">
                                {safeKey}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-900 dark:text-slate-100 font-mono break-words max-w-xs">
                                {safeValue}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <span className="font-mono">{formatNumber(String(details ?? 'N/A'))}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Info Banner */}
      <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Tip:</strong> Click "Export PDF" to download a comprehensive report with statistical analysis and recommendations for forecasting.
        </p>
      </div>
      </>
      )}
    </div>
  );
}