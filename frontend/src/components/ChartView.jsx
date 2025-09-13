// frontend/src/components/ChartView.jsx
import React from "react";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
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

export default function ChartView({
  data = [],
  columns = [],
  types = {},
  options = {},
  chartTitle = "",
  xAxis = "",
  yAxis = "",
}) {
  if (!data.length || !xAxis || !yAxis) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border p-5">
        <h3 className="font-display text-sm mb-2">{chartTitle || "Visualization"}</h3>
        <div className="rounded-xl p-6 bg-gradient-to-b from-white to-gray-50 border border-gray-100 shadow-inner dark:from-black/30 dark:to-black/10 dark:border-white/10 min-h-[280px] flex items-center justify-center text-gray-500 dark:text-slate-400">
          Upload a CSV with valid X and Y columns to see chart.
        </div>
      </div>
    );
  }

  const labelsRaw = data.map((row, i) => {
    const v = row[xAxis];
    return v === null || typeof v === "undefined" ? `Row ${i + 1}` : String(v);
  });

  // Try to coerce y values to numbers (strip commas if present)
  const valuesRaw = data.map((row) => {
    const val = row[yAxis];
    if (typeof val === "number") return val;
    const n = Number(String(val).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  });

  // Pair labels+values for sorting
  const pairs = labelsRaw.map((label, i) => ({ label, value: valuesRaw[i], idx: i }));

  if (options.sort === "asc") {
    pairs.sort((a, b) => a.value - b.value);
  } else if (options.sort === "desc") {
    pairs.sort((a, b) => b.value - a.value);
  }

  const labels = pairs.map((p) => p.label);
  const datasetValues = pairs.map((p) => p.value);

  const baseColor = options.color || "#2563eb";

  // helper: slightly lighten/darken a hex color to create a gradient-like ramp
  function adjustHex(hex, amt) {
    // hex like "#rrggbb"
    const h = hex.replace("#", "");
    const num = parseInt(h, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00ff) + amt;
    let b = (num & 0x0000ff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Create per-bar colors: if gradient enabled, vary slightly by index
  const backgroundColors = labels.map((_, i) => {
    if (!options.gradient) return baseColor;
    const amt = Math.round(((i / Math.max(1, labels.length - 1)) - 0.5) * 50); // -25..+25
    return adjustHex(baseColor, amt);
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: yAxis,
        data: datasetValues,
        backgroundColor: backgroundColors,
        borderRadius: 6,
      },
    ],
  };

  // Trendline: simple least-squares on indices 0..n-1 (works for visuals)
  if (options.trendline && datasetValues.length > 1) {
    const n = datasetValues.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const ys = datasetValues.slice();
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - xMean;
      num += dx * (ys[i] - yMean);
      den += dx * dx;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    const trendData = xs.map((x) => slope * x + intercept);

    chartData.datasets.push({
      label: "Trendline",
      data: trendData,
      type: "line",
      borderColor: adjustHex(baseColor, -70),
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      tension: 0.2,
      order: 0,
    });
  }

  const scatterData =
    options.type === "scatter"
      ? {
          datasets: [
            {
              label: yAxis,
              data: datasetValues.map((v, i) => ({ x: i, y: v })),
              backgroundColor: backgroundColors,
            },
          ],
        }
      : chartData;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border p-5">
      <h3 className="font-display text-sm mb-2">{chartTitle || "Visualization"}</h3>
      {/* Inner sub-chamber just like the Upload box */}
      <div className="rounded-xl p-3 bg-gradient-to-b from-white to-gray-50 border border-gray-100 shadow-inner dark:from-black/30 dark:to-black/10 dark:border-white/10 min-h-[320px]">
        <div className="w-full h-[320px]">
          <ChartComponent
            data={options.type === "scatter" ? scatterData : chartData}
            options={chartOpts}
          />
        </div>
      </div>
    </div>
  );
}
