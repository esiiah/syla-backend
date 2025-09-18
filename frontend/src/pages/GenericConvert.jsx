import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

/**
 * Generic convert page - adapt by passing props in FileToolPage based on action.
 * Now uses FileToolUploadPanel for consistent upload UI.
 */
export default function GenericConvert({ endpoint, accept, label }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const file = files[0] || null;

  const doConvert = async () => {
    if (!file) return alert("Choose a file");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || "Convert failed");
      setDownloadUrl(json.download_url);
      window.open(json.download_url, "_blank"); // auto-open
    } catch (e) {
      alert(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">{label}</h2>

      <FileToolUploadPanel
        title={`Select ${label}`}
        accept={accept}
        multiple={false}
        files={files}
        setFiles={setFiles}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="text-center">
        <button
          disabled={loading || !file}
          onClick={doConvert}
          className="mt-4 px-5 py-2 bg-neonBlue text-white rounded-lg shadow"
        >
          {loading ? "Processing..." : "Convert"}
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="ml-4 underline text-neonBlue"
            target="_blank"
            rel="noreferrer"
          >
            Download result
          </a>
        )}
      </div>
    </div>
  );
}
