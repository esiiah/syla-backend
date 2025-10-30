// FileToolUploadPanel.jsx
import React, { useRef, useEffect, useState } from "react";

export default function FileToolUploadPanel({
  title = "Upload File",
  hint = "",
  accept = "",
  multiple = false,
  files = [],
  setFiles = () => {},
  onUpload = null,
  viewMode = "grid",
  setViewMode = () => {},
  uploadLabel = "Upload & Process",
  loading = false,
  toolType = "convert",
}) {
  const inputRef = useRef(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState("");

  useEffect(() => {
    setInternalError("");
  }, [files]);

  const handleSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles(multiple ? selected : [selected[0]]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = Array.from(e.dataTransfer.files || []);
    if (!selected.length) return;
    setFiles(multiple ? selected : [selected[0]]);
  };

  const handleRemoveFile = (index) => {
    const next = [...files];
    next.splice(index, 1);
    setFiles(next);
  };

  const getTitle = () => {
    switch (toolType) {
      case "compress":
        return "Upload File to Compress";
      case "merge":
        return "Upload PDF Files to Merge";
      case "csv-to-excel":
        return "Upload CSV to convert to Excel";
      case "excel-to-csv":
        return "Upload Excel to convert to CSV";
      case "pdf-to-csv":
        return "Upload PDF to extract to CSV";
      case "csv-to-pdf":
        return "Upload CSV to convert to PDF";
      case "pdf-to-excel":
        return "Upload PDF to convert to Excel";
      case "excel-to-pdf":
        return "Upload Excel to convert to PDF";
      case "pdf-to-word":
        return "Upload PDF to convert to Word";
      case "word-to-pdf":
        return "Upload Word document to convert to PDF";
      case "image-to-pdf":
        return "Upload image to convert to PDF";
      default:
        return title;
    }
  };

  const getAccept = () => {
    if (accept) return accept;
    switch (toolType) {
      case "compress":
        return "*/*";
      case "merge":
        return ".pdf,application/pdf";
      case "csv-to-excel":
      case "csv-to-pdf":
        return ".csv,text/csv";
      case "excel-to-csv":
      case "excel-to-pdf":
        return ".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
      case "pdf-to-csv":
      case "pdf-to-excel":
      case "pdf-to-word":
        return ".pdf,application/pdf";
      case "word-to-pdf":
        return ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "image-to-pdf":
        return ".jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,image/*";
      default:
        return "*/*";
    }
  };

  // Default upload logic (used if no onUpload provided)
  const defaultUpload = async () => {
    setInternalError("");
    setInternalLoading(true);
    try {
      if (!files || files.length === 0) {
        throw new Error("No file selected");
      }

      // map toolType -> endpoint
      const map = {
        compress: { url: "/api/filetools/pdf/compress", multi: false, formFileKey: "file" },
        "compress-any": { url: "/api/filetools/file/compress", multi: false, formFileKey: "file" },
        merge: { url: "/api/filetools/pdf/merge", multi: true, formFileKey: "files" },
        "csv-to-excel": { url: "/api/filetools/convert/csv-to-excel", multi: false, formFileKey: "file" },
        "excel-to-csv": { url: "/api/filetools/convert/excel-to-csv", multi: false, formFileKey: "file" },
        "pdf-to-csv": { url: "/api/filetools/convert/pdf-to-csv", multi: false, formFileKey: "file" },
        "csv-to-pdf": { url: "/api/filetools/convert/csv-to-pdf", multi: false, formFileKey: "file" },
        "pdf-to-excel": { url: "/api/filetools/convert/pdf-to-excel", multi: false, formFileKey: "file" },
        "excel-to-pdf": { url: "/api/filetools/convert/excel-to-pdf", multi: false, formFileKey: "file" },
        "pdf-to-word": { url: "/api/filetools/convert/pdf-to-word", multi: false, formFileKey: "file" },
        "word-to-pdf": { url: "/api/filetools/convert/word-to-pdf", multi: false, formFileKey: "file" },
        "image-to-pdf": { url: "/api/filetools/convert/image-to-pdf", multi: false, formFileKey: "file" },
      };

      let chosen = map[toolType] || map.compress;
      const fd = new FormData();
      if (chosen.multi) {
        files.forEach((f) => {
          fd.append(chosen.formFileKey, f);
        });
      } else {
        fd.append(chosen.formFileKey, files[0]);
      }

      const resp = await fetch(chosen.url, {
        method: "POST",
        body: fd,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || json.error || JSON.stringify(json));

      // If provided, call onUpload callback with response
      if (typeof onUpload === "function") {
        try {
          await onUpload(files, { result: json, toolType });
        } catch (_) {}
      }

      setInternalLoading(false);
      return json;
    } catch (err) {
      setInternalLoading(false);
      setInternalError(err.message || String(err));
      return Promise.reject(err);
    }
  };

  const handleUpload = async () => {
    if (typeof onUpload === "function") {
      // let parent handle actual upload
      try {
        const r = onUpload(files);
        if (r && typeof r.then === "function") {
          await r;
        }
      } catch (err) {
        setInternalError(err.message || String(err));
      }
    } else {
      await defaultUpload();
    }
  };

  return (
    <section
      className="rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-lg p-6 max-w-6xl fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
      style={{ borderColor: "rgba(14,165,233,0.35)" }}
    >
      <h3 className="font-display text-lg mb-2 text-gray-800 dark:text-slate-200">{getTitle()}</h3>
      {hint && <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{hint}</p>}

      <div className="flex flex-col lg:flex-row gap-6 items-center">
        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex-1 rounded-xl p-6 text-center transition-all duration-300 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed hover:border-sky-400"
          style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 8px 32px rgba(59, 130, 246, 0.08)" }}
        >
          <div className="mb-3">
            <svg
              className="mx-auto h-10 w-10 text-sky-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">Drag & drop your file here</p>
          <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
            Accepted: <span className="font-mono text-sky-500">{getAccept()}</span>
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-lg border-2 bg-white text-sky-500 hover:bg-sky-500 hover:text-white transition-all duration-300 font-medium shadow-md"
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={getAccept()}
            multiple={multiple}
            onChange={handleSelect}
            className="hidden"
          />
        </div>

        {/* Right-hand side */}
        <div className="lg:w-80 w-full space-y-4">
          {/* Selected Files */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Selected Files:</div>
            {files.length ? (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border">
                    <span className="truncate flex-1 mr-2">{f.name || f.filename}</span>
                    {f.size && <span className="text-xs text-gray-500 dark:text-slate-400">{Math.round(f.size / 1024)} KB</span>}
                    <button onClick={() => handleRemoveFile(i)} className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-700">X</button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-500 dark:text-slate-500">No file selected</span>
            )}
          </div>

          {/* Upload Button */}
          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={loading || internalLoading}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                loading || internalLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-600 shadow-lg"
              }`}
            >
              {loading || internalLoading ? "Processing..." : uploadLabel}
            </button>
          )}

          {/* View mode switcher */}
          {files.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-gray-600 dark:text-slate-400 mr-2">View:</span>
              {["grid", "details", "list"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? "bg-sky-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Internal error */}
          {internalError && (
            <div className="mt-2 p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">{internalError}</div>
          )}
        </div>
      </div>
    </section>
  );
}
