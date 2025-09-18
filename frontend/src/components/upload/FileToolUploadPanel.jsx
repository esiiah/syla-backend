// frontend/src/components/upload/FileToolUploadPanel.jsx
import React, { useRef } from "react";

export default function FileToolUploadPanel({
  title = "Upload File",
  hint = "",
  accept = "*/*",
  multiple = false,
  files = [],
  setFiles = () => {},
  onDrop = null,
  onUpload = null,
  viewMode = "grid",
  setViewMode = () => {},
  uploadLabel = "Upload & Process",
  loading = false
}) {
  const inputRef = useRef(null);

  const handleSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) setFiles(selected);
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    const selected = Array.from(e.dataTransfer.files || []);
    if (onDrop) onDrop(e, selected);
    else if (selected.length) setFiles(selected);
  };

  const handleUpload = () => {
    if (onUpload && typeof onUpload === "function") {
      onUpload();
    }
  };

  return (
    <section className="rounded-2xl bg-white border-2 border-neonBlue/20 shadow-lg dark:bg-ink/80 dark:border-neonBlue/40 dark:border-white/5 p-6 max-w-6xl mx-auto neon-border">
      <h3 className="font-display text-lg mb-2 text-gray-800 dark:text-slate-200">{title}</h3>
      {hint && <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{hint}</p>}

      {/* Horizontal layout container */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        
        {/* File upload area - takes up more space horizontally */}
        <div
          onDrop={handleDragDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex-1 rounded-xl p-6 text-center transition-all duration-300 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-neonBlue/30 hover:border-neonBlue/60 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:bg-gradient-to-r dark:from-slate-800/50 dark:to-slate-900/50 dark:border-neonBlue/40 dark:hover:border-neonBlue/70"
          style={{ 
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.1)",
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <div className="mb-3">
            <svg className="mx-auto h-10 w-10 text-neonBlue/60" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">
            Drag & drop your file here
          </p>
          <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
            Accepted: <span className="font-mono text-neonBlue">{accept}</span>
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-lg border-2 border-neonBlue/30 bg-white text-neonBlue hover:bg-neonBlue hover:text-white hover:border-neonBlue transition-all duration-300 font-medium shadow-md hover:shadow-lg dark:bg-slate-800 dark:border-neonBlue/50 dark:text-neonBlue dark:hover:bg-neonBlue dark:hover:text-white"
          >
            Choose File
          </button>
          
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleSelect}
            className="hidden"
          />
        </div>

        {/* File info and controls section */}
        <div className="lg:w-80 w-full space-y-4">
          
          {/* Selected files display */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Selected Files:</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              {files.length ? (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border">
                      <span className="truncate flex-1 mr-2">{f.name || f.filename}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {f.size ? Math.round(f.size / 1024) + ' KB' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 dark:text-slate-500">No file selected</span>
              )}
            </div>
          </div>

          {/* Upload button - always visible when files are selected */}
          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={loading}
              data-upload-trigger="true"
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400"
                  : "bg-neonBlue text-white hover:bg-blue-600 shadow-lg hover:shadow-neon"
              }`}
            >
              {loading ? "Processing..." : uploadLabel}
            </button>
          )}

          {/* View mode controls */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-600 dark:text-slate-400 mr-2">View:</span>
            {["grid", "details", "list"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  viewMode === mode 
                    ? "bg-neonBlue text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
