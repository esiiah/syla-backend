// frontend/src/components/ChartView.jsx
import React, { useRef, useState, useEffect } from "react";
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

export default function ChartView({ data = [], columns = [], options = {} }) {
  const chartRef = useRef(null);
  const [perBarColors, setPerBarColors] = useState({});
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  if (!safeData.length || !safeColumns.length) {
    return (
      <div className="mt-4 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border">
        <h2 className="font-display text-base mb-2 text-gray-700 dark:text-slate-200">Chart</h2>
        <p className="text-gray-500 dark:text-slate-400">
          Upload a CSV to see charts. Any first two columns will be used as label/value.
        </p>
      </div>
    );
  }

  // Pick first two columns as label/value
  const labelKey = safeColumns[0];
  const yKey = safeColumns[1] || safeColumns[0];

  const labels = safeData.map((row, i) =>
    row[labelKey] !== undefined && row[labelKey] !== null && row[labelKey] !== ""
      ? String(row[labelKey])
      : `Row ${i + 1}`
  );

  const values = safeData.map((row) => {
    const v = row[yKey];
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  });

  // Sort if requested
  let paired = labels.map((lab, i) => ({ label: lab, value: values[i] }));
  if (options.sort === "asc") paired.sort((a, b) => a.value - b.value);
  if (options.sort === "desc") paired.sort((a, b) => b.value - a.value);

  const sortedLabels = paired.map((p) => p.label);
  const sortedValues = paired.map((p) => p.value);

  // Colors
  const baseColor = options.color || "#2563eb";
  const hexToRgba = (hex, alpha = 1) => {
    const h = (hex || "#2563eb").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const backgroundColors = sortedValues.map((_, i) => perBarColors[i] || baseColor);

  // Chart.js data
  const chartData = {
    labels: sortedLabels,
    datasets: [
      {
        label: yKey,
        data: sortedValues,
        backgroundColor: backgroundColors,
        borderColor: hexToRgba(baseColor, 1),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#0f172a" } },
      tooltip: { backgroundColor: hexToRgba(baseColor, 0.9), titleColor: "#fff", bodyColor: "#fff" },
      datalabels: { display: !!options.showLabels, color: "#0b1220" },
    },
    scales:
      options.type === "pie"
        ? {}
        : {
            x: { ticks: { color: "#374151" } },
            y: { type: options.logScale ? "logarithmic" : "linear", beginAtZero: !options.logScale },
          },
  };

  // Context menu for per-bar colors
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;
    if (!canvas) return;

    const onContext = (e) => {
      e.preventDefault();
      const index = Math.floor((e.offsetX / canvas.width) * sortedValues.length);
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
    };

    canvas.addEventListener("contextmenu", onContext);
    return () => canvas.removeEventListener("contextmenu", onContext);
  }, [perBarColors, baseColor, sortedValues.length]);

  // Render chart component
  const ChartComponent = options.type === "pie" ? Pie : options.type === "line" ? Line : options.type === "scatter" ? Scatter : Bar;

  return (
    <div className="mt-4 rounded-2xl p-4 bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border" style={{ minHeight: 360 }}>
      <ChartComponent ref={chartRef} data={chartData} options={chartOptions} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
