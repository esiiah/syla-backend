// frontend/src/components/ForecastResults.jsx
import React, { useMemo, useState } from "react";
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, TrendingUp, AlertCircle, BarChart3, LineChart as LineChartIcon, Layers } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ForecastResults({ result = {}, targetColumn = "", historicalData = [], onExport = () => {} }) {
  const [chartType, setChartType] = useState("area-line");
  const [showHistorical, setShowHistorical] = useState(true);
  const [activeTab, setActiveTab] = useState("insights");

  const { forecast: fObj = {}, explanation = "", scenario_parsed = {}, metadata = {} } = result;
  const forecastArr = Array.isArray(fObj?.forecast) ? fObj.forecast : [];
  const lowerArr = Array.isArray(fObj?.lower) ? fObj.lower : [];
  const upperArr = Array.isArray(fObj?.upper) ? fObj.upper : [];
  const timestamps = Array.isArray(fObj?.timestamps) ? fObj.timestamps : [];

  // Prepare chart data
  const chartData = useMemo(() => {
    const historical = showHistorical && historicalData.length > 0
      ? historicalData.slice(-12).map((val, i) => ({
          period: `H-${historicalData.length - 12 + i + 1}`,
          historical: typeof val === 'number' ? val : parseFloat(val) || 0,
          type: 'historical'
        }))
      : [];

    const forecast = forecastArr.map((val, i) => ({
      period: timestamps[i] || `F+${i + 1}`,
      forecast: val,
      lower: lowerArr[i] || val * 0.8,
      upper: upperArr[i] || val * 1.2,
      type: 'forecast'
    }));

    return [...historical, ...forecast];
  }, [forecastArr, lowerArr, upperArr, timestamps, historicalData, showHistorical]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!forecastArr.length) return null;
    
    const avg = forecastArr.reduce((a, b) => a + b, 0) / forecastArr.length;
    const trend = forecastArr[forecastArr.length - 1] - forecastArr[0];
    const trendPct = (trend / forecastArr[0]) * 100;
    const volatility = Math.sqrt(forecastArr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / forecastArr.length);
    
    return {
      average: avg,
      trend: trend,
      trendPct: trendPct,
      volatility: volatility,
      peak: Math.max(...forecastArr),
      trough: Math.min(...forecastArr),
      nextPeriod: forecastArr[0]
    };
  }, [forecastArr]);

  // Export as PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("AI Forecast Report", pageWidth / 2, 20, { align: "center" });
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Target: ${targetColumn}`, 14, 35);
    doc.text(`Model: ${metadata.model_used || 'N/A'}`, 14, 40);
    doc.text(`Periods: ${forecastArr.length}`, 14, 45);

    // Executive Summary
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Executive Summary", 14, 55);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const summaryText = explanation || "AI-generated forecast based on historical trends and scenario assumptions.";
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
    doc.text(splitSummary, 14, 62);

    // Key Insights
    if (insights) {
      const insightsY = 62 + splitSummary.length * 5 + 10;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Key Insights", 14, insightsY);
      
      doc.autoTable({
        startY: insightsY + 5,
        head: [['Metric', 'Value']],
        body: [
          ['Next Period Forecast', insights.nextPeriod.toFixed(2)],
          ['Average Forecast', insights.average.toFixed(2)],
          ['Trend Direction', insights.trend > 0 ? `↑ ${insights.trendPct.toFixed(1)}%` : `↓ ${Math.abs(insights.trendPct).toFixed(1)}%`],
          ['Peak Value', insights.peak.toFixed(2)],
          ['Trough Value', insights.trough.toFixed(2)],
          ['Volatility', insights.volatility.toFixed(2)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    // Forecast Data
    const dataY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Forecast Data", 14, dataY);
    
    doc.autoTable({
      startY: dataY + 5,
      head: [['Period', 'Forecast', 'Lower Bound', 'Upper Bound']],
      body: forecastArr.map((val, i) => [
        timestamps[i] || `Period ${i + 1}`,
        val.toFixed(2),
        (lowerArr[i] || val * 0.8).toFixed(2),
        (upperArr[i] || val * 1.2).toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    // Scenario Details
    if (scenario_parsed && Object.keys(scenario_parsed).length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Scenario Applied", 14, 20);
      
      doc.autoTable({
        startY: 25,
        head: [['Parameter', 'Value']],
        body: Object.entries(scenario_parsed).map(([key, value]) => [
          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    doc.save(`forecast_${targetColumn}_${new Date().toISOString().split('T')[0]}.pdf`);
    onExport('pdf');
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [['Period', 'Forecast', 'Lower Bound', 'Upper Bound']];
    forecastArr.forEach((val, i) => {
      rows.push([
        timestamps[i] || `Period ${i + 1}`,
        val.toFixed(2),
        (lowerArr[i] || val * 0.8).toFixed(2),
        (upperArr[i] || val * 1.2).toFixed(2)
      ]);
    });
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${targetColumn}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onExport('csv');
  };

  if (!forecastArr.length) {
    return (
      <div className="rounded-xl p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">No Forecast Data</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              The forecast could not be generated. Please check your data and scenario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-2 rounded-lg border transition-all ${
              chartType === "line"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
            title="Line Chart"
          >
            <LineChartIcon size={18} />
          </button>
          <button
            onClick={() => setChartType("area")}
            className={`px-3 py-2 rounded-lg border transition-all ${
              chartType === "area"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
            title="Area Chart"
          >
            <Layers size={18} />
          </button>
          <button
            onClick={() => setChartType("bar-line")}
            className={`px-3 py-2 rounded-lg border transition-all ${
              chartType === "bar-line"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
            title="Bar + Line"
          >
            <BarChart3 size={18} />
          </button>
          <button
            onClick={() => setChartType("area-line")}
            className={`px-3 py-2 rounded-lg border transition-all ${
              chartType === "area-line"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
            title="Area + Line"
          >
            <TrendingUp size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showHistorical}
              onChange={(e) => setShowHistorical(e.target.checked)}
              className="rounded"
            />
            <span>Show Historical</span>
          </label>
          
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <FileText size={16} />
            <span className="text-sm">CSV</span>
          </button>
          
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md">
            <Download size={16} />
            <span className="text-sm font-medium">PDF Report</span>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-white dark:bg-ink/80 border dark:border-white/5 p-6 shadow-sm">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />

            {showHistorical && historicalData.length > 0 && (
              chartType.includes("area") ? (
                <Area
                  type="monotone"
                  dataKey="historical"
                  stroke="#10b981"
                  fill="url(#colorHistorical)"
                  strokeWidth={2}
                  name="Historical"
                />
              ) : chartType === "bar-line" ? (
                <Bar dataKey="historical" fill="#10b981" name="Historical" />
              ) : (
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Historical"
                />
              )
            )}

            {chartType === "line" && (
              <>
                <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Forecast" />
                <Line type="monotone" dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Lower Bound" />
                <Line type="monotone" dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Upper Bound" />
              </>
            )}

            {chartType === "area" && (
              <>
                <Area type="monotone" dataKey="forecast" stroke="#3b82f6" fill="url(#colorForecast)" strokeWidth={2} name="Forecast" />
                <Line type="monotone" dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Lower Bound" />
                <Line type="monotone" dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Upper Bound" />
              </>
            )}

            {chartType === "bar-line" && (
              <>
                <Bar dataKey="forecast" fill="#3b82f6" name="Forecast" />
                <Line type="monotone" dataKey="forecast" stroke="#1e40af" strokeWidth={2} dot={{ r: 3 }} name="Trend" />
              </>
            )}

            {chartType === "area-line" && (
              <>
                <Area type="monotone" dataKey="forecast" stroke="#3b82f6" fill="url(#colorForecast)" strokeWidth={2} name="Forecast" />
                <Line type="monotone" dataKey="forecast" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} name="Trend" />
                <Line type="monotone" dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Lower" />
                <Line type="monotone" dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Upper" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis Tabs */}
      <div className="rounded-xl bg-white dark:bg-ink/80 border dark:border-white/5 shadow-sm overflow-hidden">
        <div className="border-b dark:border-white/10 flex">
          {['insights', 'metrics', 'scenario'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">AI Analysis</h4>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                {explanation || "AI-generated insights based on your scenario and historical patterns."}
              </p>
              
              {insights && insights.trend > 0 ? (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700/30">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Positive Trend:</strong> Forecast shows {insights.trendPct.toFixed(1)}% growth over the period.
                  </p>
                </div>
              ) : insights && insights.trend < 0 ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Declining Trend:</strong> Forecast shows {Math.abs(insights.trendPct).toFixed(1)}% decrease over the period.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'metrics' && insights && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Next Period', value: insights.nextPeriod.toFixed(2), color: 'blue' },
                { label: 'Average', value: insights.average.toFixed(2), color: 'indigo' },
                { label: 'Peak', value: insights.peak.toFixed(2), color: 'green' },
                { label: 'Trough', value: insights.trough.toFixed(2), color: 'red' },
                { label: 'Volatility', value: insights.volatility.toFixed(2), color: 'orange' },
                { label: 'Trend', value: `${insights.trendPct > 0 ? '+' : ''}${insights.trendPct.toFixed(1)}%`, color: insights.trend > 0 ? 'green' : 'red' }
              ].map((metric, i) => (
                <div key={i} className={`p-4 rounded-lg border bg-${metric.color}-50 dark:bg-${metric.color}-900/10 border-${metric.color}-200 dark:border-${metric.color}-700/30`}>
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">{metric.label}</div>
                  <div className={`text-2xl font-bold text-${metric.color}-700 dark:text-${metric.color}-300`}>{metric.value}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'scenario' && (
            <div className="space-y-3">
              <h4 className="font-semibold">Scenario Parameters</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-600 dark:text-slate-400">Model:</span>
                  <span className="ml-2 font-medium">{metadata.model_used || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-600 dark:text-slate-400">Confidence:</span>
                  <span className="ml-2 font-medium">{((metadata.confidence_level || 0.95) * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-600 dark:text-slate-400">Periods:</span>
                  <span className="ml-2 font-medium">{forecastArr.length}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-600 dark:text-slate-400">Data Points:</span>
                  <span className="ml-2 font-medium">{metadata.data_points || 'N/A'}</span>
                </div>
              </div>
              
              {scenario_parsed && Object.keys(scenario_parsed).length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30">
                  <h5 className="font-medium mb-2 text-sm">Applied Adjustments</h5>
                  <pre className="text-xs overflow-auto">{JSON.stringify(scenario_parsed, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
