// frontend/src/components/export/FileToolExportPanel.jsx
import React from "react";

export default function FileToolExportPanel({ onUpload, downloadUrl = "", onDownload, error = "" }) {
  const handleDownload = () => {
    if (typeof onDownload === "function") return onDownload();
    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  return (
    <div style={{ position: "fixed", right: 20, top: "35%", width: 240, zIndex: 80 }}>
      <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
        <div className="text-sm font-medium mb-2">Actions</div>
        <button
          onClick={onUpload}
          className="w-full px-3 py-2 rounded bg-neonBlue text-white text-sm mb-2"
        >
          Upload
        </button>
        <button
          onClick={handleDownload}
          disabled={!downloadUrl}
          className={`w-full px-3 py-2 rounded text-sm ${
            downloadUrl
              ? "bg-white border border-gray-200"
              : "bg-gray-100 text-gray-500 cursor-not-allowed"
          }`}
        >
          {downloadUrl ? "Download result" : "Waiting for result"}
        </button>

        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
    </div>
  );
}
