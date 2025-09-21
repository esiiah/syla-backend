import React, { useState, useEffect, useRef } from "react";

export default function FileToolExportPanel({
  onUpload,
  uploadLabel = "Convert",
  downloadUrl = "",
  onDownload,
  error = "",
  loading = false,
  showPanel = false,
  conversionComplete = false,
  fileName = "",
  toolType = "convert",
  onCompressionLevelChange = () => {}
}) {
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [panelWidth, setPanelWidth] = useState(340);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    if (toolType !== "compress") setCompressionLevel("medium");
  }, [toolType]);

  useEffect(() => {
    if (toolType === "compress" && !conversionComplete) setPanelWidth(400);
    else if (toolType === "merge") setPanelWidth(360);
    else setPanelWidth(320);
  }, [toolType, conversionComplete]);

  const handleMouseDown = (e) => {
    if (!panelRef.current) return;
    setDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset]);

  if (!showPanel) return null;

  const handleUpload = () => {
    if (typeof onUpload === "function") {
      if (toolType === "compress") onUpload(compressionLevel);
      else onUpload();
    }
  };

  const handleCompressionChange = (level) => {
    setCompressionLevel(level);
    onCompressionLevelChange(level);
  };

  const handleDownload = () => {
    if (typeof onDownload === "function") onDownload();
    else if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  const getUploadButtonText = () => {
    if (loading) return `${toolType[0].toUpperCase() + toolType.slice(1)} Processing...`;
    if (toolType === "compress") return `Compress File (${compressionLevel})`;
    if (toolType === "merge") return "Merge Files";
    if (toolType === "pdf") return "Export PDF";
    if (toolType === "csv") return "Export CSV";
    return "Convert";
  };

  const getProcessingTitle = () => {
    if (toolType === "compress") return "File Compression";
    if (toolType === "merge") return "File Merging";
    if (toolType === "pdf") return "PDF Export";
    if (toolType === "csv") return "CSV Export";
    return "File Processing";
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right: position ? "auto" : 24,
        top: position ? "auto" : "50%",
        left: position ? position.x : "auto",
        transform: position ? "none" : "translateY(-50%)",
        ...(position && { top: position.y }),
        width: panelWidth,
        maxHeight: "calc(100vh - 72px)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="p-3 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-neonBlue/5 to-indigo-50 cursor-grab"
      >
        <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center">
          {getProcessingTitle()}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Compression Selector */}
        {toolType === "compress" && !conversionComplete && (
          <div className="mb-4 flex gap-2">
            {[
              { value: "light", label: "Light", reduction: "~25%" },
              { value: "medium", label: "Medium", reduction: "~50%" },
              { value: "strong", label: "Strong", reduction: "~75%" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCompressionChange(opt.value)}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-all duration-150 ${
                  compressionLevel === opt.value
                    ? "border-neonBlue bg-neonBlue/10 text-neonBlue"
                    : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400"
                }`}
              >
                {opt.label} {opt.reduction}
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        <div
          className={`mb-4 p-3 rounded-lg ${
            conversionComplete ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400"
            : "bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-400"
          }`}
        >
          <span className="text-sm font-medium">
            {conversionComplete
              ? `${getProcessingTitle()} Complete!`
              : "Ready to process"}
          </span>
          {fileName && conversionComplete && (
            <p className="text-xs mt-1 break-all">{fileName}</p>
          )}
        </div>

        {/* Upload Button */}
        {onUpload && !conversionComplete && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold mb-3 transition-all duration-300 ${
              loading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                : "bg-neonBlue text-white hover:bg-blue-600 shadow-md hover:shadow-lg hover:shadow-neonBlue/25"
            }`}
          >
            {getUploadButtonText()}
          </button>
        )}

        {/* Download Button */}
        {conversionComplete && (
          <button
            onClick={handleDownload}
            disabled={!downloadUrl}
            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              downloadUrl
                ? "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg hover:shadow-green-500/25"
                : "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
            }`}
          >
            {downloadUrl ? "Download Result" : "Preparing file..."}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
