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
        const f = new File([blob], "stashed_file", {
          type: blob.type || "application/octet-stream",
        });
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
    setFiles([]);
  }, [action]);

  // --- Tool Mapping ---
  const toolMapping = {
    compress: {
      type: "compress",
      label: "File → Compressed File",
      accept: ".pdf,.docx,.xlsx,.csv,.txt",
      endpoint: "/api/filetools/pdf/compress",
    },
    merge: {
      type: "merge",
      label: "Merge PDFs",
      accept: ".pdf",
      endpoint: "/api/filetools/pdf/merge",
    },
    "pdf-to-word": {
      type: "convert",
      label: "PDF → Word",
      accept: ".pdf",
      endpoint: "/api/filetools/pdf-to-word",
    },
    "word-to-pdf": {
      type: "convert",
      label: "Word → PDF",
      accept: ".doc,.docx",
      endpoint: "/api/filetools/word-to-pdf",
    },
    "image-to-pdf": {
      type: "convert",
      label: "Image → PDF",
      accept: ".jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif",
      endpoint: "/api/filetools/image-to-pdf",
    },
    "pdf-to-excel": {
      type: "convert",
      label: "PDF → Excel",
      accept: ".pdf",
      endpoint: "/api/filetools/pdf-to-excel",
    },
    "excel-to-pdf": {
      type: "convert",
      label: "Excel → PDF",
      accept: ".xls,.xlsx",
      endpoint: "/api/filetools/excel-to-pdf",
    },
    "csv-to-excel": {
      type: "convert",
      label: "CSV → Excel",
      accept: ".csv",
      endpoint: "/api/filetools/csv-to-excel",
    },
    "excel-to-csv": {
      type: "convert",
      label: "Excel → CSV",
      accept: ".xls,.xlsx",
      endpoint: "/api/filetools/excel-to-csv",
    },
    "pdf-to-csv": {
      type: "convert",
      label: "PDF → CSV",
      accept: ".pdf",
      endpoint: "/api/filetools/pdf-to-csv",
    },
    "csv-to-pdf": {
      type: "convert",
      label: "CSV → PDF",
      accept: ".csv",
      endpoint: "/api/filetools/csv-to-pdf",
    },
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
      if (config.type === "merge") {
        files.forEach((f) => fd.append("files", f));
      } else {
        fd.append("file", files[0]);
      }

      if (config.type === "compress") {
        fd.append("level", levelOverride || compressionLevel);
      }

      const endpoint = config.endpoint;
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
              {/* Upload Panel */}
              <div
                className={`${
                  config.type === "merge" ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"
                }`}
              >
                <FileToolUploadPanel
                  title={
                    config.type === "compress"
                      ? "Select file to Compress"
                      : config.type === "merge"
                      ? "Select PDFs to Merge"
                      : `Select file for ${config.label}`
                  }
                  hint={
                    config.type === "compress"
                      ? "Choose a file and select your preferred compression level"
                      : config.type === "merge"
                      ? "You can select up to 15 PDF files to merge into one document"
                      : `Upload ${config.accept.replace(/\./g, "").toUpperCase()} file for conversion`
                  }
                  accept={config.accept}
                  multiple={config.type === "merge"}
                  files={files}
                  setFiles={setFiles}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onUpload={handleUpload}
                  uploadLabel={
                    config.type === "compress"
                      ? `Compress (${compressionLevel})`
                      : config.type === "merge"
                      ? "Merge PDFs"
                      : "Convert"
                  }
                  loading={loading}
                  borderColor="sky-400"
                />
              </div>

              {/* Export Panel */}
              <FileToolExportPanel
                showPanel={files.length > 0}
                downloadUrl={downloadUrl}
                onDownload={handleDownload}
                onUpload={handleUpload}
                uploadLabel={
                  config.type === "compress"
                    ? `Compress (${compressionLevel})`
                    : config.type === "merge"
                    ? "Merge PDFs"
                    : "Convert"
                }
                error={error}
                loading={loading}
                conversionComplete={conversionComplete}
                fileName={fileName}
                toolType={action} // pass exact action, not just "compress"
                compressionLevel={compressionLevel}
                onCompressionLevelChange={handleCompressionLevelChange}
                borderColor="sky-400"
              />
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-300">
              <div className="max-w-md mx-auto p-8 bg-white dark:bg-ink/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-soft">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Tool Not Found
                </h2>
                <p className="text-gray-600 dark:text-slate-400">
                  The requested tool "{action}" is not available.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
