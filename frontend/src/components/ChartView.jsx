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
  const { labels, yKey, limitedData } = useMemo(() => {
    if (!data.length || !columns.length) return { labels: [], yKey: null, limitedData: [] };

    const categoricalCols = columns.filter(
      (c) => (types[c] || "").startsWith("categorical")
    );
    const numericCols = columns.filter((c) => types[c] === "numeric");

    const labelKey = categoricalCols[0] || columns[0];
    const labels = data.map((row, i) =>
      row[labelKey] ? String(row[labelKey]) : `Row ${i + 1}`
    );
    const yKey = numericCols[0] || null;

    // Limit dataset to avoid rendering performance issues
    const limitedData = data.slice(0, 100);

    return { labels, yKey, limitedData };
  }, [data, columns, types]);

  if (!data.length || !labels.length || !yKey) {
    return (
      <div style={{ maxWidth: "900px", margin: "2rem auto" }}>
        <h2 className="text-lg font-semibold">Chart</h2>
        <p className="text-gray-600">Upload a CSV to see charts.</p>
      </div>
    );
  }

  const datasetValues = limitedData.map((row) => {
    const v = row[yKey];
    return typeof v === "number" ? v : Number(v) || 0;
  });

  const chartLabels = limitedData.map((row, i) =>
    row[columns[0]] ? String(row[columns[0]]) : `Row ${i + 1}`
  );

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: `${yKey} (showing first ${limitedData.length} rows)`,
        data: datasetValues,
        backgroundColor: "rgba(75, 192, 192, 0.7)"
      }
    ]
  };

  return (
    <div style={{ maxWidth: "900px", margin: "2rem auto" }}>
      <h2 className="text-lg font-semibold mb-2">Chart</h2>
      <Bar data={chartData} />
      {data.length > 100 && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          Showing first 100 rows only (out of {data.length})
        </p>
      )}
    </div>
  );
}

export default ChartView;
