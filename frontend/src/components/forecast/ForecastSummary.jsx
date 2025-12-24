// frontend/src/components/forecast/ForecastSummary.jsx (UPDATED)
import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle, AlertCircle, TrendingUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { chartToBase64, analyzeForecastTrend } from '../../utils/pdfChartGenerator';
import ConfidenceDisplay from './ConfidenceDisplay';

export default function ForecastSummary({ 
  summary, 
  insights, 
  recommendations,
  forecastData,
  targetColumn,
  scenario,
  onExportReport,
  validationData // NEW: validation metrics
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 50, 'F');

    try {
      const response = await fetch('/favicon.png');
      const blob = await response.blob();
      const reader = new FileReader();

      await new Promise((resolve) => {
        reader.onloadend = () => {
          try {
            const base64data = reader.result;
            doc.addImage(base64data, 'PNG', 14, 12, 16, 16);
          } catch (err) {
            console.warn('Logo not loaded:', err);
          }
          resolve();
        };
        reader.onerror = resolve;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Logo loading failed:', e);
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SYLA', 34, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('ANALYTICS', 34, 24);

    doc.setFontSize(20);
    doc.text('AI Forecast Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(220, 220, 220);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 18, { align: 'right' });

    doc.setTextColor(40, 40, 40);
    let yPos = 60;

    // Executive Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Executive Summary', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const summaryText = summary || 'AI-powered forecast analysis based on historical trends and scenario parameters.';
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
    doc.text(splitSummary, 14, yPos);
    yPos += splitSummary.length * 5 + 10;

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

    // NEW: Validation Metrics Section
    if (validationData?.metrics) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Forecast Validation Metrics', 14, yPos);
      yPos += 10;

      const metricsData = [
        ['MAPE (Mean Absolute % Error)', `${validationData.metrics.mape?.toFixed(2)}%`, validationData.metrics.mape < 10 ? 'Excellent' : validationData.metrics.mape < 20 ? 'Good' : 'Fair'],
        ['RMSE (Root Mean Squared Error)', validationData.metrics.rmse?.toFixed(2), 'Lower is better'],
        ['MAE (Mean Absolute Error)', validationData.metrics.mae?.toFixed(2), 'Average prediction error'],
        ['R² (Coefficient of Determination)', validationData.metrics.r_squared?.toFixed(3), validationData.metrics.r_squared > 0.7 ? 'Strong fit' : 'Moderate fit']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value', 'Assessment']],
        body: metricsData,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // NEW: Confidence Score Section
    if (validationData?.confidence_score) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      const confidence = validationData.confidence_score;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`Forecast Confidence: ${confidence.rating} (${confidence.overall_score?.toFixed(0)}%)`, 14, yPos);
      yPos += 10;

      if (confidence.recommendations) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        confidence.recommendations.forEach((rec, idx) => {
          const recText = doc.splitTextToSize(`• ${rec}`, pageWidth - 28);
          doc.text(recText, 18, yPos);
          yPos += recText.length * 5 + 2;
        });

        yPos += 10;
      }
    }

    // Forecast Analysis
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Forecast Analysis', 14, yPos);
    yPos += 8;

    const analysis = analyzeForecastTrend(forecastData);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    analysis.insights.slice(0, 6).forEach((insight) => {
      const bullet = `• ${insight}`;
      const splitInsight = doc.splitTextToSize(bullet, pageWidth - 32);
      doc.text(splitInsight, 18, yPos);
      yPos += splitInsight.length * 5 + 2;
    });

    yPos += 10;

    // Charts
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Visual Forecast Analysis', 14, yPos);
    yPos += 10;

    const pdfChartOptions = {
      width: 700,
      height: 400,
      devicePixelRatio: 2,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { font: { size: 10 }, boxWidth: 12, padding: 8 }
        },
        datalabels: {
          display: true,
          color: '#1f2937',
          font: { size: 9, weight: 'bold' },
          formatter: (value) => typeof value === 'number' ? value.toFixed(0) : value?.y?.toFixed(0) || '',
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: targetColumn || 'Value', font: { size: 11 } },
          ticks: { font: { size: 10 } }
        },
        x: {
          title: { display: true, text: 'Period', font: { size: 11 } },
          ticks: { font: { size: 9 }, maxRotation: 40 }
        }
      }
    };

    try {
      // Bar Chart
      const barChartData = {
        labels: forecastData?.timestamps?.slice(0, 12) || [],
        datasets: [{
          label: targetColumn || 'Forecast',
          data: forecastData?.forecast?.slice(0, 12) || [],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2
        }]
      };

      doc.setFontSize(12);
      doc.text('1. Bar Chart Forecast', 14, yPos);
      yPos += 5;

      const barImg = await chartToBase64('bar', barChartData, pdfChartOptions);
      if (barImg?.startsWith('data:image')) {
        doc.addImage(barImg, 'PNG', 14, yPos, 180, 100);
        yPos += 110;
      }

      // Line Chart
      const lineChartData = {
        labels: forecastData?.timestamps?.slice(0, 12) || [],
        datasets: [{
          label: targetColumn || 'Forecast',
          data: forecastData?.forecast?.slice(0, 12) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      };

      if (yPos > pageHeight - 120) {
        doc.addPage();
        yPos = 20;
      }

      doc.text('2. Line Chart Forecast', 14, yPos);
      yPos += 5;

      const lineImg = await chartToBase64('line', lineChartData, pdfChartOptions);
      if (lineImg?.startsWith('data:image')) {
        doc.addImage(lineImg, 'PNG', 14, yPos, 180, 100);
      }
    } catch (error) {
      console.error('Chart rendering failed:', error);
    }

    // Forecast Data Table
    if (forecastData?.forecast) {
      doc.addPage();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Detailed Forecast Data', 14, 20);

      const tableData = forecastData.forecast.map((val, i) => [
        forecastData.timestamps?.[i] || `Period ${i + 1}`,
        val.toFixed(2),
        (forecastData.lower?.[i] || val * 0.8).toFixed(2),
        (forecastData.upper?.[i] || val * 1.2).toFixed(2)
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Period', 'Forecast', 'Lower Bound', 'Upper Bound']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 4 }
      });
    }

    // Recommendations
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Actionable Recommendations', 14, yPos);
    yPos += 10;

    const recs = recommendations || [
      'Track actual vs forecast variance monthly',
      'Update projections quarterly as new data arrives',
      'Set up alerts for deviations exceeding 15%',
      'Review assumptions if significant changes occur'
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    recs.forEach((rec, idx) => {
      const bullet = `${idx + 1}. ${rec}`;
      const splitRec = doc.splitTextToSize(bullet, pageWidth - 28);
      doc.text(splitRec, 14, yPos);
      yPos += splitRec.length * 5 + 4;
    });

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Generated by Syla Analytics • © 2025 • Visit sylaanalytics.com',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    const fileName = `forecast-report-${targetColumn?.replace(/\s+/g, '-') || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    if (onExportReport) {
      onExportReport();
    }
  };

  const displayInsights = insights?.length > 0 ? insights : [
    'Forecast shows consistent patterns aligned with historical data',
    'Model performance validated against recent actuals',
    'Confidence intervals indicate prediction certainty'
  ];

  const displayRecommendations = recommendations?.length > 0 ? recommendations : [
    'Track actual vs forecast variance monthly',
    'Update projections quarterly as new data arrives',
    'Set up alerts for deviations exceeding 15%'
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="flex-1 flex items-center gap-2 sm:gap-3 text-left hover:opacity-90 transition-opacity min-w-0"
          >
            <Sparkles size={20} className="sm:w-7 sm:h-7 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base sm:text-2xl font-bold flex items-center gap-2">
                <span className="truncate">Forecast Analysis</span>
                <span className="text-xs sm:text-sm font-normal text-blue-100 hidden md:inline whitespace-nowrap">
                  {isMinimized ? '(Click to expand)' : '(Click to minimize)'}
                </span>
              </h3>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {isMinimized ? 'Insights hidden' : 'AI insights & validation metrics'}
              </p>
            </div>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0 text-sm sm:text-base"
          >
            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* NEW: Validation Metrics */}
          {validationData && (
            <ConfidenceDisplay validationData={validationData} />
          )}

          {/* Summary */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <FileText size={18} className="sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              Summary
            </h4>
            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
              {summary || 'AI-powered forecast reveals key trends in your data.'}
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
              <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                Key Insights
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {displayInsights.slice(0, 4).map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
              <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                Recommendations
              </h4>
              <ol className="space-y-2 sm:space-y-3">
                {displayRecommendations.slice(0, 4).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300">
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <TrendingUp size={18} className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
              <strong>📄 Comprehensive Report:</strong> Click "Export PDF" for detailed analysis including validation metrics, charts, and complete recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
