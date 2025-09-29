// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useContext } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { useChartData } from "../context/ChartDataContext";
import { UserContext } from "../context/UserContext";

export default function FileUpload({ onData }) {
  const { updateChartData } = useChartData();
  const { user } = useContext(UserContext);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    if (!user) {
      setError("You must be signed in to upload files");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      
      setProgress(100);
      setSuccess(true);

      // Update chart data context with uploaded data
      updateChartData({
        data: data.data || [],
        columns: data.columns || [],
        types: data.types || {},
        summary: data.summary || {},
        chartTitle: data.chart_title || data.filename || "Uploaded Data",
        xAxis: data.x_axis || (data.columns && data.columns[0]) || "",
        yAxis: data.y_axis || (data.columns && data.columns[1]) || ""
      });

      // Call the parent callback if provided
      if (onData) {
        onData(data);
      }

      // Create backend notification for successful upload
      try {
        await fetch('/api/notifications/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: "File Upload Successful",
            message: `'${file.name}' has been uploaded and is ready for visualization.`,
            type: "success",
            category: "upload",
            priority: "medium",
            action_url: `/editing?file=${data.file_id}`,
            metadata: {
              filename: file.name,
              file_id: data.file_id,
              rows: data.rows,
              columns: data.columns?.length
            }
          })
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the upload if notification fails
      }

      // Reset after a delay
      setTimeout(() => {
        setFile(null);
        setSuccess(false);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 3000);

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file. Please try again.");
      setProgress(0);

      // Create backend notification for failed upload
      try {
        await fetch('/api/notifications/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: "File Upload Failed",
            message: `Failed to upload '${file.name}': ${err.message}`,
            type: "error",
            category: "upload",
            priority: "high",
            action_url: "/",
            metadata: {
              filename: file.name,
              error: err.message
            }
          })
        });
      } catch (notifError) {
        console.error('Failed to create error notification:', notifError);
      }
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 cursor-pointer bg-gray-50 dark:bg-slate-900/50"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
        <p className="text-gray-700 dark:text-slate-300 mb-2 font-medium">
          Drop your file here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Supports CSV, Excel (XLSX, XLS)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected File Info */}
      {file && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-gray-800 dark:text-slate-200">
                  {file.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={clearFile}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600 dark:text-slate-400">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              Upload Successful!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your data is ready for visualization
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200">
              Upload Failed
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading || success}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Uploaded Successfully
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload & Visualize
          </>
        )}
      </button>

      {!user && (
        <p className="text-sm text-center text-gray-600 dark:text-slate-400">
          Sign in to upload and visualize your data
        </p>
      )}
    </div>
  );
}
