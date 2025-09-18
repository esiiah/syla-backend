// frontend/src/components/export/FileToolExportPanel.jsx
import React from "react";

export default function FileToolExportPanel({ 
  onUpload, 
  downloadUrl = "", 
  onDownload, 
  error = "",
  loading = false,
  uploadLabel = "Convert",
  showPanel = false, // Only show when file is selected
  conversionComplete = false, // Show success message
  fileName = ""
}) {
  
  // Don't render panel if not needed
  if (!showPanel) return null;

  const handleDownload = () => {
    if (typeof onDownload === "function") return onDownload();
    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  const handleUpload = () => {
    if (typeof onUpload === "function") onUpload();
  };

  return (
    <div style={{ position: "fixed", right: 20, top: "35%", width: 280, zIndex: 80 }}>
      <div className="p-4 rounded-xl bg-white border-2 border-neonBlue/20 shadow-xl dark:bg-slate-800/95 dark:border-neonBlue/30 backdrop-blur-sm neon-border">
        <div className="text-sm font-semibold mb-4 text-gray-800 dark:text-slate-200 flex items-center">
          <svg className="w-4 h-4 mr-2 text-neonBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          File Processing
        </div>
        
        {/* Conversion status */}
        {conversionComplete ? (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center text-green-700 dark:text-green-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Conversion Complete!</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {fileName ? `File: ${fileName}` : "Ready for download"}
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center text-blue-700 dark:text-blue-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">File Selected</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Ready to process
            </p>
          </div>
        )}
        
        {/* Upload/Convert button */}
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : uploadLabel}
          </button>
        )}
        
        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!downloadUrl}
          className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
            downloadUrl
              ? "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg hover:shadow-green-500/25"
              : "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
          }`}
        >
          {downloadUrl ? (
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Result
            </div>
          ) : conversionComplete ? "Processing Download..." : "Waiting for file"}
        </button>

        {error && (
          <div className="mt-3 p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <div className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Processing status indicator */}
        {loading && (
          <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-slate-400">
            <div className="flex space-x-1 mr-2">
              <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1 h-1 bg-neonBlue rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            Processing file...
          </div>
        )}
      </div>
    </div>
  );
}
