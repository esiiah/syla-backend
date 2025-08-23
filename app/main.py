from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
from .utils import clean_dataframe, detect_column_types, summarize_numeric

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://syla-frontend.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are allowed"}

    contents = await file.read()
    try:
        # Read CSV (utf-8 fallback-safe)
        df = pd.read_csv(StringIO(contents.decode("utf-8", errors="ignore")))

        # Clean + normalize
        df_clean = clean_dataframe(df.copy())

        # Types + summary
        column_types = detect_column_types(df_clean)
        summary = summarize_numeric(df_clean)

        return {
            "filename": file.filename,
            "rows": len(df_clean),
            "columns": list(df_clean.columns),
            "types": column_types,              # {"col": "numeric" | "categorical" | "datetime"}
            "summary": summary,                 # basic stats for numeric cols
            "data": df_clean.to_dict("records") # cleaned rows for charts
        }
    except Exception as e:
        return {"error": str(e)}
