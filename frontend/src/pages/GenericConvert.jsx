// frontend/src/pages/GenericConvert.jsx
import React, { useState } from "react";

/**
 * Generic convert page - adapt by passing props in FileToolPage based on action.
 * But this file acts as a generic handler: choose file, call endpoint, show download link.
 */
export default function GenericConvert({ endpoint, accept, label }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDownloadUrl("");
  };

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
      // open automatically
      window.open(json.download_url, "_blank");
    } catch (e) {
      alert(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">{label}</h2>

      <div className="p-6 border rounded bg-white">
        <div className="mb-3">
          <input type="file" accept={accept} onChange={onChange} />
        </div>
        <div>
          <button disabled={loading} onClick={doConvert} className="px-4 py-2 bg-neonBlue text-white rounded">
            {loading ? "Processing..." : "Convert"}
          </button>
          {downloadUrl && <a href={downloadUrl} className="ml-3 underline" target="_blank" rel="noreferrer">Download result</a>}
        </div>
      </div>
    </div>
  );
}
