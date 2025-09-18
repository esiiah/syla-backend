// frontend/src/components/UploadPanel.jsx
import React, { useRef } from "react";

/**
 * UploadPanel
 *
 * Props:
 *  - accept: file accept string
 *  - multiple: bool
 *  - files: array (File objects or uploaded file objects)
 *  - setFiles(filesArray)
 *  - onDrop handler optional
 *  - viewMode, setViewMode (grid/details/list)
 */
export default function UploadPanel({
  accept = "*/*",
  multiple = false,
  files = [],
  setFiles = () => {},
  onDrop = null,
  viewMode = "grid",
  setViewMode = () => {}
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
    <section className="max-w-xl mx-auto rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
      <div
        onDrop={handleDragDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl p-6 text-center transition bg-white border dark:bg-ink/80 neon-border"
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
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 transition shadow-neon"
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
    </section>
  );
}
