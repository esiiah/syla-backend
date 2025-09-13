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

  // labels / raw numeric values
  const labelsRaw = data.map((row, i) => {
    const v = row[xAxis];
    return v === null || typeof v === "undefined" ? `Row ${i + 1}` : String(v);
  });

  const valuesRaw = data.map((row) => {
    const val = row[yAxis];
    if (typeof val === "number") return val;
    const n = Number(String(val).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  });

  // Pair and sort if requested
  const pairs = labelsRaw.map((lbl, i) => ({ lbl, val: valuesRaw[i] }));
  if (options.sort === "asc") pairs.sort((a, b) => a.val - b.val);
  if (options.sort === "desc") pairs.sort((a, b) => b.val - a.val);

  const labels = pairs.map(p => p.lbl);
  const datasetValues = pairs.map(p => p.val);

  const baseColor = options.color || "#2563eb";

  // make text visible in dark mode
  const textColor =
    typeof document !== "undefined" && document.body && document.body.classList.contains("dark")
      ? "#E6EEF8"
      : "#0f172a";

  // simple per-bar color ramp when gradient enabled (safe, no ctx plugins)
  const adjustHex = (hex, amt) => {
    const h = hex.replace("#", "");
    const num = parseInt(h, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const backgroundColor = labels.map((_, i) =>
    options.gradient ? adjustHex(baseColor, Math.round(((i / Math.max(1, labels.length - 1)) - 0.5) * 50)) : baseColor
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: yAxis,
        data: datasetValues,
        backgroundColor,
        borderRadius: 6,
      },
    ],
  };

  // Trendline overlay (simple least squares on displayed points)
  if (options.trendline && datasetValues.length > 1) {
    const n = datasetValues.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const ys = datasetValues.slice();
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - xMean;
      num += dx * (ys[i] - yMean);
      den += dx * dx;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    const trendData = xs.map(x => slope * x + intercept);

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
              data: datasetValues.map((v, i) => ({ x: labels[i], y: v })),
              backgroundColor,
            },
          ],
        }
      : chartData;

  // update chart options text colors
  chartOpts.plugins = chartOpts.plugins || {};
  chartOpts.plugins.legend = chartOpts.plugins.legend || {};
  chartOpts.plugins.legend.labels = { color: textColor };
  chartOpts.plugins.datalabels = chartOpts.plugins.datalabels || {};
  chartOpts.plugins.datalabels.color = textColor;
  if (chartOpts.scales) {
    if (chartOpts.scales.x && chartOpts.scales.x.ticks) chartOpts.scales.x.ticks.color = textColor;
    if (chartOpts.scales.y && chartOpts.scales.y.ticks) chartOpts.scales.y.ticks.color = textColor;
  }

  const ChartComponent =
    options.type === "bar"
      ? Bar
      : options.type === "line"
      ? Line
      : options.type === "pie"
      ? Pie
      : options.type === "scatter"
      ? Scatter
      : Bar;
  
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
