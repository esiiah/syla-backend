// FileToolExportPanel.jsx
import React, { useState, useEffect, useRef } from "react";

export default function FileToolExportPanel({
  files = [],
  onUpload = null,
  uploadLabel = "Process",
  downloadUrl = "",
  onDownload = null,
  error = "",
  loading = false,
  showPanel = false,
  conversionComplete = false,
  fileName = "",
  toolType = "convert",
  onCompressionLevelChange = () => {},
}) {
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [panelWidth, setPanelWidth] = useState(340);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState("");

  useEffect(() => {
    if (toolType !== "compress") setCompressionLevel("medium");
  }, [toolType]);

  useEffect(() => {
    if (toolType === "compress" && !conversionComplete) setPanelWidth(420);
    else if (toolType === "merge") setPanelWidth(380);
    else setPanelWidth(340);
  }, [toolType, conversionComplete]);

  const handleMouseDown = (e) => {
    if (!panelRef.current) return;
    setDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset]);

  if (!showPanel) return null;

  const getProcessingTitle = () => {
    switch (toolType) {
      case "compress":
        return "File Compression";
      case "merge":
        return "File Merging";
      case "csv-to-excel":
      case "excel-to-csv":
      case "pdf-to-csv":
      case "csv-to-pdf":
      case "pdf-to-excel":
      case "excel-to-pdf":
      case "pdf-to-word":
      case "word-to-pdf":
      case "image-to-pdf":
        return "File Conversion";
      case "pdf":
        return "PDF Export";
      case "csv":
        return "CSV Export";
      default:
        return "File Processing";
    }
  };

  const handleCompressionChange = (level) => {
    setCompressionLevel(level);
    onCompressionLevelChange(level);
  };

  // Default upload logic (only used when consumer did NOT supply onUpload)
  const defaultUpload = async (providedFiles = files, opts = {}) => {
    setInternalError("");
    setInternalLoading(true);
    try {
      if (!providedFiles || providedFiles.length === 0) {
        throw new Error("No file provided for processing.");
      }

      // Map toolType -> endpoint + payload construction
      const map = {
        compress: { url: "/api/filetools/compress", method: "POST", form: (fd, f) => { fd.append("file", f); fd.append("level", compressionLevel); } },
        merge: { url: "/api/filetools/merge", method: "POST-multi", form: (fd, f) => fd.append("files", f) },
        "csv-to-excel": { url: "/api/filetools/csv-to-excel", method: "POST", form: (fd, f) => fd.append("file", f) },
        "excel-to-csv": { url: "/api/filetools/excel-to-csv", method: "POST", form: (fd, f) => fd.append("file", f) },
        "pdf-to-csv": { url: "/api/filetools/pdf-to-csv", method: "POST", form: (fd, f) => fd.append("file", f) },
        "csv-to-pdf": { url: "/api/filetools/csv-to-pdf", method: "POST", form: (fd, f) => fd.append("file", f) },
        "pdf-to-excel": { url: "/api/filetools/pdf-to-excel", method: "POST", form: (fd, f) => fd.append("file", f) },
        "excel-to-pdf": { url: "/api/filetools/excel-to-pdf", method: "POST", form: (fd, f) => fd.append("file", f) },
        "pdf-to-word": { url: "/api/filetools/pdf-to-word", method: "POST", form: (fd, f) => fd.append("file", f) },
        "word-to-pdf": { url: "/api/filetools/word-to-pdf", method: "POST", form: (fd, f) => fd.append("file", f) },
        "image-to-pdf": { url: "/api/filetools/image-to-pdf", method: "POST", form: (fd, f) => fd.append("file", f) },
      };
      // Choose endpoint
      let chosen = map[toolType];
      // If toolType is compress but file isn't PDF, use compress-any if available
      if (!chosen && toolType === "compress") {
        chosen = map["compress"];
      }

      if (!chosen) {
        // default to generic convert endpoint if unknown
        throw new Error("Unsupported tool type for built-in processing: " + toolType);
      }

      // Build formdata
      const form = new FormData();
      if (chosen.method === "POST-multi" || toolType === "merge") {
        // multiple files expected
        providedFiles.forEach((f) => {
          chosen.form(form, f);
        });
      } else {
        chosen.form(form, providedFiles[0]);
      }

      // Send
      const resp = await fetch(chosen.url, {
        method: "POST",
        body: form,
      });
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        return { download_url: url };
      }
      const json = await resp.json();
      return json;

      if (!resp.ok) {
        throw new Error(json.detail || json.error || JSON.stringify(json));
      }

      // Call onUpload callback with response (if provided)
      try {
        if (typeof onUpload === "function") {
          onUpload(providedFiles, { result: json, toolType, level: compressionLevel });
        }
      } catch (_) {}

      // If result contains download_url, either open it or call onDownload
      const dl = json.download_url || json.url || "";
      if (dl) {
        if (typeof onDownload === "function") {
          onDownload(dl);
        } else {
          // open in new tab
          const absolute = dl.startsWith("/") ? window.location.origin + dl : dl;
          window.open(absolute, "_blank");
        }
      }

      setInternalLoading(false);
      return json;
    } catch (err) {
      setInternalLoading(false);
      setInternalError(err.message || String(err));
      return Promise.reject(err);
    }
  };

  const handleUpload = async () => {
    if (typeof onUpload === "function") {
      // allow consumer to handle upload; pass files + opts
      try {
        const r = onUpload(files, { level: compressionLevel });
        // if returned promise, await it and handle download_url
        if (r && typeof r.then === "function") {
          const json = await r;
          const dl = json?.download_url;
          if (dl) {
            if (typeof onDownload === "function") onDownload(dl);
            else window.open(dl.startsWith("/") ? window.location.origin + dl : dl, "_blank");
          }
        }
      } catch (err) {
        setInternalError(err.message || String(err));
      }
    } else {
      // use built-in uploader
      await defaultUpload(files, {});
    }
  };

  const handleDownload = () => {
    if (typeof onDownload === "function") onDownload(downloadUrl);
    else if (downloadUrl) {
      const absolute = downloadUrl.startsWith("/") ? window.location.origin + downloadUrl : downloadUrl;
      window.open(absolute, "_blank");
    }
  };

  const getUploadButtonText = () => {
    if (loading || internalLoading) return `${getProcessingTitle().split(" ")[0]} Processing...`;
    switch (toolType) {
      case "compress":
        return `Compress File (${compressionLevel})`;
      case "merge":
        return "Merge Files";
      case "csv-to-excel":
        return "Convert CSV → Excel";
      case "excel-to-csv":
        return "Convert Excel → CSV";
      case "pdf-to-csv":
        return "Convert PDF → CSV";
      case "csv-to-pdf":
        return "Convert CSV → PDF";
      case "pdf-to-excel":
        return "Convert PDF → Excel";
      case "excel-to-pdf":
        return "Convert Excel → PDF";
      case "pdf-to-word":
        return "Convert PDF → Word";
      case "word-to-pdf":
        return "Convert Word → PDF";
      case "image-to-pdf":
        return "Convert Image → PDF";
      default:
        return uploadLabel || "Process";
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right: position ? "auto" : (window.innerWidth < 768 ? 8 : 24),
        top: position ? "auto" : (window.innerWidth < 768 ? "auto" : "50%"),
        bottom: position ? "auto" : (window.innerWidth < 768 ? 8 : "auto"),
        left: position ? position.x : "auto",
        transform: position ? "none" : (window.innerWidth < 768 ? "none" : "translateY(-50%)"),
        ...(position && { top: position.y }),
        width: window.innerWidth < 768 ? "280px" : panelWidth,
        maxHeight: window.innerWidth < 768 ? "auto" : "calc(100vh - 72px)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        overflow: "hidden",
        maxWidth: window.innerWidth < 768 ? "280px" : "none",
        border: "2px solid rgba(14,165,233,0.35)", // sky-blue border
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="p-2.5 md:p-3 border-b border-gray-200 bg-sky-50 cursor-grab"
      >
        <div className="text-xs md:text-sm font-semibold text-gray-800 flex items-center">
          {getProcessingTitle()}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4">
        {/* Compression controls */}
        {toolType === "compress" && !conversionComplete && (
          <div className="mb-3 md:mb-4 flex gap-1.5 md:gap-2">
            {[
              { value: "light", label: "Light", reduction: "~25%" },
              { value: "medium", label: "Med", reduction: "~50%" },
              { value: "strong", label: "Strong", reduction: "~75%" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCompressionChange(opt.value)}
                className={`flex-1 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs rounded border transition-all duration-150 ${
                  compressionLevel === opt.value
                    ? "border-sky-500 bg-sky-100 text-sky-700"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[8px] md:text-[9px]">{opt.reduction}</div>
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        <div
          className={`mb-3 md:mb-4 p-2 md:p-3 rounded-lg ${
            conversionComplete
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-sky-50 border border-sky-200 text-sky-700"
          }`}
        >
          <span className="text-xs md:text-sm font-medium">
            {conversionComplete ? `${getProcessingTitle()} Complete!` : "Ready to process"}
          </span>
          {fileName && conversionComplete && <p className="text-[10px] md:text-xs mt-1 break-all">{fileName}</p>}
        </div>

        {/* Upload / Process Button */}
        <div>
          <button
            onClick={handleUpload}
            disabled={loading || internalLoading}
            className={`w-full px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold mb-2 md:mb-3 transition-all duration-300 ${
              loading || internalLoading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-sky-500 text-white hover:bg-sky-600 shadow-md"
            }`}
          >
            {getUploadButtonText()}
          </button>
        </div>

        {/* Download */}
        {conversionComplete && (
          <button
            onClick={handleDownload}
            disabled={!downloadUrl}
            className={`w-full px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${
              downloadUrl
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-100 text-gray-500 cursor-not-allowed"
            }`}
          >
            {downloadUrl ? "Download Result" : "Preparing file..."}
          </button>
        )}

        {/* Internal error */}
        {(internalError || error) && (
          <div className="mt-2 md:mt-3 p-2 md:p-3 text-[10px] md:text-xs text-red-600 bg-red-50 rounded-lg border border-red-200">
            {internalError || error}
          </div>
        )}
      </div>
    </div>
  );
}