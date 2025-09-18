// frontend/src/pages/GenericConvert.jsx
import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

export default function GenericConvert({ endpoint, accept, label, initialFile = null, onDownloadReady = () => {} }) {
  const [files, setFiles] = useState(initialFile ? [initialFile] : []);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [error, setError] = useState("");

  const file = files[0] || null;

  const doConvert = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.detail || json.error || "Convert failed");
      
      setDownloadUrl(json.download_url);
      onDownloadReady(json.download_url);
      window.open(json.download_url, "_blank"); // auto-open
    } catch (e) {
      setError(e.message || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-2">{label}</h2>
        <p className="text-gray-600 dark:text-slate-400">Upload your file and convert it instantly</p>
      </div>

      <FileToolUploadPanel
        title={`Select file for ${label}`}
        accept={accept}
        multiple={false}
        files={files}
        setFiles={setFiles}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {error && (
        <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Hidden upload button - handled by floating panel */}
      <div className="hidden">
        <button
          disabled={loading || !file}
          onClick={doConvert}
          className="w-full px-6 py-3 bg-neonBlue text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Convert"}
        </button>
      </div>
    </div>
  );
}
