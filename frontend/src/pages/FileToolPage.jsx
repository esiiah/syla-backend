// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";
import FileToolExportPanel from "../components/export/FileToolExportPanel";

export default function FileToolPage({ theme, setTheme }) {
  const { action } = useParams();
  const [searchParams] = useSearchParams();

  // --- File Tool States ---
  const [files, setFiles] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [fileName, setFileName] = useState("");
  const [stashedFile, setStashedFile] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [viewMode, setViewMode] = useState("grid");

  // --- Load stashed file if token exists ---
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    fetch(`/api/filetools/retrieve/${token}`)
      .then((res) => res.blob())
      .then((blob) => {
        const f = new File([blob], "stashed_file", { type: blob.type || "application/octet-stream" });
        setStashedFile(f);
        setFiles([f]);
      })
      .catch(console.warn);
  }, [searchParams]);

  // --- Reset states when switching tools ---
  useEffect(() => {
    setDownloadUrl("");
    setError("");
    setLoading(false);
    setConversionComplete(false);
    setFileName("");
    setCompressionLevel("medium");
  }, [action]);

  // --- Tool Mapping ---
  const toolMapping = {
    compress: { component: "compress", label: "PDF → Compressed PDF", accept: ".pdf" },
    merge: { component: "merge", label: "Merge PDFs", accept: ".pdf" },
    "pdf-to-word": { component: "compress", endpoint: "/api/filetools/pdf-to-word", accept: ".pdf", label: "PDF → Word" },
    "pdf-to-excel": { component: "compress", endpoint: "/api/filetools/pdf-to-excel", accept: ".pdf", label: "PDF → Excel" },
    "excel-to-pdf": { component: "compress", endpoint: "/api/filetools/excel-to-pdf", accept: ".xls,.xlsx", label: "Excel → PDF" },
    "csv-to-excel": { component: "compress", endpoint: "/api/filetools/csv-to-excel", accept: ".csv", label: "CSV → Excel" },
    "excel-to-csv": { component: "compress", endpoint: "/api/filetools/excel-to-csv", accept: ".xls,.xlsx", label: "Excel → CSV" },
    "pdf-to-csv": { component: "compress", endpoint: "/api/filetools/pdf-to-csv", accept: ".pdf", label: "PDF → CSV" },
    "csv-to-pdf": { component: "compress", endpoint: "/api/filetools/csv-to-pdf", accept: ".csv", label: "CSV → PDF" },
  };

  const config = toolMapping[action] || null;

  // --- Upload / Convert Handler ---
  const handleUpload = async (levelOverride = null) => {
    if (!files.length) {
      setError("Please select a file first.");
      return;
    }
    setLoading(true);
    setError("");
    setConversionComplete(false);

    try {
      const fd = new FormData();
      if (config.component === "merge") {
        files.forEach((f) => fd.append("files", f));
      } else {
        fd.append("file", files[0]);
      }

      if (config.component === "compress") fd.append("level", levelOverride || compressionLevel);

      const endpoint =
        config.component === "compress" && action === "compress"
          ? "/api/filetools/pdf/compress"
          : config.endpoint || "/api/filetools/convert";

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.detail || json.error || "Conversion failed");

      setDownloadUrl(json.download_url);
      setFileName(json.filename || "converted_file");
      setConversionComplete(true);
    } catch (e) {
      setError(e.message || "Conversion failed");
      setConversionComplete(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Download Handler ---
  const handleDownload = () => {
    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  const handleCompressionLevelChange = (level) => {
    setCompressionLevel(level);
    if (conversionComplete) {
      setConversionComplete(false);
      setDownloadUrl("");
      setFileName("");
      setError("");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      <div className="flex-1 transition-all duration-300">
        <Navbar />

        <div className="flex-1 flex flex-col p-6 space-y-6">
          {config ? (
            <>
              <div className={config.component === "merge" ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"}>
                <FileToolUploadPanel
                  title={
                    config.component === "compress"
                      ? `Select file to Compress`
                      : config.component === "merge"
                      ? "Select PDFs to Merge"
                      : `Select file for ${config.label}`
                  }
                  hint={
                    config.component === "compress"
                      ? "Choose a file and select your preferred compression level"
                      : config.component === "merge"
                      ? "You can select up to 15 PDF files to merge into one document"
                      : `Upload ${config.accept.replace(/\./g, "").toUpperCase()} file for conversion`
                  }
                  accept={config.accept}
                  multiple={config.component === "merge"}
                  files={files}
                  setFiles={setFiles}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onUpload={handleUpload}
                  uploadLabel={
                    config.component === "compress"
                      ? `Compress (${compressionLevel})`
                      : config.component === "merge"
                      ? "Merge PDFs"
                      : "Convert"
                  }
                  loading={loading}
                />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-300">
              <div className="max-w-md mx-auto p-8 bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-soft">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">Tool Not Found</h2>
                <p className="text-gray-600 dark:text-slate-400">
                  The requested tool "{action}" is not available.
                </p>
              </div>
            </div>
          )}

          <FileToolExportPanel
            showPanel={files.length > 0}
            downloadUrl={downloadUrl}
            onDownload={handleDownload}
            onUpload={handleUpload}
            uploadLabel={
              config?.component === "compress"
                ? `Compress (${compressionLevel})`
                : config?.component === "merge"
                ? "Merge PDFs"
                : "Convert"
            }
            error={error}
            loading={loading}
            conversionComplete={conversionComplete}
            fileName={fileName}
            toolType={config?.component || "convert"}
            compressionLevel={compressionLevel}
            onCompressionLevelChange={handleCompressionLevelChange}
          />
        </div>
      </div>
    </div>
  );
}
