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

  // floating-panel export state
  const [exportType, setExportType] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");

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

  const mapping = {
    "compress": { component: "compress" },
    "merge": { component: "merge" },
    "pdf-to-word": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-word", accept: ".pdf", label: "PDF → Word" },
    "pdf-to-excel": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-excel", accept: ".pdf", label: "PDF → Excel" },
    "excel-to-pdf": { component: "convert", endpoint: "/api/filetools/convert/excel-to-pdf", accept: ".xls,.xlsx", label: "Excel → PDF" },
    "csv-to-excel": { component: "convert", endpoint: "/api/filetools/convert/csv-to-excel", accept: ".csv", label: "CSV → Excel" },
    "excel-to-csv": { component: "convert", endpoint: "/api/filetools/convert/excel-to-csv", accept: ".xls,.xlsx", label: "Excel → CSV" },
    "pdf-to-csv": { component: "convert", endpoint: "/api/filetools/convert/pdf-to-csv", accept: ".pdf", label: "PDF → CSV (table extraction)" },
    "csv-to-pdf": { component: "convert", endpoint: "/api/filetools/convert/csv-to-pdf", accept: ".csv", label: "CSV → PDF" },
  };

  const config = mapping[action] || null;
  const formattedAction = action ? action.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Tool";

  // called by child when conversion completes and backend gives a download link
  const handleDownloadReady = (url) => {
    setDownloadUrl(url || "");
  };

  const confirmExport = () => {
    setError("");
    if (!downloadUrl) {
      setError("No processed file available yet.");
      return;
    }
    // for now all options (PNG, JPEG, JSON, CSV, Download) just open same link,
    // you can extend with format-specific logic if backend supports it.
    window.open(downloadUrl, "_blank");
  };

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
          {config ? (
            config.component === "compress" ? (
              <PdfCompress initialFile={stashedFile} onDownloadReady={handleDownloadReady} />
            ) : config.component === "merge" ? (
              <PdfMerge onDownloadReady={handleDownloadReady} />
            ) : (
              <GenericConvert
                endpoint={config.endpoint}
                accept={config.accept}
                label={config.label}
                initialFile={stashedFile}
                onDownloadReady={handleDownloadReady}
              />
            )
          ) : (
            <>
              <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
                <FileUpload action={action} initialFile={stashedFile} />
              </section>

              <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
                <FileList />
              </section>

              <section className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                <p>
                  Uploaded files for <span className="font-medium">{formattedAction}</span> are listed above.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Floating export panel */}
        <div
          style={{
            position: "fixed",
            right: "20px",
            top: "35%",
            width: "220px",
            zIndex: 60,
          }}
        >
          <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm dark:bg-black/60 dark:border-white/10">
            <div className="text-sm font-medium mb-2">Export</div>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full px-3 py-2 rounded border text-sm mb-2"
            >
              <option value="">Choose export</option>
              <option value="download">Download processed file</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <button
              onClick={confirmExport}
              className="w-full px-3 py-2 rounded bg-neonBlue text-white text-sm"
            >
              Confirm
            </button>
            {error && (
              <div className="mt-2 text-xs text-red-500">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
