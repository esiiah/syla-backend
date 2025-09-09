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

export default function ChartView({ data = [], columns = [], types = {}, options = {}, chartTitle = "", xAxis = "", yAxis = "" }) {
  if (!data.length || !columns.length) {
    return <div className="text-gray-500 dark:text-slate-400">Upload a CSV to see chart.</div>;
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
      tooltip: { backgroundColor: baseColor, titleColor: "#fff", bodyColor: "#fff" },
      datalabels: { display: !!options.showLabels, color: "#0b1220" },
    },
    scales: {
      x: { title: { display: !!xAxis, text: xAxis } },
      y: { title: { display: !!yAxis, text: yAxis }, beginAtZero: true },
    },
  };

  const ChartComponent = options.type === "line" ? Line : options.type === "pie" ? Pie : options.type === "scatter" ? Scatter : Bar;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border" style={{ minHeight: 360 }}>
      <h3 className="font-display text-sm mb-2">{chartTitle || "Chart"}</h3>
      <div className="w-full h-[320px]">
        <ChartComponent data={chartData} options={chartOpts} />
      </div>
    </div>
  );
}
