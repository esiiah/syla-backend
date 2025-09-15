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
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from .utils import clean_dataframe, detect_column_types, summarize_numeric
from . import file_tools  # router with additional file tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syla-backend")

app = FastAPI(title="Syla Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(file_tools.router)

# Allow more file types (CSV/Excel remain processed as dataframes, others saved)
ALLOWED_EXTS = (
    ".csv",
    ".tsv",
    ".xls",
    ".xlsx",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".pptx",
    ".zip",
    ".json",
)

TABULAR_EXTS = (".csv", ".tsv", ".xls", ".xlsx")

# Directory to save uploaded non-tabular files or cleaned csv exports
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def sanitize_filename(name: str) -> str:
    # Keep base name and replace unsafe chars
    base = os.path.basename(name or "uploaded_file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base


def unique_filename(name: str) -> str:
    safe = sanitize_filename(name)
    ts = int(time.time() * 1000)
    return f"{ts}_{safe}"


@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTS):
        raise HTTPException(status_code=400, detail="Only specific file types are allowed")

    saved_name = None
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File is empty")

        # Tabular files -> parse & return data (same logic as your working version)
        if lower.endswith(TABULAR_EXTS):
            # read robustly (strings initially)
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
                raise HTTPException(status_code=400, detail="No data found in the uploaded file")

            # If MultiIndex columns (Excel with multi-row header), collapse them first
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [
                    " | ".join([str(x).strip() for x in col if str(x).strip() != ""]) or "column"
                    for col in df.columns
                ]

            # Ensure unique names immediately to avoid any DataFrame-slice issues later
            def make_unique_columns(cols: List[str]) -> List[str]:
                out: List[str] = []
                counts: dict = {}
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

            df.columns = make_unique_columns(df.columns)
            df = df.reset_index(drop=True)

            # Collapse any list/array cells to simple scalars (defensive)
            def _collapse_cell(v):
                if isinstance(v, (list, tuple, set)):
                    return " | ".join(map(str, v))
                if isinstance(v, np.ndarray):
                    return " | ".join(map(str, v.flatten().tolist()))
                return v

            df = df.applymap(_collapse_cell)

            # Clean & type-detect (utils does normalization too)
            df_clean = clean_dataframe(df)

            # Convert datetimes to strings for JSON
            for col in df_clean.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
                df_clean[col] = df_clean[col].astype(str)

            column_types = detect_column_types(df_clean)
            summary = summarize_numeric(df_clean)
            data_records = df_clean.to_dict(orient="records")

            x_axis = df_clean.columns[0] if len(df_clean.columns) else ""
            y_axis = x_axis
            numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
            if numeric_cols:
                if x_axis in numeric_cols:
                    y_axis = numeric_cols[1] if len(numeric_cols) > 1 else numeric_cols[0]
                else:
                    y_axis = numeric_cols[0]

            # save cleaned CSV for export
            cleaned_csv = df_clean.to_csv(index=False).encode("utf-8")
            saved_name = unique_filename(f"cleaned_{filename}.csv")
            saved_path = os.path.join(UPLOAD_DIR, saved_name)
            with open(saved_path, "wb") as fh:
                fh.write(cleaned_csv)

            download_url = f"/api/files/{saved_name}"

            return JSONResponse(
                status_code=200,
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
                    "download_url": download_url,
                },
            )

        # Non-tabular file -> save to uploads and return metadata + download url
        else:
            saved_name = unique_filename(filename)
            saved_path = os.path.join(UPLOAD_DIR, saved_name)
            with open(saved_path, "wb") as fh:
                fh.write(raw)

            download_url = f"/api/files/{saved_name}"
            file_size = os.path.getsize(saved_path)

            return JSONResponse(
                status_code=200,
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
                    "download_url": download_url,
                    "size": file_size,
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Server error processing file: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            pass


@app.get("/api/files/{saved_filename}")
async def serve_uploaded_file(saved_filename: str):
    # Prevent path traversal: saved_filename should not contain path separators
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    mime_type, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=mime_type or "application/octet-stream", filename=os.path.basename(path))


# Frontend static serving (try the common locations)
frontend_candidates = [
    os.path.join(BASE_DIR, "dist"),
    os.path.join(BASE_DIR, "../frontend/dist"),
    os.path.join(BASE_DIR, "frontend/dist"),
]
frontend_dist_path = next((p for p in frontend_candidates if os.path.isdir(p)), None)

if frontend_dist_path:
    # mount static assets (assets directory if exists)
    assets_dir = os.path.join(frontend_dist_path, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/static", StaticFiles(directory=assets_dir), name="static")

    # catch-all to serve index.html for react-router
    from fastapi import Request

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        # Do not override API routes
        # Ensure any path starting with 'api/' hits API (not the SPA)
        if full_path.startswith("api/") or full_path.startswith("_next") or full_path.startswith("static/"):
            return JSONResponse({"detail": "API route not found"}, status_code=404)

        index_file = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse({"detail": "Frontend not found"}, status_code=404)
