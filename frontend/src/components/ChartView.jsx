// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Chart as ChartJS,
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
  Filler
} from "chart.js";
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

// ---------- Helpers ----------
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

const parseNumeric = (v) => {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || String(v).trim() === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// hex <-> rgb and interpolation
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
function lerp(a, b, t) { return a + (b - a) * t; }
// interpolate across multiple stops
function interpolateStops(stops, t) {
  if (!stops || stops.length === 0) return '#999';
  if (stops.length === 1) return stops[0];
  const seg = (stops.length - 1) * t;
  const idx = Math.min(Math.floor(seg), stops.length - 2);
  const localT = seg - idx;
  const c1 = hexToRgb(stops[idx]);
  const c2 = hexToRgb(stops[idx + 1]);
  if (!c1 || !c2) return stops[idx] || stops[stops.length - 1];
  return rgbToHex({
    r: Math.round(lerp(c1.r, c2.r, localT)),
    g: Math.round(lerp(c1.g, c2.g, localT)),
    b: Math.round(lerp(c1.b, c2.b, localT))
  });
}

// adjust hex by amount (used for fallback)
function adjustHex(hex, amt) {
  try {
    const h = hex.replace('#', '');
    const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch (e) {
    return hex || '#777';
  }
}

// read theme-based text color (never tie to chart color)
function getThemeTextColor() {
  if (typeof document !== "undefined" && document.body) {
    return document.body.classList.contains('dark') ? '#E6EEF8' : '#0f172a';
  }
  return '#0f172a';
}

// ---------- Component ----------
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

  // per-segment colors
  const [perSegmentColors, setPerSegmentColors] = useState([]);
  const [editingSegment, setEditingSegment] = useState(null); // { index }

  // set sensible defaults and reset per-segment on data length change
  useEffect(() => {
    if (!xAxis && columns.length > 0) setXAxis(columns[0]);
    if (!yAxis && columns.length > 1) setYAxis(columns[1]);
    setPerSegmentColors(new Array(data.length).fill(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, data.length]);

  // labels & values
  const rawLabels = useMemo(() => data.map((r, i) => (r && r[xAxis] != null ? String(r[xAxis]) : `Row ${i + 1}`)), [data, xAxis]);
  const rawValues = useMemo(() => data.map(r => parseNumeric(r && r[yAxis])), [data, yAxis]);

  const compareValues = useMemo(() => {
    const cf = options.compareField || "";
    if (!cf.trim()) return null;
    return data.map(r => parseNumeric(r && r[cf]));
  }, [data, options.compareField]);

  // pairs + sort
  const pairs = useMemo(() => {
    const arr = rawLabels.map((lbl, i) => ({
      lbl,
      val: rawValues[i],
      raw: data[i],
      index: i,
      compare: compareValues ? compareValues[i] : null
    }));
    if (options.sort === 'asc') arr.sort((a,b) => a.val - b.val);
    if (options.sort === 'desc') arr.sort((a,b) => b.val - a.val);
    return arr;
  }, [rawLabels, rawValues, data, options.sort, compareValues]);

  const labels = pairs.map(p => p.lbl);
  const datasetValues = pairs.map(p => p.val);
  const compareDatasetValues = compareValues ? pairs.map(p => p.compare) : null;
  const originalIndexMap = pairs.map(p => p.index); // maps display index -> original index

  // min positive for log safety
  const minPositive = useMemo(() => {
    const positives = datasetValues.filter(v => v > 0);
    if (compareDatasetValues) positives.push(...compareDatasetValues.filter(v => v > 0));
    const min = positives.length ? Math.min(...positives) : 1;
    return Math.max(min, 1e-6);
  }, [datasetValues, compareDatasetValues]);

  const plottedValues = useMemo(() => {
    if (!options.logScale) return datasetValues;
    const replacement = Math.max(minPositive * 0.01, 1e-6);
    return datasetValues.map(v => (v > 0 ? v : replacement));
  }, [datasetValues, options.logScale, minPositive]);

  const plottedCompareValues = useMemo(() => {
    if (!compareDatasetValues) return null;
    if (!options.logScale) return compareDatasetValues;
    const replacement = Math.max(minPositive * 0.01, 1e-6);
    return compareDatasetValues.map(v => (v > 0 ? v : replacement));
  }, [compareDatasetValues, options.logScale, minPositive]);

  // ---------- Chart data building with safe modes ----------
  const chartData = useMemo(() => {
    const baseColor = options.color || '#2563eb';
    const stops = (options.gradientStops && options.gradientStops.length) ? options.gradientStops : [baseColor, baseColor];
    const N = labels.length || 1;

    // PIE SAFE MODE: only one dataset allowed; ignore compare/trend/log
    if (options.type === 'pie') {
      const values = datasetValues;
      const bg = values.map((_, i) => {
        const origIdx = originalIndexMap[i];
        if (perSegmentColors && perSegmentColors[origIdx]) return perSegmentColors[origIdx];
        if (options.gradient) {
          // across-slices gradient
          const t = N === 1 ? 0 : i / (N - 1);
          return interpolateStops(stops, t);
        }
        return baseColor;
      });
      return {
        labels,
        datasets: [{
          label: yAxis || 'Value',
          data: values,
          backgroundColor: bg,
          borderColor: '#fff',
          borderWidth: 1
        }]
      };
    }

    // SCATTER: build {x,y} points (x=index) and single dataset; ignore compare (not supported)
    if (options.type === 'scatter') {
      // require numeric y; if x is numeric (i.e., xAxis column numeric) we could use that but
      // fallback: map x to index and show original label in tooltip
      const points = plottedValues.map((v, i) => ({ x: i, y: v }));
      const bg = points.map((_, i) => {
        const origIdx = originalIndexMap[i];
        if (perSegmentColors && perSegmentColors[origIdx]) return perSegmentColors[origIdx];
        if (options.gradient) {
          const t = N === 1 ? 0 : i / (N - 1);
          return interpolateStops(stops, t);
        }
        return baseColor;
      });
      return {
        labels, // used for tooltip label mapping
        datasets: [{
          label: yAxis || 'Value',
          data: points,
          backgroundColor: bg,
          borderColor: adjustHex(baseColor, -20),
          pointRadius: 4,
          pointHoverRadius: 6,
          showLine: false
        }]
      };
    }

    // BAR / LINE: support compare and trendline and gradient across bars
    // Create per-bar colors array when gradient enabled
    const perBarColors = datasetValues.map((_, i) => {
      const origIdx = originalIndexMap[i];
      if (perSegmentColors && perSegmentColors[origIdx]) return perSegmentColors[origIdx];
      if (options.gradient) {
        const t = N === 1 ? 0 : i / (N - 1);
        return interpolateStops(stops, t);
      }
      return baseColor;
    });

    const core = {
      label: yAxis || 'Value',
      type: options.type === 'line' ? 'line' : 'bar',
      data: plottedValues,
      originalData: datasetValues,
      backgroundColor: perBarColors,
      borderColor: baseColor,
      borderWidth: 1,
      datalabels: { display: !!options.showLabels }
    };

    const ds = [core];

    if (compareDatasetValues) {
      const compareColors = compareDatasetValues.map((_, i) => {
        const origIdx = originalIndexMap[i];
        if (perSegmentColors && perSegmentColors[origIdx]) return perSegmentColors[origIdx];
        if (options.gradient) {
          // slightly shift t so compare colors differ subtly (or use same stops)
          const t = N === 1 ? 0 : i / (N - 1);
          return interpolateStops(stops, Math.min(1, t + 0.02));
        }
        return adjustHex(baseColor, -40);
      });
      ds.push({
        label: options.compareField,
        type: options.type === 'line' ? 'line' : 'bar',
        data: plottedCompareValues,
        originalData: compareDatasetValues,
        backgroundColor: compareColors,
        borderWidth: 1,
        yAxisID: 'y1',
        datalabels: { display: !!options.showLabels }
      });
    }

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

    return { labels, datasets: ds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.type,
    labels,
    datasetValues,
    plottedValues,
    perSegmentColors,
    options.gradient,
    options.gradientStops,
    options.color,
    options.compareField,
    compareDatasetValues,
    options.trendline,
    options.showLabels,
    originalIndexMap,
    yAxis
  ]);

  // ---------- Chart options ----------
  const chartJSOptions = useMemo(() => {
    const textColor = getThemeTextColor();
    const yScaleType = options.logScale ? 'logarithmic' : 'linear';
    const minForLog = options.logMin && Number(options.logMin) > 0 ? Number(options.logMin) : minPositive * 0.01;

    const opts = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: false },
        datalabels: {
          color: textColor,
          display: (ctx) => {
            // dataset-level datalabels override is used for finer control
            if (ctx.dataset && typeof ctx.dataset.datalabels?.display === 'boolean') {
              return ctx.dataset.datalabels.display;
            }
            return !!options.showLabels;
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const ds = context.dataset;
              const idx = context.dataIndex;
              // prefer originalData
              if (ds && ds.originalData && ds.originalData[idx] != null) {
                return `${ds.label}: ${ds.originalData[idx]}`;
              }
              // scatter: map x index to label if possible
              if (options.type === 'scatter') {
                const displayLabel = (labels && labels[idx]) ? labels[idx] : `#${idx+1}`;
                return `${displayLabel}: ${context.parsed.y}`;
              }
              return `${context.dataset.label}: ${context.formattedValue}`;
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
          } }
        }
      },
      onClick: (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const el = elements[0];
        const displayIndex = el.index;
        const origIndex = originalIndexMap[displayIndex];
        setEditingSegment({ index: origIndex });
      }
    };

    if (options.logScale) {
      opts.scales.y.min = Math.max(minForLog, 1e-9);
    }

    if (options.compareField && options.type !== 'pie' && options.type !== 'scatter') {
      opts.scales.y1 = {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: textColor }
      };
    }

    // scatter-specific: show integer ticks with labels mapped
    if (options.type === 'scatter') {
      opts.scales.x = {
        type: 'linear',
        ticks: {
          color: textColor,
          callback: (v) => {
            // v is numeric; if it's integer and within labels range show label
            if (Number.isInteger(v) && labels[v] !== undefined) return labels[v];
            return '';
          },
          stepSize: 1
        },
        min: -0.5,
        max: Math.max(0, labels.length - 0.5)
      };
    }

    // pie: use category x (no axes)
    if (options.type === 'pie') {
      delete opts.scales;
    }

    return opts;
  }, [options, labels, minPositive, originalIndexMap, yAxis]);

  // choose appropriate React component
  const ChartComponent = (options.type === 'line') ? Line : (options.type === 'pie') ? Pie : (options.type === 'scatter') ? Scatter : Bar;

  // ---------- segment color editing ----------
  const applySegmentColor = (color) => {
    if (editingSegment == null) return;
    const copy = perSegmentColors.slice();
    copy[editingSegment.index] = color;
    setPerSegmentColors(copy);
    setEditingSegment(null);
  };
  const resetSegmentColor = (idx) => {
    const copy = perSegmentColors.slice();
    copy[idx] = null;
    setPerSegmentColors(copy);
  };

  // ---------- exports ----------
  const downloadAsImage = (format = 'png') => {
    const chart = chartRef.current && chartRef.current.chartInstance ? chartRef.current.chartInstance : chartRef.current;
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

  // ---------- Render ----------
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-sm mb-2">{chartTitle || "Visualization"}</h3>

          {/* wrapped controls to avoid overflow */}
          <div className="flex flex-wrap gap-2 items-center text-sm">
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
                // compare field is controlled by ChartOptions in parent App; just hint user if they change from here
                alert("Set Compare field in Chart Options (top-right) to enable compare. Pie and Scatter ignore compare.");
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
