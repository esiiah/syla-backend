# app/file_tools_full.py
import os
import time
import uuid
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api/filetools", tags=["filetools"])

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STASH_DIR = os.path.join(BASE_DIR, "stash")
TMP_DIR = os.path.join(BASE_DIR, "tmp")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STASH_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

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

def save_upload_file(upload: UploadFile, folder: str = UPLOAD_DIR) -> str:
    saved_name = unique_filename(upload.filename or "file")
    path = os.path.join(folder, saved_name)
    with open(path, "wb") as fh:
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return saved_name

def write_upload_to_temp(upload: UploadFile, prefix="tmp_") -> str:
    ext = Path(upload.filename).suffix or ".bin"
    fd, tmp_path = tempfile.mkstemp(prefix=prefix, suffix=ext, dir=TMP_DIR)
    os.close(fd)
    with open(tmp_path, "wb") as fh:
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return tmp_path

def human_readable_size(n: int) -> str:
    if n is None:
        return "-"
    n = float(n)
    for unit in ['B','KB','MB','GB','TB']:
        if n < 1024.0:
            return f"{n:3.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} PB"

# ---------- Stash ----------
stash_map = {}  # token -> (saved_filename, timestamp)
STASH_EXPIRY = 10 * 60  # seconds

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
    cleanup_stash()
    token = uuid.uuid4().hex
    saved = save_upload_file(file, folder=STASH_DIR)
    stash_map[token] = (saved, time.time())
    return {"token": token, "filename": file.filename}

@router.get("/retrieve/{token}")
async def retrieve_file(token: str):
    cleanup_stash()
    if token not in stash_map:
        raise HTTPException(status_code=404, detail="Stashed file not found")
    saved_fname, _ = stash_map[token]
    path = os.path.join(STASH_DIR, saved_fname)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=saved_fname)

# ---------- Listing / Deleting ----------
@router.get("/list")
async def list_uploaded_files():
    items = []
    for fn in sorted(os.listdir(UPLOAD_DIR), reverse=True):
        path = os.path.join(UPLOAD_DIR, fn)
        if not os.path.isfile(path):
            continue
        items.append({"name": fn, "size": os.path.getsize(path), "download_url": f"/api/files/{fn}"})
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

# ---------- Utility: find external binaries ----------
def find_executable(names: List[str]) -> Optional[str]:
    for n in names:
        path = shutil.which(n)
        if path:
            return path
    return None

GS_EXEC = find_executable(["gs", "gswin64c", "gswin32c"])
SOFFICE_EXEC = find_executable(["soffice", "soffice.bin"])
QPDF_EXEC = find_executable(["qpdf"])

# ---------- PDF compression (preview + compress) ----------
# Uses Ghostscript if available for good presets, else falls back to pikepdf if installed.
GS_SETTINGS = {"strong": "/screen", "medium": "/ebook", "light": "/printer"}

def _gs_compress(input_path: str, output_path: str, pdfsetting: str):
    if GS_EXEC is None:
        raise RuntimeError("Ghostscript not available")
    cmd = [GS_EXEC, "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4",
           f"-dPDFSETTINGS={pdfsetting}", "-dNOPAUSE", "-dQUIET", "-dBATCH",
           f"-sOutputFile={output_path}", input_path]
    subprocess.check_call(cmd)

def _pikepdf_compress(input_path: str, output_path: str, level: str):
    try:
        import pikepdf
    except Exception as e:
        raise RuntimeError("pikepdf not available") from e
    pdf = pikepdf.Pdf.open(input_path)
    pdf.save(output_path, optimize_streams=True)
    pdf.close()

@router.post("/pdf/compress-preview")
async def pdf_compress_preview(file: UploadFile = File(...)):
    # Strict validation
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for compression preview")
    in_path = write_upload_to_temp(file, prefix="preview_in_")
    results = {}
    try:
        for level, gs_setting in GS_SETTINGS.items():
            out_tmp = None   # <-- added fix
            try:
                fd, out_tmp = tempfile.mkstemp(prefix=f"preview_{level}_", suffix=".pdf", dir=TMP_DIR)
                os.close(fd)
                if GS_EXEC:
                    _gs_compress(in_path, out_tmp, gs_setting)
                else:
                    _pikepdf_compress(in_path, out_tmp, level)
                size = os.path.getsize(out_tmp)
                results[level] = {"size_bytes": size, "size_readable": human_readable_size(size)}
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                try:
                    if out_tmp and os.path.exists(out_tmp):
                        os.remove(out_tmp)
                except Exception:
                    pass
    finally:
        try:
            os.remove(in_path)
        except Exception:
            pass
    return {"results": results}

@router.post("/pdf/compress")
async def pdf_compress(file: UploadFile = File(...), level: str = Form("medium")):
    level = (level or "medium").lower()
    if level not in GS_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Invalid level {level}")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for compression")

    in_path = write_upload_to_temp(file, prefix="compress_in_")
    fd, out_tmp = tempfile.mkstemp(prefix=f"compressed_{level}_", suffix=".pdf", dir=TMP_DIR)
    os.close(fd)
    try:
        if GS_EXEC:
            _gs_compress(in_path, out_tmp, GS_SETTINGS[level])
        else:
            _pikepdf_compress(in_path, out_tmp, level)
        size_before = os.path.getsize(in_path)
        size_after = os.path.getsize(out_tmp)
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_name = f"{orig_name}_compressed_{level}.pdf"
        # Move to uploads and return public path
        final_name = unique_filename(out_name)
        shutil.move(out_tmp, os.path.join(UPLOAD_DIR, final_name))
        return {"message": "Compressed", "download_url": f"/api/files/{final_name}",
                "size_before": size_before, "size_after": size_after,
                "size_before_readable": human_readable_size(size_before),
                "size_after_readable": human_readable_size(size_after)}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {e}")
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

# ---------- PDF merge (PDF only, max 15 files) ----------
@router.post("/pdf/merge")
async def pdf_merge(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    if len(files) > 15:
        raise HTTPException(status_code=400, detail="Cannot merge more than 15 files")

    temp_paths = []
    try:
        for f in files:
            if not (f.filename or "").lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail="All files must be PDF")
            p = write_upload_to_temp(f, prefix="merge_in_")
            temp_paths.append(p)

        # Use PyPDF2 for merging (pure-python)
        try:
            from PyPDF2 import PdfMerger
        except Exception as e:
            raise HTTPException(status_code=500, detail="PyPDF2 required for merging; pip install PyPDF2")

        merger = PdfMerger()
        for p in temp_paths:
            merger.append(p)
        out_name = f"merged_{int(time.time()*1000)}.pdf"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_path, "wb") as fh:
            merger.write(fh)
        merger.close()

        return {"message": f"Merged {len(temp_paths)} files", "download_url": f"/api/files/{out_name}"}
    finally:
        for p in temp_paths:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass

# ---------- Conversions ----------
# 1) CSV -> Excel
@router.post("/convert/csv-to-excel")
async def csv_to_excel(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV allowed for CSV->Excel")
    try:
        import pandas as pd
    except Exception:
        raise HTTPException(status_code=500, detail="pandas required: pip install pandas openpyxl")

    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_csv(saved_path)
        out_name = f"converted_{int(time.time()*1000)}.xlsx"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_excel(out_path, index=False)
        return {"message": "CSV -> Excel", "download_url": f"/api/files/{out_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2) Excel -> CSV
@router.post("/convert/excel-to-csv")
async def excel_to_csv(file: UploadFile = File(...)):
    ext = (file.filename or "").lower()
    if not (ext.endswith(".xls") or ext.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only .xls/.xlsx allowed for Excel->CSV")
    try:
        import pandas as pd
    except Exception:
        raise HTTPException(status_code=500, detail="pandas required: pip install pandas openpyxl")
    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_excel(saved_path)
        out_name = f"converted_{int(time.time()*1000)}.csv"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_csv(out_path, index=False)
        return {"message": "Excel -> CSV", "download_url": f"/api/files/{out_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3) PDF -> CSV (table extraction using pdfplumber)
@router.post("/convert/pdf-to-csv")
async def pdf_to_csv(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for PDF->CSV")
    try:
        import pdfplumber
        import csv
    except Exception:
        raise HTTPException(status_code=500, detail="pdfplumber required: pip install pdfplumber")

    in_path = write_upload_to_temp(file, prefix="pdf2csv_in_")
    rows = []
    try:
        with pdfplumber.open(in_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    # table is list of rows
                    for r in table:
                        rows.append([("" if c is None else str(c)).strip() for c in r])
        if not rows:
            # fallback to raw text -> single column
            with open(in_path, "rb") as fh:
                text = pdfplumber.open(in_path).pages[0].extract_text() or ""
            rows = [[line] for line in (text.splitlines() if text else [])]

        out_name = f"extracted_{int(time.time()*1000)}.csv"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            for r in rows:
                writer.writerow(r)
        return {"message": "PDF -> CSV (extracted)", "download_url": f"/api/files/{out_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

# 4) CSV -> PDF (simple table using reportlab)
@router.post("/convert/csv-to-pdf")
async def csv_to_pdf(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV allowed for CSV->PDF")
    try:
        import csv
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
    except Exception:
        raise HTTPException(status_code=500, detail="reportlab required: pip install reportlab")

    in_path = write_upload_to_temp(file, prefix="csv2pdf_in_")
    try:
        rows = []
        with open(in_path, "r", encoding="utf-8", errors="replace") as fh:
            reader = csv.reader(fh)
            for r in reader:
                rows.append([c for c in r])
        out_name = f"csv_print_{int(time.time()*1000)}.pdf"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        doc = SimpleDocTemplate(out_path, pagesize=letter)
        table = Table(rows, repeatRows=1)
        table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ]))
        doc.build([table])
        return {"message": "CSV -> PDF", "download_url": f"/api/files/{out_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

# 5) PDF -> Excel: run PDF->CSV then CSV->Excel
@router.post("/convert/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    # We'll reuse the pdf->csv function logic inline to avoid duplicate temp moves
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for PDF->Excel")
    try:
        import pdfplumber
        import pandas as pd
    except Exception:
        raise HTTPException(status_code=500, detail="pdfplumber & pandas required: pip install pdfplumber pandas openpyxl")

    in_path = write_upload_to_temp(file, prefix="pdf2xls_in_")
    try:
        rows = []
        with pdfplumber.open(in_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for r in table:
                        rows.append([("" if c is None else str(c)).strip() for c in r])
        if not rows:
            raise HTTPException(status_code=400, detail="No tabular data found in PDF")
        # Create DataFrame (pad uneven rows)
        max_cols = max(len(r) for r in rows)
        normalized = [r + [""]*(max_cols-len(r)) for r in rows]
        df = pd.DataFrame(normalized[1:], columns=normalized[0]) if len(normalized) > 1 else pd.DataFrame(normalized)
        out_name = f"converted_{int(time.time()*1000)}.xlsx"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_excel(out_path, index=False)
        return {"message": "PDF -> Excel (extracted)", "download_url": f"/api/files/{out_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

# 6) Word -> PDF and PDF -> Word (uses soffice / LibreOffice if available)
@router.post("/convert/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith((".doc", ".docx", ".rtf")):   # <-- added .rtf
        raise HTTPException(status_code=400, detail="Only DOC/DOCX/RTF allowed for Word->PDF")
    if SOFFICE_EXEC is None:
        raise HTTPException(status_code=500, detail="LibreOffice (soffice) not found on server. Install LibreOffice to enable Word->PDF conversion.")
    in_path = write_upload_to_temp(file, prefix="word2pdf_in_")
    try:
        # soffice --headless --convert-to pdf --outdir <dir> <file>
        cmd = [SOFFICE_EXEC, "--headless", "--convert-to", "pdf", "--outdir", TMP_DIR, in_path]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # find generated pdf
        base = Path(file.filename).stem
        generated = os.path.join(TMP_DIR, f"{base}.pdf")
        if not os.path.exists(generated):
            pdfs = [os.path.join(TMP_DIR, f) for f in os.listdir(TMP_DIR) if f.lower().endswith(".pdf")]
            if not pdfs:
                raise HTTPException(status_code=500, detail="Conversion failed (no output PDF)")
            generated = max(pdfs, key=os.path.getctime)
        out_name = f"word2pdf_{int(time.time()*1000)}.pdf"
        shutil.move(generated, os.path.join(UPLOAD_DIR, out_name))
        return {"message": "Word -> PDF", "download_url": f"/api/files/{out_name}"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

@router.post("/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for PDF->Word")
    if SOFFICE_EXEC is None:
        raise HTTPException(status_code=500, detail="LibreOffice (soffice) not found. Install it for PDF->Word conversion.")
    in_path = write_upload_to_temp(file, prefix="pdf2word_in_")
    try:
        # soffice --headless --convert-to docx --outdir <dir> <file>
        cmd = [SOFFICE_EXEC, "--headless", "--convert-to", "docx", "--outdir", TMP_DIR, in_path]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # find docx
        base = Path(file.filename).stem
        generated = os.path.join(TMP_DIR, f"{base}.docx")
        if not os.path.exists(generated):
            docs = [os.path.join(TMP_DIR, f) for f in os.listdir(TMP_DIR) if f.lower().endswith(".docx")]
            if not docs:
                raise HTTPException(status_code=500, detail="Conversion failed (no output DOCX)")
            generated = max(docs, key=os.path.getctime)
        out_name = f"pdf2word_{int(time.time()*1000)}.docx"
        shutil.move(generated, os.path.join(UPLOAD_DIR, out_name))
        return {"message": "PDF -> Word", "download_url": f"/api/files/{out_name}"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass
