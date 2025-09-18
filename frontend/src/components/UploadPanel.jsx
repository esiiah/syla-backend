// frontend/src/components/UploadPanel.jsx
import React, { useRef } from "react";

/**
 * UploadPanel
 * 
 * Two variants:
 * 
 * 1. Visualisation mode (for cleaning & charting):
 *    - Drag & drop
 *    - File choose
 *    - Upload & Process button
 *    - Preview (grid/list/details)
 * 
 * 2. FileTool mode (for conversions, compress, merge):
 *    - Drag & drop
 *    - File choose
 *    - Preview (grid/list/details)
 *    - NO "Upload & Process" button here (that comes from floating ExportPanel instead)
 */

export function VisualUploadPanel({
  title = "Upload Data",
  hint = "",
  accept = "*/*",
  multiple = false,
  files = [],
  setFiles = () => {},
  onDrop = null,
  viewMode = "grid",
  setViewMode = () => {},
  onUploadClick = () => {},
  primaryLabel = "Upload & Process",
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
    <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 p-5 max-w-3xl mx-auto">
      <h3 className="font-display text-lg mb-1">{title}</h3>
      {hint && <p className="text-sm text-gray-500 mb-4">{hint}</p>}

      <div
        onDrop={handleDragDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl p-6 text-center transition bg-white border dark:bg-ink/80"
        style={{ boxShadow: "0 6px 14px rgba(20,24,40,0.05)" }}
      >
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">
          Drag & drop your file here
        </p>
        <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
          Accepted: {accept}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 transition"
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

          <div className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[220px]">
            {files && files.length > 0 ? (
              <>
                Selected:{" "}
                <span className="text-neonYellow">
                  {files.map((f) => f.name || f.filename).join(", ")}
                </span>
              </>
            ) : (
              <span>No file chosen</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded ${
              viewMode === "grid" ? "bg-gray-100" : ""
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("details")}
            className={`px-3 py-1 rounded ${
              viewMode === "details" ? "bg-gray-100" : ""
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded ${
              viewMode === "list" ? "bg-gray-100" : ""
            }`}
          >
            List
          </button>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={onUploadClick}
          className="w-full px-4 py-3 rounded-2xl bg-neonBlue text-white shadow transition font-medium"
        >
          {primaryLabel}
        </button>
      </div>
    </section>
  );
}

// ---------- FileTool Variant ----------
export function FileToolUploadPanel({
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
    <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 p-5 max-w-3xl mx-auto">
      <h3 className="font-display text-lg mb-1">{title}</h3>
      {hint && <p className="text-sm text-gray-500 mb-4">{hint}</p>}

      <div
        onDrop={handleDragDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl p-6 text-center transition bg-white border dark:bg-ink/80"
        style={{ boxShadow: "0 6px 14px rgba(20,24,40,0.05)" }}
      >
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">
          Drag & drop your file here
        </p>
        <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
          Accepted: {accept}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 transition"
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

          <div className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[220px]">
            {files && files.length > 0 ? (
              <>
                Selected:{" "}
                <span className="text-neonYellow">
                  {files.map((f) => f.name || f.filename).join(", ")}
                </span>
              </>
            ) : (
              <span>No file chosen</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded ${
              viewMode === "grid" ? "bg-gray-100" : ""
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("details")}
            className={`px-3 py-1 rounded ${
              viewMode === "details" ? "bg-gray-100" : ""
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded ${
              viewMode === "list" ? "bg-gray-100" : ""
            }`}
          >
            List
          </button>
        </div>
      </div>
      {/* Notice: No Upload button here — action handled by floating ExportPanel */}
    </section>
  );
}
