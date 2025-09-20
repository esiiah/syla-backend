// Replace the entire frontend/src/components/export/FileToolExportPanel.jsx

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
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight * 0.35 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panelWidth, setPanelWidth] = useState(320);
  const panelRef = useRef(null);

  // Reset compression level when tool type changes
  useEffect(() => {
    if (toolType !== "compress") {
      setCompressionLevel("medium");
    }
  }, [toolType]);

  // Set initial position on right side when panel first shows
  useEffect(() => {
    if (showPanel) {
      setPosition({ x: window.innerWidth - 340, y: window.innerHeight * 0.35 });
    }
  }, [showPanel]);

  // Adjust panel width based on content
  useEffect(() => {
    if (toolType === "compress" && !conversionComplete) {
      setPanelWidth(400); // Expand horizontally for compression options
    } else if (toolType === "merge") {
      setPanelWidth(360); // Slightly wider for merge options
    } else {
      setPanelWidth(320); // Default width
    }
  }, [toolType, conversionComplete]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - panelWidth;
      const maxY = window.innerHeight - 400;
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelWidth]);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - panelWidth;
      const maxY = window.innerHeight - 400;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset]);

  if (!showPanel) return null;

  const handleUpload = () => {
    if (typeof onUpload === "function") {
      if (toolType === "compress") {
        onUpload(compressionLevel);
      } else {
        onUpload();
      }
    }
  };

  const handleCompressionLevelChange = (level) => {
    setCompressionLevel(level);
    onCompressionLevelChange(level);
  };

  const handleDownload = () => {
    if (typeof onDownload === "function") {
      onDownload();
    } else if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
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
      strong: "Maximum compression - Smaller file, some quality loss"
    };
    return descriptions[level] || "";
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: panelWidth,
        maxHeight: "60vh",
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="rounded-xl bg-white border-2 border-neonBlue/20 shadow-2xl dark:bg-slate-800/95 dark:border-neonBlue/30 backdrop-blur-sm neon-border h-full flex flex-col">
        {/* Draggable Header */}
        <div className="drag-handle p-3 border-b border-gray-200 dark:border-white/10 cursor-move bg-gradient-to-r from-neonBlue/5 to-indigo-500/5 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center">
              <svg className="w-4 h-4 mr-2 text-neonBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {getProcessingTitle()}
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Scrollable Panel Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Compression Level Selector */}
            {toolType === "compress" && !conversionComplete && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-3">
                  Compression Level
                </label>
                <div className="space-y-2">
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
                      <div className={`w-4 h-4 rounded-full border-2 ml-3 flex-shrink-0 ${
                        compressionLevel === option.value 
                          ? "border-neonBlue bg-neonBlue" 
                          : "border-gray-300 dark:border-slate-500"
                      }`}>
                        {compressionLevel === option.value && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
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
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {getUploadButtonText()}
                  </div>
                ) : (
                  getUploadButtonText()
                )}
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
                <div className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="break-words">{error}</span>
                </div>
              </div>
            )}

            {/* Loading dots */}
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
    </div>
  );
}
