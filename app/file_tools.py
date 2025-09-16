# backend/file_tools.py
import os
import time
import zipfile
import shutil
import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STASH_DIR = os.path.join(BASE_DIR, "stash")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STASH_DIR, exist_ok=True)

router = APIRouter(prefix="/api/filetools", tags=["filetools"])

# ---------- Helpers ----------
def sanitize_filename(name: str) -> str:
    import re
    base = os.path.basename(name or "file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base


def unique_filename(name: str) -> str:
    ts = int(time.time() * 1000)
    return f"{ts}_{sanitize_filename(name)}"


def save_upload_fileobj(fileobj, filename: str, folder: str):
    path = os.path.join(folder, filename)
    with open(path, "wb") as fh:
        shutil.copyfileobj(fileobj, fh)
    return path


def save_upload_file(upload: UploadFile, folder: str = UPLOAD_DIR) -> str:
    """
    Save an UploadFile to disk and return saved filename (not full path).
    """
    saved_name = unique_filename(upload.filename or "file")
    path = os.path.join(folder, saved_name)
    # Use copyfileobj for streaming
    with open(path, "wb") as fh:
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return saved_name


# ---------- Stash (temporary tokenized storage) ----------
stash_map = {}  # token -> (saved_filename, timestamp)
STASH_EXPIRY = 10 * 60  # 600 seconds / 10 minutes


def cleanup_stash():
    now = time.time()
    expired = [t for t, (_, ts) in stash_map.items() if now - ts > STASH_EXPIRY]
    for t in expired:
        fname, _ = stash_map.get(t, (None, None))
        if fname:
            p = os.path.join(STASH_DIR, fname)
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        stash_map.pop(t, None)


@router.post("/stash")
async def stash_file(file: UploadFile = File(...)):
    """
    Temporarily stash a file and return a token.
    Token is valid for STASH_EXPIRY seconds.
    """
    cleanup_stash()
    token = uuid.uuid4().hex
    saved = save_upload_file(file, folder=STASH_DIR)
    stash_map[token] = (saved, time.time())
    return {"token": token, "filename": file.filename}


@router.get("/retrieve/{token}")
async def retrieve_file(token: str):
    """
    Retrieve a stashed file by token (returns FileResponse).
    """
    cleanup_stash()
    if token not in stash_map:
        raise HTTPException(status_code=404, detail="Stashed file not found")
    saved_fname, _ = stash_map[token]
    path = os.path.join(STASH_DIR, saved_fname)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    # Return file as attachment
    return FileResponse(path, filename=saved_fname)


# ---------- Core file tools endpoints ----------
@router.post("/compress")
async def compress_file(file: UploadFile = File(...)):
    """
    Save file and return a zip containing it.
    """
    saved_name = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    zip_name = f"compressed_{int(time.time() * 1000)}.zip"
    zip_path = os.path.join(UPLOAD_DIR, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # arcname should be original filename so user sees original name inside zip
        arcname = file.filename or saved_name
        zf.write(saved_path, arcname=arcname)

    return {"message": f"{file.filename} compressed successfully", "download_url": f"/api/files/{zip_name}"}


@router.post("/merge")
async def merge_files(files: List[UploadFile] = File(...)):
    """
    Accepts multiple files and returns a zip containing them all.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    saved = []
    for f in files:
        saved_name = save_upload_file(f)
        saved.append((f.filename or saved_name, os.path.join(UPLOAD_DIR, saved_name)))

    merged_name = f"merged_{int(time.time() * 1000)}.zip"
    merged_path = os.path.join(UPLOAD_DIR, merged_name)
    with zipfile.ZipFile(merged_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for orig_name, path in saved:
            zf.write(path, arcname=orig_name)

    return {"message": f"Merged {len(saved)} files", "download_url": f"/api/files/{merged_name}"}


@router.post("/convert")
async def convert_file(file: UploadFile = File(...), target: str = Form("pdf")):
    """
    Minimal safe conversions:
      - csv -> xlsx using pandas (if installed)
      - xls/xlsx -> csv using pandas (if installed)
    Otherwise just save file and return stored path.
    """
    fname = file.filename or "file"
    lower = fname.lower()
    saved_name = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    # Try small deterministic conversions
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
        # If pandas or conversion fails, we'll fall through and return saved file
        pass

    return {"message": f"Conversion to {target} not implemented on server; original saved", "download_url": f"/api/files/{saved_name}"}


@router.get("/list")
async def list_uploaded_files():
    """
    Return list of files saved in UPLOAD_DIR
    """
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
    """
    Delete a file previously uploaded (by saved filename).
    """
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(path)
    return {"message": "Deleted", "name": saved_filename}
