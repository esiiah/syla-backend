from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

router = APIRouter(prefix="/api/filetools", tags=["filetools"])

@router.post("/compress")
async def compress_file(file: UploadFile = File(...)):
    # TODO: add real compression
    return {"message": f"{file.filename} compressed successfully"}

@router.post("/merge")
async def merge_files(files: List[UploadFile]):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    # TODO: add real merging
    return {"message": f"Merged {len(files)} files"}

@router.post("/convert")
async def convert_file(file: UploadFile = File(...), target: str = "pdf"):
    # TODO: add real conversion
    return {"message": f"{file.filename} converted to {target}"}
