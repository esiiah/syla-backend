// frontend/src/components/forecast/ForecastSummary.jsx
import React, { useState, useContext } from 'react';
import { FileText, TrendingUp, AlertCircle, CheckCircle, Download, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // FIX: Correct import
import { chartToBase64, analyzeForecastTrend } from '../../utils/pdfChartGenerator';
import { UserContext } from '../../context/UserContext';

export default function ForecastSummary({ 
  summary, 
  insights, 
  recommendations,
  forecastData,
  targetColumn,
  scenario,
  onExportReport 
}) {
  const { user } = useContext(UserContext);
  
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
  // ========== PROFESSIONAL HEADER WITH LOGO ==========
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Load and add logo
    try {
      const response = await fetch('/favicon.png');
      const blob = await response.blob();
      const reader = new FileReader();
  
      await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64data = reader.result;
            doc.addImage(base64data, 'PNG', 14, 12, 16, 16);
            resolve();
          } catch (err) {
            console.warn('Failed to add logo:', err);
            resolve();
          }
        };
        reader.onerror = () => {
          console.warn('Failed to read logo file');
          resolve();
        };
        reader.readAsDataURL(blob);
        setTimeout(resolve, 2000);
      });
    } catch (e) {
      console.warn('Logo not loaded:', e);
    }

    // SYLA ANALYTICS - aligned horizontally with logo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SYLA', 34, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('ANALYTICS', 34, 24);

    // Title - CENTERED and vertically aligned
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Forecast Report', pageWidth / 2, 20, { align: 'center' });

    // Username - RIGHT ALIGNED
    doc.setFontSize(8);
    doc.setTextColor(220, 220, 220);
    doc.text(`Prepared for: ${user?.name || 'User'}`, pageWidth - 14, 18, { align: 'right' });

    // Date & Time - RIGHT ALIGNED below username
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    const now = new Date();
    doc.text(
      `Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
      pageWidth - 14,
      24,
      { align: 'right' }
    );
  
    doc.setTextColor(40, 40, 40);
    let yPos = 60;

    // ========== EXECUTIVE SUMMARY ==========
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
      
    // ========== CHART ANALYSIS WITH BULLETS ==========
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Forecast Analysis', 14, yPos);
    yPos += 8;
    
    // Generate smart insights
    const analysis = analyzeForecastTrend(forecastData);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    analysis.insights.slice(0, 6).forEach((insight, idx) => {
      const bullet = `• ${insight}`;
      const splitInsight = doc.splitTextToSize(bullet, pageWidth - 32);
      doc.text(splitInsight, 18, yPos);
      yPos += splitInsight.length * 5 + 2;
    });
    
    yPos += 10;
    
    // ========== EMBEDDED CHARTS ==========
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Visual Forecast Analysis', 14, yPos);
    yPos += 10;

    // BETTER chart options for PDF
    const pdfChartOptions = {
      width: 700,
      height: 400,
      devicePixelRatio: 2,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 10, weight: '500' },
            boxWidth: 12,
            padding: 8,
            usePointStyle: true
          }
        },
        datalabels: {
          display: true,
          color: '#1f2937',
          font: { size: 9, weight: 'bold' },
          formatter: (value) => {
            if (typeof value === 'number') return value.toFixed(0);
            return value?.y ? value.y.toFixed(0) : '';
          },
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          title: { display: true, text: targetColumn || 'Value', font: { size: 11 } },
          ticks: { font: { size: 10 }, padding: 6 },
          grid: { color: 'rgba(0,0,0,0.08)' }
        },
        x: { 
          title: { display: true, text: 'Period', font: { size: 11 } },
          ticks: { font: { size: 9 }, maxRotation: 40 },
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      }
    };

    try {
      // Chart 1: BAR
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
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('1. Bar Chart Forecast', 14, yPos);
      yPos += 5;

      try {
        const barImg = await chartToBase64('bar', barChartData, pdfChartOptions);
        if (barImg && barImg.startsWith('data:image')) {
          doc.addImage(barImg, 'PNG', 14, yPos, 180, 100);
          yPos += 110;
        } else {
          throw new Error('Invalid chart image');
        }
      } catch (chartError) {
        console.warn('Bar chart render failed:', chartError);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Chart could not be rendered', 14, yPos + 20);
        yPos += 50;
      }

      // Chart 2: LINE
      const lineChartData = {
        labels: forecastData?.timestamps?.slice(0, 12) || [],
        datasets: [{
          label: targetColumn || 'Forecast',
          data: forecastData?.forecast?.slice(0, 12) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff'
        }]
      };

      if (yPos > pageHeight - 120) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('2. Line Chart Forecast', 14, yPos);
      yPos += 5;

      try {
        const lineImg = await chartToBase64('line', lineChartData, pdfChartOptions);
        if (lineImg && lineImg.startsWith('data:image')) {
          doc.addImage(lineImg, 'PNG', 14, yPos, 180, 100);
          yPos += 110;
        } else {
          throw new Error('Invalid chart image');
        }
      } catch (chartError) {
        console.warn('Line chart render failed:', chartError);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Chart could not be rendered', 14, yPos + 20);
        yPos += 50;
      }
      // NEW PAGE
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Additional Visualizations', 14, yPos);
      yPos += 10;

      // Chart 3: AREA
      const areaChartData = {
        labels: forecastData?.timestamps?.slice(0, 12) || [],
        datasets: [{
          label: targetColumn || 'Forecast',
          data: forecastData?.forecast?.slice(0, 12) || [],
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.3)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }]
      };

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Area Chart Forecast', 14, yPos);
      yPos += 5;

      try {
        const areaImg = await chartToBase64('line', areaChartData, pdfChartOptions);
        if (areaImg && areaImg.startsWith('data:image')) {
          doc.addImage(areaImg, 'PNG', 14, yPos, 180, 100);
          yPos += 110;
        } else {
          throw new Error('Invalid chart image');
        }
      } catch (chartError) {
        console.warn('Area chart render failed:', chartError);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Chart could not be rendered', 14, yPos + 20);
        yPos += 50;
      }

      // Chart 4: PIE
      const pieChartData = {
        labels: forecastData?.timestamps?.slice(0, 6) || [],
        datasets: [{
          data: forecastData?.forecast?.slice(0, 6) || [],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(236, 72, 153, 0.8)'
          ],
          borderColor: '#fff',
          borderWidth: 2
        }]
      };

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Distribution Pie Chart', 14, yPos);
      yPos += 5;

      try {
        const pieImg = await chartToBase64('pie', pieChartData, {
          ...pdfChartOptions,
          scales: {},
          plugins: {
            ...pdfChartOptions.plugins,
            legend: { display: true, position: 'right', labels: { font: { size: 9 } } },
            datalabels: {
              display: true,
              color: '#fff',
              font: { size: 10, weight: 'bold' },
              formatter: (value, ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return `${((value / total) * 100).toFixed(1)}%`;
              }
            }
          }
        });
    
        if (pieImg && pieImg.startsWith('data:image')) {
          doc.addImage(pieImg, 'PNG', 14, yPos, 180, 100);
        } else {
          throw new Error('Invalid chart image');
        }
      } catch (chartError) {
        console.warn('Pie chart render failed:', chartError);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Chart could not be rendered', 14, yPos + 20);
      }

    } catch (error) {
      console.error('Chart rendering error:', error);
      doc.setFontSize(10);
      doc.setTextColor(200, 50, 50);
      doc.text('Some charts could not be rendered. Please try again.', 14, yPos);
    }
    
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
        ((forecastData.upper?.[i] || val * 1.2) - (forecastData.lower?.[i] || val * 0.8)).toFixed(2)
      ]);
      
      autoTable(doc, {
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
        
        autoTable(doc, {
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

    // ========== RECOMMENDATIONS ==========
    doc.addPage();
    yPos = 20;
  
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Actionable Recommendations', 14, yPos);
    yPos += 10;
  
    const recs = generateRecommendations(analysis);
  
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
  
    recs.forEach((rec, idx) => {
      const bullet = `${idx + 1}. ${rec}`;
      const splitRec = doc.splitTextToSize(bullet, pageWidth - 28);
      doc.text(splitRec, 14, yPos);
      yPos += splitRec.length * 5 + 4;
    });

    // ========== FOOTER ON ALL PAGES ==========
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Generated by Syla Analytics • © 2025 • Visit sylaanalytics.com`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - 20,
        pageHeight - 10,
        { align: 'right' }
      );
    }
      
    // Save
    const fileName = `forecast-report-${targetColumn?.replace(/\s+/g, '-') || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
          
    if (onExportReport) {
      onExportReport();
    }
  };

  const generateRecommendations = (analysis) => {
    const recs = [];
    
    if (analysis.trend === 'upward') {
      recs.push('Scale infrastructure and increase inventory to meet growing demand');
      recs.push('Invest in marketing to capitalize on positive momentum');
      recs.push('Hire additional staff to handle projected workload increase');
    } else if (analysis.trend === 'downward') {
      recs.push('Implement cost reduction strategies immediately');
      recs.push('Analyze root causes of decline and address key issues');
      recs.push('Consider pivoting strategy or launching recovery initiatives');
    } else {
      recs.push('Maintain current operations while monitoring for changes');
      recs.push('Focus on efficiency improvements and optimization');
    }
    
    recs.push('Review forecast monthly and update with actual performance data');
    recs.push('Set up automated alerts for deviations exceeding 15% from projections');
    recs.push('Conduct scenario planning for best/worst case outcomes');
    
    if (parseFloat(analysis.volatility) > 20) {
      recs.push('Develop contingency plans for high-volatility scenarios');
    }
    
    return recs;
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

  const [isMinimized, setIsMinimized] = useState(false);
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="flex-1 flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
          >
            <Sparkles size={28} className="flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Forecast Analysis
                <span className="text-sm font-normal text-blue-100">
                  {isMinimized ? '(Click to expand)' : '(Click to minimize)'}
                </span>
              </h3>
              <p className="text-blue-100 text-sm">
                {isMinimized ? 'AI-generated insights hidden' : 'AI-generated insights and actionable recommendations'}
              </p>
            </div>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {!isMinimized && (
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
    )}
  </div>
);
}
