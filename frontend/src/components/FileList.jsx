import React, { useState } from "react";
import { List, LayoutGrid, Table, File } from "lucide-react";

export default function FileList() {
  const [view, setView] = useState("list");
  const [files, setFiles] = useState([]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg">Uploaded Files</h2>
        <div className="flex gap-2">
          <button onClick={() => setView("list")}><List size={18} /></button>
          <button onClick={() => setView("details")}><Table size={18} /></button>
          <button onClick={() => setView("grid")}><LayoutGrid size={18} /></button>
        </div>
      </div>

      {/* Render depending on view */}
      <div>
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No files uploaded yet.</p>
        ) : view === "list" ? (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/30">
                <File size={18} /> {f.name}
              </li>
            ))}
          </ul>
        ) : view === "details" ? (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-black/30">
                <th className="px-3 py-2 text-left text-sm">Name</th>
                <th className="px-3 py-2 text-left text-sm">Size</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-black/20">
                  <td className="px-3 py-2 text-sm">{f.name}</td>
                  <td className="px-3 py-2 text-sm">{f.size} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((f, i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-gray-50 dark:bg-black/30">
                <File size={32} className="mb-2" />
                <span className="text-xs">{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
