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
  const [perBarColors, setPerBarColors] = useState({}); // { index: color }

  // Defensive: ensure arrays
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  // Derive which columns to use (labelKey, yKey) and limitedData
  const { labelKey, yKey, limitedData } = useMemo(() => {
    if (!safeData.length || !safeColumns.length) {
      return { labelKey: null, yKey: null, limitedData: [] };
    }

    // Identify categorical and numeric candidates.
    const categoricalCols = safeColumns.filter((c) => {
      const t = (types && types[c]) || "";
      return t && t.toLowerCase().startsWith("categorical");
    });

    // numeric detection: explicit type 'numeric' OR try to coerce values
    const numericCols = safeColumns.filter((c) => {
      const t = (types && types[c]) || "";
      if (t && t.toLowerCase() === "numeric") return true;
      // try quick coercion check on first non-empty rows
      for (let i = 0; i < Math.min(safeData.length, 10); i++) {
        const v = safeData[i][c];
        if (v === null || v === undefined || v === "") continue;
        // if number or numeric-string
        if (typeof v === "number" && !isNaN(v)) return true;
        if (!isNaN(Number(v))) return true;
        // otherwise not numeric
        return false;
      }
      return false;
    });

    // fallback strategies
    const chosenLabel = categoricalCols[0] || safeColumns[0];
    const chosenY = numericCols[0] || safeColumns.find((c) =>
      // second fallback: see if most rows coerce to numbers
      safeData.slice(0, 20).filter((r) => {
        const v = r[c];
        return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
      }).length > 0
    ) || null;

    const limitedData = safeData.slice(0, 100);

    return { labelKey: chosenLabel || null, yKey: chosenY || null, limitedData };
  }, [safeData, safeColumns, types]);

  // If not enough data to build a chart
  if (!safeData.length || !labelKey || !yKey) {
    return (
      <div
        className="mt-4 p-6 rounded-2xl
        bg-white border border-gray-200 shadow-sm
        dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border"
      >
        <h2 className="font-display text-base mb-2 text-gray-700 dark:text-slate-200">
          Chart
        </h2>
        <p className="text-gray-500 dark:text-slate-400">
          Upload a CSV with at least one categorical-like column and one numeric-like column to
          see charts.
        </p>
      </div>
    );
  }

  // Build label array and numeric dataset values (coerce where needed)
  const labelsRaw = limitedData.map((row, i) =>
    row[labelKey] !== undefined && row[labelKey] !== null && row[labelKey] !== ""
      ? String(row[labelKey])
      : `Row ${i + 1}`
  );

  let datasetValuesRaw = limitedData.map((row) => {
    const v = row[yKey];
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  });

  // Sorting: produce paired array containing corresponding row so everything stays aligned
  let paired = labelsRaw.map((lab, i) => ({
    label: lab,
    value: datasetValuesRaw[i],
    row: limitedData[i],
    index: i,
  }));

  if (options.sort && options.sort !== "none") {
    if (options.sort === "asc") {
      paired.sort((a, b) => a.value - b.value);
    } else if (options.sort === "desc") {
      paired.sort((a, b) => b.value - a.value);
    }
  }

  const labels = paired.map((p) => p.label);
  const datasetValues = paired.map((p) => p.value);
  const limitedDataSorted = paired.map((p) => p.row);

  // Base color and hex->rgba util
  const baseColor = options.color || "#2563eb";
  function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== "string") return `rgba(37,99,235,${alpha})`;
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Build background color array (handles perBarColors and gradient)
  const buildBackgroundArray = (canvasCtx, canvasHeight) => {
    // gradient requested and we have a real 2D context
    if (options.gradient && canvasCtx && typeof canvasCtx.createLinearGradient === "function") {
      try {
        const g = canvasCtx.createLinearGradient(0, 0, 0, canvasHeight || 200);
        g.addColorStop(0, hexToRgba(baseColor, 1));
        g.addColorStop(1, hexToRgba(baseColor, 0.25));
        return new Array(datasetValues.length).fill(g);
      } catch (e) {
        // fallback to solid colors below
      }
    }

    // otherwise per-bar overrides or base color for each bar
    return datasetValues.map((_, idx) => perBarColors[idx] || baseColor);
  };

  // Trendline calculation (linear regression) — returns dataset config for a line overlay
  const trendDataset = useMemo(() => {
    if (!options.trendline) return null;
    const n = datasetValues.length;
    if (n < 2) return null;
    const x = Array.from({ length: n }, (_, i) => i);
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
      yAxisID: "y",
      parsing: false, // using raw numbers array
    };
  }, [datasetValues, options.trendline, baseColor]);

  // Chart data factory: called with canvas (when react-chartjs-2 passes canvas argument)
  const getChartData = (canvas) => {
    // obtain 2d context & canvas height
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    const canvasHeight = canvas && canvas.height ? canvas.height : 200;

    // background colors
    const backgroundArray = buildBackgroundArray(ctx, canvasHeight);

    if (options.type === "pie") {
      return {
        labels,
        datasets: [
          {
            data: datasetValues,
            backgroundColor: backgroundArray,
            hoverOffset: 8,
          },
        ],
      };
    }

    // primary dataset for bar/line
    const primary = {
      label: `${yKey} (first ${limitedDataSorted.length})`,
      data: datasetValues,
      backgroundColor: backgroundArray,
      borderRadius: 6,
      barPercentage: 0.6,
      borderColor: hexToRgba(baseColor, 1),
      borderWidth: 0,
      type: options.type === "line" ? "line" : "bar",
      order: 0,
      yAxisID: "y",
      parsing: false, // we already provide arrays
    };

    // ensure backgroundColor array length matches dataset
    if (Array.isArray(primary.backgroundColor) && primary.backgroundColor.length !== datasetValues.length) {
      primary.backgroundColor = datasetValues.map((_, i) => perBarColors[i] || baseColor);
    }

    const datasets = [primary];
    if (trendDataset) datasets.push(trendDataset);

    return {
      labels,
      datasets,
    };
  };

  // Chart options factory (scales, plugins)
  const chartOptions = useMemo(() => {
    // For scatter we show x as linear indices but map ticks to labels
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#0f172a",
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
            if (options.type === "pie") {
              const total = datasetValues.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
              const pct = ((Number(value) || 0) / total) * 100;
              return `${pct.toFixed(1)}%`;
            }
            return value;
          },
        },
      },
      animation: { duration: 700, easing: "easeOutQuart" },
    };

    // scales
    if (options.type === "pie") {
      base.scales = {};
    } else if (options.type === "scatter") {
      // scatter uses linear x but we'll show category labels via tick callback
      base.scales = {
        x: {
          type: "linear",
          ticks: {
            callback: function (val, index) {
              // val is numeric coordinate; this callback receives index for ticks, but we map to label if available
              // attempt to map index-1 to label (we used x = idx+1 for points)
              const i = Number(val) - 1;
              return labels[i] !== undefined ? labels[i] : val;
            },
            color: "#374151",
          },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
        y: {
          type: options.logScale ? "logarithmic" : "linear",
          ticks: {
            color: "#374151",
          },
          grid: { color: "rgba(0,0,0,0.04)" },
          beginAtZero: !options.logScale,
        },
      };
    } else {
      base.scales = {
        x: {
          ticks: { color: "#374151" },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
        y: {
          type: options.logScale ? "logarithmic" : "linear",
          ticks: {
            color: "#374151",
          },
          grid: { color: "rgba(0,0,0,0.04)" },
          beginAtZero: !options.logScale,
        },
      };
    }

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.type, options.showLabels, options.logScale, options.color, datasetValues, labels, baseColor]);

  // Export current chart as PNG (if available)
  const exportPng = () => {
    try {
      const chartInstance = chartRef.current;
      if (chartInstance && typeof chartInstance.toBase64Image === "function") {
        const img = chartInstance.toBase64Image();
        const link = document.createElement("a");
        link.href = img;
        link.download = "chart.png";
        link.click();
      }
    } catch (e) {
      // ignore silently
    }
  };

  // Context menu handler: allow per-bar recolor via <input type="color"> anchored to page
  useEffect(() => {
    const chartInstance = chartRef.current;
    const canvas = chartInstance && chartInstance.canvas ? chartInstance.canvas : null;
    if (!canvas || !chartInstance) return;

    let activeInput = null;

    const onContext = (e) => {
      e.preventDefault();
      try {
        // Chart.js method to get elements at event for mode
        // Pass native event to Chart.js instance method
        const elements = chartInstance.getElementsAtEventForMode(e.native ? e.native : e, "nearest", { intersect: true }, false);
        // Some environments don't attach native property; fallback:
        const found =
          (elements && elements.length && elements) ||
          (chartInstance && typeof chartInstance.getElementsAtEventForMode === "function"
            ? chartInstance.getElementsAtEventForMode(e, "nearest", { intersect: true }, false)
            : []);

        if (!found || !found.length) return;

        const el = found[0];
        const index = el.index !== undefined ? el.index : (el.element && el.element.index) || null;
        if (index === null) return;

        // remove any previous input
        if (activeInput) {
          activeInput.remove();
          activeInput = null;
        }

        const input = document.createElement("input");
        input.type = "color";
        input.value = perBarColors[index] || baseColor;
        input.style.position = "fixed";
        input.style.left = `${e.pageX}px`;
        input.style.top = `${e.pageY}px`;
        input.style.zIndex = 999999;
        input.style.width = "36px";
        input.style.height = "36px";
        input.style.border = "0";
        input.style.padding = "0";
        input.addEventListener("input", (ev) => {
          const newColor = ev.target.value;
          setPerBarColors((prev) => ({ ...prev, [index]: newColor }));
        });
        // cleanup on blur/change
        const removeInput = () => {
          if (input && input.parentNode) input.parentNode.removeChild(input);
          activeInput = null;
        };
        input.addEventListener("change", removeInput);
        input.addEventListener("blur", removeInput);

        document.body.appendChild(input);
        activeInput = input;
        input.focus();
        input.click();
      } catch (err) {
        // ignore
      }
    };

    canvas.addEventListener("contextmenu", onContext);
    return () => {
      canvas.removeEventListener("contextmenu", onContext);
      if (activeInput && activeInput.parentNode) activeInput.parentNode.removeChild(activeInput);
      activeInput = null;
    };
  }, [chartRef, perBarColors, baseColor]);

  // Render Chart container depending on type
  const ChartContainer = ({ type }) => {
    const style = { minHeight: 320 };

    if (type === "pie") {
      const dataFn = (canvas) => getChartData(canvas);
      return <Pie ref={chartRef} data={dataFn} options={chartOptions} style={style} />;
    }

    if (type === "line") {
      const dataFn = (canvas) => getChartData(canvas);
      return <Line ref={chartRef} data={dataFn} options={chartOptions} style={style} />;
    }

    if (type === "scatter") {
      // scatter expects points {x, y}. Map category labels to x indices (1..N) so x ticks show labels
      const points = datasetValues.map((v, i) => ({ x: i + 1, y: v }));
      const scatterData = {
        datasets: [
          {
            label: yKey,
            data: points,
            backgroundColor: datasetValues.map((_, i) => perBarColors[i] || baseColor),
            pointRadius: 4,
          },
          ...(trendDataset
            ? [
                {
                  ...trendDataset,
                  // transform trend data into {x,y} pairs for scatter overlay
                  data: trendDataset.data.map((val, i) => ({ x: i + 1, y: val })),
                  parsing: false,
                },
              ]
            : []),
        ],
      };
      return <Scatter ref={chartRef} data={scatterData} options={chartOptions} style={style} />;
    }

    // default to bar
    const dataFn = (canvas) => getChartData(canvas);
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
              {safeData.length > 100 ? `Showing first 100 rows (of ${safeData.length})` : null}
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
