// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";

/**
 * Full-featured FileUpload component
 *
 * Supports:
 * - Drag & drop + choose files
 * - Multiple files or single file
 * - Accept / extension validation
 * - Upload via XHR with progress bar
 * - Download link / export options after upload
 * - Stash file to another tool via token
 * - Dashboard callbacks (onData, onColumns, etc.)
 *
 * Props:
 *  - action: string (optional) -> POST endpoint `/api/filetools/${action}`
 *  - accept: string (optional) -> file types allowed, e.g., ".csv,.xlsx,.pdf"
 *  - multiple: boolean (optional)
 *  - maxFiles: number (optional)
 *  - onResult: callback(resultJSON)
 *  - onData, onColumns, onTypes, onSummary, onChartTitle, onXAxis, onYAxis
 *  - initialFiles: File | File[] (preloaded stashed files)
 */
export default function FileUpload({
  action = null,
  accept = "*/*",
  multiple = false,
  maxFiles = 1,
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
  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialFiles) setFiles(Array.isArray(initialFiles) ? initialFiles : [initialFiles]);
  }, [initialFiles]);

  const endpoint = action ? `/api/filetools/${action}` : "/api/upload";

  const validateFiles = (selected) => {
    if (!multiple && selected.length > 1) {
      alert("This tool only accepts a single file at a time.");
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
          if (onYAxis) onYAxis(result.y_axis || {});

          if (result.download_url) {
            setDownloadUrl(result.download_url);
            setShowExport(true);
          } else {
            setDownloadUrl("");
            setShowExport(false);
          }

          setFiles([]);
          if (inputRef.current) inputRef.current.value = "";

          alert(`Upload successful: ${result.filename || "file"}`);
        } catch (e) {
          alert("Upload succeeded but response was not JSON.");
        }
      } else {
        let msg = `Upload failed (status ${xhr.status})`;
        try {
          const r = JSON.parse(xhr.responseText);
          if (r && (r.detail || r.error || r.message)) msg = r.detail || r.error || r.message;
        } catch (e) {}
        alert(msg);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Upload failed due to network/CORS error");
    };

    xhr.send(fd);
  };

  const handleExportClick = () => {
    if (!files.length && !downloadUrl) return alert("No file to export.");
    setShowExport(true);
  };

  const confirmExport = async () => {
    if (!exportType) return alert("Choose a format first.");
    const routeMap = {
      csv: "csv-to-excel",
      xlsx: "csv-to-excel",
      excel: "csv-to-excel",
      pdf: "word-to-pdf",
      docx: "pdf-to-word",
      "pdf-to-csv": "pdf-to-csv",
    };
    const targetRoute = routeMap[exportType] || null;
    if (!targetRoute) {
      if (downloadUrl) window.open(downloadUrl, "_blank");
      setShowExport(false);
      return;
    }

    try {
      let blobToStash = null;
      let originalName = "file";

      if (files.length) {
        blobToStash = files[0];
        originalName = files[0].name;
      } else if (downloadUrl) {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error("Failed to fetch resource");
        const b = await res.blob();
        const cd = res.headers.get("content-disposition");
        if (cd) {
          const m = /filename="?([^"]+)"?/.exec(cd);
          if (m) originalName = m[1];
        }
        blobToStash = new File([b], originalName, { type: b.type });
      }

      const fd = new FormData();
      fd.append("file", blobToStash);

      const stashRes = await fetch("/api/filetools/stash", { method: "POST", body: fd });
      if (!stashRes.ok) throw new Error("Could not stash file");
      const stashJson = await stashRes.json();
      if (!stashJson.token) throw new Error("No token returned from stash");

      window.open(`/tools/${targetRoute}?token=${stashJson.token}`, "_blank");
      setShowExport(false);
    } catch (e) {
      alert("Export failed: " + (e.message || e));
      setShowExport(false);
    }
  };

  const copyShare = async () => {
    if (!downloadUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert("Copy failed");
    }
  };

  const dragStyle = dragOver
    ? { borderColor: "#FACC15", backgroundColor: "rgba(250, 204, 21, 0.03)", boxShadow: "0 0 0 6px rgba(250,204,21,0.05)" }
    : {};

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="space-y-4">
      {/* Drag & drop / choose */}
      <div
        className={`rounded-2xl p-6 text-center transition bg-white border dark:bg-ink/80 neon-border`}
        style={dragStyle}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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

          {files.length > 0 && (
            <span className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[180px]">
              Selected: <span className="text-neonYellow">{files.map(f => f.name).join(", ")}</span>
            </span>
          )}
        </div>

        {showExport && downloadUrl && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <a className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10" href={downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
            <button onClick={copyShare} className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10">{copied ? "Copied!" : "Copy link"}</button>
            <button onClick={() => setShowExport(false)} className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10">Close</button>
          </div>
        )}
      </div>

      {/* Export chooser */}
      {showExport && (
        <div className="rounded-lg p-4 border bg-gray-50 dark:bg-black/30">
          <label className="block text-sm font-medium mb-2">Choose export format</label>
          <div className="flex gap-2 items-center">
            <select className="px-3 py-2 rounded-lg border w-full" value={exportType} onChange={(e) => setExportType(e.target.value)}>
              <option value="">Select format</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (.docx)</option>
              <option value="pdf-to-csv">PDF → CSV (extract)</option>
            </select>
            <button onClick={confirmExport} className="px-4 py-2 rounded-lg bg-neonBlue text-white">Confirm</button>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button onClick={handleUpload} disabled={uploading} className="w-full px-4 py-3 rounded-2xl bg-neonBlue text-white shadow-neon hover:animate-glow transition font-medium">
        {uploading ? `Uploading ${progress}%` : "Upload & Process"}
      </button>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shadow-inner">
            <div className="h-3 rounded-full bg-neonYellow animate-shimmer transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-700 dark:text-slate-300 font-mono">{progress}%</p>
        </div>
      )}
    </div>
  );
}
