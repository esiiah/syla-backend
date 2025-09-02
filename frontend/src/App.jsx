import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload.jsx";
import ChartView from "./components/ChartView.jsx";
import "./App.css";

function App() {
  const [data, setData] = useState([]);          // cleaned rows
  const [columns, setColumns] = useState([]);    // column names
  const [types, setTypes] = useState({});        // {"col": "numeric" | "categorical" | "datetime"}
  const [summary, setSummary] = useState({});    // numeric stats

  // Detect install prompt (for PWA)
  useEffect(() => {
    let deferredPrompt;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log("✅ PWA can be installed!");
      // You can later call deferredPrompt.prompt() from a button
    });
  }, []);

  return (
    <div className="App max-w-4xl mx-auto p-4">
      {/* Header */}
      <header className="flex items-center gap-2">
        <img
          src="/favicon.png"   // ✅ Vite serves from public/
          alt="Syla logo"
          className="w-8 h-8"
        />
        <h1 className="text-2xl font-bold">Syla Data Analytics</h1>
      </header>

      {/* Intro */}
      <p className="mt-2 text-gray-600">
        Upload your data and generate instant visualizations.
      </p>

      {/* Tailwind test banner */}
      <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
        🚀 Tailwind is working!
      </div>

      {/* File Upload + Charts */}
      <FileUpload
        onData={setData}
        onColumns={setColumns}
        onTypes={setTypes}
        onSummary={setSummary}
      />

      <ChartView data={data} columns={columns} types={types} />

      {/* Summary */}
      {Object.keys(summary).length > 0 && (
        <div className="max-w-3xl mx-auto mt-6 p-4 rounded-lg bg-gray-50 shadow">
          <h2 className="text-lg font-semibold mb-2">Summary</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
