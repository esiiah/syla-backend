// frontend/src/pages/FileCompress.jsx
import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

export default function FileCompress({ initialFile = null, onDownloadReady = () => {} }) {
  const [files, setFiles] = useState(initialFile ? [initialFile] : []);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [panelVisible, setPanelVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState("medium");

  const file = files[0] || null;

  const handleUpload = async (level = "medium") => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    setLoading(true);
    setCompressionLevel(level);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("level", level);

      // Determine endpoint based on file type
      let endpoint = "/api/filetools/file/compress";
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "pdf") endpoint = "/api/filetools/pdf/compress";
      else if (["docx", "doc"].includes(ext)) endpoint = "/api/filetools/word/compress";
      else if (["xls", "xlsx", "csv"].includes(ext)) endpoint = "/api/filetools/excel/compress";

      const res = await fetch(endpoint, { method: "POST", body: fd });

      const contentType = res.headers.get("content-type") || "";

      // Handle error responses
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail || err.message || "Compression failed";
        alert(detail.startsWith("Compression failed") ? detail : "Compression failed: " + detail);
        setLoading(false);
        return;
      }

      // Handle binary PDF response
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        onDownloadReady(url);
        setLoading(false);
        return;
      }

      // Handle JSON response (fallback)
      const data = await res.json();
      setDownloadUrl(data.download_url || data.url || "");
      onDownloadReady(data.download_url || data.url || "");
      setLoading(false);

    } catch (e) {
      setLoading(false);
      alert("Compression failed: " + (e.message || e));
    }
  };

  const onAction = (action, payload) => {
    if (action === "process") handleUpload(compressionLevel);
    else if (action === "clear") {
      setFiles([]);
      setDownloadUrl("");
      setPanelVisible(false);
    } else if (action === "open") {
      console.log("Open", payload);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">File Compression</h2>

      <div>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
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
        {["light", "medium", "strong"].map((level) => (
          <button
            key={level}
            onClick={() => handleUpload(level)}
            className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {downloadUrl && (
        <div className="text-center">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 px-5 py-2 rounded bg-neonBlue text-white shadow hover:scale-105 transition-transform"
          >
            Download Compressed File
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
