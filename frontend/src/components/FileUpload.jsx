import React, { useState, useRef } from "react";

function FileUpload({ onData, onColumns, onTypes, onSummary }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleUpload = () => {
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onloadstart = () => {
      setUploading(true);
      setProgress(0);
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.error) {
            alert(result.error);
            return;
          }
          onData(result.data || []);
          onColumns(result.columns || []);
          onTypes(result.types || {});
          onSummary(result.summary || {});
          alert(`Upload successful: ${result.filename} (${result.rows} rows)`);
        } catch (e) {
          alert("Upload succeeded but response was not JSON.");
        }
      } else {
        alert("Upload failed");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Upload failed due to network/CORS error");
    };

    xhr.send(formData);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`rounded-2xl border border-dashed p-6 text-center transition 
          ${dragOver ? "border-neonYellow bg-white/5" : "border-white/10 bg-black/10"} neon-border shadow-soft`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="text-slate-300 mb-2 font-medium">Drag & drop your CSV here</p>
        <p className="text-xs text-slate-400 mb-4">or select a file from your computer</p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-white/10 text-slate-200 hover:text-white hover:border-neonBlue/60 transition shadow-neon hover:animate-glow"
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && (
            <span className="text-xs text-slate-300 truncate max-w-[120px]">
              Selected: <span className="text-neonYellow">{file.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        className="w-full px-4 py-3 rounded-2xl bg-neonBlue text-white shadow-neon hover:animate-glow transition font-medium"
      >
        Upload
      </button>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden shadow-inner">
            <div
              className="h-3 rounded-full bg-neonYellow animate-shimmer transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-slate-300 font-mono">{progress}%</p>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
