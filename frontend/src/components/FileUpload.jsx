// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";

/**
 * FileUpload component (full version)
 *
 * Props:
 *  - action (string) : if present, the component will POST to /api/filetools/{action}
 *                      e.g. action="compress" or "pdf-to-excel". If not present, uses /api/upload.
 *  - initialFile (File|null) : a File object provided when user arrived with a token (auto preloaded)
 *
 * Behavior:
 *  - Drag/drop + choose file UI
 *  - Upload progress (XHR)
 *  - After upload, shows download link (if returned) and export options
 *  - Export to another format will stash the file (POST /api/filetools/stash) and open the
 *    target tool page in a new tab with ?token=abc123 so the new page can pre-load it.
 */

function FileUpload({
  onData,
  onColumns,
  onTypes,
  onSummary,
  onChartTitle,
  onXAxis,
  onYAxis,
  action = null, // if provided, POSTs to `/api/filetools/${action}`
  initialFile = null,
}) {
  const [file, setFile] = useState(initialFile);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Accept list - keep generous but front-end only; backend still controls allowed actions.
  const ACCEPT = ".csv,.tsv,.xls,.xlsx,.pdf,.doc,.docx,.txt,.pptx,.zip,.json";

  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
    }
  }, [initialFile]);

  const endpoint = action ? `/api/filetools/${action}` : "/api/upload";

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

    // If convert endpoint requires extra form fields like 'target', UI should add them.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

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
          // optional structured data that dashboard may expect
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

          // Clear file input to allow re-upload same file if needed
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";

          alert(`Upload successful: ${result.filename || "file"} (${result.rows || "-" } rows)`);
        } catch (e) {
          alert("Upload succeeded but response was not JSON.");
        }
      } else {
        // Try to parse server error message
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

    xhr.send(formData);
  };

  // When user picks another export format while a downloaded resource exists
  const handleExportClick = () => {
    if (!file && !downloadUrl) return alert("No file to export.");

    setShowExport(true);
  };

  const confirmExport = async () => {
    // Map export choices to tool routes (adjust to your routes)
    const routeMap = {
      csv: "csv-to-excel",
      xlsx: "csv-to-excel",
      excel: "csv-to-excel",
      pdf: "word-to-pdf",
      docx: "pdf-to-word",
      "pdf-to-csv": "pdf-to-csv",
    };

    // If user selected an export type and it maps to a different tool, stash and open
    if (!exportType) {
      alert("Choose a format first.");
      return;
    }

    // Decide the target tool route based on selection
    let targetRoute = routeMap[exportType] || null;

    // If no mapping, default to the action's page or show link to download
    if (!targetRoute) {
      // If same action or no special route, fallback to direct download if available
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        setShowExport(false);
        return;
      } else {
        alert("No export available for this choice.");
        setShowExport(false);
        return;
      }
    }

    // If we have a 'file' object (unsent/just-chosen) stash it; otherwise if we have downloadUrl,
    // we might need to fetch the file from server and then stash it so the other tool can use it.
    try {
      // prefer existing File object if available
      let blobToStash = null;
      let originalName = "file";

      if (file) {
        blobToStash = file;
        originalName = file.name || originalName;
      } else if (downloadUrl) {
        // fetch the resource from the server as blob
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error("Failed to fetch resource to export");
        const b = await res.blob();
        const contentDisposition = res.headers.get("content-disposition");
        // try to derive filename
        if (contentDisposition) {
          const m = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (m) originalName = m[1];
        }
        blobToStash = new File([b], originalName, { type: b.type });
      } else {
        alert("No file available to stash for export.");
        setShowExport(false);
        return;
      }

      // Stash the file
      const fd = new FormData();
      fd.append("file", blobToStash);

      const stashRes = await fetch("/api/filetools/stash", {
        method: "POST",
        body: fd,
      });

      if (!stashRes.ok) {
        const j = await stashRes.json().catch(() => ({}));
        throw new Error(j.detail || j.error || "Could not stash file");
      }

      const stashJson = await stashRes.json();
      if (!stashJson.token) throw new Error("No token returned from stash");

      // open the relevant tool page in a new tab with the token
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
      const full = window.location.origin + downloadUrl;
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      alert("Copy failed");
    }
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
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
      >
        <p className="mb-2 font-medium text-gray-700 dark:text-slate-300">
          Drag & drop your file here
        </p>
        <p className="text-xs mb-4 text-gray-500 dark:text-slate-400">
          CSV / Excel / PDF / DOCX / TXT / PPTX etc.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 transition dark:border-white/10 dark:text-slate-200 dark:hover:text-white shadow-neon hover:animate-glow"
          >
            Choose File
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />

          {file && (
            <span className="text-xs text-gray-700 dark:text-slate-300 truncate max-w-[180px]">
              Selected: <span className="text-neonYellow">{file.name}</span>
            </span>
          )}
        </div>

        {/* Optional Export / Share display after upload */}
        {showExport && downloadUrl && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <a
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10"
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button
              onClick={copyShare}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() => setShowExport(false)}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 dark:border-white/10"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Export chooser (shown after upload or manual open) */}
      {showExport && (
        <div className="rounded-lg p-4 border bg-gray-50 dark:bg-black/30">
          <label className="block text-sm font-medium mb-2">Choose export format</label>
          <div className="flex gap-2 items-center">
            <select
              className="px-3 py-2 rounded-lg border w-full"
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
            >
              <option value="">Select format</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (.docx)</option>
              <option value="pdf-to-csv">PDF → CSV (extract)</option>
            </select>

            <button
              onClick={confirmExport}
              className="px-4 py-2 rounded-lg bg-neonBlue text-white"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

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
