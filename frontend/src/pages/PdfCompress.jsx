// frontend/src/pages/PdfCompress.jsx
import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

export default function PdfCompress({ initialFile = null, onDownloadReady = () => {} }) {
  const [files, setFiles] = useState(initialFile ? [initialFile] : []);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [panelVisible, setPanelVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const file = files[0] || null;

  const handleUpload = async (level = "medium") => {
    if (!file) {
      alert("Please select a PDF first.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("level", level);

    try {
      const res = await fetch("/api/filetools/pdf/compress", { method: "POST", body: fd });
      if (!res.ok) {
        // Try to parse a JSON error; fallback to generic message
        const err = await res.json().catch(() => ({}));
        const detail = err.detail || err.message || "Compress failed";
        alert(detail.startsWith("Compress failed") ? detail : "Compress failed: " + detail);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDownloadUrl(data.download_url || data.url || "");
      onDownloadReady(data.download_url || data.url || "");
      setLoading(false);
    } catch (e) {
      setLoading(false);
      alert("Compress failed: " + (e.message || e));
    }
  };

  const onAction = (action, payload) => {
    if (action === "process") {
      handleUpload("medium");
    } else if (action === "clear") {
      setFiles([]);
      setDownloadUrl("");
      setPanelVisible(false);
    } else if (action === "open") {
      // placeholder
      console.log("Open", payload);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">PDF Compression</h2>

      <div>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) {
              setFiles([f]);
              setPanelVisible(true);
            }
          }}
        />
      </div>

      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => handleUpload("light")} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" disabled={loading}>
          Light
        </button>
        <button onClick={() => handleUpload("medium")} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" disabled={loading}>
          Medium
        </button>
        <button onClick={() => handleUpload("strong")} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" disabled={loading}>
          Strong
        </button>
      </div>

      {downloadUrl && (
        <div className="text-center">
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-block mt-4 px-5 py-2 rounded bg-neonBlue text-white shadow">
            Download compressed PDF
          </a>
        </div>
      )}

      <FileToolUploadPanel
        visible={panelVisible}
        files={files}
        setFiles={setFiles}
        onClose={() => setPanelVisible(false)}
        onRemoveFile={(i) => {
          const next = [...files];
          next.splice(i, 1);
          setFiles(next);
          if (next.length === 0) setPanelVisible(false);
        }}
        onAction={onAction}
        navbarOffset={72}
      />
    </div>
  );
}
