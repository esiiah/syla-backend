// frontend/src/components/charts/AdvancedChartRenderer.jsx
import React, { useRef, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

// Register additional Chart.js components
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

export const DoughnutChart = ({ data, options }) => {
  return (
    <Chart
      type="doughnut"
      data={data}
      options={{
        ...options,
        cutout: '60%', // Makes it a doughnut
        plugins: {
          ...options?.plugins,
          legend: {
            display: true,
            position: 'right'
          }
        }
      }}
    />
  );
};

export const RadarChart = ({ data, options }) => {
  return (
    <Chart
      type="radar"
      data={data}
      options={{
        ...options,
        scales: {
          r: {
            beginAtZero: true,
            ticks: {
              backdropColor: 'transparent'
            }
          }
        }
      }}
    />
  );
};

export const BubbleChart = ({ data, options }) => {
  return (
    <Chart
      type="bubble"
      data={data}
      options={{
        ...options,
        scales: {
          x: { type: 'linear', position: 'bottom' },
          y: { type: 'linear' }
        }
      }}
    />
  );
};

export const GaugeChart = ({ value, max = 100, options }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get parent container dimensions
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set canvas size
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height * 0.7; // Position gauge lower
    const radius = Math.min(width, height) * 0.35; // Smaller radius
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw gauge background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 25;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Draw gauge value
    const percentage = Math.min(value / max, 1);
    const endAngle = Math.PI + (percentage * Math.PI);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.lineWidth = 25;
    ctx.lineCap = 'round';
    
    // Color based on value
    const color = percentage > 0.7 ? '#10b981' : percentage > 0.4 ? '#f59e0b' : '#ef4444';
    ctx.strokeStyle = color;
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 35, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Draw center text
    ctx.font = 'bold 36px Inter';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value), centerX, centerY - 10);
    
    ctx.font = '16px Inter';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`of ${max}`, centerX, centerY + 25);
    
  }, [value, max]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export const ColumnChart = ({ data, options }) => {
  return (
    <Chart
      type="bar"
      data={data}
      options={{
        ...options,
        indexAxis: 'x', // Vertical bars
        plugins: {
          ...options?.plugins,
          legend: {
            display: true,
            position: 'top'
          }
        }
      }}
    />
  );
};

export const ComparisonChart = ({ data, options }) => {
  return (
    <Chart
      type="bar"
      data={{
        ...data,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(249, 115, 22, 0.7)',
            'rgba(168, 85, 247, 0.7)'
          ][index % 4],
          barPercentage: 0.8,
          categoryPercentage: 0.9
        }))
      }}
      options={{
        ...options,
        indexAxis: 'x', // Vertical bars
        plugins: {
          ...options?.plugins,
          legend: {
            display: true,
            position: 'top'
          }
        }
      }}
    />
  );
};

// Replace StackedBarChart component
export const StackedBarChart = ({ data, options }) => {
  return (
    <Chart
      type="bar"
      data={data}
      options={{
        ...options,
        indexAxis: 'x', // Vertical bars
        scales: {
          x: { 
            stacked: true,
            grid: { color: "rgba(0,0,0,0.1)" }
          },
          y: { 
            stacked: true,
            grid: { color: "rgba(0,0,0,0.1)" }
          }
        },
        plugins: {
          ...options?.plugins,
          legend: {
            display: true,
            position: 'top'
          }
        }
      }}
    />
  );
};
