// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import { useChartData } from "../context/ChartDataContext";
import VisualUploadPanel from "./upload/VisualUploadPanel";

export default function FileUpload({
  action = null,
  accept = ".csv,.xlsx,.xls",
  multiple = false,
  maxFiles = 10,
  onResult = () => {},
  initialFiles = null,
}) {
  const { updateChartData } = useChartData();
  const [files, setFiles] = useState(initialFiles ? [].concat(initialFiles) : []);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("grid");
  const inputRef = useRef(null);

  useEffect(
    () => () =>
      files.forEach((f) => f.__previewUrl && URL.revokeObjectURL(f.__previewUrl)),
    [files]
  );

  const validate = (sel) => {
    if (!multiple && sel.length > 1) return alert("Only one file allowed"), false;
    if (sel.length > maxFiles) return alert(`Max ${maxFiles}`), false;
    const allowed = accept.split(",").map((s) => s.trim().toLowerCase());
    for (const f of sel) {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (allowed[0] !== "*/*" && !allowed.includes(ext))
        return alert(`Not allowed: ${f.name}`), false;
    }
    return true;
  };

  const withPreview = (sel) =>
    sel.map((f) => {
      try {
        f.__previewUrl = URL.createObjectURL(f);
      } catch {}
      return f;
    });

  const normalizeResponseData = (r) => {
    if (!r) return { data: [], columns: [] };

    console.info("Raw response for normalization:", r);
    
    let finalData = [];
    let finalColumns = [];
    
    const possibleDataSources = [
      r.data, r.rows, r.records, r.content, r
    ];
    
    for (const source of possibleDataSources) {
      if (source && Array.isArray(source) && source.length > 0) {
        finalData = source;
        break;
      }
    }
    
    if (finalData.length === 0 && r) {
      if (typeof r === 'object' && !Array.isArray(r)) {
        const keys = Object.keys(r);
        const firstKey = keys[0];
        if (firstKey && Array.isArray(r[firstKey])) {
          const maxLength = Math.max(...keys.map(k => Array.isArray(r[k]) ? r[k].length : 0));
          finalData = [];
          for (let i = 0; i < maxLength; i++) {
            const row = {};
            keys.forEach(key => {
              row[key] = Array.isArray(r[key]) ? r[key][i] : r[key];
            });
            finalData.push(row);
          }
          finalColumns = keys;
        }
      }
    }
    
    if (finalColumns.length === 0) {
      const possibleColumnSources = [
        r.columns, r.headers, r.fields,
        finalData.length > 0 ? Object.keys(finalData[0]) : []
      ];
      
      for (const source of possibleColumnSources) {
        if (Array.isArray(source) && source.length > 0) {
          finalColumns = source;
          break;
        }
      }
    }
    
    if (finalData.length > 0 && Array.isArray(finalData[0])) {
      finalData = finalData.map((row) => {
        const obj = {};
        row.forEach((value, colIndex) => {
          const columnName = finalColumns[colIndex] || `Column_${colIndex + 1}`;
          obj[columnName] = value;
        });
        return obj;
      });
    }
    
    if (finalColumns.length === 0 && finalData.length > 0) {
      finalColumns = Object.keys(finalData[0]);
    }
    
    if (finalData.length === 0) {
      console.warn("No data could be extracted from response, returning empty structure");
      return { data: [], columns: [] };
    }
    
    console.info("Universal normalization result:", { 
      dataLength: finalData.length, 
      columns: finalColumns,
      sampleRow: finalData[0]
    });
    
    return { data: finalData, columns: finalColumns };
  };

  const handleUpload = () => {
    if (!files.length) return alert("Select a file first");
    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    multiple ? files.forEach((f) => fd.append("files", f)) : fd.append("file", files[0]);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", action || "/api/upload", true);

    xhr.upload.onprogress = (e) =>
      e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const r = JSON.parse(xhr.responseText);
          console.info("Backend response:", r);
          
          const { data: finalData, columns: finalColumns } = normalizeResponseData(r);

          // Update chart data context with all the processed information
          const chartDataUpdate = {
            data: finalData,
            columns: finalColumns,
            types: r.types || {},
            summary: r.summary || {},
            chartTitle: r.chart_title || r.filename || "Processed Data",
            xAxis: r.x_axis || (finalColumns[0] || ""),
            yAxis: r.y_axis || (finalColumns[1] || finalColumns[0] || ""),
            chartOptions: {
              type: "bar",
              color: "#2563eb",
              gradient: false,
              showLabels: false,
              sort: "none",
              orientation: "vertical"
            }
          };

          updateChartData(chartDataUpdate);

          // Fire callback for backward compatibility
          onResult(r);

          // Success message
          const message = r.message || `Processed: ${r.filename || "file"}`;
          alert(message);
          
        } catch (err) {
          console.error("Response parsing error:", err);
          alert("Upload successful but response parsing failed. Please try again.");
        }
      } else {
        console.warn("Upload failed:", xhr.status, xhr.responseText);
        alert("Upload failed. Please check your file and try again.");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Network error occurred during upload.");
    };

    xhr.send(fd);
  };
  
  return (
    <div className="relative">
      <VisualUploadPanel
        accept={accept}
        multiple={multiple}
        files={files}
        setFiles={(f) => setFiles(withPreview(f))}
        onDrop={(e, sel) => validate(sel) && setFiles(withPreview(sel))}
        viewMode={view}
        setViewMode={setView}
        onUploadClick={handleUpload}
        primaryLabel={uploading ? `Uploading ${progress}%` : "Upload & Process"}
      />

      <div className="mt-4">
        {files.length === 0 ? (
          <div className="text-sm text-gray-500">No files selected</div>
        ) : view === "list" ? (
          <ul>{files.map((f, i) => <li key={i}>{f.name}</li>)}</ul>
        ) : view === "details" ? (
          <table>
            <tbody>
              {files.map((f, i) => (
                <tr key={i}>
                  <td>{f.name}</td>
                  <td>{f.size ? `${Math.round(f.size / 1024)} KB` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {files.map((f, i) => (
              <div key={i} className="p-2 border rounded text-center">
                <div className="h-24 flex items-center justify-center">
                  {f.__previewUrl ? <img src={f.__previewUrl} alt="" className="max-h-24" /> : f.name.split(".").pop()}
                </div>
                <div className="truncate text-sm">{f.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="mt-2">
          <div className="w-full h-2 bg-gray-200">
            <div className="h-2 bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
