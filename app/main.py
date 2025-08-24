from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from .utils import clean_dataframe, detect_column_types, summarize_numeric

app = FastAPI()

# CORSMiddleware applied immediately to handle preflight correctly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://syla-frontend.onrender.com"],  # your deployed frontend
    allow_credentials=True,
    allow_methods=["*"],  # allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # allow Content-Type, Authorization, etc.
)

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}

    try:
        # Read CSV directly from UploadFile
        df = pd.read_csv(file.file)

        # Clean + normalize
        df_clean = clean_dataframe(df.copy())

        # Detect column types and summarize
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
