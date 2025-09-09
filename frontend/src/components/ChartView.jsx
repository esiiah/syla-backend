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
    return <div className="text-gray-500 dark:text-slate-400">Upload a CSV with valid X and Y columns to see chart.</div>;
  }

  const labels = data.map((row, i) => String(row[xAxis] ?? `Row ${i + 1}`));
  const datasetValues = data.map((row) => {
    const val = row[yAxis];
    return typeof val === "number" ? val : Number(val) || 0;
  });

  const baseColor = options.color || "#2563eb";
  const getBackgroundColor = () => (options.gradient ? baseColor : labels.map(() => baseColor));

  const chartData = {
    labels,
    datasets: [
      {
        label: yAxis,
        data: datasetValues,
        backgroundColor: getBackgroundColor(),
      },
    ],
  };

  const chartOpts = {
    responsive: true,
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
        formatter: (value, context) => {
          if (options.type === "pie") {
            const total = datasetValues.reduce((sum, v) => sum + (Number(v) || 0), 0) || 1;
            return `${(((Number(value) || 0) / total) * 100).toFixed(1)}%`;
          }
          return value;
        },
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

  // Scatter requires data in {x, y} format
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
    <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border" style={{ minHeight: 360 }}>
      <h3 className="font-display text-sm mb-2">{chartTitle || "Chart"}</h3>
      <div className="w-full h-[320px]">
        <ChartComponent data={scatterData} options={chartOpts} />
      </div>
    </div>
  );
}
