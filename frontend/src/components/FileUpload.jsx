// frontend/src/components/FileUpload.jsx
import React, { useState, useRef } from "react";

function FileUpload({ onData, onColumns, onTypes, onSummary, onChartTitle, onXAxis, onYAxis }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleUpload = () => {
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    // POST to same origin /api/upload (if you host backend elsewhere change URL)
    xhr.open("POST", "/api/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onloadstart = () => {
      setUploading(true);
      setProgress(0);
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.error) {
            alert(result.error);
            return;
          }

          onData(result.data || []);
          onColumns(result.columns || []);
          onTypes(result.types || {});
          onSummary(result.summary || {});
          onChartTitle(result.chart_title || "");
          onXAxis(result.x_axis || "");
          onYAxis(result.y_axis || "");

          setFile(null);
          if (inputRef.current) inputRef.current.value = "";

          alert(`Upload successful: ${result.filename || "file"} (${result.rows || "-"} rows)`);
        } catch (e) {
          alert("Upload succeeded but response was not JSON.");
        }
      } else {
        // try parse JSON error from server
        let msg = `Upload failed (status ${xhr.status})`;
        try {
          const r = JSON.parse(xhr.responseText);
          if (r && (r.detail || r.error)) msg = r.detail || r.error;
        } catch (e) {}
        alert(msg);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Upload failed due to network/CORS error");
    };

    xhr.send(formData);
  };

  const dragStyle = dragOver
    ? {
        borderColor: "#FACC15",
        backgroundColor: "rgba(250, 204, 21, 0.03)",
        boxShadow: "0 0 0 6px rgba(250,204,21,0.05)",
      }
    : {};

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`rounded-2xl p-6 text-center transition bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft neon-border`}
        style={dragStyle}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
      >
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">
          Drag & drop your CSV / Excel here
        </p>
        <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
          or select a file from your computer
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700
              hover:text-black hover:border-neonBlue/60 transition
              dark:border-white/10 dark:text-slate-200 dark:hover:text-white
              shadow-neon hover:animate-glow"
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && (
            <span className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[140px]">
              Selected: <span className="text-neonYellow">{file.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        className="w-full px-4 py-3 rounded-2xl bg-neonBlue text-white shadow-neon hover:animate-glow transition font-medium"
        disabled={uploading}
      >
        {uploading ? `Uploading ${progress}%` : "Upload"}
      </button>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shadow-inner">
            <div
              className="h-3 rounded-full bg-neonYellow animate-shimmer transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-gray-700 dark:text-slate-300 font-mono">
            {progress}%
          </p>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
