import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

export default function PdfCompress({ initialFile = null, onDownloadReady = () => {} }) {
  const [files, setFiles] = useState(initialFile ? [initialFile] : []);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const file = files[0] || null;

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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">PDF Compression</h2>

      <FileToolUploadPanel
        title="Select PDF"
        accept=".pdf"
        multiple={false}
        files={files}
        setFiles={setFiles}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="flex gap-3 justify-center mt-4">
        <button
          onClick={() => handleUpload("light")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          Light
        </button>
        <button
          onClick={() => handleUpload("medium")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          Medium
        </button>
        <button
          onClick={() => handleUpload("strong")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          Strong
        </button>
      </div>

      {downloadUrl && (
        <div className="text-center">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 px-5 py-2 rounded bg-neonBlue text-white shadow"
          >
            Download compressed PDF
          </a>
        </div>
      )}
    </div>
  );
}
