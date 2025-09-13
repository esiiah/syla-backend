# app/main.py
import io
import csv
import logging
import os
from typing import List

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

# ✅ relative import (since utils.py is in same package)
from .utils import clean_dataframe, detect_column_types, summarize_numeric

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syla-backend")

app = FastAPI(title="Syla Backend")

# Public app: allow any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

ALLOWED_EXTS = (".csv", ".tsv", ".xls", ".xlsx")


def make_unique_columns(cols: List[str]) -> List[str]:
    cleaned = [("" if c is None else str(c).strip()) for c in cols]
    counts = {}
    for name in cleaned:
        counts[name] = counts.get(name, 0) + 1

    duplicates = {name for name, c in counts.items() if c > 1}
    counters = {name: 0 for name in duplicates}
    result = []
    for idx, name in enumerate(cleaned, start=1):
        if name == "":
            base = f"column_{idx}"
            if base in duplicates:
                counters.setdefault(base, 0)
                counters[base] += 1
                result.append(f"{base} {counters[base]}")
            else:
                result.append(base)
        elif name in duplicates:
            counters[name] += 1
            result.append(f"{name} {counters[name]}")
        else:
            result.append(name)
    return result


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
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="File is empty")

        # Read dataframe
        if lower.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            text = contents.decode("utf-8", errors="replace")

            # Try pandas auto-detection first (safer for many messy CSVs).
            try:
                df = pd.read_csv(io.StringIO(text), sep=None, engine="python", dtype=str)
            except Exception:
                sample = text[:8192]
                try:
                    dialect = csv.Sniffer().sniff(sample)
                    delim = dialect.delimiter
                except Exception:
                    delim = "\t" if "\t" in sample else ","
                df = pd.read_csv(io.StringIO(text), sep=delim, engine="python", dtype=str)

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="No data found in the uploaded file")

        # Clean & process
        df.columns = make_unique_columns(list(df.columns))
        df_clean = clean_dataframe(df)

        # ✅ Ensure datetime columns are JSON serializable
        for col in df_clean.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
            df_clean[col] = df_clean[col].astype(str)

        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)
        data_records = df_clean.to_dict(orient="records")

        # Default axes
        x_axis = df_clean.columns[0] if len(df_clean.columns) >= 1 else ""
        y_axis = x_axis
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        if numeric_cols:
            if x_axis in numeric_cols:
                if len(numeric_cols) > 1:
                    y_axis = numeric_cols[1] if numeric_cols[0] == x_axis else numeric_cols[0]
                else:
                    y_axis = numeric_cols[0]
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
        raise HTTPException(status_code=500, detail=f"Server error processing file: {str(e)}")
    finally:
        try:
            await file.close()
        except Exception:
            pass


# Serve frontend (optional)
frontend_dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
