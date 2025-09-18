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
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme="light" setTheme={() => {}} />
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
          error={error}
        />
      </div>
    </div>
  );
}
