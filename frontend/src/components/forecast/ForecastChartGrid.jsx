// frontend/src/components/forecast/ForecastChartGrid.jsx
import React from 'react';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ChartCard = ({ chart, data, onClick, isSelected }) => {
  const chartComponents = {
    bar: Bar,
    line: Line,
    pie: Pie,
    scatter: Scatter,
    area: Line,
    column: Bar,
    doughnut: Pie,
    radar: RadarChart,
    bubble: Scatter,
    comparison: Bar,
    stacked_bar: Bar,
    gauge: GaugeChart
  };

  const ChartComponent = chartComponents[chart.id] || Bar;


  // Chart-specific configurations
  const getChartConfig = () => {
    const baseDataset = {
      label: 'Forecast',
      data: data?.forecast || [],
      backgroundColor: `rgba(${chart.color}, 0.6)`,
      borderColor: `rgb(${chart.color})`,
      borderWidth: 2
    };

    if (chart.id === 'area') {
      return {
        ...baseDataset,
        fill: true,
        backgroundColor: `rgba(${chart.color}, 0.2)`,
        tension: 0.4
      };
    }

    if (chart.id === 'pie' || chart.id === 'doughnut') {
      return {
        ...baseDataset,
        backgroundColor: [
          `rgba(${chart.color}, 0.8)`,
          `rgba(${chart.color}, 0.6)`,
          `rgba(${chart.color}, 0.4)`,
          `rgba(${chart.color}, 0.2)`
        ]
      };
    }

    if (chart.id === 'scatter' || chart.id === 'bubble') {
      return {
        ...baseDataset,
        pointRadius: chart.id === 'bubble' ? 8 : 6,
        pointHoverRadius: chart.id === 'bubble' ? 10 : 8
      };
    }

    if (chart.id === 'column') {
      return {
        ...baseDataset,
        barThickness: 20,
        maxBarThickness: 30
      };
    }

    if (chart.id === 'stacked_bar') {
      return [
        {
          label: 'Series 1',
          data: data?.forecast || [],
          backgroundColor: `rgba(${chart.color}, 0.8)`
        },
        {
          label: 'Series 2',
          data: (data?.forecast || []).map(v => v * 0.7),
          backgroundColor: `rgba(${chart.color}, 0.5)`
        }
      ];
    }

    return baseDataset;
  };


  const chartData = {
    labels: data?.timestamps || [],
    datasets: Array.isArray(getChartConfig()) ? getChartConfig() : [getChartConfig()]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chart.id === 'pie' || chart.id === 'doughnut' || chart.id === 'stacked_bar',
        position: 'bottom',
        labels: {
          font: { size: 9 },
          boxWidth: 10,
          padding: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderColor: `rgb(${chart.color})`,
        borderWidth: 1,
        displayColors: true
      },
      datalabels: {
        display: false // Never show labels in interactive view
      }
    },
    scales: chart.id !== 'pie' && chart.id !== 'doughnut' && chart.id !== 'radar' && chart.id !== 'gauge' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: { size: 9 },
          color: 'rgba(100, 116, 139, 0.8)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 9 },
          color: 'rgba(100, 116, 139, 0.8)',
          maxRotation: 45,
          minRotation: 0
        }
      }
    } : chart.id === 'stacked_bar' ? {
      x: { stacked: true },
      y: { stacked: true }
    } : {},
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div
      onClick={onClick}
      data-chart={chart.id}
      className={`forecast-chart-card relative bg-white dark:bg-slate-900 rounded-xl border ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-500 shadow-xl selected' 
          : 'border-gray-200 dark:border-slate-700'
      } p-4 cursor-pointer transition-all duration-300 group`}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-md"
            style={{ backgroundColor: `rgb(${chart.color})` }}
          />
          <h3 className="font-semibold text-sm text-gray-800 dark:text-slate-200">
            {chart.label}
          </h3>
        </div>
        <div 
          className="w-8 h-8 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity shadow-inner"
          style={{ 
            background: `linear-gradient(135deg, rgb(${chart.color}), rgb(${chart.colorEnd}))` 
          }}
        />
      </div>

      {/* Chart Canvas */}
      <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-2 shadow-inner">
        {data ? (
          chart.id === 'gauge' ? (
            <GaugeChart 
              value={data.forecast[0] || 0}
              max={Math.max(...data.forecast) * 1.2}
              options={options}
            />
          ) : (
            <ChartComponent data={chartData} options={options} />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Hover Overlay Indicator */}
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
      
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
          Viewing
        </div>
      )}
    </div>
  );
};

// Update export to accept chartTypes prop
export default function ForecastChartGrid({ 
  forecastData, 
  onChartClick, 
  selectedChart,
  chartTypes = ['bar', 'line', 'pie', 'scatter'] // Default to 4 charts
}) {
  const allChartConfigs = [
    { id: 'bar', label: 'Bar Chart', color: '59, 130, 246', colorEnd: '79, 70, 229' },
    { id: 'line', label: 'Line Chart', color: '34, 197, 94', colorEnd: '5, 150, 105' },
    { id: 'area', label: 'Area Chart', color: '168, 85, 247', colorEnd: '147, 51, 234' },
    { id: 'pie', label: 'Pie Chart', color: '239, 68, 68', colorEnd: '220, 38, 38' },
    { id: 'scatter', label: 'Scatter Plot', color: '249, 115, 22', colorEnd: '239, 68, 68' },
    { id: 'column', label: 'Column Chart', color: '6, 182, 212', colorEnd: '14, 165, 233' },
    { id: 'doughnut', label: 'Doughnut Chart', color: '236, 72, 153', colorEnd: '219, 39, 119' },
    { id: 'radar', label: 'Radar Chart', color: '99, 102, 241', colorEnd: '79, 70, 229' },
    { id: 'bubble', label: 'Bubble Chart', color: '245, 158, 11', colorEnd: '217, 119, 6' },
    { id: 'comparison', label: 'Comparison Chart', color: '20, 184, 166', colorEnd: '13, 148, 136' },
    { id: 'stacked_bar', label: 'Stacked Bar', color: '132, 204, 22', colorEnd: '101, 163, 13' },
    { id: 'gauge', label: 'Gauge Chart', color: '244, 63, 94', colorEnd: '225, 29, 72' }
  ];

  // Filter to only show requested chart types
  const displayCharts = allChartConfigs.filter(chart => chartTypes.includes(chart.id));

  return (
    <div className={`transition-all duration-500 ${selectedChart ? 'blur-sm scale-95' : ''}`}>
      <div className="grid grid-cols-2 gap-4">
        {displayCharts.map((chart) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            data={forecastData}
            onClick={() => onChartClick(chart.id)}
            isSelected={selectedChart === chart.id}
          />
        ))}
      </div>
    </div>
  );
}
