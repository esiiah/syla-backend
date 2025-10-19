// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale, RadialLinearScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Pie, Scatter, Doughnut, PolarArea, Radar } from "react-chartjs-2";
import { 
  DoughnutChart, 
  RadarChart, 
  BubbleChart, 
  GaugeChart, 
  ColumnChart,
  ComparisonChart,
  StackedBarChart
} from './charts/AdvancedChartRenderer';

import { CHART_TYPES, get3DShadowOffset } from '../utils/chartConfigs';

import ChartDataLabels from "chartjs-plugin-datalabels";
import { TrendingUp, Download, Edit3 } from "lucide-react";
import ChartExportTool from "./export/ChartExportTool";

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, RadialLinearScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler, ChartDataLabels
);

// Helper functions remain the same...
const parseNum = v => (v == null || v === "" ? 0 : +String(v).replace(/,/g, "") || 0);
const lerp = (a, b, t) => a + (b - a) * t;
const hexToRgb = h => {
  if (!h) return null;
  const n = h.replace("#", "");
  const x = parseInt(n.length === 3 ? n.split("").map(c => c + c).join("") : n, 16);
  return { r: (x >> 16) & 255, g: (x >> 8) & 255, b: x & 255 };
};
const rgbToHex = ({ r, g, b }) => "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");

const interpolateColor = (color1, color2, factor) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;
  
  return rgbToHex({
    r: Math.round(lerp(rgb1.r, rgb2.r, factor)),
    g: Math.round(lerp(rgb1.g, rgb2.g, factor)),
    b: Math.round(lerp(rgb1.b, rgb2.b, factor))
  });
};

const generateGradientColors = (stops, count) => {
  if (!stops || stops.length < 2) return Array(count).fill(stops?.[0] || "#2563eb");
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    const position = count === 1 ? 0 : i / (count - 1);
    const segmentSize = 1 / (stops.length - 1);
    const segmentIndex = Math.min(Math.floor(position / segmentSize), stops.length - 2);
    const segmentPosition = (position - segmentIndex * segmentSize) / segmentSize;
    
    colors.push(interpolateColor(stops[segmentIndex], stops[segmentIndex + 1], segmentPosition));
  }
  return colors;
};

const trendline = vals => {
  const n = vals.length;
  if (n < 2) return vals.map(() => null);
  const xs = vals.map((_, i) => i);
  const ys = vals;
  const xm = xs.reduce((a, b) => a + b, 0) / n;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xm) * (ys[i] - ym);
    den += (xs[i] - xm) ** 2;
  }
  const m = den ? num / den : 0;
  const b = ym - m * xm;
  return xs.map(x => m * x + b);
};

const themeText = () => (document?.body?.classList.contains("dark") ? "#E6EEF8" : "#0f172a");

export default function ChartView({ 
  data = [], 
  columns = [], 
  types = {}, 
  options = {}, 
  chartTitle = "", 
  xAxis = "", 
  yAxis = "", 
  setXAxis = () => {}, 
  setYAxis = () => {},
  onBarClick = () => {},
  onLegendToggle = () => {},
  selectedBars = [],
  selectionMode = false,
  dataPayload = null
}) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [perColor, setPerColor] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showExportTool, setShowExportTool] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      localStorage.setItem("uploadedData", JSON.stringify(data));
      localStorage.setItem("uploadedColumns", JSON.stringify(columns));
      setPerColor(new Array(data.length).fill(null));
    }
  }, [data, columns]);

  useEffect(() => {
    if (!xAxis && columns[0]) setXAxis(columns[0]);
    if (!yAxis && columns[1]) setYAxis(columns[1]);
  }, [columns, xAxis, yAxis, setXAxis, setYAxis]);

  const labels = useMemo(() => data.map((r, i) => r?.[xAxis] ?? `Row ${i + 1}`), [data, xAxis]);
  const values = useMemo(() => data.map(r => parseNum(r?.[yAxis])), [data, yAxis]);
  const compareVals = useMemo(() => 
    options.compareField ? data.map(r => parseNum(r?.[options.compareField])) : null, 
    [data, options.compareField]
  );

  const pairs = labels.map((l, i) => ({
    l, 
    v: values[i], 
    c: compareVals ? compareVals[i] : null, 
    raw: data[i], 
    i
  }));

  if (options.sort === "asc") pairs.sort((a, b) => a.v - b.v);
  if (options.sort === "desc") pairs.sort((a, b) => b.v - a.v);

  const lbls = pairs.map(p => p.l);
  const vals = pairs.map(p => p.v);
  const cmp = compareVals ? pairs.map(p => p.c) : null;
  const map = pairs.map(p => p.i);

  const minPos = Math.max(1e-6, Math.min(...[...vals, ...(cmp || [])].filter(v => v > 0)) || 1);
  const safeVals = options.logScale ? vals.map(v => v > 0 ? v : minPos * 0.01) : vals;
  const safeCmp = cmp ? (options.logScale ? cmp.map(v => v > 0 ? v : minPos * 0.01) : cmp) : null;

  const chartData = useMemo(() => {
    const base = options.color || "#2563eb";
    const N = lbls.length || 1;
    
    let colors;
    if (options.gradient && options.gradientStops?.length > 1) {
      colors = generateGradientColors(options.gradientStops, N);
    } else {
      colors = Array(N).fill(base);
    }

    const finalColors = colors.map((color, i) => {
      const originalIndex = map[i];
      let finalColor = perColor[originalIndex] || color;
      
      if (selectedBars.includes(lbls[i])) {
        const rgb = hexToRgb(finalColor);
        if (rgb) {
          finalColor = rgbToHex({
            r: Math.min(255, rgb.r + 40),
            g: Math.min(255, rgb.g + 40),
            b: Math.min(255, rgb.b + 40)
          });
        }
      }
      
      return finalColor;
    });

    const borderColors = finalColors.map(color => {
      if (selectedBars.length > 0) {
        return selectedBars.includes(lbls[finalColors.indexOf(color)]) ? "#ff6b6b" : color;
      }
      return color;
    });

    // PIE & DOUGHNUT
    if (options.type === CHART_TYPES.PIE || options.type === CHART_TYPES.DOUGHNUT) {
      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          data: vals,
          backgroundColor: finalColors,
          borderColor: "#fff",
          borderWidth: 2
        }]
      };
    }

    // SCATTER & BUBBLE
    if (options.type === CHART_TYPES.SCATTER || options.type === CHART_TYPES.BUBBLE) {
      const scatterData = safeVals.map((v, i) => {
        let bubbleSize = undefined;
        if (options.type === CHART_TYPES.BUBBLE) {
          // Real bubble sizes: scale based on data magnitude
          const maxValue = Math.max(...safeVals.filter(v => v > 0));
          const minValue = Math.min(...safeVals.filter(v => v > 0));
          const range = maxValue - minValue || maxValue || 1;
          
          // Scale bubble radius: 10-50 pixels for actual bubble appearance
          const normalizedValue = Math.abs(v) / (maxValue || 1);
          bubbleSize = 15 + (normalizedValue * 40); // 15-55 pixel radius
        }
        
        return {
          x: i,
          y: v,
          r: bubbleSize
        };
      });

      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          data: scatterData,
          backgroundColor: options.type === CHART_TYPES.BUBBLE 
            ? finalColors.map(c => {
                const rgb = hexToRgb(c);
                return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : c.replace(')', ', 0.5)').replace('rgb(', 'rgba(');
              })
            : finalColors,
          borderColor: options.type === CHART_TYPES.BUBBLE 
            ? finalColors.map(c => {
                const rgb = hexToRgb(c);
                return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)` : c.replace(')', ', 0.8)').replace('rgb(', 'rgba(');
              })
            : borderColors,
          borderWidth: options.type === CHART_TYPES.BUBBLE ? 2 : (selectedBars.length > 0 ? 3 : 2),
          showLine: false,
          pointRadius: options.type === CHART_TYPES.BUBBLE ? undefined : 6,
          pointHoverRadius: options.type === CHART_TYPES.BUBBLE ? undefined : 8,
          pointStyle: 'circle',
          // Bubble-specific settings
          hoverBorderWidth: options.type === CHART_TYPES.BUBBLE ? 3 : undefined,
          hoverBackgroundColor: options.type === CHART_TYPES.BUBBLE 
            ? finalColors.map(c => {
                const rgb = hexToRgb(c);
                return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)` : c;
              })
            : undefined
        }]
      };
    }

    // RADAR
    if (options.type === CHART_TYPES.RADAR) {
      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          data: safeVals,
          backgroundColor: `${base}33`,
          borderColor: base,
          borderWidth: 2,
          pointBackgroundColor: base,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: base
        }]
      };
    }

    // AREA (Line with fill)
    if (options.type === CHART_TYPES.AREA) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      
      const color1 = options.color || '#2563eb';
      const color2 = options.gradientStops?.[1] || '#93c5fd';
      
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);

      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          type: "line",
          data: safeVals,
          originalData: vals,
          backgroundColor: gradient,
          borderColor: color1,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      };
    }

    const core = {
      label: yAxis || "Value",
      type: options.type === CHART_TYPES.LINE ? "line" : "bar",
      data: safeVals,
      originalData: vals,
      backgroundColor: finalColors,
      borderColor: borderColors,
      borderWidth: selectedBars.length > 0 ? 3 : (options.type === CHART_TYPES.LINE ? 3 : 1),
      tension: options.type === CHART_TYPES.LINE ? 0.4 : undefined,
      fill: false
    };

    const ds = [core];

    // Handle COMPARISON chart - add second dataset for side-by-side comparison
    if (options.type === CHART_TYPES.COMPARISON && safeCmp) {
      // Make bars grouped (side-by-side) instead of stacked
      core.barPercentage = 0.8;
      core.categoryPercentage = 0.7;
      
      ds.push({
        label: options.compareField || 'Comparison',
        type: "bar",
        data: safeCmp,
        originalData: cmp,
        backgroundColor: "#10b981",
        borderColor: "#059669",
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.7
      });
    }

    // Handle STACKED_BAR - create multiple series
    if (options.type === CHART_TYPES.STACKED_BAR) {
      ds.push({
        label: `${yAxis} (Secondary)`,
        type: "bar",
        data: safeVals.map(v => v * 0.6),
        originalData: vals.map(v => v * 0.6),
        backgroundColor: finalColors.map(color => {
          const rgb = hexToRgb(color);
          if (rgb) {
            return rgbToHex({
              r: Math.max(0, rgb.r - 40),
              g: Math.min(255, rgb.g + 40),
              b: Math.max(0, rgb.b - 40)
            });
          }
          return color;
        }),
        borderColor: "#059669",
        borderWidth: 1
      });
    }

    if (safeCmp && options.type !== CHART_TYPES.COMPARISON && options.type !== CHART_TYPES.STACKED_BAR) {
      ds.push({
        label: options.compareField,
        type: core.type,
        data: safeCmp,
        originalData: cmp,
        backgroundColor: cmp.map((_, i) => finalColors[i]),
        borderColor: "#dc2626",
        yAxisID: "y1"
      });
    }

    if (options.trendline && options.type !== CHART_TYPES.PIE) {
      ds.push({
        label: `${yAxis} Trend`,
        type: "line",
        data: trendline(safeVals),
        borderColor: "#059669",
        backgroundColor: "transparent",
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        borderDash: [5, 5]
      });
    }

    // Add 3D shadow dataset if enabled
    if (options.enable3D && (options.type === CHART_TYPES.BAR || options.type === CHART_TYPES.COLUMN)) {
      const shadowPosition = options.shadow3DPosition || 'bottom-right';
      const shadowDepth = options.shadow3DDepth || 5;
      const shadowOffset = get3DShadowOffset(shadowPosition, shadowDepth);
      
      const shadowColors = finalColors.map(color => {
        const rgb = hexToRgb(color);
        if (rgb) {
          return rgbToHex({
            r: Math.max(0, rgb.r - 60),
            g: Math.max(0, rgb.g - 60),
            b: Math.max(0, rgb.b - 60)
          });
        }
        return color;
      });

      // Create shadow dataset
      const shadowDataset = {
        label: '3D Shadow',
        type: "bar",
        data: safeVals,
        backgroundColor: shadowColors.map(c => c + '80'), // Add transparency
        borderColor: 'transparent',
        borderWidth: 0,
        barPercentage: core.barPercentage || 0.8,
        categoryPercentage: core.categoryPercentage || 0.9,
        xAxisID: isHorizontal ? 'x-shadow' : 'x',
        yAxisID: isHorizontal ? 'y' : 'y-shadow',
        order: 2, // Render behind main bars
        datalabels: { display: false }
      };

      // Insert shadow before main dataset
      ds.unshift(shadowDataset);
    }

    return { labels: lbls, datasets: ds };
  }, [options, lbls, vals, safeVals, perColor, yAxis, map, safeCmp, cmp, selectedBars]);

    // MUST define isHorizontal BEFORE chartOptions
    const isHorizontal = options.type === CHART_TYPES.COLUMN || 
                         options.type === CHART_TYPES.COMPARISON || 
                         options.type === CHART_TYPES.STACKED_BAR;

    const chartOptions = useMemo(() => {
    const tc = themeText();
    const ys = options.logScale ? "logarithmic" : "linear";
  
    const opts = {
      indexAxis: isHorizontal ? 'y' : 'x', // Horizontal for COLUMN/COMPARISON/STACKED, vertical for BAR
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        intersect: false,
        mode: selectionMode ? 'point' : 'index'
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const dataIndex = element.index;
          const seriesKey = element.datasetIndex;
          onBarClick(seriesKey, lbls[dataIndex]);
        }
      },
      onHover: (event, activeElements) => {
        if (selectionMode) {
          event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'crosshair';
        }
      },
      plugins: {
        legend: {
          labels: { 
            color: tc, 
            usePointStyle: true,
            generateLabels: (chart) => {
              const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
              return original.map(label => ({
                ...label,
                fillStyle: label.fillStyle,
                strokeStyle: selectedBars.length > 0 ? "#ff6b6b" : label.strokeStyle
              }));
            }
          },
          onClick: (e, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const chart = legend.chart;
            const meta = chart.getDatasetMeta(index);
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update();
            onLegendToggle(index);
          }
        },
        datalabels: {
          color: tc,
          display: ctx => ctx.dataset?.datalabels?.display ?? !!options.showLabels,
          formatter: (value, ctx) => {
            if (options.type === CHART_TYPES.PIE || options.type === CHART_TYPES.DOUGHNUT) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${percentage}%`;
            }
            return ctx.dataset.originalData ? ctx.dataset.originalData[ctx.dataIndex] : value;
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#2563eb',
          borderWidth: 1,
          callbacks: {
            title: ctx => {
              if ((options.type === CHART_TYPES.SCATTER || options.type === CHART_TYPES.BUBBLE) && ctx[0]) {
                const xIndex = Math.round(ctx[0].parsed.x);
                return lbls[xIndex] || `Point ${xIndex}`;
              }
              return ctx[0]?.label || "";
            },
            label: ctx => {
              const originalValue = ctx.dataset.originalData ? ctx.dataset.originalData[ctx.dataIndex] : ctx.formattedValue;
              const selected = selectedBars.includes(lbls[ctx.dataIndex]) ? " (Selected)" : "";
              return `${ctx.dataset.label}: ${originalValue?.toLocaleString() || originalValue}${selected}`;
            }
          }
        }
      },
      
      scales:
        (options.type === CHART_TYPES.PIE || options.type === CHART_TYPES.DOUGHNUT)
          ? {}
          : options.type === CHART_TYPES.RADAR
          ? {}
          : options.type === CHART_TYPES.STACKED_BAR
          ? {
              x: {
                stacked: true,
                type: ys,
                ticks: { 
                  color: tc,
                  callback: (value) => value.toLocaleString()
                },
                grid: { color: "rgba(0,0,0,0.1)" },
                min: options.logScale ? minPos * 0.1 : undefined
              },
              y: {
                stacked: true,
                ticks: { 
                  color: tc,
                  maxRotation: 45,
                  minRotation: 0
                },
                grid: { color: "rgba(0,0,0,0.1)" }
              }
            }
          : options.type === CHART_TYPES.COMPARISON
          ? {
              x: {
                stacked: false,
                type: ys,
                ticks: { 
                  color: tc,
                  callback: (value) => value.toLocaleString()
                },
                grid: { color: "rgba(0,0,0,0.1)" },
                min: options.logScale ? minPos * 0.1 : undefined
              },
              y: {
                stacked: false,
                ticks: { 
                  color: tc,
                  maxRotation: 0
                },
                grid: { color: "rgba(0,0,0,0.1)" }
              }
            }
          : isHorizontal
          ? {
              x: {
                type: ys,
                ticks: { 
                  color: tc,
                  callback: (value) => value.toLocaleString()
                },
                min: options.logScale ? minPos * 0.1 : undefined,
                grid: { color: "rgba(0,0,0,0.1)" }
              },
              y: {
                ticks: { 
                  color: tc,
                  maxRotation: 0
                },
                grid: { color: "rgba(0,0,0,0.1)" }
              },
              // 3D shadow scales for horizontal
              ...(options.enable3D && {
                'x-shadow': {
                  type: ys,
                  display: false,
                  offset: true,
                  grid: { display: false },
                  ticks: { display: false },
                  min: options.logScale ? minPos * 0.1 : undefined,
                  afterFit: (scale) => {
                    const shadowOffset = get3DShadowOffset(options.shadow3DPosition || 'bottom-right', options.shadow3DDepth || 5);
                    scale.paddingLeft = Math.abs(shadowOffset.x);
                    scale.paddingRight = Math.abs(shadowOffset.x);
                  }
                }
              })
            }
          : {
              x:
                options.type === CHART_TYPES.SCATTER || options.type === CHART_TYPES.BUBBLE
                  ? {
                      type: "linear",
                      position: "bottom",
                      ticks: { color: tc },
                      grid: { color: "rgba(0,0,0,0.1)" }
                    }
                  : {
                      ticks: { color: tc },
                      grid: { color: "rgba(0,0,0,0.1)" }
                    },
              y: {
                type: ys,
                ticks: { 
                  color: tc,
                  callback: (value) => value.toLocaleString()
                },
                min: options.logScale ? minPos * 0.1 : undefined,
                grid: { color: "rgba(0,0,0,0.1)" }
              },
              // 3D shadow scales for vertical
              ...(options.enable3D && {
                'y-shadow': {
                  type: ys,
                  display: false,
                  offset: true,
                  grid: { display: false },
                  ticks: { display: false },
                  min: options.logScale ? minPos * 0.1 : undefined,
                  afterFit: (scale) => {
                    const shadowOffset = get3DShadowOffset(options.shadow3DPosition || 'bottom-right', options.shadow3DDepth || 5);
                    scale.paddingTop = Math.abs(shadowOffset.y);
                    scale.paddingBottom = Math.abs(shadowOffset.y);
                  }
                }
              })
            }
    };

    // Add rounded corners for horizontal bars
    if (isHorizontal) {
      opts.elements = {
        bar: {
          borderRadius: {
            topLeft: 0,
            topRight: 8,
            bottomLeft: 0,
            bottomRight: 8
          }
        }
      };
    }

    if (options.compareField && options.type !== CHART_TYPES.PIE && options.type !== CHART_TYPES.SCATTER) {
      opts.scales.y1 = {
        type: ys,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { 
          color: tc,
          callback: function(value) {
            return value.toLocaleString();
          }
        },
        min: options.logScale ? minPos * 0.1 : undefined
      };
    }

    // Radar-specific scale config
    if (options.type === CHART_TYPES.RADAR) {
      opts.scales = {
        r: {
          beginAtZero: true,
          ticks: {
            color: tc,
            backdropColor: 'transparent'
          },
          grid: {
            color: 'rgba(0,0,0,0.1)'
          },
          pointLabels: {
            color: tc,
            font: { size: 11 }
          }
        }
      };
    }

    return opts;
  }, [options, lbls, yAxis, onBarClick, onLegendToggle, selectedBars, selectionMode, minPos]);
  

  // Render special chart types
  if (options.type === CHART_TYPES.GAUGE) {
    const avgValue = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    return (
      <div className="rounded-2xl bg-white border shadow-sm dark:bg-ink/80 dark:border-white/5 p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-display text-lg font-medium mb-2 text-gray-800 dark:text-slate-200">
              {chartTitle || "Data Visualization"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/forecast')}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
            >
              <TrendingUp size={16} />
              Forecast
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-xl p-4 bg-gradient-to-b from-gray-50 to-white border dark:from-black/20 dark:to-black/10 dark:border-white/10">
          <div style={{ height: 400, position: 'relative' }}>
            <GaugeChart 
              value={avgValue}
              max={Math.max(...vals) * 1.2}
              options={chartOptions}
            />
          </div>
        </div>
      </div>
    );
  }

const getChartComponent = () => {
    switch (options.type) {
      case CHART_TYPES.BAR:
      case CHART_TYPES.COLUMN:
      case CHART_TYPES.COMPARISON:
      case CHART_TYPES.STACKED_BAR:
        return Bar;
      case CHART_TYPES.LINE:
      case CHART_TYPES.AREA:
        return Line;
      case CHART_TYPES.PIE:
        return Pie;
      case CHART_TYPES.DOUGHNUT:
        return Doughnut;
      case CHART_TYPES.SCATTER:
      case CHART_TYPES.BUBBLE:
        return Scatter;
      case CHART_TYPES.RADAR:
        return Radar;
      default:
        return Bar;
    }
  };

  const ChartComponent = getChartComponent();

  const exportImage = (format, config = {}) => {
    const chart = ref.current;
    if (!chart?.canvas) {
      alert('Chart not ready for export');
      return;
    }

    try {
      let dataURL;
      // For PNG and JPEG with custom background      
      if ((format === 'png' || format === 'jpeg') && config.useCustomBackground) {
        const originalCanvas = chart.canvas;
        const exportCanvas = document.createElement('canvas');
        // Match original dimensions        
        exportCanvas.width = originalCanvas.width;
        exportCanvas.height = originalCanvas.height;
        
        const ctx = exportCanvas.getContext('2d');        
        // Validate and apply background
        const backgroundColor = config.background || '#ffffff';
        // Paint background first        
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);        
        // Draw chart on top of background
        ctx.drawImage(originalCanvas, 0, 0);
        // Convert to data URL with proper format     
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpeg' ? 0.95 : 1.0;
        dataURL = exportCanvas.toDataURL(mimeType, quality);
      } else {
        // Fallback to default Chart.js export
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        dataURL = chart.toBase64Image(mimeType);
      }
       // Create and trigger download
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = config.filename || `${chartTitle || 'chart'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export chart: ' + error.message);
    }
  };

  const exportData = (format) => {
    if (!data.length) return;
    
    if (format === "csv") {
      const keys = Object.keys(data[0]);
      const csvContent = [
        keys.join(","),
        ...data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chartTitle || 'data'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chartTitle || 'data'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Navigate to forecast page
  const goToForecast = () => {
    localStorage.setItem("chartTitle", chartTitle);
    localStorage.setItem("currentXAxis", xAxis);
    localStorage.setItem("currentYAxis", yAxis);
    navigate("/forecast");
  };

  const handleBarClick = (seriesKey, label) => {
    const index = lbls.indexOf(label);
    if (index !== -1) {
      const originalIndex = map[index];
      if (!selectionMode) {
        setEditing({ index: originalIndex, label });
      }
    }
    onBarClick(seriesKey, label);
  };

  const updateBarColor = (color) => {
    if (editing) {
      const newColors = [...perColor];
      newColors[editing.index] = color;
      setPerColor(newColors);
      setEditing(null);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-white border shadow-sm dark:bg-ink/80 dark:border-white/5 p-8 text-center">
        <div className="text-gray-500 dark:text-slate-400">
          No data available for visualization
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border shadow-sm dark:bg-ink/80 dark:border-white/5 p-5">
     {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-display text-lg font-medium mb-2 text-gray-800 dark:text-slate-200">
            {chartTitle || "Data Visualization"}
          </h3>

          {/* Status indicators */}

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
            <span>{data.length.toLocaleString()} data points</span>
            {options.logScale && <span>Log Scale</span>}
            {selectedBars.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                {selectedBars.length} selected
              </span>
            )}
            {selectionMode && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                Selection Mode
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/editing')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
            title="Edit Chart"
          >
            <Edit3 size={16} />
            Edit Chart
          </button>

          <button
            onClick={() => navigate('/forecast')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
            title="Generate AI Forecast"
          >
            <TrendingUp size={16} />
            Forecast
          </button>
          
          <button
            onClick={() => setShowExportTool(!showExportTool)}
            className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-white/20 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            title="Export Chart"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Chart container */}

      <div className="mt-4 rounded-xl p-4 bg-gradient-to-b from-gray-50 to-white border dark:from-black/20 dark:to-black/10 dark:border-white/10">
        <div style={{ height: 400, position: 'relative' }}>
          <ChartComponent
            ref={ref}
            data={chartData}
            options={{
              ...chartOptions,
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const element = elements[0];
                  const dataIndex = element.index;
                  const seriesKey = element.datasetIndex;
                  handleBarClick(seriesKey, lbls[dataIndex]);
                }
              }
            }}
          />
        </div>
      </div>

      {/* Compare Mode Toggle - NEW */}
      {options.compareMode && options.compareParam1 && options.compareParam2 && (
        <div className="mt-4 p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Compare Parameters
            </span>
            <span className="text-xs text-gray-500">
              Viewing: {options.activeCompareParam || options.compareParam1}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setYAxis(options.compareParam1);
                setOptions({ ...options, activeCompareParam: options.compareParam1 });
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                (!options.activeCompareParam || options.activeCompareParam === options.compareParam1)
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="text-xs opacity-75 mb-1">Parameter 1</div>
              <div className="text-sm font-semibold">{options.compareParam1}</div>
            </button>
            
            <button
              onClick={() => {
                setYAxis(options.compareParam2);
                setOptions({ ...options, activeCompareParam: options.compareParam2 });
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                options.activeCompareParam === options.compareParam2
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="text-xs opacity-75 mb-1">Parameter 2</div>
              <div className="text-sm font-semibold">{options.compareParam2}</div>
            </button>
          </div>
          <div className="mt-3 text-xs text-center text-gray-600 dark:text-slate-400">
            Click to switch between parameters and compare their flow on the X-axis
          </div>
        </div>
      )}

      {/* Color editing panel */}
      {editing && !selectionMode && (
        <div className="mt-4 p-4 border rounded-xl bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Edit color for: <span className="text-blue-600 dark:text-blue-400">{editing.label}</span>
            </span>
            <input
              type="color"
              onChange={e => updateBarColor(e.target.value)}
              className="w-10 h-8 rounded border"
            />
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Export tool overlay */}
      {showExportTool && (
        <ChartExportTool
          onClose={() => setShowExportTool(false)}
          onExportImage={exportImage}
          onExportCSV={() => exportData("csv")}
          onExportJSON={() => exportData("json")}
          chartData={data}
          chartTitle={chartTitle}
        />
      )}

      {/* Selection help text */}
      {selectionMode && (
        <div className="mt-4 text-sm text-gray-600 dark:text-slate-400 text-center">
          Click on chart elements to select them for bulk operations
        </div>
      )}
    </div>
  );
}
