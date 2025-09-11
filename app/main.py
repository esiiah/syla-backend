# backend/main.py
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

from .utils import clean_dataframe, detect_column_types, summarize_numeric

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syla-backend")

app = FastAPI(title="Syla Backend")

# Public app: allow any origin (if you want to lock to your frontend add explicit origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

ALLOWED_EXTS = (".csv", ".tsv", ".xls", ".xlsx")


def make_unique_columns(cols: List[str]) -> List[str]:
    """
    If any column name appears multiple times, rename all occurrences into:
      Name 1, Name 2, ...
    This matches your requirement: if there is "school", "school" -> "school 1", "school 2".
    Blank or null column names are replaced with "column <index> 1/2..." as needed.
    """
    cleaned = [("" if c is None else str(c).strip()) for c in cols]
    counts = {}
    for name in cleaned:
        counts[name] = counts.get(name, 0) + 1

    # If a name is duplicated, we will enumerate each occurrence "Name 1", "Name 2", ...
    duplicates = {name for name, c in counts.items() if c > 1}
    counters = {name: 0 for name in duplicates}
    result = []
    for idx, name in enumerate(cleaned, start=1):
        if name == "":
            # give generic name if header blank
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
    """
    Accept CSV/TSV or Excel files, parse robustly, clean dataframe and return JSON:
      - filename, rows, columns, types, summary, data, chart_title, x_axis, y_axis
    """
    filename = file.filename or "uploaded_file"
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTS):
        raise HTTPException(status_code=400, detail="Only CSV/TSV/XLS/XLSX files are allowed")

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="File is empty")

        # Parse
        if lower.endswith((".xls", ".xlsx")):
            # Excel
            df = pd.read_excel(io.BytesIO(contents))
        else:
            # Try to decode as text and sniff delimiter
            text = contents.decode("utf-8", errors="replace")
            sample = text[:8192]
            try:
                dialect = csv.Sniffer().sniff(sample)
                delim = dialect.delimiter
            except Exception:
                # fallback: detect common separators
                if "\t" in sample:
                    delim = "\t"
                else:
                    delim = ","
            df = pd.read_csv(io.StringIO(text), sep=delim, engine="python")

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="No data found in the uploaded file")

        # Normalize column headers and ensure uniqueness in the requested format
        df.columns = make_unique_columns(list(df.columns))

        # Clean dataframe (numeric coercion, datetime attempts, drop empty cols, fill missing)
        df_clean = clean_dataframe(df)

        # Summaries & types
        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)

        data_records = df_clean.to_dict(orient="records")

        # Default axes - prefer first numeric as y if available
        x_axis = df_clean.columns[0] if len(df_clean.columns) >= 1 else ""
        y_axis = x_axis
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        if numeric_cols:
            # set default y to first numeric column (if not the first column)
            if x_axis in numeric_cols:
                # pick second numeric if exists
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
        # propagated error (400s)
        raise
    except Exception as e:
        logger.exception("Upload failed")
        # Return 500 with message so frontend can show it
        raise HTTPException(status_code=500, detail=f"Server error processing file: {str(e)}")
    finally:
        try:
            await file.close()
        except Exception:
            pass


# Serve frontend if compiled into backend/dist
frontend_dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
