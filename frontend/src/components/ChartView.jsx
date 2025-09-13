// frontend/src/components/ChartView.jsx
import React, { useMemo } from "react";
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
  // Early exit if data or axis not defined
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

  // --- Extract labels and values ---
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

  // Sort if requested
  const pairs = labelsRaw.map((lbl, i) => ({ lbl, val: valuesRaw[i] }));
  if (options.sort === "asc") pairs.sort((a, b) => a.val - b.val);
  if (options.sort === "desc") pairs.sort((a, b) => b.val - a.val);

  const labels = pairs.map((p) => p.lbl);
  const datasetValues = pairs.map((p) => p.val);

  // --- Color & Gradient ---
  const baseColor = options.color || "#2563eb";
  const gradientColors = options.gradientColors && options.gradientColors.length
    ? options.gradientColors
    : [baseColor, baseColor];

  const interpolateColors = (colors, steps) => {
    if (colors.length === 1) return Array(steps).fill(colors[0]);
    const result = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const seg = t * (colors.length - 1);
      const idx = Math.floor(seg);
      const frac = seg - idx;
      const hexToRgb = (h) => h.length === 4
        ? [parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16), parseInt(h[3]+h[3],16)]
        : [parseInt(h[1]+h[2],16), parseInt(h[3]+h[4],16), parseInt(h[5]+h[6],16)];
      const rgbToHex = (r,g,b) => "#" + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
      const [r1,g1,b1] = hexToRgb(colors[idx]);
      const [r2,g2,b2] = hexToRgb(colors[Math.min(idx+1,colors.length-1)]);
      const r = Math.round(r1 + (r2 - r1)*frac);
      const g = Math.round(g1 + (g2 - g1)*frac);
      const b = Math.round(b1 + (b2 - b1)*frac);
      result.push(rgbToHex(r,g,b));
    }
    return result;
  };

  const backgroundColor = options.gradient
    ? interpolateColors(gradientColors, labels.length)
    : labels.map(() => baseColor);

  // --- Chart Data ---
  const chartData = useMemo(() => {
    const datasets = [
      {
        label: options.showLabels ? yAxis : "",
        data: datasetValues,
        backgroundColor,
        borderRadius: 6,
      },
    ];

    // Trendline
    if (options.trendline && datasetValues.length > 1) {
      const n = datasetValues.length;
      const xs = Array.from({ length: n }, (_, i) => i);
      const ys = datasetValues.slice();
      const xMean = xs.reduce((a,b)=>a+b,0)/n;
      const yMean = ys.reduce((a,b)=>a+b,0)/n;
      let num=0, den=0;
      for(let i=0;i<n;i++){
        const dx = xs[i]-xMean;
        num += dx*(ys[i]-yMean);
        den += dx*dx;
      }
      const slope = den===0?0:num/den;
      const intercept = yMean - slope*xMean;
      const trendData = xs.map(x => slope*x + intercept);
      datasets.push({
        label: "Trendline",
        data: trendData,
        type: "line",
        borderColor: baseColor,
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        order: 0,
      });
    }

    // Scatter
    if (options.type === "scatter") {
      return {
        datasets: [
          {
            label: yAxis,
            data: datasetValues.map((v,i)=>({x:labels[i], y:v})),
            backgroundColor,
          }
        ]
      };
    }

    return { labels, datasets };
  }, [labels, datasetValues, backgroundColor, options]);

  // --- Chart Options ---
  const chartOpts = useMemo(() => {
    const textColor = document && document.body && document.body.classList.contains("dark")
      ? "#E6EEF8"
      : "#0f172a";

    const yMin = options.logScale
      ? Math.max(1, Math.min(...datasetValues.filter(v => v > 0)))
      : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        tooltip: {},
        datalabels: {
          display: options.showLabels,
          color: textColor,
        },
      },
      scales: {
        x: { ticks: { color: textColor } },
        y: { 
          type: options.logScale ? "log" : "linear",
          ticks: { color: textColor },
          min: yMin,
        }
      },
    };
  }, [options, datasetValues]);

  const ChartComponent = options.type === "bar"
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
      <div className="rounded-xl p-3 bg-gradient-to-b from-white to-gray-50 border border-gray-100 shadow-inner dark:from-black/30 dark:to-black/10 dark:border-white/10 min-h-[320px]">
        <div className="w-full h-[320px]">
          <ChartComponent data={chartData} options={chartOpts} />
        </div>
      </div>
    </div>
  );
}
