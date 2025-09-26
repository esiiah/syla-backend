// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import VisualUploadPanel from "./upload/VisualUploadPanel";
import ChartExportTool from "./export/ChartExportTool";

/**
 * FileUpload
 * Props:
 *  - action, accept, multiple, maxFiles
 *  - onResult(r)
 *  - onData(dataArray)
 *  - onColumns(columnsArray)
 *  - onTypes(typesObj)
 *  - onSummary(summaryObj)
 *  - onChartTitle(title)
 *  - onXAxis(xAxis)
 *  - onYAxis(yAxis)
 */
export default function FileUpload({
  action = null,
  accept = ".csv,.xlsx,.xls",
  multiple = false,
  maxFiles = 10,
  onResult = () => {},
  onData,
  onColumns,
  onTypes,
  onSummary,
  onChartTitle,
  onXAxis,
  onYAxis,
  initialFiles = null,
}) {
  const [files, setFiles] = useState(initialFiles ? [].concat(initialFiles) : []);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("grid");
  const [uploadedData, setUploadedData] = useState(null);
  const [chartTitle, setChartTitleState] = useState("");
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

  /**
   * FIXED: Normalize backend response data into an array of row objects
   */
  const normalizeResponseData = (r) => {
    if (!r) return { data: [], columns: [] };

    console.info("Raw response for normalization:", r);
    console.info("r.data type:", typeof r.data, "isArray:", Array.isArray(r.data));
    console.info("r.columns:", r.columns);
    console.info("First few items of r.data:", r.data?.slice(0, 3));

    // Primary source: r.data (records). Fallbacks: preview_rows, preview, data_preview
    const raw = Array.isArray(r.data) ? r.data
      : Array.isArray(r.preview_rows) ? r.preview_rows
      : Array.isArray(r.preview) ? r.preview
      : Array.isArray(r.data_preview) ? r.data_preview
      : r.data;
    let columns = Array.isArray(r.columns) ? r.columns.slice() : null;

     // FIXED: Case 1 - Array of objects (most common CSV case)
    if (Array.isArray(raw) && raw.length > 0) {
    if (Array.isArray(raw) && raw.length > 0) {
      const firstItem = raw[0];
      console.info("First item:", firstItem, "type:", typeof firstItem, "isArray:", Array.isArray(firstItem));
       
      // Check if it's an array of objects (not array of arrays)
      if (firstItem && typeof firstItem === "object" && !Array.isArray(firstItem)) {
        // If columns not provided, infer from keys of first row
        if (!columns) {
          columns = Object.keys(firstItem);
        }
        console.info("Case 1: Array of objects detected", { columns, dataLength: raw.length });
        return { data: raw, columns: columns || [] };
      }
      
      // Case 2: Array of arrays with columns provided
      if (Array.isArray(firstItem) && Array.isArray(columns)) {
        const data = raw.map((row) => {
          const obj = {};
          for (let i = 0; i < columns.length; i++) {
            obj[columns[i]] = row[i];
          }
          return obj;
        });
        console.info("Case 2: Array of arrays converted", { columns, dataLength: data.length });
        return { data, columns };
      }

      // DEBUG: If we reach here, let's see what we actually have
      console.info("No case matched. firstItem structure:", JSON.stringify(firstItem, null, 2));
    }

    // Case 3: Column-oriented object (e.g., { col1: [...], col2: [...] })
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      // If columns not provided, use object keys
      if (!columns) columns = Object.keys(raw);

      // Determine row count from longest column array (fall back to 0)
      const lengths = columns.map((c) => (Array.isArray(raw[c]) ? raw[c].length : 0));
      const rowCount = Math.max(0, ...lengths);

      const data = [];
      for (let i = 0; i < rowCount; i++) {
        const row = {};
        for (const col of columns) {
          const colArr = raw[col];
          row[col] = Array.isArray(colArr) ? colArr[i] : colArr;
        }
        data.push(row);
      }
      console.info("Case 3: Column-oriented object converted", { columns, dataLength: data.length });
      return { data, columns };
    }

    // Case 4: Empty or unknown format - try to handle gracefully
    if (Array.isArray(raw)) {
      // If r.data is empty but we have columns provided by backend, or preview exists,
      // try to return that preview as data.
      if ((!raw.length || raw.length === 0) && Array.isArray(r.preview_rows) && r.preview_rows.length > 0) {
        const preview = r.preview_rows;
        if (!columns && preview.length > 0 && typeof preview[0] === "object") columns = Object.keys(preview[0]);
        return { data: preview, columns: columns || [] };
      }

      if (columns && raw.length > 0) {
        const data = raw.map((row) => {
          if (Array.isArray(row)) {
            const obj = {};
            for (let i = 0; i < columns.length; i++) obj[columns[i]] = row[i];
            return obj;
          }
          return row;
        });
        console.info("Case 4: Fallback array conversion", { columns, dataLength: data.length });
        return { data, columns: columns || [] };        
        }

        return { data: raw, columns: columns || [] };
      }
      
 
      // Default fallback
      console.warn("No matching case for data normalization, returning empty");
      return { data: [], columns: columns || [] };
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

          // Helpful debug logs (remove or guard in production)
          console.info("File upload response:", r);
          console.info("typeof r.data:", typeof r.data, "Array.isArray(r.data):", Array.isArray(r.data));
          onResult(r);

          // FIXED: Normalize data so ChartView always gets rows-of-objects
          const normalized = normalizeResponseData(r);
          const finalData = normalized.data || [];
          const finalColumns = normalized.columns || [];

          console.info("Final normalized data:", finalData);
          console.info("Final normalized columns:", finalColumns);

          // ADDITIONAL FIX: Ensure we have valid data before proceeding
          if (finalData.length === 0) {
            console.error("No data after normalization. Check backend response format.");
            alert("Upload successful but no data could be processed. Please check file format.");
            return;
          }

          // Store data for export and local preview
          setUploadedData(finalData);
          setChartTitleState(r.chart_title || r.filename || "Chart");

          // Callbacks with normalized values
          onData && onData(finalData);
          onColumns && onColumns(finalColumns);
          onTypes && onTypes(r.types || {});
          onSummary && onSummary(r.summary || {});
          onChartTitle && onChartTitle(r.chart_title || "");
          onXAxis && onXAxis(r.x_axis || (finalColumns[0] || ""));
          onYAxis && onYAxis(r.y_axis || (finalColumns[1] || ""));

          alert(r.filename ? `Uploaded: ${r.filename}` : "Upload OK");
        } catch (err) {
          console.error("Upload response parse error:", err);
          alert("Upload ok but invalid JSON");
        }
      } else {
        console.warn("Upload failed status:", xhr.status, xhr.responseText);
        alert("Upload failed");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Network error");
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

      {/* Only show export panel when data is available */}
      {uploadedData && uploadedData.length > 0 && (
        <ChartExportTool
          chartData={uploadedData}
          chartTitle={chartTitle}
          onExportImage={(format) => console.log("Export image", format)}
          onExportCSV={() => console.log("Export CSV")}
          onExportJSON={() => console.log("Export JSON")}
        />
      )}
    </div>
  );
}

export default FileUpload;
