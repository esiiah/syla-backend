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
    
    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height * 0.75;
    const radius = Math.min(width, height) * 0.4;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw gauge background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#e5e7eb';
    ctx.stroke();
    
    // Draw gauge value
    const percentage = value / max;
    const endAngle = Math.PI + (percentage * Math.PI);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.lineWidth = 20;
    
    // Color based on value
    const color = percentage > 0.7 ? '#10b981' : percentage > 0.4 ? '#f59e0b' : '#ef4444';
    ctx.strokeStyle = color;
    ctx.stroke();
    
    // Draw center text
    ctx.font = 'bold 32px Inter';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(value), centerX, centerY + 10);
    
    ctx.font = '14px Inter';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`of ${max}`, centerX, centerY + 30);
    
  }, [value, max]);
  
  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      style={{ width: '100%', height: 'auto' }}
    />
  );
};

export const ColumnChart = ({ data, options }) => {
  // Column is just vertical bar chart
  return (
    <Chart
      type="bar"
      data={data}
      options={{
        ...options,
        indexAxis: 'x', // Vertical orientation
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
  // Comparison chart shows multiple datasets side by side
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
          ][index % 4]
        }))
      }}
      options={{
        ...options,
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

export const StackedBarChart = ({ data, options }) => {
  return (
    <Chart
      type="bar"
      data={data}
      options={{
        ...options,
        scales: {
          x: { stacked: true },
          y: { stacked: true }
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
