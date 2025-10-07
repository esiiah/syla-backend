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
    scatter: Scatter
  };

  const ChartComponent = chartComponents[chart.id];

  const chartData = {
    labels: data?.timestamps || [],
    datasets: [{
      label: 'Forecast',
      data: data?.forecast || [],
      backgroundColor: chart.id === 'pie' 
        ? ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
        : `rgba(${chart.color}, 0.6)`,
      borderColor: `rgb(${chart.color})`,
      borderWidth: 2
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chart.id === 'pie',
        position: 'bottom'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderColor: `rgb(${chart.color})`,
        borderWidth: 1
      }
    },
    scales: chart.id !== 'pie' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    } : {}
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-slate-900 rounded-xl border ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-500 shadow-xl' 
          : 'border-gray-200 dark:border-slate-700 hover:shadow-lg'
      } p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] group`}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full`}
            style={{ backgroundColor: `rgb(${chart.color})` }}
          />
          <h3 className="font-semibold text-gray-800 dark:text-slate-200">
            {chart.label}
          </h3>
        </div>
        <div 
          className={`w-8 h-8 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity`}
          style={{ background: `linear-gradient(135deg, rgb(${chart.color}), rgb(${chart.colorEnd}))` }}
        />
      </div>

      {/* Chart Canvas */}
      <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-2">
        {data ? (
          <ChartComponent data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Hover Indicator */}
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
    </div>
  );
};

export default function ForecastChartGrid({ forecastData, onChartClick, selectedChart }) {
  const chartTypes = [
    { 
      id: 'bar', 
      label: 'Bar Chart', 
      color: '59, 130, 246',
      colorEnd: '79, 70, 229'
    },
    { 
      id: 'line', 
      label: 'Line Chart', 
      color: '34, 197, 94',
      colorEnd: '5, 150, 105'
    },
    { 
      id: 'pie', 
      label: 'Pie Chart', 
      color: '168, 85, 247',
      colorEnd: '147, 51, 234'
    },
    { 
      id: 'scatter', 
      label: 'Scatter Plot', 
      color: '249, 115, 22',
      colorEnd: '239, 68, 68'
    }
  ];

  return (
    <div className={`transition-all duration-500 ${selectedChart ? 'blur-sm scale-95' : ''}`}>
      <div className="grid grid-cols-2 gap-4">
        {chartTypes.map((chart) => (
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
