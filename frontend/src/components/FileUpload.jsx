// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import ExportPanel from "./ExportPanel";
import UploadPanel from "./UploadPanel";

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
    // cleanup object URLs on unmount
    return () => {
      (files || []).forEach(f => {
        if (f && f.__previewUrl) URL.revokeObjectURL(f.__previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (validateFiles(selected)) {
      // attach preview URLs for images/pdf first page (browser support may vary)
      const withPreview = selected.map(f => {
        try {
          const copy = f;
          copy.__previewUrl = URL.createObjectURL(f);
          return copy;
        } catch { return f; }
      });
      setFiles(withPreview);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = Array.from(e.dataTransfer.files || []);
    if (!selected.length) return;
    if (validateFiles(selected)) {
      const withPreview = selected.map(f => {
        try {
          const copy = f;
          copy.__previewUrl = URL.createObjectURL(f);
          return copy;
        } catch { return f; }
      });
      setFiles(withPreview);
    }
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
    window.open(downloadUrl, "_blank");
  };

  // file card renderer — grid: thumbnail framed with filename below
  const renderFileCard = (f, i) => {
    const name = f.name || f.filename || `File-${i + 1}`;
    const sizeKB = f.size ? `${Math.round(f.size / 1024)} KB` : "";
    const thumbnail = f.__previewUrl || f.thumbnail_url || f.preview_url || null;

    return (
      <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-black/30 flex flex-col items-center gap-2">
        <div className="w-full bg-white border rounded-md overflow-hidden flex items-center justify-center" style={{ height: 120 }}>
          {thumbnail ? (
            // object-fit to keep aspect, framed with outline
            <img src={thumbnail} alt={name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
          ) : (
            <div className="text-xs text-gray-500">{name.split(".").pop().toUpperCase()}</div>
          )}
        </div>
        <div className="mt-2 text-sm font-medium truncate w-full text-center">{name}</div>
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

  // Chart export handlers (ExportPanel chart mode uses these if included)
  const handleExportImage = (format) => {
    // If parent chart component exposes handlers, it should pass them to ExportPanel directly.
    // For this FileUpload component we only support default "open the processed download" behavior
    if (!downloadUrl) {
      alert("No chart/image available to export.");
      return;
    }
    // If downloadUrl points to an image of requested type, open it; otherwise backend must support format.
    window.open(downloadUrl, "_blank");
  };
  const handleExportCSV = () => {
    // if server returned CSV result or data is present, open or create CSV.
    if (!downloadUrl) return alert("No processed CSV available.");
    window.open(downloadUrl, "_blank");
  };
  const handleExportJSON = () => {
    if (!downloadUrl) return alert("No processed JSON available.");
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="relative">
      <UploadPanel
        title="Upload Data"
        hint="CSV / Excel only. Preview & progress included."
        accept={accept}
        multiple={multiple}
        files={files}
        setFiles={(arr) => {
          // attach preview URLs
          const withPreview = arr.map(f => {
            try {
              const copy = f;
              if (!copy.__previewUrl && f instanceof File) copy.__previewUrl = URL.createObjectURL(f);
              return copy;
            } catch { return f; }
          });
          setFiles(withPreview);
        }}
        onDrop={(e, selected) => {
          // validate then set
          const ok = validateFiles(selected) && selected.length;
          if (!ok) return;
          const withPreview = selected.map(f => {
            try { f.__previewUrl = URL.createObjectURL(f); } catch {}
            return f;
          });
          setFiles(withPreview);
        }}
        viewMode={previewView}
        setViewMode={setPreviewView}
        onUploadClick={handleUpload}
        primaryLabel={uploading ? `Uploading ${progress}%` : "Upload & Process"}
      />

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

      {/* Progress / status */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shadow-inner">
            <div className="h-3 rounded-full bg-neonYellow animate-shimmer transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-700 dark:text-slate-300 font-mono">{progress}%</p>
        </div>
      )}

      {/* ExportPanel used in filetool mode */}
      <ExportPanel
        mode="filetool"
        actionLabel={action ? (action.includes("merge") ? "Merge" : action.includes("compress") ? "Compress" : "Convert") : "Process"}
        onPrimaryAction={handleUpload}
        downloadUrl={downloadUrl}
        onDownload={() => {
          if (!downloadUrl) return alert("No result available yet");
          window.open(downloadUrl, "_blank");
        }}
        error={error}
      />
    </div>
  );
}
