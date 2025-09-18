// frontend/src/components/ExportPanel.jsx
import React from "react";

/**
 * ExportPanel
 *
 * Props:
 *  - context: "chart" | "filetool"
 *  - style: inline style override for container (optional)
 *
 * Chart mode props:
 *  - onExportImage(format)  -> called with 'png' or 'jpeg'
 *  - onExportCSV()          -> csv handler
 *  - onExportJSON()         -> json handler
 *
 * Filetool mode props:
 *  - onUpload()             -> upload handler
 *  - downloadUrl            -> url of processed file (string)
 *  - onDownload()           -> download handler (or fallback opens downloadUrl)
 */
export default function ExportPanel({
  context = "filetool",
  style = {},
  // chart handlers
  onExportImage,
  onExportCSV,
  onExportJSON,
  // filetool handlers
  onUpload,
  downloadUrl = "",
  onDownload
}) {
  const handleDownload = () => {
    if (typeof onDownload === "function") return onDownload();
    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        top: "35%",
        width: 240,
        zIndex: 80,
        ...style
      }}
    >
      <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
        {context === "chart" ? (
          <>
            <div className="text-sm font-medium mb-2">Export chart</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => onExportImage && onExportImage("png")}
                className="px-2 py-2 rounded bg-gray-100 text-sm"
              >
                PNG
              </button>
              <button
                onClick={() => onExportImage && onExportImage("jpeg")}
                className="px-2 py-2 rounded bg-gray-100 text-sm"
              >
                JPEG
              </button>
              <button
                onClick={() => onExportCSV && onExportCSV()}
                className="px-2 py-2 rounded bg-gray-100 text-sm"
              >
                CSV
              </button>
              <button
                onClick={() => onExportJSON && onExportJSON()}
                className="px-2 py-2 rounded bg-gray-100 text-sm"
              >
                JSON
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium mb-2">File Actions</div>
            <button
              onClick={() => onUpload && onUpload()}
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
          </>
        )}
      </div>
    </div>
  );
}
