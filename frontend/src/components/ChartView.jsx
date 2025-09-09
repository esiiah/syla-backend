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

function ChartView({ data = [], columns = [], types = {}, options = {} }) {
  const chartRef = useRef(null);
  const [perBarColors, setPerBarColors] = useState({});

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  // --- Auto-detect X/Y columns: now assumption-free, just picks first two if not provided
  const { labelKey, yKey } = useMemo(() => {
    if (!safeColumns.length) return { labelKey: null, yKey: null };
    return { labelKey: safeColumns[0], yKey: safeColumns[1] || safeColumns[0] };
  }, [safeColumns]);

  if (!safeData.length || !labelKey || !yKey) {
    return (
      <div className="mt-4 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border">
        <h2 className="font-display text-base mb-2 text-gray-700 dark:text-slate-200">
          Chart
        </h2>
        <p className="text-gray-500 dark:text-slate-400">
          Upload a dataset to see charts. Any column types are supported.
        </p>
      </div>
    );
  }

  // --- Prepare labels and values
  const labels = safeData.map((row, i) => {
    const val = row[labelKey];
    if (val === null || val === undefined || typeof val === "object") return `Row ${i + 1}`;
    return String(val);
  });

  const datasetValues = safeData.map((row) => {
    const v = row[yKey];
    if (typeof v === "number") return v;
    const n = Number(v);
    return isNaN(n) ? null : n; // leave nulls instead of 0
  });

  // --- Apply sorting
  let paired = labels.map((lab, i) => ({ label: lab, value: datasetValues[i], index: i }));
  if (options.sort === "asc") paired.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  if (options.sort === "desc") paired.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const finalLabels = paired.map((p) => p.label);
  const finalValues = paired.map((p) => p.value);

  // --- Color utilities
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
        return new Array(finalValues.length).fill(g);
      } catch {
        // fallback
      }
    }
    return finalValues.map((_, i) => perBarColors[i] || baseColor);
  };

  // --- Trendline
  const trendDataset = useMemo(() => {
    if (!options.trendline) return null;
    const n = finalValues.length;
    const y = finalValues.map((v) => v ?? 0);
    const x = Array.from({ length: n }, (_, i) => i);
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
  }, [finalValues, options.trendline, baseColor]);

  // --- Chart data function
  const getChartData = (canvas) => {
    const ctx = canvas?.getContext?.("2d") || null;
    const backgroundArray = buildBackgroundArray(ctx, canvas?.height);

    if (options.type === "pie") {
      return { labels: finalLabels, datasets: [{ data: finalValues.map((v) => v ?? 0), backgroundColor: backgroundArray }] };
    }

    const primary = {
      label: `${yKey} (all rows)`,
      data: finalValues.map((v) => v ?? 0),
      backgroundColor: backgroundArray,
      borderRadius: 6,
      barPercentage: 0.6,
      borderColor: hexToRgba(baseColor, 1),
      borderWidth: 0,
      type: options.type === "line" ? "line" : "bar",
      order: 0,
      yAxisID: "y",
    };

    return { labels: finalLabels, datasets: trendDataset ? [primary, trendDataset] : [primary] };
  };

  // --- Chart options
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
              const total = finalValues.reduce((s, v) => s + (v ?? 0), 0) || 1;
              return `${(((value ?? 0) / total) * 100).toFixed(1)}%`;
            }
            return value;
          },
        },
      },
    };

    if (options.type === "pie") base.scales = {};
    else if (options.type === "scatter") {
      base.scales = {
        x: { type: "linear", ticks: { color: "#374151" } },
        y: { type: options.logScale ? "logarithmic" : "linear", beginAtZero: !options.logScale },
      };
    } else {
      base.scales = {
        x: { ticks: { color: "#374151" } },
        y: { type: options.logScale ? "logarithmic" : "linear", beginAtZero: !options.logScale },
      };
    }
    return base;
  }, [options, finalValues, baseColor]);

  // --- Context menu per-bar colors
  useEffect(() => {
    const chart = chartRef.current;
    const canvas = chart?.canvas;
    if (!canvas || !chart) return;

    const onContext = (e) => {
      e.preventDefault();
      try {
        const els = typeof chart.getElementsAtEventForMode === "function"
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
        input.oninput = (ev) => setPerBarColors((prev) => ({ ...prev, [index]: ev.target.value }));
        input.onblur = () => input.remove();
        document.body.appendChild(input);
        input.focus();
        input.click();
      } catch {}
    };

    canvas.addEventListener("contextmenu", onContext);
    return () => canvas.removeEventListener("contextmenu", onContext);
  }, [perBarColors, baseColor]);

  const ChartContainer = ({ type }) => {
    const style = { minHeight: 320 };
    if (type === "pie") return <Pie ref={chartRef} data={getChartData} options={chartOptions} style={style} />;
    if (type === "line") return <Line ref={chartRef} data={getChartData} options={chartOptions} style={style} />;
    if (type === "scatter") {
      const points = finalValues.map((v, i) => ({ x: i + 1, y: v ?? 0 }));
      return (
        <Scatter
          ref={chartRef}
          data={{
            datasets: [
              { label: yKey, data: points, backgroundColor: finalValues.map((_, i) => perBarColors[i] || baseColor) },
              ...(trendDataset ? [{ ...trendDataset, data: trendDataset.data.map((v, i) => ({ x: i + 1, y: v })) }] : []),
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
      <div className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border" style={{ minHeight: 360 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-600 dark:text-slate-400">
            Label: <span className="text-gray-800 dark:text-slate-200">{labelKey}</span> • Value: <span className="text-gray-800 dark:text-slate-200">{yKey}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {safeData.length > 500 ? `Showing ${safeData.length} rows` : null}
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
