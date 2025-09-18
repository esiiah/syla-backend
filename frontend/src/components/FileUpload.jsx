// frontend/src/components/FileUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import ExportPanel from "./ExportPanel";
import UploadPanel from "./UploadPanel";

export default function FileUpload({
  action=null, accept=".csv,.xlsx,.xls", multiple=false, maxFiles=10,
  onResult=()=>{}, onData,onColumns,onTypes,onSummary,onChartTitle,onXAxis,onYAxis,
  initialFiles=null
}) {
  const [files,setFiles]=useState(initialFiles?[].concat(initialFiles):[]);
  const [progress,setProgress]=useState(0), [uploading,setUploading]=useState(false);
  const [downloadUrl,setDownloadUrl]=useState(""), [error,setError]=useState(""), [view,setView]=useState("grid");
  const inputRef=useRef(null);
  const endpoint=action?`/api/filetools/${action}`:"/api/upload";

  useEffect(()=>()=>files.forEach(f=>f.__previewUrl&&URL.revokeObjectURL(f.__previewUrl)),[files]);

  const validate=sel=>{
    if(!multiple&&sel.length>1)return alert("Only one file allowed"),false;
    if(sel.length>maxFiles)return alert(`Max ${maxFiles}`),false;
    const allowed=accept.split(",").map(s=>s.trim().toLowerCase());
    for(const f of sel){const ext="."+f.name.split(".").pop().toLowerCase();if(allowed[0]!=="*/*"&&!allowed.includes(ext))return alert(`Not allowed: ${f.name}`),false;}
    return true;
  };
  const withPreview=sel=>sel.map(f=>{try{f.__previewUrl=URL.createObjectURL(f);}catch{}return f;});
  const handleUpload=()=>{
    if(!files.length)return alert("Select a file first");
    setUploading(true);setProgress(0);
    const fd=new FormData();multiple?files.forEach(f=>fd.append("files",f)):fd.append("file",files[0]);
    const xhr=new XMLHttpRequest();xhr.open("POST",endpoint,true);
    xhr.upload.onprogress=e=>e.lengthComputable&&setProgress(Math.round(e.loaded/e.total*100));
    xhr.onload=()=>{setUploading(false);if(xhr.status>=200&&xhr.status<300){try{const r=JSON.parse(xhr.responseText);onResult(r);onData&&onData(r.data||[]);onColumns&&onColumns(r.columns||[]);onTypes&&onTypes(r.types||{});onSummary&&onSummary(r.summary||{});onChartTitle&&onChartTitle(r.chart_title||"");onXAxis&&onXAxis(r.x_axis||"");onYAxis&&onYAxis(r.y_axis||"");setDownloadUrl(r.download_url||"");alert(r.filename?`Uploaded: ${r.filename}`:"Upload OK");}catch{alert("Upload ok but invalid JSON");}}else alert("Upload failed");};
    xhr.onerror=()=>{setUploading(false);alert("Network error");};
    xhr.send(fd);
  };

  return (
    <div className="relative">
      <UploadPanel accept={accept} multiple={multiple} files={files} setFiles={f=>setFiles(withPreview(f))} onDrop={(e,sel)=>validate(sel)&&setFiles(withPreview(sel))} viewMode={view} setViewMode={setView} onUploadClick={handleUpload} primaryLabel={uploading?`Uploading ${progress}%`:"Upload & Process"}/>
      <div className="mt-4">
        {files.length===0?<div className="text-sm text-gray-500">No files selected</div>:view==="list"?<ul>{files.map((f,i)=><li key={i}>{f.name}</li>)}</ul>:view==="details"?<table><tbody>{files.map((f,i)=><tr key={i}><td>{f.name}</td><td>{f.size?`${Math.round(f.size/1024)} KB`:""}</td></tr>)}</tbody></table>:<div className="grid grid-cols-2 gap-4">{files.map((f,i)=><div key={i} className="p-2 border rounded text-center"><div className="h-24 flex items-center justify-center">{f.__previewUrl?<img src={f.__previewUrl} alt="" className="max-h-24"/>:f.name.split(".").pop()}</div><div className="truncate text-sm">{f.name}</div></div>)}</div>}
      </div>
      {uploading&&<div className="mt-2"><div className="w-full h-2 bg-gray-200"><div className="h-2 bg-blue-500" style={{width:`${progress}%`}}/></div></div>}
      <ExportPanel context="filetool" onUpload={handleUpload} downloadUrl={downloadUrl} onDownload={()=>downloadUrl?window.open(downloadUrl,"_blank"):setError("No file")} error={error}/>
    </div>
  );
}
