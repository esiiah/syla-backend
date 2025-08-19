from fastapi import FastAPI, UploadFile, File
import pandas as pd
import io

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        if file.content_type == "text/csv":
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents))
            # Basic cleaning: drop empty cols, fill NaN
            df = df.dropna(axis=1, how="all").fillna("")
            return {
                "filename": file.filename,
                "columns": df.columns.tolist(),
                "rows": len(df)
            }
        else:
            return {"error": "Only CSV files supported for now."}
    except Exception as e:
        return {"error": str(e)}
