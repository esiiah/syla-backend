// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileList from "../components/FileList";
import PdfMerge from "./PdfMerge";
import GenericConvert from "./GenericConvert";
import PdfCompress from "./PdfCompress";
import ExportPanel from "../components/ExportPanel";
import UploadPanel from "../components/UploadPanel";

export default function FileToolPage() {
  const { action } = useParams();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState("light");

  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");

  const [stashedFile, setStashedFile] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    fetch(`/api/filetools/retrieve/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Token not found");
        return res.blob();
      })
      .then((blob) => {
        const f = new File([blob], "stashed_file", {
          type: blob.type || "application/octet-stream"
        });
        setStashedFile(f);
        setFiles([f]);
      })
      .catch((err) => console.warn("Failed to retrieve stashed file:", err));
  }, [searchParams]);

  const mapping = {
    compress: { component: "compress" },
    merge: { component: "merge" },
    "pdf-to-word": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-word",
      accept: ".pdf",
      label: "PDF → Word"
    },
    "pdf-to-excel": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-excel",
      accept: ".pdf",
      label: "PDF → Excel"
    },
    "excel-to-pdf": {
      component: "convert",
      endpoint: "/api/filetools/convert/excel-to-pdf",
      accept: ".xls,.xlsx",
      label: "Excel → PDF"
    },
    "csv-to-excel": {
      component: "convert",
      endpoint: "/api/filetools/convert/csv-to-excel",
      accept: ".csv",
      label: "CSV → Excel"
    },
    "excel-to-csv": {
      component: "convert",
      endpoint: "/api/filetools/convert/excel-to-csv",
      accept: ".xls,.xlsx",
      label: "Excel → CSV"
    },
    "pdf-to-csv": {
      component: "convert",
      endpoint: "/api/filetools/convert/pdf-to-csv",
      accept: ".pdf",
      label: "PDF → CSV (table extraction)"
    },
    "csv-to-pdf": {
      component: "convert",
      endpoint: "/api/filetools/convert/csv-to-pdf",
      accept: ".csv",
      label: "CSV → PDF"
    }
  };

  const config = mapping[action] || null;
  const formattedAction = action
    ? action.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Tool";

  const handleDownloadReady = (url) => {
    setDownloadUrl(url || "");
  };

  // Upload handler for ExportPanel
  const handleUpload = async () => {
    if (!files || files.length === 0) {
      alert("Please select a file first.");
      return;
    }
    if (!config?.endpoint) {
      alert("No endpoint configured for this tool.");
      return;
    }

    setError("");
    const fd = new FormData();
    fd.append("file", files[0]);

    try {
      const res = await fetch(config.endpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setDownloadUrl(data.download_url || "");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
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
              <PdfCompress
                initialFile={stashedFile}
                onDownloadReady={handleDownloadReady}
              />
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
              <UploadPanel
                accept={config?.accept || "*/*"}
                multiple={false}
                files={files}
                setFiles={setFiles}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />

              <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
                <FileList />
              </section>
            </>
          )}
        </div>

        {/* Floating panel for upload + download */}
        <ExportPanel
          context="filetool"
          onUpload={handleUpload}
          downloadUrl={downloadUrl}
          onDownload={() => {
            if (!downloadUrl) {
              setError("No processed file available yet.");
              return;
            }
            window.open(downloadUrl, "_blank");
          }}
        />
      </div>
    </div>
  );
}
