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
    
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height * 0.65;
    const radius = Math.min(width, height) * 0.35;
    
    ctx.clearRect(0, 0, width, height);
    
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.stroke();
    
    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineWidth = 28;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Value arc with gradient
    const percentage = Math.min(value / max, 1);
    const endAngle = Math.PI * 0.75 + (percentage * Math.PI * 1.5);
    
    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#10b981');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, endAngle);
    ctx.lineWidth = 28;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Pointer
    const pointerAngle = Math.PI * 0.75 + (percentage * Math.PI * 1.5);
    const pointerLength = radius - 15;
    const pointerX = centerX + Math.cos(pointerAngle) * pointerLength;
    const pointerY = centerY + Math.sin(pointerAngle) * pointerLength;
    
    // Pointer shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Pointer line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointerX, pointerY);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1f2937';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    
    // Display value
    ctx.font = 'bold 42px Inter, system-ui';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value), centerX, centerY + radius + 40);
    
    ctx.font = '16px Inter, system-ui';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`/ ${max}`, centerX, centerY + radius + 70);
    
    // Scale markers
    ctx.font = '11px Inter, system-ui';
    ctx.fillStyle = '#9ca3af';
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const markX = centerX + Math.cos(angle) * (radius + 35);
      const markY = centerY + Math.sin(angle) * (radius + 35);
      const val = Math.round((i / 10) * max);
      ctx.fillText(val.toString(), markX, markY);
    }
    
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
        indexAxis: 'y', // Horizontal bars
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
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(168, 85, 247, 0.8)'
          ][index % 4],
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }))
      }}
      options={{
        ...options,
        indexAxis: 'y', // Horizontal bars for comparison
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
        indexAxis: 'y', // Horizontal stacked bars
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
