// frontend/src/components/export/FileToolExportPanel.jsx

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
  const panelRef = useRef(null);

  // Reset compression level when tool type changes
  useEffect(() => {
    if (toolType !== "compress") setCompressionLevel("medium");
  }, [toolType]);

  // Adjust width based on tool type
  useEffect(() => {
    if (toolType === "compress" && !conversionComplete) setPanelWidth(400);
    else if (toolType === "merge") setPanelWidth(360);
    else setPanelWidth(320);
  }, [toolType, conversionComplete]);

  if (!showPanel) return null;

  const handleUpload = () => {
    if (typeof onUpload === "function") {
      if (toolType === "compress") onUpload(compressionLevel);
      else onUpload();
    }
  };

  const handleCompressionLevelChange = (level) => {
    setCompressionLevel(level);
    onCompressionLevelChange(level);
  };

  const handleDownload = () => {
    if (typeof onDownload === "function") onDownload();
    else if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  const getUploadButtonText = () => {
    if (loading) {
      if (toolType === "compress") return "Compressing...";
      if (toolType === "merge") return "Merging...";
      return "Processing...";
    }
    if (toolType === "compress") return `Compress PDF (${compressionLevel})`;
    if (toolType === "merge") return "Merge PDFs";
    return "Convert";
  };

  const getProcessingTitle = () => {
    if (toolType === "compress") return "PDF Compression";
    if (toolType === "merge") return "PDF Merging";
    return "File Processing";
  };

  const getCompressionDescription = (level) => {
    const descriptions = {
      light: "Minimal compression - Better quality, larger file size",
      medium: "Balanced compression - Good quality, moderate reduction",
      strong: "Maximum compression - Smaller file, some quality loss",
    };
    return descriptions[level] || "";
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right: 24,
        top: "50%",
        transform: "translateY(-50%)",
        width: panelWidth,
        maxHeight: "calc(100vh - 72px)", // vertical centering with scrollable body
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="rounded-xl bg-white border-2 border-neonBlue/20 shadow-2xl dark:bg-slate-800/95 dark:border-neonBlue/30 backdrop-blur-sm neon-border flex flex-col h-full">
        
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-neonBlue/5 to-indigo-500/5 rounded-t-xl">
          <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center">
            <svg className="w-4 h-4 mr-2 text-neonBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {getProcessingTitle()}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          
          {/* Compression Level Selector */}
          {toolType === "compress" && !conversionComplete && (
            <div className="mb-4 space-y-2">
              {[
                { value: "light", label: "Light", reduction: "~25%" },
                { value: "medium", label: "Medium", reduction: "~50%" },
                { value: "strong", label: "Strong", reduction: "~75%" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    compressionLevel === option.value
                      ? "border-neonBlue bg-neonBlue/10 text-neonBlue"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 dark:border-slate-600 dark:hover:border-slate-500 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="compressionLevel"
                    value={option.value}
                    checked={compressionLevel === option.value}
                    onChange={(e) => handleCompressionLevelChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{option.label}</span>
                      <span className="text-xs opacity-75">{option.reduction}</span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {getCompressionDescription(option.value)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Status */}
          {conversionComplete ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center text-green-700 dark:text-green-400">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">
                  {toolType === "compress"
                    ? `Compression Complete! (${compressionLevel})`
                    : toolType === "merge"
                    ? "Merge Complete!"
                    : "Conversion Complete!"}
                </span>
              </div>
              {fileName && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 break-all">
                  File: {fileName}
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center text-blue-700 dark:text-blue-400">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">File(s) Selected</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Ready to process
                {toolType === "compress" && ` with ${compressionLevel} compression`}
              </p>
            </div>
          )}

          {/* Upload */}
          {onUpload && !conversionComplete && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold mb-3 transition-all duration-300 ${
                loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                  : "bg-neonBlue text-white hover:bg-blue-600 shadow-md hover:shadow-lg hover:shadow-neonBlue/25"
              }`}
            >
              {loading ? "Processing..." : getUploadButtonText()}
            </button>
          )}

          {/* Download */}
          {conversionComplete && (
            <button
              onClick={handleDownload}
              disabled={!downloadUrl}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
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

          {/* Loading */}
          {loading && (
            <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-slate-400">
              <div className="flex space-x-1 mr-2">
                <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
              Processing file...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
