from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO

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
        df = pd.read_csv(StringIO(contents.decode("utf-8")))
        return {
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
        }
    except Exception as e:
        return {"error": str(e)}
