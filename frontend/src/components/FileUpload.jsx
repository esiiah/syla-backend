import React, { useState } from "react";

function FileUpload({ onData, onColumns, onTypes, onSummary }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://syla-backend.onrender.com/upload", true);

    // Track upload progress
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
    <div className="p-4 max-w-md mx-auto">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-2 block w-full"
      />
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-800 text-white rounded-lg w-full"
      >
        Upload
      </button>

      {uploading && (
        <>
          <div className="mt-4 w-full bg-gray-300 rounded-full h-4">
            <div
              className="bg-blue-800 h-4 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-center text-sm text-gray-700">{progress}%</p>
        </>
      )}
    </div>
  );
}

export default FileUpload;
