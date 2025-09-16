// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";

/**
 * Full FileToolPage:
 * - Renders Sidebar + simple nav bar so tools open inside full app
 * - Loads a stashed file when ?token=... present and forwards it to FileUpload as initialFile
 */

export default function FileToolPage() {
  const { action } = useParams(); // e.g., "compress", "pdf-to-excel"
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState("light");
  const [stashedFile, setStashedFile] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    // fetch stashed file blob from backend and convert to File so FileUpload can use it
    fetch(`/api/filetools/retrieve/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Token not found");
        return res.blob();
      })
      .then((blob) => {
        // derive filename from blob type or fallback
        // We don't have original filename easily from response headers in many setups,
        // so name it "stashed_file" (FileUpload will show it and the user can confirm).
        const f = new File([blob], "stashed_file", { type: blob.type || "application/octet-stream" });
        setStashedFile(f);
      })
      .catch((err) => {
        console.warn("Failed to retrieve stashed file:", err);
      });
  }, [searchParams]);

  const formattedAction = action
    ? action.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Tool";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} />
      <div className="flex-1 flex flex-col">
        {/* Simple top nav matching app header style */}
        <nav className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="logo" className="w-6 h-6" />
              <div className="font-semibold">{formattedAction} Tool</div>
            </div>
            <div className="text-sm text-gray-500">File tools</div>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload panel */}
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
            <FileUpload action={action} initialFile={stashedFile} />
          </section>

          {/* List of uploaded files */}
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
            <FileList />
          </section>

          {/* Footer / help */}
          <section className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            <p>
              Uploaded files for <span className="font-medium">{formattedAction}</span> are listed above.
              You can remove or process them as needed. Files stashed for cross-tool export are valid for a short time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
