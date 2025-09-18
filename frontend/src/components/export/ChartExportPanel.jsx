// frontend/src/components/export/ChartExportPanel.jsx
import React from "react";

export default function ChartExportPanel({ onExportImage, onExportCSV, onExportJSON }) {
  return (
    <div style={{ position: "fixed", right: 20, top: "35%", width: 240, zIndex: 80 }}>
      <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
        <div className="text-sm font-medium mb-2">Export chart</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => onExportImage?.("png")} className="px-2 py-2 rounded bg-gray-100 text-sm">
            PNG
          </button>
          <button onClick={() => onExportImage?.("jpeg")} className="px-2 py-2 rounded bg-gray-100 text-sm">
            JPEG
          </button>
          <button onClick={onExportCSV} className="px-2 py-2 rounded bg-gray-100 text-sm">
            CSV
          </button>
          <button onClick={onExportJSON} className="px-2 py-2 rounded bg-gray-100 text-sm">
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}
