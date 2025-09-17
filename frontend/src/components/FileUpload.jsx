import React, { useState, useRef, useEffect } from "react";

export default function FileUpload({
  action = null,
  accept = ".csv,.xlsx,.xls",
  multiple = false,
  maxFiles = 10,
  onResult = () => {},
  onData,
  onColumns,
  onTypes,
  onSummary,
  onChartTitle,
  onXAxis,
  onYAxis,
  initialFiles = null,
}) {
  const [files, setFiles] = useState(initialFiles ? (Array.isArray(initialFiles) ? initialFiles : [initialFiles]) : []);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [exportType, setExportType] = useState("");
  const [error, setError] = useState("");
  const [previewView, setPreviewView] = useState("grid"); // grid | details | list
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialFiles) setFiles(Array.isArray(initialFiles) ? initialFiles : [initialFiles]);
  }, [initialFiles]);

  const endpoint = action ? `/api/filetools/${action}` : "/api/upload";

  const validateFiles = (selected) => {
    if (!multiple && selected.length > 1) {
      alert("This tool accepts a single file at a time.");
      return false;
    }
    if (selected.length > maxFiles) {
      alert(`Max ${maxFiles} file(s) allowed.`);
      return false;
    }
    const allowed = accept.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (allowed.length && !(allowed.includes("*/*"))) {
      for (const f of selected) {
        const ext = "." + f.name.split(".").pop().toLowerCase();
        const ok = allowed.some(a => a === ext || a === f.type);
        if (!ok) {
          alert(`File not supported: ${f.name}. Allowed: ${accept}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (validateFiles(selected)) setFiles(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = Array.from(e.dataTransfer.files || []);
    if (!selected.length) return;
    if (validateFiles(selected)) setFiles(selected);
    setDragOver(false);
  };

  const handleUpload = () => {
    if (!files || !files.length) return alert("Please select a file first.");

    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    if (multiple) {
      files.forEach(f => fd.append("files", f));
    } else {
      fd.append("file", files[0]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onloadstart = () => setUploading(true);

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          onResult(result);

          if (onData) onData(result.data || []);
          if (onColumns) onColumns(result.columns || []);
          if (onTypes) onTypes(result.types || {});
          if (onSummary) onSummary(result.summary || {});
          if (onChartTitle) onChartTitle(result.chart_title || "");
          if (onXAxis) onXAxis(result.x_axis || "");
          if (onYAxis) onYAxis(result.y_axis || "");

          setDownloadUrl(result.download_url || "");

          // clear file input
          setFiles([]);
          if (inputRef.current) inputRef.current.value = "";

          alert(result.filename ? `Uploaded: ${result.filename}` : "Upload successful");
        } catch {
          alert("Upload succeeded but response was not JSON.");
        }
      } else {
        let msg = `Upload failed (status ${xhr.status})`;
        try {
          const r = JSON.parse(xhr.responseText);
          if (r && (r.detail || r.error || r.message)) msg = r.detail || r.error || r.message;
        } catch {}
        alert(msg);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Upload failed due to network/CORS error");
    };

    xhr.send(fd);
  };

  const confirmExport = () => {
    setError("");
    if (!downloadUrl) {
      setError("No processed file available yet.");
      return;
    }
    // for now every option just opens the processed file link.
    window.open(downloadUrl, "_blank");
  };

  const dragStyle = dragOver
    ? { borderColor: "#FACC15", backgroundColor: "rgba(250, 204, 21, 0.03)", boxShadow: "0 0 0 6px rgba(250,204,21,0.05)" }
    : {};

  const renderFileCard = (f, i) => {
    const name = f.name || f.filename || `File-${i + 1}`;
    const sizeKB = f.size ? `${Math.round(f.size / 1024)} KB` : "";
    return (
      <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-black/30 flex flex-col items-start gap-2">
        <div className="font-medium text-sm truncate max-w-[200px]">{name}</div>
        <div className="text-xs text-gray-500">{sizeKB}</div>
        <div className="flex gap-2 mt-2">
          {f.download_url ? (
            <a href={f.download_url} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded text-xs">Download</a>
          ) : f instanceof File ? (
            <span className="px-2 py-1 border rounded text-xs">Local</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Drag & drop / choose */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-2xl p-6 text-center transition bg-white border dark:bg-ink/80 neon-border"
        style={dragStyle}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      >
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">Drag & drop your file here</p>
        <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">Accepted: {accept}</p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 transition dark:border-white/10 dark:text-slate-200 dark:hover:text-white shadow-neon hover:animate-glow"
          >
            Choose File
          </button>
          <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleFileSelect} className="hidden" />

          <div className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[220px]">
            {files.length > 0 ? <>Selected: <span className="text-neonYellow">{files.map(f => f.name || f.filename).join(", ")}</span></> : <span>No file chosen</span>}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPreviewView("grid")} className={`px-3 py-1 rounded ${previewView==="grid" ? "bg-gray-100" : ""}`}>Grid</button>
          <button onClick={() => setPreviewView("details")} className={`px-3 py-1 rounded ${previewView==="details" ? "bg-gray-100" : ""}`}>Details</button>
          <button onClick={() => setPreviewView("list")} className={`px-3 py-1 rounded ${previewView==="list" ? "bg-gray-100" : ""}`}>List</button>
        </div>
      </div>

      {/* Preview area */}
      <div className="mt-4">
        {files.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-slate-400 p-3">No files selected. Use drag & drop or choose a file to preview.</div>
        ) : previewView === "list" ? (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/30">
                <div className="flex-1">
                  <div className="font-medium">{f.name || f.filename}</div>
                  <div className="text-xs text-gray-500">{f.size ? `${Math.round(f.size/1024)} KB` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : previewView === "details" ? (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-black/30">
                <th className="px-3 py-2 text-left text-sm">Name</th>
                <th className="px-3 py-2 text-left text-sm">Size</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-black/20">
                  <td className="px-3 py-2 text-sm">{f.name || f.filename}</td>
                  <td className="px-3 py-2 text-sm">{f.size ? `${Math.round(f.size/1024)} KB` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((f, i) => renderFileCard(f, i))}
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="mt-4">
        <button onClick={handleUpload} disabled={uploading} className="w-full px-4 py-3 rounded-2xl bg-neonBlue text-white shadow-neon hover:animate-glow transition font-medium">
          {uploading ? `Uploading ${progress}%` : "Upload & Process"}
        </button>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shadow-inner">
            <div className="h-3 rounded-full bg-neonYellow animate-shimmer transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-700 dark:text-slate-300 font-mono">{progress}%</p>
        </div>
      )}

      {/* Floating export panel */}
      <div
        style={{
          position: "fixed",
          right: "20px",
          top: "35%",
          width: "220px",
          zIndex: 60,
        }}
      >
        <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
          <div className="text-sm font-medium mb-2">Export</div>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="w-full px-3 py-2 rounded border text-sm mb-2"
          >
            <option value="">Choose export</option>
            <option value="download">Download processed file</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={confirmExport}
            className="w-full px-3 py-2 rounded bg-neonBlue text-white text-sm"
          >
            Confirm
          </button>
          {error && (
            <div className="mt-2 text-xs text-red-500">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
