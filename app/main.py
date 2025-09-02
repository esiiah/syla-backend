from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
import pandas as pd
from .utils import clean_dataframe, detect_column_types, summarize_numeric

app = FastAPI()

# CORS middleware (optional for development, not needed in production if same origin)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # during production with same domain, this can be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React frontend from frontend/dist
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")

# API route for health check
@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}

# CSV upload endpoint
@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}

    try:
        # Read CSV directly from UploadFile
        df = pd.read_csv(file.file)

        # Clean and normalize
        df_clean = clean_dataframe(df.copy())

        # Column types and numeric summary
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
