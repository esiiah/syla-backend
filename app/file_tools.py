# file_tools.py
import os
import time
import zipfile
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/filetools", tags=["filetools"])


def sanitize_filename(name: str) -> str:
    import re
    base = os.path.basename(name or "file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base


def unique_filename(name: str) -> str:
    ts = int(time.time() * 1000)
    return f"{ts}_{sanitize_filename(name)}"


def save_upload_file(upload: UploadFile) -> str:
    contents = upload.file.read()
    saved_name = unique_filename(upload.filename or "file")
    path = os.path.join(UPLOAD_DIR, saved_name)
    with open(path, "wb") as fh:
        fh.write(contents)
    try:
        upload.file.close()
    except Exception:
        pass
    return saved_name


@router.post("/compress")
async def compress_file(file: UploadFile = File(...)):
    saved_name = unique_filename(file.filename or "file")
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    contents = await file.read()
    with open(saved_path, "wb") as fh:
        fh.write(contents)

    # Create a .zip that contains the saved file (simple compression wrapper)
    zip_name = f"compressed_{int(time.time() * 1000)}.zip"
    zip_path = os.path.join(UPLOAD_DIR, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(saved_path, arcname=file.filename or saved_name)

    return {"message": f"{file.filename} compressed successfully", "download_url": f"/api/files/{zip_name}"}


@router.post("/merge")
async def merge_files(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Save all files
    saved = []
    for f in files:
        contents = await f.read()
        name = unique_filename(f.filename or "file")
        path = os.path.join(UPLOAD_DIR, name)
        with open(path, "wb") as fh:
            fh.write(contents)
        saved.append((f.filename or name, path))

    # For now create a zip that contains all files (safe, generic "merge")
    merged_name = f"merged_{int(time.time() * 1000)}.zip"
    merged_path = os.path.join(UPLOAD_DIR, merged_name)
    with zipfile.ZipFile(merged_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for original_name, path in saved:
            zf.write(path, arcname=original_name)

    return {"message": f"Merged {len(saved)} files", "download_url": f"/api/files/{merged_name}"}


@router.post("/convert")
async def convert_file(
    file: UploadFile = File(...),
    target: str = Form("pdf"),
):
    # Minimal conversion helpers: implement csv->xlsx, xlsx->csv using pandas if available
    fname = file.filename or "file"
    lower = fname.lower()
    saved_name = unique_filename(fname)
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    contents = await file.read()
    with open(saved_path, "wb") as fh:
        fh.write(contents)

    # Try to do simple conversions that are safe:
    try:
        if lower.endswith(".csv") and target.lower() in ("xlsx", "xls", "excel"):
            import pandas as pd
            df = pd.read_csv(saved_path)
            out_name = f"converted_{int(time.time() * 1000)}.xlsx"
            out_path = os.path.join(UPLOAD_DIR, out_name)
            df.to_excel(out_path, index=False)
            return {"message": "Converted CSV -> Excel", "download_url": f"/api/files/{out_name}"}
        if lower.endswith((".xls", ".xlsx")) and target.lower() in ("csv",):
            import pandas as pd
            df = pd.read_excel(saved_path)
            out_name = f"converted_{int(time.time() * 1000)}.csv"
            out_path = os.path.join(UPLOAD_DIR, out_name)
            df.to_csv(out_path, index=False)
            return {"message": "Converted Excel -> CSV", "download_url": f"/api/files/{out_name}"}
    except Exception:
        # ignore and fall through to generic response
        pass

    # For other types conversion is not implemented server-side here
    return {"message": f"Conversion to {target} not implemented on server; original saved", "download_url": f"/api/files/{os.path.basename(saved_path)}"}


@router.get("/list")
async def list_uploaded_files():
    items = []
    for fn in sorted(os.listdir(UPLOAD_DIR), reverse=True):
        path = os.path.join(UPLOAD_DIR, fn)
        if not os.path.isfile(path):
            continue
        items.append(
            {
                "name": fn,
                "size": os.path.getsize(path),
                "download_url": f"/api/files/{fn}",
            }
        )
    return {"files": items}


@router.delete("/delete/{saved_filename}")
async def delete_uploaded_file(saved_filename: str):
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(path)
    return {"message": "Deleted", "name": saved_filename}
