import React, { useState } from "react";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";

export default function PdfMerge() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const merge = async () => {
    if (!files.length) return alert("Choose PDFs to merge");
    setLoading(true);
    setMessage("");
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/filetools/pdf/merge", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || "Merge failed");
      setMessage(`Merged! Download: ${json.download_url}`);
      window.open(json.download_url, "_blank");
      setFiles([]);
    } catch (e) {
      alert(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Merge PDFs (max 15)</h2>

      <FileToolUploadPanel
        title="Select PDFs"
        accept=".pdf"
        multiple={true}
        files={files}
        setFiles={setFiles}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="text-center">
        <button
          onClick={merge}
          disabled={loading || files.length === 0}
          className="mt-4 px-5 py-2 bg-neonBlue text-white rounded-lg shadow"
        >
          {loading ? "Merging..." : "Merge PDFs"}
        </button>
      </div>

      {message && (
        <div className="mt-3 text-sm text-green-600 text-center">{message}</div>
      )}
    </div>
  );
}
