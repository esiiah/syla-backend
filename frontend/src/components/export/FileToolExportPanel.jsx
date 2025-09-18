// frontend/src/components/export/FileToolExportPanel.jsx
import React from "react";

export default function FileToolExportPanel({ 
  onUpload, 
  downloadUrl = "", 
  onDownload, 
  error = "",
  loading = false,
  uploadLabel = "Upload & Process"
}) {
  const handleDownload = () => {
    if (typeof onDownload === "function") return onDownload();
    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  const handleUpload = () => {
    if (typeof onUpload === "function") onUpload();
  };

  return (
    <div style={{ position: "fixed", right: 20, top: "35%", width: 260, zIndex: 80 }}>
      <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-lg dark:bg-slate-800/90 dark:border-white/10 backdrop-blur-sm">
        <div className="text-sm font-medium mb-3 text-gray-800 dark:text-slate-200">File Actions</div>
        
        {onUpload && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium mb-3 transition-all duration-200 ${
              loading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                : "bg-neonBlue text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? "Processing..." : uploadLabel}
          </button>
        )}
        
        <button
          onClick={handleDownload}
          disabled={!downloadUrl}
          className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            downloadUrl
              ? "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
          }`}
        >
          {downloadUrl ? "Download Result" : "Waiting for result"}
        </button>

        {error && (
          <div className="mt-3 p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
