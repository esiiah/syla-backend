# app/file_tools_full.py
import os
import time
import uuid
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple, Dict

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from .services.file_compression import FileCompressionService

router = APIRouter(prefix="/api/filetools", tags=["filetools"])

# ---------- Directories ----------
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STASH_DIR = os.path.join(BASE_DIR, "stash")
TMP_DIR = os.path.join(BASE_DIR, "tmp")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STASH_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

# Initialize compression service
compression_service = FileCompressionService()

# ---------- Helpers ----------
def sanitize_filename(name: str) -> str:
    import re
    base = os.path.basename(name or "file")
    base = base.replace(" ", "_")
    return re.sub(r"[^A-Za-z0-9._-]", "_", base)

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
    ext = Path(upload.filename or "").suffix or ".bin"
    fd, tmp_path = tempfile.mkstemp(prefix=prefix, suffix=ext, dir=TMP_DIR)
    os.close(fd)
    with open(tmp_path, "wb") as fh:
        try:
            upload.file.seek(0)
        except Exception:
            pass
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return tmp_path

def human_readable_size(n: Optional[int]) -> str:
    if n is None:
        return "-"
    return compression_service._human_readable_size(n)

# ---------- Stash ----------
stash_map = {}  # token -> (saved_filename, timestamp)
STASH_EXPIRY = 10 * 60  # seconds

def cleanup_stash():
    now = time.time()
    expired = [t for t, (_, ts) in stash_map.items() if now - ts > STASH_EXPIRY]
    for t in expired:
        fname, _ = stash_map.pop(t, (None, None))
        if fname:
            p = os.path.join(STASH_DIR, fname)
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

@router.post("/stash")
async def stash_file(file: UploadFile = File(...)):
    cleanup_stash()
    token = uuid.uuid4().hex
    saved = save_upload_file(file, folder=STASH_DIR)
    stash_map[token] = (saved, time.time())
    return {"token": token, "filename": file.filename}

@router.get("/retrieve/{token}")
async def retrieve_file(token: str):
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
        size = os.path.getsize(path)
        items.append({
            "name": fn,
            "size": size,
            "size_readable": human_readable_size(size),
            "download_url": f"/api/filetools/files/{fn}",
        })
    return {"files": items}

@router.delete("/delete/{saved_filename}")
async def delete_uploaded_file(saved_filename: str):
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        os.remove(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    return {"message": "Deleted", "name": saved_filename}

# ---------- Serve saved files ----------
@router.get("/files/{filename}")
async def serve_uploaded_file(filename: str):
    if "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)

# ---------- PDF compress preview ----------
@router.post("/pdf/compress-preview")
async def pdf_compress_preview(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    in_path = write_upload_to_temp(file, prefix="preview_in_")
    try:
        return compression_service.get_compression_preview(in_path, prefer_pdf=True)
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

# ---------- Generic file compress ----------
@router.post("/file/compress")
async def file_compress(file: UploadFile = File(...), level: str = Form("medium")):
    level = (level or "medium").lower()
    if level not in ["light", "medium", "strong"]:
        raise HTTPException(status_code=400, detail="Invalid level")
    in_path = write_upload_to_temp(file, prefix="compress_in_")
    out_tmp = None
    try:
        orig_name = Path(file.filename).stem if file.filename else "file"
        out_name = f"{orig_name}_compressed_{level}.zip"
        out_tmp = tempfile.mktemp(prefix=f"compressed_{level}_", suffix=".zip", dir=TMP_DIR)
        
        success = compression_service.compress_file(in_path, out_tmp, level)
        
        if not success or not os.path.exists(out_tmp) or os.path.getsize(out_tmp) == 0:
            raise HTTPException(status_code=500, detail="Compression failed")
        
        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(out_tmp, final_path)
        out_tmp = None
        
        size_before = os.path.getsize(in_path)
        size_after = os.path.getsize(final_path)
        reduction = ((size_before - size_after) / size_before) * 100 if size_before > 0 else 0
        
        return {
            "message": f"File compressed successfully ({level})",
            "download_url": f"/api/filetools/files/{final_name}",
            "filename": final_name,
            "size_before": size_before,
            "size_after": size_after,
            "size_before_readable": human_readable_size(size_before),
            "size_after_readable": human_readable_size(size_after),
            "reduction_percent": round(reduction, 1),
            "level_used": level
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")
    finally:
        for path in [in_path, out_tmp]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

# ---------- PDF compress ----------
@router.post("/pdf/compress")
async def pdf_compress(file: UploadFile = File(...), level: str = Form("medium")):
    level = (level or "medium").lower()
    if level not in ["light", "medium", "strong"]:
        raise HTTPException(status_code=400, detail=f"Invalid level '{level}'")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    in_path = write_upload_to_temp(file, prefix="compress_in_")
    out_tmp = None
    try:
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_name = f"{orig_name}_compressed_{level}.pdf"
        out_tmp = tempfile.mktemp(prefix=f"compressed_pdf_{level}_", suffix=".pdf", dir=TMP_DIR)
        
        success = compression_service.compress_pdf(in_path, out_tmp, level)
        
        if not success or not os.path.exists(out_tmp):
            raise HTTPException(status_code=500, detail="Compression failed")
        
        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(out_tmp, final_path)
        out_tmp = None
        
        size_before = os.path.getsize(in_path)
        size_after = os.path.getsize(final_path)
        reduction = ((size_before - size_after) / size_before) * 100 if size_before > 0 else 0
        
        return {
            "message": f"PDF compressed successfully ({level})",
            "download_url": f"/api/filetools/files/{final_name}",
            "filename": final_name,
            "size_before": size_before,
            "size_after": size_after,
            "size_before_readable": human_readable_size(size_before),
            "size_after_readable": human_readable_size(size_after),
            "reduction_percent": round(reduction, 1),
            "level_used": level,
            "format": "pdf"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")
    finally:
        for path in [in_path, out_tmp]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

# ---------- PDF merge ----------
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
                raise HTTPException(status_code=400, detail=f"All files must be PDF. Found: {f.filename}")
            p = write_upload_to_temp(f, prefix="merge_in_")
            temp_paths.append(p)
        
        try:
            from PyPDF2 import PdfMerger
        except ImportError:
            raise HTTPException(status_code=500, detail="PyPDF2 required: pip install PyPDF2")
        
        merger = PdfMerger()
        for p in temp_paths:
            merger.append(p)
        
        out_name = f"merged_{int(time.time() * 1000)}.pdf"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_path, "wb") as fh:
            merger.write(fh)
        merger.close()
        
        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise HTTPException(status_code=500, detail="Merge produced empty file")
        
        return {
            "message": f"Successfully merged {len(temp_paths)} PDF files",
            "download_url": f"/api/filetools/files/{out_name}",
            "filename": out_name
        }
    finally:
        for p in temp_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

# ---------- Word/Image to PDF (LibreOffice) ----------
@router.post("/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    """Convert Word document to PDF using LibreOffice"""
    ext = (file.filename or "").lower()
    if not (ext.endswith(".doc") or ext.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only .doc/.docx files allowed")
    
    in_path = write_upload_to_temp(file, prefix="word2pdf_in_")
    try:
        pdf_path = compression_service.convert_to_pdf_libreoffice(in_path, TMP_DIR)
        
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_name = f"{orig_name}_converted.pdf"
        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(pdf_path, final_path)
        
        return {
            "message": "Word document successfully converted to PDF",
            "download_url": f"/api/filetools/files/{final_name}",
            "filename": final_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

@router.post("/image-to-pdf")
async def image_to_pdf(file: UploadFile = File(...)):
    """Convert image to PDF using LibreOffice"""
    ext = (file.filename or "").lower()
    valid_exts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif"]
    if not any(ext.endswith(e) for e in valid_exts):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    
    in_path = write_upload_to_temp(file, prefix="img2pdf_in_")
    try:
        pdf_path = compression_service.convert_to_pdf_libreoffice(in_path, TMP_DIR)
        
        orig_name = Path(file.filename).stem if file.filename else "image"
        out_name = f"{orig_name}_converted.pdf"
        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(pdf_path, final_path)
        
        return {
            "message": "Image successfully converted to PDF",
            "download_url": f"/api/filetools/files/{final_name}",
            "filename": final_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

# ---------- Other Conversions ----------
@router.post("/csv-to-excel")
async def csv_to_excel(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas required")
    
    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_csv(saved_path, encoding="utf-8", on_bad_lines="skip")
        out_name = f"converted_{int(time.time() * 1000)}.xlsx"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_excel(out_path, index=False, engine="openpyxl")
        return {
            "message": "CSV successfully converted to Excel",
            "download_url": f"/api/filetools/files/{out_name}",
            "filename": out_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@router.post("/excel-to-csv")
async def excel_to_csv(file: UploadFile = File(...)):
    ext = (file.filename or "").lower()
    if not (ext.endswith(".xls") or ext.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only .xls/.xlsx files allowed")
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas required")
    
    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_excel(saved_path, engine="openpyxl")
        out_name = f"converted_{int(time.time() * 1000)}.csv"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_csv(out_path, index=False, encoding="utf-8")
        return {
            "message": "Excel successfully converted to CSV",
            "download_url": f"/api/filetools/files/{out_name}",
            "filename": out_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@router.post("/pdf-to-csv")
async def pdf_to_csv(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    try:
        import pdfplumber
        import csv
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber required")
    
    in_path = write_upload_to_temp(file, prefix="pdf2csv_in_")
    out_path = os.path.join(UPLOAD_DIR, f"extracted_{int(time.time() * 1000)}.csv")
    rows = []
    try:
        with pdfplumber.open(in_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    for r in table:
                        rows.append([("" if c is None else str(c)).strip() for c in r])
        
        if not rows:
            with pdfplumber.open(in_path) as pdf:
                text_lines = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    text_lines.extend(text.splitlines())
                rows = [[line] for line in text_lines if line.strip()]
            if not rows:
                raise HTTPException(status_code=400, detail="No extractable content found")
        
        with open(out_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            for r in rows:
                writer.writerow(r)
        
        return {
            "message": "PDF content successfully extracted to CSV",
            "download_url": f"/api/filetools/files/{os.path.basename(out_path)}",
            "filename": os.path.basename(out_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

@router.post("/csv-to-pdf")
async def csv_to_pdf(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    try:
        import csv as csv_mod
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab required")
    
    in_path = write_upload_to_temp(file, prefix="csv2pdf_in_")
    out_path = os.path.join(UPLOAD_DIR, f"csv_print_{int(time.time() * 1000)}.pdf")
    rows = []
    try:
        with open(in_path, "r", encoding="utf-8", errors="replace") as fh:
            reader = csv_mod.reader(fh)
            for r in reader:
                rows.append([c for c in r])
        
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        doc = SimpleDocTemplate(out_path, pagesize=letter)
        table = Table(rows, repeatRows=1)
        table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ])
        )
        doc.build([table])
        
        return {
            "message": "CSV successfully converted to PDF table",
            "download_url": f"/api/filetools/files/{os.path.basename(out_path)}",
            "filename": os.path.basename(out_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV->PDF conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

@router.post("/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    try:
        import pdfplumber
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber & pandas required")
    
    in_path = write_upload_to_temp(file, prefix="pdf2xls_in_")
    try:
        rows = []
        import csv as csv_mod
        
        with pdfplumber.open(in_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    for r in table:
                        rows.append([("" if c is None else str(c)).strip() for c in r])
        
        if not rows:
            with pdfplumber.open(in_path) as pdf:
                text_lines = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    text_lines.extend(text.splitlines())
                rows = [[line] for line in text_lines if line.strip()]
            if not rows:
                raise HTTPException(status_code=400, detail="No tabular data found")
        
        out_name = f"extracted_{int(time.time() * 1000)}.csv"
        out_csv_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_csv_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv_mod.writer(fh)
            for r in rows:
                writer.writerow(r)
        
        df = pd.read_csv(out_csv_path, header=0 if len(rows) > 1 else None)
        out_xlsx_name = f"converted_{int(time.time() * 1000)}.xlsx"
        out_xlsx_path = os.path.join(UPLOAD_DIR, out_xlsx_name)
        df.to_excel(out_xlsx_path, index=False, engine="openpyxl")
        
        try:
            os.remove(out_csv_path)
        except Exception:
            pass
        
        return {
            "message": "PDF table data successfully converted to Excel",
            "download_url": f"/api/filetools/files/{out_xlsx_name}",
            "filename": out_xlsx_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF->Excel conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

@router.post("/excel-to-pdf")
async def excel_to_pdf(file: UploadFile = File(...)):
    try:
        import pandas as pd
        from reportlab.platypus import Table, SimpleDocTemplate
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas & reportlab required")
    
    in_path = write_upload_to_temp(file, prefix="xls2pdf_in_")
    out_name = f"excel_print_{int(time.time() * 1000)}.pdf"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    try:
        df = pd.read_excel(in_path, engine="openpyxl")
        data = [df.columns.tolist()] + df.values.tolist()
        doc = SimpleDocTemplate(out_path)
        table = Table(data, repeatRows=1)
        doc.build([table])
        
        return {
            "message": "Excel successfully converted to PDF",
            "download_url": f"/api/filetools/files/{out_name}",
            "filename": out_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel->PDF conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass

@router.post("/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """Convert PDF to Word using LibreOffice instead of pdf2docx"""
    import subprocess
    from pathlib import Path

    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    in_path = write_upload_to_temp(file, prefix="pdf2word_in_")
    try:
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_dir = TMP_DIR
        # LibreOffice command to convert PDF to DOCX
        cmd = [
            "libreoffice",
            "--headless",
            "--convert-to", "docx",
            "--outdir", out_dir,
            in_path,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # Find the converted file
        out_name = f"{orig_name}.docx"
        converted_path = os.path.join(out_dir, out_name)
        if not os.path.exists(converted_path):
            raise HTTPException(status_code=500, detail="LibreOffice conversion failed")

        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(converted_path, final_path)

        return {
            "message": "PDF successfully converted to Word (LibreOffice)",
            "download_url": f"/api/filetools/files/{final_name}",
            "filename": final_name,
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"LibreOffice failed: {e.stderr.decode(errors='ignore')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass
