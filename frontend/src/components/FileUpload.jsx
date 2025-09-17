import React, { useState, useRef, useEffect } from "react";

/**
 * FileUpload (rewritten)
 *
 * - Drag & drop + choose files
 * - Multiple or single file support
 * - Accept validation
 * - Preview of selected/uploaded files in 3 views: grid / details / list (default: grid)
 * - Floating action panel (right side) with Convert button and export/download controls
 * - Reuses existing upload endpoint behavior (POST to /api/filetools/<action> or /api/upload)
 *
 * Props:
 *  - action: optional endpoint suffix
 *  - accept: accept string (".csv,.xlsx,.pdf", etc.)
 *  - multiple, maxFiles
 *  - callbacks: onResult, onData, onColumns, onTypes, onSummary, onChartTitle, onXAxis, onYAxis
 *  - initialFiles: optional preloaded File(s)
 */
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
  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState("");
  const [copied, setCopied] = useState(false);
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

          if (result.download_url) {
            setDownloadUrl(result.download_url);
            setShowExport(true);
          } else {
            setDownloadUrl("");
            setShowExport(false);
          }

          // keep a lightweight preview of the just-uploaded filename(s)
          setFiles([]);
          if (inputRef.current) inputRef.current.value = "";

          // non-intrusive message
          const msg = result.filename ? `Uploaded: ${result.filename}` : "Upload successful";
          // show small toast-like alert (simple alert here)
          alert(msg);
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

  const confirmExport = async () => {
    if (!exportType && !downloadUrl) return alert("Choose export format");
    // support direct download if downloadUrl present and no stash needed
    try {
      if (downloadUrl && (exportType === "" || exportType === "download")) {
        window.open(downloadUrl, "_blank");
        setShowExport(false);
        return;
      }

      // if user wants to export via stash route, reuse existing stash flow (keeps cross-tool behavior)
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

  // Render small preview row for file-like objects (File or {name,size,download_url})
  const renderFileCard = (f, i) => {
    const name = f.name || f.filename || `File-${i+1}`;
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
          {/* placeholder for future actions */}
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
        className={`rounded-2xl p-6 text-center transition bg-white border dark:bg-ink/80 neon-border`}
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

        {/* Minimal inline export widgets when server returned download link */}
        {showExport && downloadUrl && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <a className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10" href={downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
            <button onClick={copyShare} className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10">{copied ? "Copied!" : "Copy link"}</button>
            <button onClick={() => setShowExport(false)} className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10">Close</button>
          </div>
        )}
      </div>

      {/* Preview area (shows selected or uploaded files) */}
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
                <div className="flex gap-2">
                  {f.download_url ? (
                    <a href={f.download_url} className="px-3 py-1 rounded bg-white border text-sm">Download</a>
                  ) : (
                    <button onClick={() => { /* no-op local file */ }} className="px-3 py-1 rounded border text-sm">Info</button>
                  )}
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
                <th className="px-3 py-2 text-left text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-black/20">
                  <td className="px-3 py-2 text-sm">{f.name || f.filename}</td>
                  <td className="px-3 py-2 text-sm">{f.size ? `${Math.round(f.size/1024)} KB` : ""}</td>
                  <td className="px-3 py-2 text-sm">
                    {f.download_url ? <a href={f.download_url} target="_blank" rel="noreferrer">Download</a> : "Local"}
                  </td>
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

      {/* Floating action panel (right side) */}
      <div style={{
        position: "fixed",
        right: "20px",
        top: "35%",
        width: "220px",
        zIndex: 60,
      }}>
        <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
          <div className="text-sm font-medium mb-2">Actions</div>

          {/* Quick actions (Download/Copy) */}
          <div className="flex flex-col gap-2">
            {downloadUrl ? (
              <>
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded border text-sm text-center">Download Output</a>
                <button onClick={copyShare} className="px-3 py-2 rounded border text-sm">{copied ? "Copied!" : "Copy link"}</button>
              </>
            ) : (
              <div className="text-xs text-gray-500">No output yet</div>
            )}
          </div>

          <div className="mt-4">
            <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full px-3 py-2 rounded border text-sm mb-2">
              <option value="">Choose export</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (.docx)</option>
              <option value="pdf-to-csv">PDF → CSV (extract)</option>
            </select>

            <button onClick={confirmExport} className="w-full px-3 py-2 rounded bg-neonBlue text-white text-sm">
              Confirm / Convert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
