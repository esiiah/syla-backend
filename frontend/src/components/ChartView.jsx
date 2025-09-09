// frontend/src/components/ChartView.jsx
import React, { useMemo, useRef, useEffect, useState } from "react";
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
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";

// Register required elements and plugins
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

/**
 * ChartView
 *
 * Props:
 * - data: array of row objects
 * - columns: array of column names
 * - types: object mapping column->type ("numeric", "categorical", etc.)
 * - options: {
 *     type: "bar" | "line" | "scatter" | "pie",
 *     color: "#2563eb",
 *     gradient: boolean,
 *     showLabels: boolean,
 *     trendline: boolean,
 *     sort: "none" | "asc" | "desc",
 *     logScale: boolean,
 *   }
 */
function ChartView({
  data = [],
  columns = [],
  types = {},
  options = {
    type: "bar",
    color: "#2563eb",
    gradient: false,
    showLabels: false,
    trendline: false,
    sort: "none",
    logScale: false,
  },
}) {
  const chartRef = useRef(null);
  const [perBarColors, setPerBarColors] = useState({});

  // Derive labelKey, yKey and limitedData
  const { labels, yKey, limitedData, labelKey } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(columns) || columns.length === 0) {
      return { labels: [], yKey: null, limitedData: [], labelKey: null };
    }

    const categoricalCols = columns.filter(
      (c) => (types[c] || "").startsWith("categorical")
    );
    const numericCols = columns.filter((c) => types[c] === "numeric");

    const labelKey = categoricalCols[0] || columns[0];
    const yKey = numericCols[0] || null;
    const limitedData = data.slice(0, 100);

    const labels = limitedData.map((row, i) =>
      row[labelKey] ? String(row[labelKey]) : `Row ${i + 1}`
    );

    return { labels, yKey, limitedData, labelKey };
  }, [data, columns, types]);

  // If not enough data to build a chart
  if (!data.length || !labels.length || !yKey) {
    return (
      <div
        className="mt-4 p-6 rounded-2xl
        bg-white border border-gray-200 shadow-sm
        dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border"
      >
        <h2 className="font-display text-base mb-2 text-gray-700 dark:text-slate-200">
          Chart
        </h2>
        <p className="text-gray-500 dark:text-slate-400">Upload a CSV to see charts.</p>
      </div>
    );
  }

  // Build numeric dataset values
  let datasetValues = limitedData.map((row) => {
    const v = row[yKey];
    return typeof v === "number" ? v : Number(v) || 0;
  });

  // Apply sorting if requested (sort by values, keep paired labels)
  if (options.sort && options.sort !== "none") {
    const paired = labels.map((lab, idx) => ({ lab, val: datasetValues[idx] }));
    if (options.sort === "asc") paired.sort((a, b) => a.val - b.val);
    if (options.sort === "desc") paired.sort((a, b) => b.val - a.val);
    datasetValues = paired.map((p) => p.val);
    // reorder labels to match
    var sortedLabels = paired.map((p) => p.lab);
  } else {
    var sortedLabels = labels;
  }

  // Build base backgroundColor array (per-bar colors or global)
  const baseColor = options.color || "#2563eb";
  const buildBackgroundArray = (ctx, chartAreaH) => {
    // If gradient requested and chart context available create gradient
    if (options.gradient && ctx && chartAreaH) {
      try {
        const g = ctx.createLinearGradient(0, 0, 0, chartAreaH);
        // gradient: stronger intensity at top -> lighter at bottom
        g.addColorStop(0, baseColor);
        // lighten the base color for the bottom stop; simple approach: use rgba with lower alpha
        g.addColorStop(1, hexToRgba(baseColor, 0.25));
        // Use gradient per-bar
        return new Array(datasetValues.length).fill(g);
      } catch (e) {
        // fallback
      }
    }

    // Default -> per bar pick override or base color
    return datasetValues.map((_, idx) => perBarColors[idx] || baseColor);
  };

  // Utility: convert hex to rgba string with alpha
  function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(37,99,235,${alpha})`;
    const h = hex.replace("#", "");
    const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Trendline: compute linear regression across datasetValues
  const trendDataset = useMemo(() => {
    if (!options.trendline) return null;
    const n = datasetValues.length;
    if (n < 2) return null;
    const x = [...Array(n).keys()];
    const y = datasetValues;
    const xAvg = x.reduce((s, v) => s + v, 0) / n;
    const yAvg = y.reduce((s, v) => s + v, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - xAvg) * (y[i] - yAvg);
      den += (x[i] - xAvg) * (x[i] - xAvg);
    }
    const m = den === 0 ? 0 : num / den;
    const b = yAvg - m * xAvg;
    // Build line points for same label indices (so it overlays nicely)
    const linePoints = x.map((xi) => m * xi + b);
    return {
      label: "Trendline",
      data: linePoints,
      borderColor: hexToRgba(baseColor, 1),
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 0,
      fill: false,
      type: "line",
      order: 1,
    };
  }, [datasetValues, options.trendline, baseColor]);

  // Chart data factory (we need to use canvas ctx for gradients)
  const getChartData = (ctx) => {
    // chart area height for gradient
    let chartAreaH = null;
    try {
      const chart = ctx?.chart || ctx;
      chartAreaH = chart?.height || (chart?.canvas && chart.canvas.height);
    } catch (e) {
      /* ignore */
    }

    // Bail out if no values
    if (!Array.isArray(datasetValues) || datasetValues.length === 0) {
      return { labels: [], datasets: [] };
    }

    const backgroundArray = buildBackgroundArray(
      ctx?.createLinearGradient ? ctx : (chartRef.current?.ctx || null),
      chartAreaH
    );

    // If pie chart, we pass single dataset with background array
    if (options.type === "pie") {
      return {
        labels: sortedLabels,
        datasets: [
          {
            data: datasetValues,
            backgroundColor: backgroundArray,
            hoverOffset: 8,
          },
        ],
      };
    }


    // For bar/line/scatter: primary dataset
    const primary = {
      label: `${yKey} (first ${limitedData.length})`,
      data: datasetValues,
      backgroundColor: backgroundArray,
      borderRadius: 6,
      barPercentage: 0.6,
      borderColor: hexToRgba(baseColor, 1),
      borderWidth: 0,
      type: options.type === "line" ? "line" : "bar",
      order: 0,
    };

    // If user applied per-bar color overrides, ensure array aligns with dataset length
    if (Array.isArray(primary.backgroundColor) && primary.backgroundColor.length !== datasetValues.length) {
      primary.backgroundColor = datasetValues.map((_, i) => perBarColors[i] || baseColor);
    }

    const datasets = [primary];
    if (trendDataset) {
      datasets.push(trendDataset);
    }

    return {
      labels: sortedLabels,
      datasets,
    };
  };

  // Chart options factory
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: options.type === "pie" ? "#0f172a" : "#0f172a",
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: hexToRgba(baseColor, 0.95),
        titleColor: "#fff",
        bodyColor: "#fff",
        cornerRadius: 6,
        padding: 8,
      },
      datalabels: {
        display: !!options.showLabels,
        color: "#0b1220",
        anchor: "end",
        align: "end",
        font: { weight: "600", size: 10 },
        formatter: (value) => {
          // For pies show percentages
          if (options.type === "pie") {
            const total = datasetValues.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
            const pct = ((Number(value) || 0) / total) * 100;
            return `${pct.toFixed(1)}%`;
          }
          return value;
        },
      },
    },
    scales: options.type === "pie"
      ? {}
      : {
          x: {
            ticks: {
              color: "#374151",
            },
            grid: { color: "rgba(0,0,0,0.04)" },
          },
          y: {
            type: options.logScale ? "logarithmic" : "linear",
            ticks: {
              color: "#374151",
              callback: function (val) {
                // keep readability on log scale
                return val;
              },
            },
            grid: { color: "rgba(0,0,0,0.04)" },
            beginAtZero: !options.logScale,
          },
        },
    onClick: (evt, elements, chart) => {
      // left click behavior can be added by parent via ref if needed
    },
    animation: { duration: 700, easing: "easeOutQuart" },
  };

  // Handle right-click (contextmenu) on canvas to recolor individual bars
  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const handleContext = (e) => {
      // prevent default browser menu
      e.preventDefault();
      // Chart.js helper to get element at event
      try {
        const chart = chartRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Get elements at position
        const elements = chart.getElementsAtEventForMode(e, "nearest", { intersect: true }, false);
        if (!elements || !elements.length) return;

        const el = elements[0];
        const datasetIndex = el.datasetIndex;
        const index = el.index;

        // Open a tiny color prompt: create an input[type=color] dynamically
        const input = document.createElement("input");
        input.type = "color";
        input.value = perBarColors[index] || baseColor;
        input.style.position = "fixed";
        input.style.left = `${e.pageX}px`;
        input.style.top = `${e.pageY}px`;
        input.style.zIndex = 9999;
        input.addEventListener("input", (ev) => {
          const newColor = ev.target.value;
          setPerBarColors((prev) => ({ ...prev, [index]: newColor }));
        });
        // remove input when color chosen or blurred
        input.addEventListener("change", () => {
          input.remove();
        });
        input.addEventListener("blur", () => {
          input.remove();
        });
        document.body.appendChild(input);
        input.focus();
        input.click();
      } catch (err) {
        // ignore if anything unexpected happens
      }
    };

    canvas.addEventListener("contextmenu", handleContext);
    return () => canvas.removeEventListener("contextmenu", handleContext);
  }, [chartRef.current, perBarColors, options.color, baseColor]);

  // Allow parent to request image export via chartRef.current.toBase64Image()
  // expose a small helper
  const exportPng = () => {
    try {
      const img = chartRef.current.toBase64Image();
      const link = document.createElement("a");
      link.href = img;
      link.download = "chart.png";
      link.click();
    } catch (e) {
      // ignore
    }
  };

  // Choose which react-chart component to render and create data dynamically using ctx param where possible
  const ChartContainer = ({ type }) => {
    const style = { minHeight: 320 };
    if (type === "pie") {
      const dataFn = (canvas) => getChartData(canvas && canvas.getContext("2d"));
      return <Pie ref={chartRef} data={dataFn} options={chartOptions} style={style} />;
    }

    if (type === "line") {
      const dataFn = (canvas) => getChartData(canvas && canvas.getContext("2d"));
      return <Line ref={chartRef} data={dataFn} options={chartOptions} style={style} />;
    }

    if (type === "scatter") {
      // scatter expects {x,y} points; map categories to numeric x (index)
      const scatterPoints = datasetValues.map((v, i) => ({ x: i + 1, y: v }));
      const scatterData = {
        datasets: [
          {
            label: yKey,
            data: scatterPoints,
            backgroundColor: perBarColors[0] || baseColor,
            pointRadius: 4,
          },
          ...(trendDataset ? [{ ...trendDataset, data: trendDataset.data.map((val, i) => ({ x: i + 1, y: val })) }] : []),
        ],
      };
      return <Scatter ref={chartRef} data={scatterData} options={chartOptions} style={style} />;
    }

    // default / bar
    const dataFn = (canvas) => getChartData(canvas && canvas.getContext("2d"));
    return <Bar ref={chartRef} data={dataFn} options={chartOptions} style={style} />;
  };

  return (
    <div className="mt-4">
      <div
        className="rounded-2xl p-4
        bg-white border border-gray-200 shadow-sm
        dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border"
        style={{ minHeight: 360 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-600 dark:text-slate-400">
            Label: <span className="text-gray-800 dark:text-slate-200">{labelKey}</span> • Value:{" "}
            <span className="text-gray-800 dark:text-slate-200">{yKey}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-black/30"
              onClick={exportPng}
            >
              Export PNG
            </button>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {data.length > 100 ? `Showing first 100 rows (of ${data.length})` : null}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-[320px]">
          <ChartContainer type={options.type || "bar"} />
        </div>
      </div>
    </div>
  );
}

export default ChartView;
