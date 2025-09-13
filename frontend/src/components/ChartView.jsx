// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

// helper to compute simple least squares trendline
function computeTrendline(values) {
  const n = values.length;
  if (n < 2) return values.map(() => null);
  const xs = values.map((_, i) => i);
  const ys = values.slice();
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return xs.map(x => slope * x + intercept);
}

// safe numeric parse
const parseNumeric = (v) => {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || String(v).trim() === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function ChartView({
  data = [],
  columns = [],
  types = {},
  options = {},
  chartTitle = "",
  xAxis = "",
  yAxis = "",
  setXAxis = () => {},
  setYAxis = () => {}
}) {
  const chartRef = useRef(null);

  // per-segment colors (user can set via clicking)
  const [perSegmentColors, setPerSegmentColors] = useState([]);
  const [editingSegment, setEditingSegment] = useState(null); // {index, x,y, datasetIndex}

  // ensure columns exist; if xAxis/yAxis not set, auto select sensible defaults
  useEffect(() => {
    if (!xAxis && columns.length > 0) {
      setXAxis(columns[0]);
    }
    if (!yAxis && columns.length > 1) {
      setYAxis(columns[1]);
    }
    // reset per-segment colors when data length changes
    setPerSegmentColors(new Array(data.length).fill(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, data.length]);

  // labels & numeric arrays based on current axes and options.sort
  const rawLabels = useMemo(() => data.map((r, i) => (r && r[xAxis] != null ? String(r[xAxis]) : `Row ${i + 1}`)), [data, xAxis]);
  const rawValues = useMemo(() => data.map(r => parseNumeric(r && r[yAxis])), [data, yAxis]);

  // optional compare field
  const compareValues = useMemo(() => {
    const cf = options.compareField || "";
    if (!cf.trim()) return null;
    return data.map(r => parseNumeric(r && r[cf]));
  }, [data, options.compareField]);

  // Prepare pairs and sort if requested
  const pairs = useMemo(() => {
    const arr = rawLabels.map((lbl, i) => ({ lbl, val: rawValues[i], raw: data[i], index: i, compare: compareValues ? compareValues[i] : null }));
    if (options.sort === 'asc') arr.sort((a,b) => a.val - b.val);
    if (options.sort === 'desc') arr.sort((a,b) => b.val - a.val);
    return arr;
  }, [rawLabels, rawValues, data, options.sort, compareValues]);

  const labels = pairs.map(p => p.lbl);
  const datasetValues = pairs.map(p => p.val);
  const compareDatasetValues = compareValues ? pairs.map(p => p.compare) : null;
  const originalIndexMap = pairs.map(p => p.index); // to map back to perSegmentColors

  // handle safe log scale: find min positive
  const minPositive = useMemo(() => {
    const positives = datasetValues.filter(v => v > 0);
    if (compareDatasetValues) positives.push(...compareDatasetValues.filter(v => v > 0));
    const min = positives.length ? Math.min(...positives) : 1;
    return Math.max(min, 1e-6);
  }, [datasetValues, compareDatasetValues]);

  const plottedValues = useMemo(() => {
    if (!options.logScale) return datasetValues;
    // replace <=0 with small positive fraction (doesn't mutate original datasetValues)
    const replacement = Math.max(minPositive * 0.01, 1e-6);
    return datasetValues.map(v => (v > 0 ? v : replacement));
  }, [datasetValues, options.logScale, minPositive]);

  const plottedCompareValues = useMemo(() => {
    if (!compareDatasetValues) return null;
    if (!options.logScale) return compareDatasetValues;
    const replacement = Math.max(minPositive * 0.01, 1e-6);
    return compareDatasetValues.map(v => (v > 0 ? v : replacement));
  }, [compareDatasetValues, options.logScale, minPositive]);

  // gradient creation helper for dataset-level gradient using chartArea
  const createGradient = (ctx, chartArea, stops) => {
    if (!ctx || !chartArea) return null;
    const g = ctx.createLinearGradient(chartArea.left, chartArea.top, chartArea.left, chartArea.bottom);
    stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
    return g;
  };

  // build datasets array for Chart.js
  const datasets = useMemo(() => {
    const baseColor = options.color || '#2563eb';
    const gradientStops = options.gradientStops && options.gradientStops.length ? options.gradientStops : [baseColor, baseColor];
    const coreDataset = {
      label: yAxis || 'Value',
      type: options.type === 'line' ? 'line' : 'bar',
      data: plottedValues,
      originalData: datasetValues, // store original for tooltip
      backgroundColor: (ctx) => {
        // ctx contains chart/chartArea etc — create gradient dynamically if requested
        const chart = ctx.chart;
        const index = ctx.dataIndex;
        const origIndex = originalIndexMap[index]; // map to original index
        if (perSegmentColors && perSegmentColors[origIndex]) return perSegmentColors[origIndex]; // per-segment override
        if (options.gradient) {
          const g = createGradient(chart.ctx, chart.chartArea, gradientStops);
          return g || baseColor;
        }
        // fallback: single color
        return baseColor;
      },
      borderColor: baseColor,
      borderWidth: 1,
      datalabels: {
        display: (ctx) => {
          // only show on bars and only if user requested showLabels
          if (ctx.dataset.type === 'line') return false;
          return !!options.showLabels;
        }
      }
    };

    const ds = [coreDataset];

    if (compareDatasetValues) {
      ds.push({
        label: options.compareField,
        type: options.type === 'line' ? 'line' : 'bar',
        data: plottedCompareValues,
        originalData: compareDatasetValues,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const i = ctx.dataIndex;
          const origIndex = originalIndexMap[i];
          if (perSegmentColors && perSegmentColors[origIndex]) return perSegmentColors[origIndex];
          if (options.gradient) {
            const g = createGradient(chart.ctx, chart.chartArea, options.gradientStops || [options.color, options.color]);
            return g || options.color;
          }
          return adjustHex(options.color || '#2563eb', -40);
        },
        borderWidth: 1,
        yAxisID: 'y1', // show on secondary axis by default for clarity
        datalabels: { display: !!options.showLabels }
      });
    }

    // trendline: always a line dataset and must NOT show datalabels
    if (options.trendline) {
      const trend = computeTrendline(plottedValues);
      ds.push({
        label: `${yAxis} trend`,
        type: 'line',
        data: trend,
        borderColor: '#222',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.15,
        datalabels: { display: false },
        yAxisID: compareDatasetValues ? 'y' : undefined
      });
    }

    return ds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plottedValues, options, perSegmentColors, datasetValues, plottedCompareValues, compareDatasetValues, originalIndexMap, yAxis]);

  // small hex adjust helper used for fallback colors
  function adjustHex(hex, amt) {
    try {
      const h = hex.replace('#', '');
      const num = parseInt(h, 16);
      let r = (num >> 16) + amt;
      let g = ((num >> 8) & 0xff) + amt;
      let b = (num & 0xff) + amt;
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (e) {
      return hex;
    }
  }

  // chart options object (passed to Chart components)
  const chartJSOptions = useMemo(() => {
    const textColor =
      typeof document !== "undefined" && document.body && document.body.classList.contains("dark")
        ? "#E6EEF8"
        : "#0f172a";

    const yScaleType = options.logScale ? 'logarithmic' : 'linear';
    const minForLog = options.logMin && Number(options.logMin) > 0 ? Number(options.logMin) : minPositive * 0.01;

    const opts = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: false },
        datalabels: {
          color: textColor,
          display: (ctx) => {
            // fallback: if dataset datalabels.display is defined, that will override
            return !!options.showLabels && ctx.dataset.type !== 'line';
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const ds = context.dataset;
              const idx = context.dataIndex;
              if (ds.originalData && ds.originalData[idx] != null) {
                return `${ds.label}: ${ds.originalData[idx]}`;
              }
              return `${ds.label}: ${context.formattedValue}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, maxRotation: 45, autoSkip: true },
        },
        y: {
          type: yScaleType,
          ticks: { color: textColor, callback: function(v) {
            if (Math.abs(v) >= 1e6) return (v/1e6)+'M';
            if (Math.abs(v) >= 1000) return (v/1000)+'k';
            return v;
          }},
        }
      },
      onClick: (evt, elements) => {
        // clicking a bar/pie slice triggers per-segment color edit
        if (!elements || elements.length === 0) return;
        const el = elements[0];
        const index = el.index;
        const datasetIndex = el.datasetIndex;
        // map displayed index -> original data index
        const originalIndex = originalIndexMap[index];
        setEditingSegment({ index: originalIndex, displayIndex: index, datasetIndex, evt });
      }
    };

    if (options.logScale) {
      opts.scales.y.min = Math.max(minForLog, 1e-9);
    }

    // if there is a compare dataset, add secondary axis y1
    if (options.compareField) {
      opts.scales.y1 = {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: textColor }
      };
    }

    return opts;
  }, [options, minPositive, originalIndexMap]);

  // final data object for Chart.js
  const chartData = useMemo(() => {
    return {
      labels,
      datasets
    };
  }, [labels, datasets]);

  // chosen Chart component
  const ChartComponent = (options.type === 'line') ? Line : (options.type === 'pie') ? Pie : (options.type === 'scatter') ? Scatter : Bar;

  // handle per-segment color chosen by user
  const applySegmentColor = (color) => {
    if (!editingSegment) return;
    const copy = perSegmentColors.slice();
    copy[editingSegment.index] = color;
    setPerSegmentColors(copy);
    setEditingSegment(null);
  };

  // reset per-segment color
  const resetSegmentColor = (idx) => {
    const copy = perSegmentColors.slice();
    copy[idx] = null;
    setPerSegmentColors(copy);
  };

  // download/export helpers
  const downloadAsImage = (format = 'png') => {
    const chart = chartRef.current && chartRef.current.chartInstance ? chartRef.current.chartInstance : (chartRef.current && chartRef.current);
    // react-chartjs-2 v4 stores instance directly at chartRef.current
    const instance = chartRef.current?.chartInstance || chartRef.current;
    if (!instance || !instance.toBase64Image) return alert('Chart not ready for export');
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const url = instance.toBase64Image(mime);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-${(yAxis||'metric')}.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
  };

  const downloadCSV = () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const rows = [keys.join(',')].concat(data.map(r => keys.map(k => `"${(r[k]??'')}"`).join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-${yAxis||'data'}.csv`;
    a.click();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `data-${yAxis||'data'}.json`;
    a.click();
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-sm mb-2">{chartTitle || "Visualization"}</h3>
          <div className="flex gap-2 items-center text-sm">
            {/* Axis selectors for quick switching */}
            <label className="flex items-center gap-2">
              X:
              <select value={xAxis} onChange={e => setXAxis(e.target.value)} className="ml-1 border rounded px-2 py-1">
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-2">
              Y:
              <select value={yAxis} onChange={e => setYAxis(e.target.value)} className="ml-1 border rounded px-2 py-1">
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-2">
              Compare:
              <select value={options.compareField || ""} onChange={e => {
                const val = e.target.value || "";
                // update options (need to mutate parent state). A simple way: dispatch a CustomEvent expected by ChartOptions,
                // but in this component we don't have setter - we expect App to pass setOptions. To keep component self-contained,
                // we rely on options.compareField being managed in App via ChartOptions. For now show selection but do not set here.
                // If you want this select to update parent, pass setChartOptions down or create a callback prop.
                alert("To change compare field, open Chart Options panel (top-right) and set Compare Field there.");
              }} className="ml-1 border rounded px-2 py-1">
                <option value="">None</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="text-xs">Export:</div>
          <button onClick={() => downloadAsImage('png')} className="px-2 py-1 rounded border text-xs">PNG</button>
          <button onClick={() => downloadAsImage('jpeg')} className="px-2 py-1 rounded border text-xs">JPEG</button>
          <button onClick={downloadCSV} className="px-2 py-1 rounded border text-xs">CSV</button>
          <button onClick={downloadJSON} className="px-2 py-1 rounded border text-xs">JSON</button>
        </div>
      </div>

      <div className="rounded-xl p-3 bg-gradient-to-b from-white to-gray-50 border border-gray-100 shadow-inner dark:from-black/30 dark:to-black/10 dark:border-white/10 mt-3">
        <div style={{ height: 360 }}>
          <ChartComponent ref={chartRef} data={chartData} options={chartJSOptions} />
        </div>
      </div>

      {/* Inline color editor for clicked segment */}
      {editingSegment && (
        <div className="mt-3 p-3 border rounded bg-white dark:bg-black/40">
          <div className="flex items-center gap-4">
            <div>Editing segment #{editingSegment.index + 1}</div>
            <input type="color" onChange={(e) => applySegmentColor(e.target.value)} />
            <button onClick={() => { resetSegmentColor(editingSegment.index); setEditingSegment(null); }} className="px-2 py-1 border rounded">Reset</button>
            <button onClick={() => setEditingSegment(null)} className="px-2 py-1 border rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
