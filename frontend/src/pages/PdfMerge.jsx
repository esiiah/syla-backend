// frontend/src/pages/PdfMerge.jsx
import React, { useState } from "react";

export default function PdfMerge() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onFiles = (e) => {
    const f = Array.from(e.target.files || []);
    if (f.length > 15) return alert("Max 15 files");
    for (const file of f) {
      if (!file.name.toLowerCase().endsWith(".pdf")) return alert("Only PDF files allowed");
    }
    setFiles(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files || []);
    if (f.length > 15) return alert("Max 15 files");
    for (const file of f) {
      if (!file.name.toLowerCase().endsWith(".pdf")) return alert("Only PDF files allowed");
    }
    setFiles(f);
  };

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
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Merge PDFs (max 15)</h2>

      <div onDrop={onDrop} onDragOver={(e)=>e.preventDefault()} className="p-6 border rounded mb-4 bg-white">
        <input type="file" id="pdfs" accept=".pdf" multiple onChange={onFiles} className="hidden" />
        <div className="flex items-center gap-3">
          <label htmlFor="pdfs" className="px-4 py-2 bg-neonBlue text-white rounded cursor-pointer">Select PDFs</label>
          <div>{files.length ? `${files.length} files selected` : "No files selected"}</div>
        </div>

        <div className="mt-3">
          <ul className="list-disc pl-5">
            {files.map((f,i)=> <li key={i}>{f.name} — {(f.size/1024).toFixed(1)} KB</li>)}
          </ul>
        </div>

        <div className="mt-4">
          <button onClick={merge} disabled={loading || files.length===0} className="px-4 py-2 bg-neonBlue text-white rounded">
            {loading ? "Merging..." : "Merge PDFs"}
          </button>
        </div>

        {message && <div className="mt-3 text-sm text-green-600">{message}</div>}
      </div>
    </div>
  );
}
