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
  const handleUpload = async () => {
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

      const endpoint =
        config.component === "compress"
          ? "/api/filetools/pdf/compress"
          : config.component === "merge"
          ? "/api/filetools/pdf/merge"
          : config.endpoint;

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

  // Download handler
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        <div className="flex-1 flex flex-col p-6 space-y-6">
          {config ? (
            <>
              {config.component === "merge" ? (
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-8 text-center">
                    Merge PDFs (max 15)
                  </h2>
                  <FileToolUploadPanel
                    title="Select PDFs to Merge"
                    accept=".pdf"
                    multiple={true}
                    files={files}
                    setFiles={setFiles}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onUpload={handleUpload}
                    uploadLabel="Merge PDFs"
                    loading={loading}
                  />
                </div>
              ) : config.component === "compress" ? (
                <FileToolUploadPanel
                  title="Select PDF to Compress"
                  accept=".pdf"
                  multiple={false}
                  files={files}
                  setFiles={setFiles}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onUpload={handleUpload}
                  uploadLabel="Compress PDF"
                  loading={loading}
                />
              ) : (
                <FileToolUploadPanel
                  title={`Select file for ${config.label}`}
                  accept={config.accept}
                  multiple={false}
                  files={files}
                  setFiles={setFiles}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onUpload={handleUpload}
                  uploadLabel="Convert"
                  loading={loading}
                />
              )}
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-300">
              <p>Unknown tool: {action}</p>
            </div>
          )}

          <FileToolExportPanel
            showPanel={files.length > 0}
            downloadUrl={downloadUrl}
            onDownload={handleDownload}
            onUpload={handleUpload}
            error={error}
            loading={loading}
            uploadLabel="Convert"
            conversionComplete={conversionComplete}
            fileName={fileName}
          />
        </div>
      </div>
    </div>
  );
}
