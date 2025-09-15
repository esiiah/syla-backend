// frontend/src/components/FileList.jsx
import React, { useState, useEffect } from "react";

export default function FileList() {
  const [view, setView] = useState("list");
  const [files, setFiles] = useState([]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/filetools/list");
      const json = await res.json();
      setFiles(json.files || []);
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/filetools/delete/${name}`, { method: "DELETE" });
      if (res.ok) fetchFiles();
      else {
        const j = await res.json();
        alert(j.detail || "Delete failed");
      }
    } catch (e) {
      alert("Delete failed");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg">Uploaded Files</h2>
        <div className="flex gap-2">
          <button onClick={() => setView("list")} className="px-2 py-1 rounded">List</button>
          <button onClick={() => setView("details")} className="px-2 py-1 rounded">Details</button>
          <button onClick={() => setView("grid")} className="px-2 py-1 rounded">Grid</button>
        </div>
      </div>

      <div>
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No files uploaded yet.</p>
        ) : view === "list" ? (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/30">
                <div className="flex-1">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-gray-500">{Math.round((f.size || 0)/1024)} KB</div>
                </div>
                <div className="flex gap-2">
                  <a href={f.download_url} className="px-3 py-1 rounded bg-white border" target="_blank" rel="noopener noreferrer">Download</a>
                  <button onClick={() => handleDelete(f.name)} className="px-3 py-1 rounded border">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        ) : view === "details" ? (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-black/30">
                <th className="px-3 py-2 text-left text-sm">Name</th>
                <th className="px-3 py-2 text-left text-sm">Size</th>
                <th className="px-3 py-2 text-left text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-black/20">
                  <td className="px-3 py-2 text-sm">{f.name}</td>
                  <td className="px-3 py-2 text-sm">{Math.round((f.size||0)/1024)} KB</td>
                  <td className="px-3 py-2 text-sm
