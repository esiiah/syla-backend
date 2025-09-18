// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import PdfMerge from "./PdfMerge";
import GenericConvert from "./GenericConvert";
import PdfCompress from "./PdfCompress";
import ExportPanel from "../components/ExportPanel";

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

  const handleDownloadReady = (url) => {
    setDownloadUrl(url || "");
  };

  const confirmExport = () => {
    setError("");
    if (!downloadUrl) {
      setError("No processed file available yet.");
      return;
    }
    window.open(downloadUrl, "_blank");
  };

  // primary action for ExportPanel - this function dispatches depending on tool
  const handlePrimaryAction = () => {
    setError("");
    // For merge/compress: if subcomponent provides onDownloadReady, we expect it to set downloadUrl
    // So here we just attempt to trigger an action - for GenericConvert and PdfMerge they've already implemented their own buttons
    // But if the page uses FileUpload (default view), call its upload endpoint by simulating click via DOM or better: provide a ref.
    // For simplicity here, we show a message asking the user to use the page's button if no auto-action wired.
    if (config?.component === "merge") {
      // Merge page has its own Merge button; we rely on it.
      alert("Use the Merge button in the main panel to start merging PDFs. The download link appears here when ready.");
      return;
    }
    if (config?.component === "compress") {
      alert("Use the Compress button in the main panel. The download link will appear here when ready.");
      return;
    }
    if (config?.component === "convert") {
      alert("Use the Convert button in the main panel. The download link will appear here when ready.");
      return;
    }
    // fallback
    alert("Use the primary control in the main panel to process the file. The download appears here.");
  };

  // Determine primary action label for panel
  const primaryLabel = config
    ? (config.component === "merge" ? "Merge" : config.component === "compress" ? "Compress" : "Convert")
    : "Process";

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

        {/* ExportPanel usage */}
        <ExportPanel
          mode="filetool"
          actionLabel={primaryLabel}
          onPrimaryAction={handlePrimaryAction}
          downloadUrl={downloadUrl}
          onDownload={() => {
            if (!downloadUrl) return setError("No processed file available yet.");
            window.open(downloadUrl, "_blank");
          }}
          error={error}
        />
      </div>
    </div>
  );
}
