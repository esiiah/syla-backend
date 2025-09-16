// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import PdfMerge from "./PdfMerge";
import GenericConvert from "./GenericConvert";

export default function FileToolPage() {
  const { action } = useParams(); 
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState("light");
  const [stashedFile, setStashedFile] = useState(null);

  // Retrieve stashed file if token present
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    fetch(`/api/filetools/retrieve/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Token not found");
        return res.blob();
      })
      .then((blob) => {
        const f = new File([blob], "stashed_file", { type: blob.type || "application/octet-stream" });
        setStashedFile(f);
      })
      .catch((err) => console.warn("Failed to retrieve stashed file:", err));
  }, [searchParams]);

  // Map action -> which component to render
  const mapping = {
    "compress": { component: "compress" },
    "merge": { component: "merge" },
    "pdf-to-excel": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-excel", accept: ".pdf", label: "PDF → Excel" },
    "excel-to-pdf": { component: "convert", endpoint: "/api/filetools/convert/excel-to-pdf", accept: ".xls,.xlsx", label: "Excel → PDF" },
    "csv-to-excel": { component: "convert", endpoint: "/api/filetools/convert/csv-to-excel", accept: ".csv", label: "CSV → Excel" },
    "excel-to-csv": { component: "convert", endpoint: "/api/filetools/convert/excel-to-csv", accept: ".xls,.xlsx", label: "Excel → CSV" },
    "pdf-to-csv": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-csv", accept: ".pdf", label: "PDF → CSV (table extraction)" },
    "csv-to-pdf": { component: "convert", endpoint: "/api/filetools/convert/csv-to-pdf", accept: ".csv", label: "CSV → PDF" },
    "word-to-pdf": { component: "convert", endpoint: "/api/filetools/convert/word-to-pdf", accept: ".doc,.docx", label: "Word → PDF" },
    "pdf-to-word": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-word", accept: ".pdf", label: "PDF → Word" },
  };

  const config = mapping[action] || null;
  const formattedAction = action ? action.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Tool";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} />
      <div className="flex-1 flex flex-col">
        {/* Top nav */}
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
          {/* Render tool-specific component if mapped */}
          {config ? (
            config.component === "compress" ? (
              <PdfCompress initialFile={stashedFile} />
            ) : config.component === "merge" ? (
              <PdfMerge />
            ) : (
              <GenericConvert
                endpoint={config.endpoint}
                accept={config.accept}
                label={config.label}
                initialFile={stashedFile}
              />
            )
          ) : (
            <>
              {/* Default upload + file list UI if action unknown */}
              <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
                <FileUpload action={action} initialFile={stashedFile} />
              </section>

              <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
                <FileList />
              </section>

              <section className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                <p>
                  Uploaded files for <span className="font-medium">{formattedAction}</span> are listed above.
                  You can remove or process them as needed. Files stashed for cross-tool export are valid for a short time.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
