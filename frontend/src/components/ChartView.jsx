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

  const labels = data.map((row, i) => {
    const v = row[xAxis];
    return v === null || typeof v === "undefined" ? `Row ${i + 1}` : String(v);
  });

  const datasetValues = data.map((row) => {
    const val = row[yAxis];
    if (typeof val === "number") return val;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  });

  const baseColor = options.color || "#2563eb";
  const getBackgroundColor = () =>
    options.gradient ? baseColor : labels.map(() => baseColor);

  const chartData = {
    labels,
    datasets: [
      {
        label: yAxis,
        data: datasetValues,
        backgroundColor: getBackgroundColor(),
        borderRadius: 6,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#0f172a" } },
      tooltip: {
        backgroundColor: baseColor,
        titleColor: "#fff",
        bodyColor: "#fff",
      },
      datalabels: {
        display: !!options.showLabels,
        color: "#0b1220",
        formatter: (value) => (options.type === "pie" ? `${value}` : value),
      },
    },
    scales:
      options.type === "pie"
        ? {}
        : {
            x: {
              title: { display: !!xAxis, text: xAxis },
              ticks: { color: "#374151" },
            },
            y: {
              title: { display: !!yAxis, text: yAxis },
              type: options.logScale ? "logarithmic" : "linear",
              beginAtZero: !options.logScale,
              ticks: { color: "#374151" },
            },
          },
  };

  const ChartComponent =
    options.type === "line"
      ? Line
      : options.type === "pie"
      ? Pie
      : options.type === "scatter"
      ? Scatter
      : Bar;

  const scatterData =
    options.type === "scatter"
      ? {
          datasets: [
            {
              label: yAxis,
              data: datasetValues.map((v, i) => ({ x: labels[i], y: v })),
              backgroundColor: labels.map(() => baseColor),
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
