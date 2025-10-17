// frontend/src/components/forecast/ExpandedChartModal.jsx
import React, { useRef } from 'react';
import { X, Download, Maximize2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Bar, Line, Pie, Scatter, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { GaugeChart } from '../charts/AdvancedChartRenderer';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ExpandedChartModal({ 
  chartType, 
  data, 
  onClose,
  title 
}) {
  const chartRef = useRef(null);

  if (!data) return null;

  const getChartComponent = () => {
    switch (chartType) {
      case 'bar':
      case 'column':
      case 'comparison':
      case 'stacked_bar':
        return Bar;
      case 'line':
      case 'area':
        return Line;
      case 'pie':
        return Pie;
      case 'doughnut':
        return Doughnut;
      case 'scatter':
      case 'bubble':
        return Scatter;
      case 'radar':
        return Radar;
      case 'gauge':
        return GaugeChart;
      default:
        return Bar;
    }
  };
   
  const ChartComponent = getChartComponent();

  const chartConfig = {
    bar: { color: '59, 130, 246', colorEnd: '79, 70, 229', bgColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)' },
    line: { color: '34, 197, 94', colorEnd: '5, 150, 105', bgColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgb(34, 197, 94)' },
    area: { color: '34, 197, 94', colorEnd: '5, 150, 105', bgColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgb(34, 197, 94)' },
    pie: { color: '168, 85, 247', colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f97316'] },
    doughnut: { color: '168, 85, 247', colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f97316'] },
    radar: { color: '16, 185, 129', bgColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgb(16, 185, 129)' },
    scatter: { color: '249, 115, 22', colorEnd: '239, 68, 68', bgColor: 'rgba(249, 115, 22, 0.6)', borderColor: 'rgb(249, 115, 22)' },
    bubble: { color: '234, 179, 8', bgColor: 'rgba(234, 179, 8, 0.4)', borderColor: 'rgb(234, 179, 8)' },
    gauge: { color: '59, 130, 246', bgColor: 'rgba(59, 130, 246, 0.3)', borderColor: 'rgb(59, 130, 246)' },
    column: { color: '59, 130, 246', bgColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)' },
    comparison: { color: '34, 197, 94', bgColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgb(34, 197, 94)' },
    stacked_bar: { color: '34, 197, 94', bgColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgb(34, 197, 94)' }
  };
  
  const config = chartConfig[chartType] || chartConfig.bar;

  const chartData = {
    labels: data?.timestamps || [],
    datasets: [{
      label: title || 'Forecast Data',
      data: data?.forecast || [],
      backgroundColor: chartType === 'pie' || chartType === 'doughnut'
        ? config.colors 
        : config.bgColor,
      borderColor: chartType === 'pie' || chartType === 'doughnut' ? '#ffffff' : config.borderColor,
      borderWidth: chartType === 'pie' || chartType === 'doughnut' ? 2 : 3,
      tension: chartType === 'line' || chartType === 'area' ? 0.4 : 0,
      pointRadius: chartType === 'line' || chartType === 'scatter' || chartType === 'bubble' ? 6 : 0,
      pointHoverRadius: chartType === 'line' || chartType === 'scatter' || chartType === 'bubble' ? 8 : 0,
      fill: chartType === 'line' || chartType === 'area',
      pointBackgroundColor: config.borderColor,
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }]
  };

  if (data?.lower && data?.upper && chartType !== 'pie' && chartType !== 'doughnut') {
    chartData.datasets.push({
      label: 'Lower Bound',
      data: data.lower,
      borderColor: 'rgba(156, 163, 175, 0.6)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    });
    chartData.datasets.push({
      label: 'Upper Bound',
      data: data.upper,
      borderColor: 'rgba(156, 163, 175, 0.6)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    });
  }
  
  if (chartType === 'area') {
    chartData.datasets[0].fill = true;
    chartData.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.2)';
    chartData.datasets[0].tension = 0.4;
  }
  
  if (chartType === 'doughnut') {
    chartData.datasets[0].cutout = '60%';
  }
   
  if (chartType === 'stacked_bar') {
    chartData.datasets = [
      { ...chartData.datasets[0], label: 'Series 1' },
      {
        ...chartData.datasets[0],
        label: 'Series 2',
        data: chartData.datasets[0].data.map(v => v * 0.7),
        backgroundColor: 'rgba(34, 197, 94, 0.7)'
      }
    ];
  }

  if (chartType === 'radar') {
    chartData.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.2)';
    chartData.datasets[0].pointBackgroundColor = 'rgb(59, 130, 246)';
    chartData.datasets[0].pointBorderColor = '#fff';
    chartData.datasets[0].pointHoverBackgroundColor = '#fff';
    chartData.datasets[0].pointHoverBorderColor = 'rgb(59, 130, 246)';
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 14, weight: '500' },
          color: document.body.classList.contains('dark') ? '#e2e8f0' : '#334155'
        }
      },
      title: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 16,
        titleFont: { size: 15, weight: 'bold' },
        bodyFont: { size: 14 },
        borderColor: config.borderColor || 'rgba(255, 255, 255, 0.2)',
        borderWidth: 2,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
            }
            return label;
          }
        }
      }
    },
    scales: chartType === 'pie' || chartType === 'doughnut' ? {} : 
           chartType === 'radar' ? {
             r: {
               beginAtZero: true,
               ticks: {
                 font: { size: 12 },
                 backdropColor: 'transparent',
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b'
               },
               pointLabels: {
                 font: { size: 12 },
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b'
               },
               grid: {
                 color: 'rgba(0, 0, 0, 0.06)'
               }
             }
           } : 
           chartType === 'stacked_bar' ? {
             x: { 
               stacked: true,
               ticks: {
                 font: { size: 13 },
                 maxRotation: 45,
                 minRotation: 0,
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b'
               }
             },
             y: { 
               stacked: true, 
               beginAtZero: true,
               grid: { color: 'rgba(0, 0, 0, 0.06)', drawBorder: false },
               ticks: {
                 font: { size: 13 },
                 padding: 12,
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b',
                 callback: function(value) { return value.toLocaleString(); }
               }
             }
           } : {
             y: {
               beginAtZero: true,
               grid: { color: 'rgba(0, 0, 0, 0.06)', drawBorder: false },
               ticks: {
                 font: { size: 13 },
                 padding: 12,
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b',
                 callback: function(value) { return value.toLocaleString(); }
               }
             },
             x: {
               grid: { display: false, drawBorder: false },
               ticks: {
                 font: { size: 13 },
                 maxRotation: 45,
                 minRotation: 0,
                 color: document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b'
               }
             }
           },
    animation: { duration: 750, easing: 'easeInOutQuart' },
    interaction: { intersect: false, mode: 'index' }
  };

  const handleExportImage = () => {
    const chart = chartRef.current;
    if (!chart) return;

    const url = chart.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartType}-forecast-${new Date().toISOString().split('T')[0]}.png`;
    a.click();
  };

  const handleExportCSV = () => {
    if (!data?.forecast || !data.timestamps) return;

    const rows = [['Period', 'Forecast', 'Lower Bound', 'Upper Bound']];
    
    data.forecast.forEach((val, i) => {
      rows.push([
        data.timestamps[i] || `Period ${i + 1}`,
        val.toFixed(2),
        (data.lower?.[i] || val * 0.8).toFixed(2),
        (data.upper?.[i] || val * 1.2).toFixed(2)
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartType}-forecast-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const forecast = data?.forecast || [];
  const stats = forecast.length > 0 ? {
    average: (forecast.reduce((a, b) => a + b, 0) / forecast.length).toFixed(2),
    peak: Math.max(...forecast).toFixed(2),
    trough: Math.min(...forecast).toFixed(2),
    trend: forecast[forecast.length - 1] - forecast[0],
    trendPct: ((forecast[forecast.length - 1] - forecast[0]) / forecast[0] * 100).toFixed(1)
  } : null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col animate-slideUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, rgb(${config.color}), rgba(${config.colorEnd || config.color}, 0.7))` 
              }}
            >
              <Maximize2 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                {title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {forecast.length} forecast periods • Full visualization
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors text-sm"
              title="Export as CSV"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={handleExportImage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              <Download size={18} />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={24} className="text-gray-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="h-full min-h-[500px]">
            {forecast.length > 0 ? (
              chartType === 'gauge' ? (
                <GaugeChart 
                  value={forecast[0] || 0}
                  max={Math.max(...forecast) * 1.2}
                  options={options}
                />
              ) : (
                <ChartComponent 
                  ref={chartRef}
                  data={chartData} 
                  options={options} 
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                    <Maximize2 size={40} className="text-gray-400 dark:text-slate-500" />
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-lg">
                    No forecast data available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {stats && (
          <div className="p-5 border-t border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Average</p>
                <p className="text-lg font-bold text-gray-800 dark:text-slate-200">{stats.average}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Peak</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.peak}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Trough</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.trough}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Trend</p>
                <div className="flex items-center justify-center gap-1">
                  {stats.trend > 0 ? (
                    <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
                  ) : stats.trend < 0 ? (
                    <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
                  ) : (
                    <Minus size={18} className="text-gray-600 dark:text-gray-400" />
                  )}
                  <p className={`text-lg font-bold ${
                    stats.trend > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : stats.trend < 0 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {stats.trendPct}%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Periods</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{forecast.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}