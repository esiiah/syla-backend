// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { TrendingUp, Download, Palette, Settings, Edit3 } from "lucide-react";
import ChartExportTool from "./export/ChartExportTool";

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  BarElement, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler, ChartDataLabels
);

// Helper functions
const parseNum = v => (v == null || v === "" ? 0 : +String(v).replace(/,/g, "") || 0);
const lerp = (a, b, t) => a + (b - a) * t;
const hexToRgb = h => { if (!h) return null; const n = h.replace("#",""); const x = parseInt(n.length===3?n.split("").map(c=>c+c).join(""):n,16); return {r:(x>>16)&255,g:(x>>8)&255,b:x&255}; };
const rgbToHex = ({r,g,b}) => "#" + [r,g,b].map(c=>c.toString(16).padStart(2,"0")).join("");
const interpolate = (stops,t) => { if(stops.length<2)return stops[0]||"#999"; const seg=(stops.length-1)*t,i=Math.min(Math.floor(seg),stops.length-2);const c1=hexToRgb(stops[i]),c2=hexToRgb(stops[i+1]);return rgbToHex({r:Math.round(lerp(c1.r,c2.r,seg-i)),g:Math.round(lerp(c1.g,c2.g,seg-i)),b:Math.round(lerp(c1.b,c2.b,seg-i))}); };
const trendline = vals => {const n=vals.length;if(n<2)return vals.map(()=>null);const xs=vals.map((_,i)=>i),ys=vals;const xm=xs.reduce((a,b)=>a+b,0)/n,ym=ys.reduce((a,b)=>a+b,0)/n;let num=0,den=0;for(let i=0;i<n;i++){num+=(xs[i]-xm)*(ys[i]-ym);den+=(xs[i]-xm)**2;}const m=den?num/den:0,b=ym-m*xm;return xs.map(x=>m*x+b);};
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
  dataPayload = null
}) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [perColor, setPerColor] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showExportTool, setShowExportTool] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Store data for export and forecast - REMOVED AUTOMATIC EXPORT PANEL DISPLAY
  useEffect(() => {
    if (data && data.length > 0) {
      localStorage.setItem("uploadedData", JSON.stringify(data));
      localStorage.setItem("uploadedColumns", JSON.stringify(columns));
      setPerColor(new Array(data.length).fill(null));
      // REMOVED: setShowExportTool(true) - No automatic showing of export panel
    }
  }, [data, columns]);

  useEffect(() => {
    if (!xAxis && columns[0]) setXAxis(columns[0]);
    if (!yAxis && columns[1]) setYAxis(columns[1]);
  }, [columns, xAxis, yAxis, setXAxis, setYAxis]);

  // Process data for chart
  const labels = useMemo(() => data.map((r, i) => r?.[xAxis] ?? `Row ${i + 1}`), [data, xAxis]);
  const values = useMemo(() => data.map(r => parseNum(r?.[yAxis])), [data, yAxis]);
  const compareVals = useMemo(() => 
    options.compareField ? data.map(r => parseNum(r?.[options.compareField])) : null, 
    [data, options.compareField]
  );

  // Sort and map data
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

  // Handle log scale
  const minPos = Math.max(1e-6, Math.min(...[...vals, ...(cmp || [])].filter(v => v > 0)) || 1);
  const safeVals = options.logScale ? vals.map(v => v > 0 ? v : minPos * 0.01) : vals;
  const safeCmp = cmp ? (options.logScale ? cmp.map(v => v > 0 ? v : minPos * 0.01) : cmp) : null;

  // Generate chart data
  const chartData = useMemo(() => {
    const base = options.color || "#2563eb";
    const stops = options.gradientStops?.length ? options.gradientStops : [base, base];
    const N = lbls.length || 1;
    
    const pickColor = (i) => {
      const originalIndex = map[i];
      return perColor[originalIndex] || 
        (options.gradient ? interpolate(stops, N === 1 ? 0 : i / (N - 1)) : base);
    };

    if (options.type === "pie") {
      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          data: vals,
          backgroundColor: vals.map((_, i) => pickColor(i)),
          borderColor: "#fff",
          borderWidth: 2
        }]
      };
    }

    if (options.type === "scatter") {
      return {
        labels: lbls,
        datasets: [{
          label: yAxis || "Value",
          data: safeVals.map((v, i) => ({ x: i, y: v })),
          backgroundColor: safeVals.map((_, i) => pickColor(i)),
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      };
    }

    const core = {
      label: yAxis || "Value",
      type: options.type === "line" ? "line" : "bar",
      data: safeVals,
      originalData: vals,
      backgroundColor: vals.map((_, i) => pickColor(i)),
      borderColor: base,
      borderWidth: options.type === "line" ? 3 : 1,
      tension: options.type === "line" ? 0.4 : undefined,
      fill: options.type === "area" ? true : false
    };

    const ds = [core];

    if (safeCmp) {
      ds.push({
        label: options.compareField,
        type: core.type,
        data: safeCmp,
        originalData: cmp,
        backgroundColor: cmp.map((_, i) => pickColor(i)),
        borderColor: "#dc2626",
        yAxisID: "y1"
      });
    }

    if (options.trendline && options.type !== "pie") {
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

    return { labels: lbls, datasets: ds };
  }, [options, lbls, vals, safeVals, perColor, yAxis, map, safeCmp, cmp]);

  // Chart options
  const chartOptions = useMemo(() => {
    const tc = themeText();
    const ys = options.logScale ? "logarithmic" : "linear";
    
    const opts = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const dataIndex = element.index;
          const seriesKey = element.datasetIndex;
          onBarClick(seriesKey, lbls[dataIndex]);
        }
      },
      plugins: {
        legend: {
          labels: { color: tc, usePointStyle: true },
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
            if (options.type === "pie") {
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
            label: ctx => {
              const originalValue = ctx.dataset.originalData ? ctx.dataset.originalData[ctx.dataIndex] : ctx.formattedValue;
              return `${ctx.dataset.label}: ${originalValue?.toLocaleString() || originalValue}`;
            }
          }
        }
      },
      scales: options.type === "pie" ? {} : {
        x: {
          ticks: { 
            color: tc,
            maxRotation: 45,
            minRotation: 0
          },
          grid: { color: "rgba(0,0,0,0.1)" }
        },
        y: {
          type: ys,
          ticks: { 
            color: tc,
            callback: function(value) {
              return value.toLocaleString();
            }
          },
          grid: { color: "rgba(0,0,0,0.1)" }
        }
      }
    };

    if (options.compareField && options.type !== "pie" && options.type !== "scatter") {
      opts.scales.y1 = {
        type: ys,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { 
          color: tc,
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      };
    }

    if (options.type === "scatter") {
      opts.scales.x = {
        type: "linear",
        ticks: {
          color: tc,
          callback: v => (Number.isInteger(v) && lbls[v]) ? lbls[v] : "",
          stepSize: 1
        },
        min: -0.5,
        max: lbls.length - 0.5
      };
    }

    return opts;
  }, [options, lbls, yAxis, onBarClick, onLegendToggle]);

  const ChartComponent = options.type === "line" || options.type === "area" ? Line :
    options.type === "pie" ? Pie :
    options.type === "scatter" ? Scatter : Bar;

  // Export functions
  const exportImage = (format) => {
    const chart = ref.current;
    if (!chart?.toBase64Image) {
      alert('Chart not ready for export');
      return;
    }
    
    const url = chart.toBase64Image(format === "jpeg" ? "image/jpeg" : "image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chartTitle || 'chart'}.${format}`;
    a.click();
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
    // Store current data for forecast page
    localStorage.setItem("chartTitle", chartTitle);
    localStorage.setItem("currentXAxis", xAxis);
    localStorage.setItem("currentYAxis", yAxis);
    navigate("/forecast");
  };

  const handleBarClick = (seriesKey, label) => {
    const index = lbls.indexOf(label);
    if (index !== -1) {
      const originalIndex = map[index];
      setEditing({ index: originalIndex, label });
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
          
          {/* Axis selectors */}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-gray-600 dark:text-slate-400 font-medium">X-Axis:</label>
              <select
                value={xAxis}
                onChange={e => setXAxis(e.target.value)}
                className="border rounded-lg px-3 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 min-w-[120px]"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-gray-600 dark:text-slate-400 font-medium">Y-Axis:</label>
              <select
                value={yAxis}
                onChange={e => setYAxis(e.target.value)}
                className="border rounded-lg px-3 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 min-w-[120px]"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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
            onClick={goToForecast}
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

      {/* Color editing panel */}
      {editing && (
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

      {/* Export tool overlay - ONLY shows when user clicks Export button */}
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

      {/* Data quality indicator */}
      {data.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
          <span>{data.length.toLocaleString()} data points visualized</span>
          {selectedBars.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {selectedBars.length} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
