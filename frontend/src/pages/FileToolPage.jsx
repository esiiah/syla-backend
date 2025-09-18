// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";
import FileToolExportPanel from "../components/export/FileToolExportPanel";
import FileList from "../components/FileList";
import PdfMerge from "./PdfMerge";
import PdfCompress from "./PdfCompress";
import GenericConvert from "./GenericConvert";

export default function FileToolPage() {
  const { action } = useParams();
  const [searchParams] = useSearchParams();
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [stashedFile, setStashedFile] = useState(null);
  const [theme, setTheme] = useState("light");

  // Apply theme to body
  useEffect(() => {
    if (typeof window !== "undefined" && document && document.body) {
      document.body.classList.remove("dark", "light");
      document.body.classList.add(theme === "light" ? "light" : "dark");
    }
  }, [theme]);

  // Restore stashed file if present
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    fetch(`/api/filetools/retrieve/${token}`)
      .then((res) => res.blob())
      .then((blob) => {
        const f = new File([blob], "stashed_file", {
          type: blob.type || "application/octet-stream",
        });
        setStashedFile(f);
      })
      .catch(console.warn);
  }, [searchParams]);

  const mapping = {
    compress: { component: "compress" },
    merge: { component: "merge" },
    "pdf-to-word": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-word",
      accept: ".pdf",
      label: "PDF → Word",
    },
    "pdf-to-excel": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-excel",
      accept: ".pdf",
      label: "PDF → Excel",
    },
    "excel-to-pdf": {
      component: "convert",
      endpoint: "/api/filetools/convert/excel-to-pdf",
      accept: ".xls,.xlsx",
      label: "Excel → PDF",
    },
    "csv-to-excel": {
      component: "convert",
      endpoint: "/api/filetools/convert/csv-to-excel",
      accept: ".csv",
      label: "CSV → Excel",
    },
    "excel-to-csv": {
      component: "convert",
      endpoint: "/api/filetools/convert/excel-to-csv",
      accept: ".xls,.xlsx",
      label: "Excel → CSV",
    },
    "pdf-to-csv": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-csv",
      accept: ".pdf",
      label: "PDF → CSV (table extraction)",
    },
    "csv-to-pdf": {
      component: "convert",
      endpoint: "/api/filetools/convert/csv-to-pdf",
      accept: ".csv",
      label: "CSV → PDF",
    },
  };

  const config = mapping[action] || null;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        {/* Navbar */}
        <nav className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 dark:shadow-soft">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="Syla logo" className="w-8 h-8 animate-float" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg tracking-wide">
                  Syla <span className="text-neonBlue">Analytics</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 -mt-0.5">
                  Futuristic Data Intelligence
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Docs</a>
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Templates</a>
              <a href="#" className="text-gray-700 hover:text-neonYellow dark:text-slate-300 dark:hover:text-neonYellow">Pricing</a>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-neonBlue/60 dark:border-white/10 dark:text-slate-200 dark:hover:text-white">
                Log in
              </button>
              <button className="px-4 py-1.5 rounded-xl bg-neonBlue text-white shadow-neon hover:animate-glow transition">
                Sign up
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6 space-y-6">
          {config ? (
            config.component === "compress" ? (
              <PdfCompress
                initialFile={stashedFile}
                onDownloadReady={(url) => setDownloadUrl(url)}
              />
            ) : config.component === "merge" ? (
              <PdfMerge onDownloadReady={(url) => setDownloadUrl(url)} />
            ) : (
              <GenericConvert
                endpoint={config.endpoint}
                accept={config.accept}
                label={config.label}
                initialFile={stashedFile}
                onDownloadReady={(url) => setDownloadUrl(url)}
              />
            )
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-300">
              <p>Unknown tool: {action}</p>
            </div>
          )}

          <FileToolExportPanel
            downloadUrl={downloadUrl}
            onDownload={() => {
              if (!downloadUrl) {
                setError("No processed file available yet.");
                return;
              }
              window.open(downloadUrl, "_blank");
            }}
            onUpload={() => {
              // Trigger upload action based on component type
              const uploadBtn = document.querySelector('button[data-upload-trigger]');
              if (uploadBtn) uploadBtn.click();
            }}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
