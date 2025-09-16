// frontend/src/pages/PdfCompress.jsx
import React, { useState, useRef } from "react";

function humanReadableSize(n) {
  if (!n && n !== 0) return "-";
  let num = Number(n);
  const units = ["B", "KB", "MB", "GB"];
  let u = 0;
  while (num >= 1024 && u < units.length - 1) {
    num /= 1024;
    u++;
  }
  return `${num.toFixed(1)} ${units[u]}`;
}

export default function PdfCompress() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // {light:{size_bytes, size_readable}, ...}
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("medium");
  const [compressing, setCompressing] = useState(false);
  const [downloadBlobUrl, setDownloadBlobUrl] = useState("");
  const inputRef = useRef(null);

  const handleFile = (f) => {
    setFile(f);
    setPreview(null);
    setDownloadBlobUrl("");
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const runPreview = async () => {
    if (!file) return alert("Choose a PDF first");
    setLoadingPreview(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/filetools/pdf/compress-preview", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || "Preview failed");
      }
      const json = await res.json();
      setPreview(json.results || null);
    } catch (e) {
      alert("Preview failed: " + (e.message || e));
    } finally {
      setLoadingPreview(false);
    }
  };

  const runCompress = async () => {
    if (!file) return alert("Choose a PDF first");
    setCompressing(true);
    setDownloadBlobUrl("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("level", selectedLevel);
      const res = await fetch("/api/filetools/pdf/compress", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || "Compression failed");
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      // create download URL
      const url = window.URL.createObjectURL(blob);
      setDownloadBlobUrl(url);
      // optionally auto-download:
      const a = document.createElement("a");
      const filename = (contentDisposition && /filename="?([^"]+)"?/.exec(contentDisposition)) ? RegExp.$1 : `compressed_${selectedLevel}.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Compression failed: " + (e.message || e));
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">PDF Compression</h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="p-6 rounded-xl border bg-white dark:bg-ink/80"
      >
        <div className="mb-4">
          <input ref={inputRef} type="file" accept=".pdf" onChange={onFileChange} className="hidden" />
          <div className="flex items-center gap-3">
            <button onClick={() => inputRef.current?.click()} className="px-4 py-2 rounded bg-neonBlue text-white">Choose PDF</button>
            {file && <div className="text-sm">Selected: <strong>{file.name}</strong> — {humanReadableSize(file.size)}</div>}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={runPreview} disabled={!file || loadingPreview} className="px-3 py-2 rounded border">
            {loadingPreview ? "Previewing..." : "Preview compression"}
          </button>

          <button onClick={() => { setSelectedLevel("strong"); runCompress(); }} disabled={!file || compressing} className="px-3 py-2 rounded bg-gray-100">
            Quick Strong Compress
          </button>
        </div>

        {preview && (
          <div className="mt-4 p-3 border rounded">
            <h4 className="font-medium">Estimated compressed sizes</h4>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {["light","medium","strong"].map((lvl) => {
                const r = preview[lvl];
                return (
                  <div key={lvl} className="p-2 border rounded">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="level" value={lvl} checked={selectedLevel===lvl} onChange={() => setSelectedLevel(lvl)} />
                      <span className="capitalize">{lvl}</span>
                    </label>
                    <div className="text-sm mt-1">
                      {r && r.size_bytes ? (
                        <>
                          <div>{humanReadableSize(r.size_bytes)}</div>
                          <div className="text-xs text-gray-500">
                            Reduction: {file ? Math.round((1 - (r.size_bytes / file.size || 1)) * 100) : "-"}%
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-red-500">Preview not available</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4">
          <button onClick={runCompress} disabled={!file || compressing} className="px-4 py-2 rounded bg-neonBlue text-white">
            {compressing ? "Compressing..." : "Compress PDF"}
          </button>

          {downloadBlobUrl && (
            <a href={downloadBlobUrl} download className="ml-3 px-3 py-2 border rounded">Download</a>
          )}
        </div>
      </div>
    </div>
  );
}
