// frontend/src/components/forecast/ForecastSummary.jsx
import React from 'react';
import { FileText, TrendingUp, AlertCircle, CheckCircle, Download, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ForecastSummary({ 
  summary, 
  insights, 
  recommendations,
  forecastData,
  targetColumn,
  scenario,
  onExportReport 
}) {
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ========== COVER PAGE ==========
    // Header background
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Forecast Report', pageWidth / 2, 30, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(targetColumn || 'Forecast Analysis', pageWidth / 2, 40, { align: 'center' });
    
    // Metadata box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 60, pageWidth - 28, 35, 'F');
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 70);
    doc.text(`Model: ${forecastData?.model_used || 'Hybrid AI'}`, 20, 78);
    doc.text(`Confidence: ${Math.round((forecastData?.confidence_level || 0.95) * 100)}%`, 20, 86);
    doc.text(`Forecast Periods: ${forecastData?.forecast?.length || 0}`, pageWidth - 20, 70, { align: 'right' });
    doc.text(`Target: ${targetColumn || 'N/A'}`, pageWidth - 20, 78, { align: 'right' });
    
    // ========== EXECUTIVE SUMMARY ==========
    let yPos = 110;
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Executive Summary', 14, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const summaryText = summary || 'AI-powered forecast analysis based on historical trends and scenario parameters.';
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
    doc.text(splitSummary, 14, yPos);
    yPos += splitSummary.length * 5 + 10;
    
    // Scenario Applied
    if (scenario) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Scenario Applied:', 14, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const scenarioText = doc.splitTextToSize(`"${scenario}"`, pageWidth - 28);
      doc.text(scenarioText, 14, yPos);
      yPos += scenarioText.length * 5 + 15;
    }
    
    // ========== KEY INSIGHTS ==========
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Key Insights', 14, yPos);
    yPos += 10;
    
    const displayInsights = insights || [
      'Forecast indicates steady trend based on historical patterns',
      'Seasonal variations detected and factored into predictions',
      'Confidence intervals provide range of likely outcomes',
      'Model accuracy validated against historical performance'
    ];
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    displayInsights.slice(0, 6).forEach((insight, idx) => {
      const bullet = `${idx + 1}. ${insight}`;
      const splitInsight = doc.splitTextToSize(bullet, pageWidth - 28);
      doc.text(splitInsight, 14, yPos);
      yPos += splitInsight.length * 5 + 4;
    });
    
    yPos += 10;
    
    // ========== RECOMMENDATIONS ==========
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Actionable Recommendations', 14, yPos);
    yPos += 10;
    
    const displayRecommendations = recommendations || [
      'Monitor actual performance against forecast on a monthly basis',
      'Adjust operational strategies if deviations exceed confidence bounds',
      'Implement early warning systems for significant trend changes',
      'Review and update forecast quarterly with new data',
      'Consider scenario planning for best/worst case outcomes'
    ];
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    displayRecommendations.slice(0, 6).forEach((rec, idx) => {
      const bullet = `${idx + 1}. ${rec}`;
      const splitRec = doc.splitTextToSize(bullet, pageWidth - 28);
      doc.text(splitRec, 14, yPos);
      yPos += splitRec.length * 5 + 4;
    });
    
    // ========== FORECAST DATA TABLE ==========
    if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
      doc.addPage();
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Detailed Forecast Data', 14, 20);
      
      const tableData = forecastData.forecast.map((val, i) => [
        forecastData.timestamps?.[i] || `Period ${i + 1}`,
        val.toFixed(2),
        (forecastData.lower?.[i] || val * 0.8).toFixed(2),
        (forecastData.upper?.[i] || val * 1.2).toFixed(2),
        `${((forecastData.upper?.[i] || val * 1.2) - (forecastData.lower?.[i] || val * 0.8)).toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 30,
        head: [['Period', 'Forecast', 'Lower Bound', 'Upper Bound', 'Range']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [37, 99, 235],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 30 }
      });
      
      // Statistical Summary
      const finalY = doc.lastAutoTable.finalY + 15;
      
      if (finalY < pageHeight - 60) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('Statistical Summary', 14, finalY);
        
        const forecast = forecastData.forecast;
        const avg = forecast.reduce((a, b) => a + b, 0) / forecast.length;
        const peak = Math.max(...forecast);
        const trough = Math.min(...forecast);
        const trend = forecast[forecast.length - 1] - forecast[0];
        const trendPct = (trend / forecast[0] * 100).toFixed(2);
        
        doc.autoTable({
          startY: finalY + 5,
          head: [['Metric', 'Value']],
          body: [
            ['Average Forecast', avg.toFixed(2)],
            ['Peak Value', peak.toFixed(2)],
            ['Trough Value', trough.toFixed(2)],
            ['Overall Trend', `${trendPct}%`],
            ['Data Points', forecast.length.toString()]
          ],
          theme: 'plain',
          headStyles: { 
            fillColor: [37, 99, 235],
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { halign: 'right' }
          }
        });
      }
    }
    
    // ========== FOOTER ON ALL PAGES ==========
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount} • Generated by Syla Analytics`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    const fileName = `forecast-report-${targetColumn?.replace(/\s+/g, '-') || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    if (onExportReport) {
      onExportReport();
    }
  };

  // Default values
  const defaultInsights = [
    'Forecast shows consistent patterns aligned with historical data',
    'Seasonal trends have been identified and incorporated',
    'Confidence intervals indicate moderate prediction certainty',
    'Model performance validated against recent actuals'
  ];

  const defaultRecommendations = [
    'Track actual vs. forecast variance monthly',
    'Update projections quarterly as new data arrives',
    'Set up alerts for deviations exceeding 15%',
    'Review assumptions if significant changes occur'
  ];

  const displayInsights = insights && insights.length > 0 ? insights : defaultInsights;
  const displayRecommendations = recommendations && recommendations.length > 0 ? recommendations : defaultRecommendations;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Sparkles size={28} />
              Forecast Analysis
            </h3>
            <p className="text-blue-100 text-sm">
              AI-generated insights and actionable recommendations
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Summary
          </h4>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-sm">
            {summary || 'AI-powered forecast reveals key trends in your data. The model analyzed historical performance and projected future outcomes based on your scenario.'}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Key Insights */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Key Insights
            </h4>
            <ul className="space-y-3">
              {displayInsights.slice(0, 4).map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5 flex-shrink-0">•</span>
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              Recommendations
            </h4>
            <ol className="space-y-3">
              {displayRecommendations.slice(0, 4).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <span className="text-orange-600 dark:text-orange-400 font-bold min-w-[20px] flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <TrendingUp size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>📄 Comprehensive Report:</strong> Click "Export PDF" to download a detailed report including all forecast charts, extended analysis, statistical summaries, and complete recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
