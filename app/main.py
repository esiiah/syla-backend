from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://syla-backend-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # Rename duplicate columns
    cols = pd.Series(df.columns)
    for dup in df.columns[df.columns.duplicated(keep=False)]:
        dup_indices = cols[cols == dup].index.tolist()
        for i, idx in enumerate(dup_indices):
            if i == 0:
                continue
            cols[idx] = f"{dup} {i}"
    df.columns = cols

    # Optionally fill missing values or clean rows
    df = df.fillna("")
    return df

def detect_column_types(df: pd.DataFrame) -> dict:
    types = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            types[col] = "numeric"
        else:
            types[col] = "categorical"
    return types

def summarize_numeric(df: pd.DataFrame) -> dict:
    summary = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            series = df[col].dropna()
            summary[col] = {
                "mean": series.mean() if not series.empty else None,
                "std": series.std() if not series.empty else None,
                "min": series.min() if not series.empty else None,
                "max": series.max() if not series.empty else None,
                "count": series.count(),
            }
        else:
            summary[col] = {"unique": df[col].nunique(), "top_values": df[col].value_counts().head(5).to_dict()}
    return summary

@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}
    try:
        file.file.seek(0)
        df = pd.read_csv(file.file)
        if df.empty:
            return {"error": "CSV is empty"}

        df_clean = clean_dataframe(df)
        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)
        data_records = df_clean.to_dict(orient="records")

        return {
            "filename": file.filename,
            "rows": len(df_clean),
            "columns": list(df_clean.columns),
            "types": column_types,
            "summary": summary,
            "data": data_records,
            "chart_title": file.filename,       # Title for charts
            "x_axis": list(df_clean.columns)[0],  # Default X axis name
            "y_axis": list(df_clean.columns)[1] if len(df_clean.columns) > 1 else list(df_clean.columns)[0],  # Default Y
        }
    except Exception as e:
        return {"error": str(e)}

# Serve frontend if exists
frontend_dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
