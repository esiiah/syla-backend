# main.py
import io
import csv
import logging
import os
import time
import mimetypes
import re
from typing import List

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from .utils import clean_dataframe, detect_column_types, summarize_numeric
from .file_tools_full import router as file_tools_full_router, UPLOAD_DIR
from app.routers import auth as auth_router   # ✅ import from routers
from app.routers import profile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syla-backend")

app = FastAPI(title="Syla Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# 🔗 include routers
app.include_router(file_tools_full_router)
app.include_router(auth_router.router)   # ✅ use .router
app.include_router(profile.router)

# Mount uploaded files directory so download_url /api/files/<name> works
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# ---- File handling setup ----
ALLOWED_EXTS = (
    ".csv", ".tsv", ".xls", ".xlsx",  # tabular
    ".pdf", ".doc", ".docx", ".txt", ".pptx", ".zip", ".json"  # other
)
TABULAR_EXTS = (".csv", ".tsv", ".xls", ".xlsx")

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Frontend directory
FRONTEND_DIR = os.path.join(BASE_DIR, "dist")  # ✅ correct path inside app/


# ----- Utilities -----
def sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "uploaded_file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base


def unique_filename(name: str) -> str:
    safe = sanitize_filename(name)
    ts = int(time.time() * 1000)
    return f"{ts}_{safe}"


# ----- Health check -----
@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}


# ----- File upload -----
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTS):
        raise HTTPException(status_code=400, detail="File type not allowed")

    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File is empty")

        # --- Tabular: process with pandas ---
        if lower.endswith(TABULAR_EXTS):
            if lower.endswith((".xls", ".xlsx")):
                df = pd.read_excel(io.BytesIO(raw), dtype=str)
            else:
                text = raw.decode("utf-8", errors="replace")
                try:
                    df = pd.read_csv(io.StringIO(text), sep=None, engine="python",
                                     dtype=str, keep_default_na=False)
                except Exception:
                    sample = text[:8192]
                    try:
                        dialect = csv.Sniffer().sniff(sample)
                        delim = dialect.delimiter
                    except Exception:
                        delim = "\t" if "\t" in sample else ","
                    df = pd.read_csv(io.StringIO(text), sep=delim, engine="python",
                                     dtype=str, keep_default_na=False)

            if df is None or df.empty:
                raise HTTPException(status_code=400, detail="No data found in the file")

            # --- normalize columns ---
            def make_unique_columns(cols: List[str]) -> List[str]:
                out, counts = [], {}
                for c in cols:
                    base = "" if c is None else str(c).strip()
                    if base == "":
                        base = "column"
                    if base in counts:
                        counts[base] += 1
                        out_name = f"{base}_{counts[base]}"
                    else:
                        counts[base] = 0
                        out_name = base
                    out.append(out_name)
                return out

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [
                    " | ".join([str(x).strip() for x in col if str(x).strip() != ""]) or "column"
                    for col in df.columns
                ]
            df.columns = make_unique_columns(df.columns)
            df = df.reset_index(drop=True)

            # collapse lists/arrays in cells
            def _collapse_cell(v):
                if isinstance(v, (list, tuple, set)):
                    return " | ".join(map(str, v))
                if isinstance(v, np.ndarray):
                    return " | ".join(map(str, v.flatten().tolist()))
                return v

            df = df.applymap(_collapse_cell)

            df_clean = clean_dataframe(df)

            # convert datetimes to str
            for col in df_clean.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
                df_clean[col] = df_clean[col].astype(str)

            column_types = detect_column_types(df_clean)
            summary = summarize_numeric(df_clean)
            data_records = df_clean.to_dict(orient="records")

            x_axis = df_clean.columns[0] if len(df_clean.columns) else ""
            y_axis = x_axis
            numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
            if numeric_cols:
                if x_axis in numeric_cols and len(numeric_cols) > 1:
                    y_axis = numeric_cols[1]
                else:
                    y_axis = numeric_cols[0]

            # save cleaned csv
            saved_name = unique_filename(f"cleaned_{filename}.csv")
            with open(os.path.join(UPLOAD_DIR, saved_name), "wb") as fh:
                fh.write(df_clean.to_csv(index=False).encode("utf-8"))

            return JSONResponse(
                content={
                    "filename": filename,
                    "rows": len(df_clean),
                    "columns": list(df_clean.columns),
                    "types": column_types,
                    "summary": summary,
                    "data": data_records,
                    "chart_title": filename,
                    "x_axis": x_axis,
                    "y_axis": y_axis,
                    "download_url": f"/api/files/{saved_name}",
                }
            )

        # --- Non-tabular: just save and return meta ---
        else:
            saved_name = unique_filename(filename)
            saved_path = os.path.join(UPLOAD_DIR, saved_name)
            with open(saved_path, "wb") as fh:
                fh.write(raw)

            return JSONResponse(
                content={
                    "filename": filename,
                    "rows": 0,
                    "columns": [],
                    "types": {},
                    "summary": {},
                    "data": [],
                    "chart_title": filename,
                    "x_axis": "",
                    "y_axis": "",
                    "download_url": f"/api/files/{saved_name}",
                    "size": os.path.getsize(saved_path),
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Server error: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            pass


# ----- Serve uploaded files -----
@app.get("/api/files/{saved_filename}")
async def serve_uploaded_file(saved_filename: str):
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    mime_type, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=mime_type or "application/octet-stream",
                        filename=os.path.basename(path))


# ✅ Custom SPA fallback handler
@app.get("/{path:path}")
async def spa_fallback(request: Request, path: str):
    """
    Serve static files and handle SPA routing.
    If a static file exists, serve it. Otherwise, serve index.html for client-side routing.
    """
    # Skip API routes - they should be handled by their respective routers
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Try to serve static file first
    file_path = os.path.join(FRONTEND_DIR, path)
    
    # If it's a file and exists, serve it
    if os.path.isfile(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(file_path, media_type=mime_type)
    
    # For directories or non-existent files, try index.html in that directory
    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path, media_type="text/html")
    
    # Fallback to root index.html for SPA routing
    root_index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(root_index):
        return FileResponse(root_index, media_type="text/html")
    
    # If no index.html exists, return 404
    raise HTTPException(status_code=404, detail="Page not found")
