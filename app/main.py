from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
from .utils import clean_dataframe, detect_column_types, summarize_numeric

app = FastAPI()

# ✅ CORS: local + deployed
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://syla-backend-gld2.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}
    try:
        df = pd.read_csv(file.file)
        df_clean = clean_dataframe(df.copy())
        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)
        return {
            "filename": file.filename,
            "rows": len(df_clean),
            "columns": list(df_clean.columns),
            "types": column_types,
            "summary": summary,
            "data": df_clean.to_dict("records"),
        }
    except Exception as e:
        return {"error": str(e)}

# ✅ Serve built frontend at the very end
frontend_dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
