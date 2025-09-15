import io
import csv
import logging
import os
from typing import List

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from .utils import clean_dataframe, detect_column_types, summarize_numeric
from . import file_tools  # your existing router

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

ALLOWED_EXTS = (".csv", ".tsv", ".xls", ".xlsx")


def make_unique_columns(cols: List[str]) -> List[str]:
    """Return column names guaranteed to be unique: name, name_1, name_2, ..."""
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


@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_file"
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTS):
        raise HTTPException(status_code=400, detail="Only CSV/TSV/XLS/XLSX files are allowed")

    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File is empty")

        # --- read file robustly (as strings initially)
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

        # Clean & type-detect
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


# -------------------------
# Serve React frontend correctly
# -------------------------
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

# Mount static assets
app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="static")

# Catch-all route for React Router
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    Serve React's index.html for all non-API routes so React Router works in production.
    """
    # Do not override API routes
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "API route not found"}, status_code=404)

    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"detail": "Frontend not found"}, status_code=404)
