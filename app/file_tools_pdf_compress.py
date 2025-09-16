# syla-backend/app/file_tools_pdf_compress.py
import os
import shutil
import tempfile
import time
import subprocess
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api/filetools/pdf", tags=["filetools-pdf"])

# Where to keep temp files (ensure writable)
TMP_DIR = os.path.join(os.path.dirname(__file__), "tmp_pdf")
os.makedirs(TMP_DIR, exist_ok=True)

# Compression level mapping -> Ghostscript PDFSETTINGS
GS_SETTINGS = {
    "strong": "/screen",   # smallest, low quality (~72dpi)
    "medium": "/ebook",    # medium (~150dpi)
    "light": "/printer",   # light compression (better quality)
}

# Helper: find ghostscript executable name
def find_ghostscript_exec():
    names = ["gs", "gswin64c", "gswin32c"]
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None

GS_EXEC = find_ghostscript_exec()

# Helper: run ghostscript compression: input_path -> output_path, using a PDFSETTINGS
def _gs_compress(input_path: str, output_path: str, pdfsetting: str):
    if GS_EXEC is None:
        raise RuntimeError("Ghostscript not available")
    # Build command (quiet)
    cmd = [
        GS_EXEC,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={pdfsetting}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        f"-sOutputFile={output_path}",
        input_path,
    ]
    subprocess.check_call(cmd)  # raises CalledProcessError on failure

# Fallback: use pikepdf if available (less flexible than Ghostscript for size control)
def _pikepdf_compress(input_path: str, output_path: str, level: str):
    try:
        import pikepdf
    except Exception as e:
        raise RuntimeError("pikepdf not available") from e

    # pikepdf does not offer simple preset quality levels like Ghostscript.
    # We will save with optimize_streams=True; that helps but won't match GS settings.
    pdf = pikepdf.Pdf.open(input_path)
    # save with optimize_streams, maybe linearize
    pdf.save(output_path, optimize_streams=True)
    pdf.close()

def _ensure_pdf(upload: UploadFile):
    name = upload.filename or ""
    if not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted for this tool")
    return True

def _write_upload_to_temp(upload: UploadFile, prefix="upload_"):
    ext = Path(upload.filename).suffix or ".pdf"
    fd, tmp_path = tempfile.mkstemp(prefix=prefix, suffix=ext, dir=TMP_DIR)
    os.close(fd)
    with open(tmp_path, "wb") as fh:
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return tmp_path

# Endpoint: preview compressed sizes for each level
@router.post("/compress-preview")
async def compress_preview(file: UploadFile = File(...)):
    """
    Upload a PDF and get estimated compressed sizes for 'light','medium','strong'.
    The server will run a fast compression for each level (to temp) and report file sizes.
    """
    _ensure_pdf(file)
    input_path = _write_upload_to_temp(file, prefix="preview_in_")

    results = {}
    try:
        for level, gs_setting in GS_SETTINGS.items():
            out_fd, out_tmp = tempfile.mkstemp(prefix=f"preview_{level}_", suffix=".pdf", dir=TMP_DIR)
            os.close(out_fd)
            try:
                if GS_EXEC:
                    _gs_compress(input_path, out_tmp, gs_setting)
                else:
                    # fallback to pikepdf (no level differentiation) — write once, copy size
                    _pikepdf_compress(input_path, out_tmp, level)
                size = os.path.getsize(out_tmp)
                results[level] = {"size_bytes": size}
            except Exception as e:
                # If one level fails, return error for that level
                results[level] = {"error": str(e)}
            finally:
                # keep out_tmp so we can calculate sizes; we'll cleanup below
                pass
    finally:
        # remove original input file
        try:
            os.remove(input_path)
        except Exception:
            pass
        # remove preview output files
        # NOTE: we already measured sizes; clean the preview files
        for f in os.listdir(TMP_DIR):
            if f.startswith("preview_"):
                try:
                    os.remove(os.path.join(TMP_DIR, f))
                except Exception:
                    pass

    # Return results with readable sizes
    for k, v in results.items():
        if "size_bytes" in v:
            v["size_readable"] = human_readable_size(v["size_bytes"])
    return {"results": results}

# Helper readable size
def human_readable_size(n):
    for unit in ['B','KB','MB','GB','TB']:
        if n < 1024.0:
            return f"{n:3.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} PB"

# Endpoint: perform compression and return compressed PDF
@router.post("/compress")
async def compress_file(file: UploadFile = File(...), level: str = Form("medium")):
    """
    Compress uploaded PDF at requested level (light|medium|strong).
    Returns FileResponse with compressed PDF.
    """
    level = (level or "medium").lower()
    if level not in GS_SETTINGS.keys():
        raise HTTPException(status_code=400, detail=f"Invalid compression level '{level}'")

    _ensure_pdf(file)
    input_path = _write_upload_to_temp(file, prefix="compress_in_")
    out_fd, out_tmp = tempfile.mkstemp(prefix=f"compress_{level}_", suffix=".pdf", dir=TMP_DIR)
    os.close(out_fd)

    try:
        if GS_EXEC:
            _gs_compress(input_path, out_tmp, GS_SETTINGS[level])
        else:
            # fallback to pikepdf
            try:
                _pikepdf_compress(input_path, out_tmp, level)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"No compression backend available: {e}")

        size_before = os.path.getsize(input_path)
        size_after = os.path.getsize(out_tmp)
        # Build a meaningful filename
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_name = f"{orig_name}_compressed_{level}.pdf"

        # Return metadata and file
        headers = {
            "X-Original-Size": str(size_before),
            "X-Compressed-Size": str(size_after),
        }
        return FileResponse(out_tmp, filename=out_name, headers=headers)
    finally:
        # cleanup original upload (out_tmp is returned, do not remove immediately)
        try:
            os.remove(input_path)
        except Exception:
            pass
        # NOTE: don't delete out_tmp here because FileResponse streams it.
