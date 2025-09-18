// frontend/src/pages/PdfCompress.jsx
import React, { useState } from "react";

export default function PdfCompress({ initialFile = null, onDownloadReady = () => {} }) {
  const [file, setFile] = useState(initialFile);
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleUpload = async (level = "medium") => {
    if (!file) {
      alert("Please select a PDF first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("level", level);

    const res = await fetch("/api/filetools/pdf/compress", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Compression failed");
      return;
    }
    const data = await res.json();
    setDownloadUrl(data.download_url);
    onDownloadReady(data.download_url);
  };

  return (
    <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
      <h2 className="font-semibold text-lg mb-3">PDF Compression</h2>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-3"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleUpload("light")}
          className="px-3 py-2 rounded bg-gray-200"
        >
          Light
        </button>
        <button
          onClick={() => handleUpload("medium")}
          className="px-3 py-2 rounded bg-gray-200"
        >
          Medium
        </button>
        <button
          onClick={() => handleUpload("strong")}
          className="px-3 py-2 rounded bg-gray-200"
        >
          Strong
        </button>
      </div>

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded bg-neonBlue text-white"
        >
          Download compressed PDF
        </a>
      )}
    </section>
  );
}
