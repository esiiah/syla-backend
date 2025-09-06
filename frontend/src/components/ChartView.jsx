import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ChartView({ data = [], columns = [], types = {} }) {
  const { labels, yKey, limitedData, labelKey } = useMemo(() => {
    if (!data.length || !columns.length)
      return { labels: [], yKey: null, limitedData: [], labelKey: null };

    const categoricalCols = columns.filter(
      (c) => (types[c] || "").startsWith("categorical")
    );
    const numericCols = columns.filter((c) => types[c] === "numeric");

    const labelKey = categoricalCols[0] || columns[0];
    const yKey = numericCols[0] || null;
    const limitedData = data.slice(0, 100);

    const labels = limitedData.map((row, i) =>
      row[labelKey] ? String(row[labelKey]) : `Row ${i + 1}`
    );

    return { labels, yKey, limitedData, labelKey };
  }, [data, columns, types]);

  if (!data.length || !labels.length || !yKey) {
    return (
      <div className="mt-4 p-6 rounded-2xl bg-black/20 border border-white/10 shadow-soft text-slate-300">
        <h2 className="font-display text-base mb-2">Chart</h2>
        <p className="text-slate-400">Upload a CSV to see charts.</p>
      </div>
    );
  }

  const datasetValues = limitedData.map((row) => {
    const v = row[yKey];
    return typeof v === "number" ? v : Number(v) || 0;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: `${yKey} (first ${limitedData.length})`,
        data: datasetValues,
        backgroundColor: "rgba(37, 99, 235, 0.7)", // neonBlue
        borderRadius: 6,
        barPercentage: 0.6,
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#e5e7eb" } },
      tooltip: {
        backgroundColor: "rgba(37,99,235,0.85)",
        titleColor: "#fff",
        bodyColor: "#fff",
        cornerRadius: 6,
        padding: 8,
      },
      title: { display: false }
    },
    scales: {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.04)" } }
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    }
  };

  return (
    <div className="mt-4">
      <div className="rounded-2xl bg-black/20 border border-white/10 p-4 shadow-neon">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-400">
            Label: <span className="text-slate-200">{labelKey}</span> • Value:{" "}
            <span className="text-slate-200">{yKey}</span>
          </div>
          {data.length > 100 && (
            <p className="text-xs text-slate-400">
              Showing first 100 rows (of {data.length})
            </p>
          )}
        </div>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

export default ChartView;
