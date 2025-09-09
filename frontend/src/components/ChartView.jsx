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

// Register elements and plugins
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

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  // Stable column detection
  const { labelKey, yKey, limitedData } = useMemo(() => {
    if (!safeData.length || !safeColumns.length) {
      return { labelKey: null, yKey: null, limitedData: [] };
    }

    const categoricalCols = safeColumns.filter((c) => {
      const t = (types && types[c]) || "";
      return String(t).toLowerCase().startsWith("categorical");
    });

    const numericCols = safeColumns.filter((c) => {
      const t = (types && types[c]) || "";
      if (String(t).toLowerCase() === "numeric") return true;
      for (let i = 0; i < Math.min(safeData.length, 10); i++) {
        const v = safeData[i][c];
        if (v === null || v === undefined || v === "") continue;
        if (typeof v === "number" && !isNaN(v)) return true;
        if (!isNaN(Number(v))) return true;
      }
      return false;
    });

    const chosenLabel = categoricalCols[0] || safeColumns[0];
    const chosenY =
      numericCols[0] ||
      safeColumns.find((c) =>
        safeData.slice(0, 20).some((r) => {
          const v = r[c];
          return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
        })
      ) ||
      null;

    return {
      labelKey: chosenLabel || null,
      yKey: chosenY || null,
      limitedData: safeData.slice(0, 100),
    };
  }, [safeData, safeColumns, types]);

  if (!safeData.length || !labelKey || !yKey) {
    return (
      <div className="mt-4 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border">
        <h2 className="font-display text-base mb-2 text-gray-700 dark:text-slate-200">
          Chart
        </h2>
        <p className="text-gray-500 dark:text-slate-400">
          Upload a CSV with at least one categorical-like column and one numeric-like column to see
          charts.
        </p>
      </div>
    );
  }

  const labelsRaw = limitedData.map((row, i) =>
    row[labelKey] !== undefined && row[labelKey] !== null && row[labelKey] !== ""
      ? String(row[labelKey])
      : `Row ${i + 1}`
  );

  const datasetValuesRaw = limitedData.map((row) => {
    const v = row[yKey];
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  });

  // Keep labels/data aligned
  let paired = labelsRaw.map((lab, i) => ({
    label: lab,
    value: datasetValuesRaw[i],
    row: limitedData[i],
    index: i,
  }));

  if (options.sort === "asc") paired.sort((a, b) => a.value - b.value);
  if (options.sort === "desc") paired.sort((a, b) => b.value - a.value);

  const labels = paired.map((p) => p.label);
  const datasetValues = paired.map((p) => p.value);
  const limitedDataSorted = paired.map((p) => p.row);

  // Color utils
  const baseColor = options.color || "#2563eb";
  const hexToRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== "string") return `rgba(37,99,235,${alpha})`;
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const buildBackgroundArray = (ctx, height) => {
    if (options.gradient && ctx?.createLinearGradient) {
      try {
        const g = ctx.createLinearGradient(0, 0, 0, height || 200);
        g.addColorStop(0, hexToRgba(baseColor, 1));
        g.addColorStop(1, hexToRgba(baseColor, 0.25));
        return new Array(datasetValues.length).fill(g);
      } catch {
        // fallback
      }
    }
    return datasetValues.map((_, i) => perBarColors[i] || baseColor);
  };

  // Trendline
  const trendDataset = useMemo(() => {
    if (!options.trendline) return null;
    const n = datasetValues.length;
    if (n < 2) return null;
    const x = datasetValues.map((_, i) => i);
    const y = datasetValues;
    const xAvg = x.reduce((s, v) => s + v, 0) / n;
    const yAvg = y.reduce((s, v) => s + v, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - xAvg) * (y[i] - yAvg);
      den += (x[i] - xAvg) ** 2;
    }
    const m = den === 0 ? 0 : num / den;
    const b = yAvg - m * xAvg;
    return {
      label: "Trendline",
      data: x.map((xi) => m * xi + b),
      borderColor: hexToRgba(baseColor, 1),
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 0,
      type: "line",
      order: 1,
      yAxisID: "y",
    };
  }, [datasetValues, options.trendline, baseColor]);

  const getChartData = (canvas) => {
    const ctx = canvas?.getContext?.("2d") || null;
    const backgroundArray = buildBackgroundArray(ctx, canvas?.height);

    if (options.type === "pie") {
      return { labels, datasets: [{ data: datasetValues, backgroundColor: backgroundArray }] };
    }

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
    };

    if (
      Array.isArray(primary.backgroundColor) &&
      primary.backgroundColor.length !== datasetValues.length
    ) {
      primary.backgroundColor = datasetValues.map((_, i) => perBarColors[i] || baseColor);
    }

    return { labels, datasets: trendDataset ? [primary, trendDataset] : [primary] };
  };

  const chartOptions = useMemo(() => {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#0f172a" } },
        tooltip: {
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
              return `${(((Number(value) || 0) / total) * 100).toFixed(1)}%`;
            }
            return value;
          },
        },
      },
    };

    if (options.type === "pie") base.scales = {};
    else if (options.type === "scatter") {
      base.scales = {
        x: {
          type: "linear",
          ticks: {
            callback: (val) => labels[Number(val) - 1] || val,
            color: "#374151",
          },
        },
        y: { type: options.logScale ? "logarithmic" : "linear", beginAtZero: !options.logScale },
      };
    } else {
      base.scales = {
        x: { ticks: { color: "#374151" } },
        y: { type: options.logScale ? "logarithmic" : "linear", beginAtZero: !options.logScale },
      };
    }
    return base;
  }, [options, datasetValues, labels, baseColor]);

  // Context menu for per-bar colors
  useEffect(() => {
    const chart = chartRef.current;
    const canvas = chart?.canvas;
    if (!canvas || !chart) return;

    const onContext = (e) => {
      e.preventDefault();
      try {
        // chart.getElementsAtEventForMode is Chart.js API
        const els =
          typeof chart.getElementsAtEventForMode === "function"
            ? chart.getElementsAtEventForMode(e, "nearest", { intersect: true }, false)
            : [];
        if (!els?.length) return;
        const index = els[0].index;
        if (index == null) return;

        const input = document.createElement("input");
        input.type = "color";
        input.value = perBarColors[index] || baseColor;
        input.style.position = "fixed";
        input.style.left = `${e.pageX}px`;
        input.style.top = `${e.pageY}px`;
        input.style.zIndex = 99999;
        input.oninput = (ev) =>
          setPerBarColors((prev) => ({ ...prev, [index]: ev.target.value }));
        input.onblur = () => input.remove();
        document.body.appendChild(input);
        input.focus();
        input.click();
      } catch (err) {
        // swallow
        // console.error(err);
      }
    };

    canvas.addEventListener("contextmenu", onContext);
    return () => canvas.removeEventListener("contextmenu", onContext);
  }, [perBarColors, baseColor]);

  const ChartContainer = ({ type }) => {
    const style = { minHeight: 320 };
    if (type === "pie")
      return <Pie ref={chartRef} data={getChartData} options={chartOptions} style={style} />;
    if (type === "line")
      return <Line ref={chartRef} data={getChartData} options={chartOptions} style={style} />;
    if (type === "scatter") {
      const points = datasetValues.map((v, i) => ({ x: i + 1, y: v }));
      return (
        <Scatter
          ref={chartRef}
          data={{
            datasets: [
              {
                label: yKey,
                data: points,
                backgroundColor: datasetValues.map((_, i) => perBarColors[i] || baseColor),
              },
              ...(trendDataset
                ? [
                    {
                      ...trendDataset,
                      data: trendDataset.data.map((v, i) => ({ x: i + 1, y: v })),
                    },
                  ]
                : []),
            ],
          }}
          options={chartOptions}
          style={style}
        />
      );
    }
    return <Bar ref={chartRef} data={getChartData} options={chartOptions} style={style} />;
  };

  return (
    <div className="mt-4">
      <div
        className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border"
        style={{ minHeight: 360 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-600 dark:text-slate-400">
            Label: <span className="text-gray-800 dark:text-slate-200">{labelKey}</span> • Value:{" "}
            <span className="text-gray-800 dark:text-slate-200">{yKey}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {safeData.length > 100 ? `Showing first 100 rows (of ${safeData.length})` : null}
          </div>
        </div>
        <div className="w-full h-[320px]">
          <ChartContainer type={options.type || "bar"} />
        </div>
      </div>
    </div>
  );
}

export default ChartView;
