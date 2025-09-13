import io, csv, logging, os
from typing import List

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from .utils import clean_dataframe, detect_column_types, summarize_numeric

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

ALLOWED_EXTS = (".csv", ".tsv", ".xls", ".xlsx")


def make_unique_columns(cols: List[str]) -> List[str]:
    """Always return globally unique column names."""
    new_cols, seen = [], {}
    for c in cols:
        base = "" if c is None else str(c).strip()
        if base == "":
            base = "column"
        if base in seen:
            seen[base] += 1
            new_cols.append(f"{base}_{seen[base]}")
        else:
            seen[base] = 0
            new_cols.append(base)
    return new_cols


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

        # --- read as text/strings first
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

        # >>> ADD THIS BLOCK <<<
        def force_unique(cols):
            seen = {}
            out = []
            for c in cols:
                c = str(c).strip() if c is not None else "column"
                if c in seen:
                    seen[c] += 1
                    out.append(f"{c}_{seen[c]}")
                else:
                    seen[c] = 0
                    out.append(c)
            return out

        df.columns = force_unique(df.columns)
        # >>> END OF ADDED BLOCK <<<

        df = df.reset_index(drop=True)

        # --- enforce unique columns immediately
        df.columns = make_unique_columns(df.columns)

        # --- collapse any list/array cells to simple scalars
        def _collapse_cell(v):
            if isinstance(v, (list, tuple, set)):
                return " | ".join(map(str, v))
            if isinstance(v, np.ndarray):
                return " | ".join(map(str, v.flatten().tolist()))
            return v
        df = df.applymap(_collapse_cell)

        # --- clean & type-detect
        df_clean = clean_dataframe(df)

        # ensure datetimes are JSON serialisable
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


frontend_dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
