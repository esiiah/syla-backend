// frontend/src/pages/FileToolPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import FileToolUploadPanel from "../components/upload/FileToolUploadPanel";
import FileToolExportPanel from "../components/export/FileToolExportPanel";

export default function FileToolPage() {
  const { action } = useParams();
  const [searchParams] = useSearchParams();

  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [fileName, setFileName] = useState("");
  const [stashedFile, setStashedFile] = useState(null);
  const [theme, setTheme] = useState("light");
  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [user, setUser] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState("medium");

  // Load user + theme
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(savedTheme);
  }, []);

  // Reset state when switching between different tools
  useEffect(() => {
    setDownloadUrl("");
    setError("");
    setLoading(false);
    setConversionComplete(false);
    setFileName("");
    setCompressionLevel("medium");
  }, [action]);

  // Restore stashed file if token exists
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

  // Mapping of tools
  const mapping = {
    compress: { component: "compress", label: "PDF → Compressed PDF", accept: ".pdf" },
    merge: { component: "merge", label: "Merge PDFs", accept: ".pdf" },
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
      label: "PDF → CSV",
    },
    "csv-to-pdf": {
      component: "convert",
      endpoint: "/api/filetools/convert/csv-to-pdf",
      accept: ".csv",
      label: "CSV → PDF",
    },
  };

  const config = mapping[action] || null;

  // Upload handler
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

      // Add compression level for PDF compression
      if (config.component === "compress") {
        const level = levelOverride || compressionLevel;
        fd.append("level", level);
      }

      const endpoint =
        config.component === "compress"
          ? "/api/filetools/pdf/compress"
          : config.component === "merge"
          ? "/api/filetools/pdf/merge"
          : config.endpoint;

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        let actionFailMsg = "Conversion failed";
        if (config.component === "compress") actionFailMsg = "Compress failed";
        else if (config.component === "merge") actionFailMsg = "Merge failed";
        throw new Error(json.detail || json.error || actionFailMsg);
      }

      setDownloadUrl(json.download_url);
      setFileName(json.filename || "converted_file");
      setConversionComplete(true);

      if (config.component === "compress" && json.reduction_percent) {
        console.log(`File size reduced by ${json.reduction_percent}%`);
      }
    } catch (e) {
      setError(e.message || "Conversion failed");
      setConversionComplete(false);
    } finally {
      setLoading(false);
    }
  };

  // Download handler
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  // Handle compression level changes
  const handleCompressionLevelChange = (level) => {
    setCompressionLevel(level);
    if (conversionComplete) {
      setConversionComplete(false);
      setDownloadUrl("");
      setFileName("");
      setError("");
    }
  };

  // Clear all user files
  const handleClearUserFiles = async () => {
    if (!confirm("Are you sure you want to delete all your uploaded files?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/files/clear-user-files", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to clear files");
      setFiles([]);
      setDownloadUrl("");
      alert(data.message);
    } catch (e) {
      alert(e.message || "Failed to clear files");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />

        <div className="flex-1 flex flex-col p-6 space-y-6">
          {/* Clear Files Button */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">File Tools</h1>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              onClick={handleClearUserFiles}
              disabled={loading}
            >
              {loading ? "Processing..." : "Clear All My Files"}
            </button>
          </div>

          {config ? (
            <>
              {/* Tool Header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-2">
                  {config.label}
                </h1>
                <p className="text-gray-600 dark:text-slate-400">
                  {config.component === "compress"
                    ? "Reduce PDF file size with customizable compression levels"
                    : config.component === "merge"
                    ? "Combine multiple PDF files into a single document (max 15 files)"
                    : "Convert your files quickly and securely"}
                </p>
              </div>

              {/* Upload Panel */}
              <div className={config.component === "merge" ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"}>
                <FileToolUploadPanel
                  title={
                    config.component === "compress"
                      ? "Select PDF to Compress"
                      : config.component === "merge"
                      ? "Select PDFs to Merge"
                      : `Select file for ${config.label}`
                  }
                  hint={
                    config.component === "compress"
                      ? "Choose a PDF file and select your preferred compression level"
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
                      ? `Compress PDF (${compressionLevel})`
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
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Tool Not Found
                </h2>
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
                ? `Compress PDF (${compressionLevel})`
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
