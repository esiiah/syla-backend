from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
import pandas as pd
from .utils import clean_dataframe, detect_column_types, summarize_numeric

from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# ------------------- CORS -------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- API ROUTES -------------------

# Health check
@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}

# CSV upload
@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}

    try:
        # Read CSV directly
        df = pd.read_csv(file.file)

        # Clean and normalize
        df_clean = clean_dataframe(df.copy())

        # Column types + summary
        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)

        return {
            "filename": file.filename,
            "rows": len(df_clean),
            "columns": list(df_clean.columns),
            "types": column_types,
            "summary": summary,
            "data": df_clean.to_dict("records")
        }
    except Exception as e:
        return {"error": str(e)}

# ------------------- FRONTEND -------------------
# Ensure frontend/dist is served for all non-API routes
frontend_path = os.path.join(os.path.dirname(__file__), "dist")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
