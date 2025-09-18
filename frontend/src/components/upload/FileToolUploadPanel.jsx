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
  viewMode = "grid",
  setViewMode = () => {},
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

  return (
    <section className="rounded-2xl bg-white border-2 border-neonBlue/20 shadow-lg dark:bg-ink/80 dark:border-neonBlue/40 dark:border-white/5 p-6 max-w-4xl mx-auto neon-border">
      <h3 className="font-display text-lg mb-2 text-gray-800 dark:text-slate-200">{title}</h3>
      {hint && <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{hint}</p>}

      <div
        onDrop={handleDragDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl p-8 text-center transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-neonBlue/30 hover:border-neonBlue/60 hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 dark:bg-gradient-to-br dark:from-slate-800/50 dark:to-slate-900/50 dark:border-neonBlue/40 dark:hover:border-neonBlue/70"
        style={{ 
          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.1)",
          minHeight: "160px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-neonBlue/60" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300 text-lg">
          Drag & drop your file here
        </p>
        <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
          Accepted formats: <span className="font-mono text-neonBlue">{accept}</span>
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-6 py-3 rounded-xl border-2 border-neonBlue/30 bg-white text-neonBlue hover:bg-neonBlue hover:text-white hover:border-neonBlue transition-all duration-300 font-medium shadow-lg hover:shadow-neon dark:bg-slate-800 dark:border-neonBlue/50 dark:text-neonBlue dark:hover:bg-neonBlue dark:hover:text-white"
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

          <div className="text-sm text-gray-700 dark:text-slate-300 max-w-[300px] text-center">
            {files.length ? (
              <>
                <span className="text-gray-600 dark:text-slate-400">Selected:</span>{" "}
                <span className="font-medium text-neonBlue">
                  {files.map((f) => f.name || f.filename).join(", ")}
                </span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-slate-500">No file selected</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600 dark:text-slate-400 mr-2">View:</span>
        {["grid", "details", "list"].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === mode 
                ? "bg-neonBlue text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
      {/* Action handled by floating FileToolExportPanel */}
    </section>
  );
}
