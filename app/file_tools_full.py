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

# Directories
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
    ext = Path(upload.filename or "").suffix or ".bin"
    fd, tmp_path = tempfile.mkstemp(prefix=prefix, suffix=ext, dir=TMP_DIR)
    os.close(fd)
    with open(tmp_path, "wb") as fh:
        upload.file.seek(0)
        shutil.copyfileobj(upload.file, fh)
    try:
        upload.file.close()
    except Exception:
        pass
    return tmp_path


def human_readable_size(n: Optional[int]) -> str:
    if n is None:
        return "-"
    n = float(n)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
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
        items.append(
            {
                "name": fn,
                "size": os.path.getsize(path),
                "size_readable": human_readable_size(os.path.getsize(path)),
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
    try:
        os.remove(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    return {"message": "Deleted", "name": saved_filename}


# ---------- External binaries detection ----------
def find_executable(names: List[str]) -> Optional[str]:
    for n in names:
        path = shutil.which(n)
        if path:
            return path
    return None


GS_EXEC = find_executable(["gs", "gswin64c", "gswin32c"])
SOFFICE_EXEC = find_executable(["soffice", "soffice.bin"])
QPDF_EXEC = find_executable(["qpdf"])


# ---------- PDF compression helpers ----------
GS_SETTINGS = {"strong": "/ebook", "medium": "/ebook", "light": "/printer"}


def _gs_compress(input_path: str, output_path: str, pdfsetting: str):
    if GS_EXEC is None:
        raise RuntimeError("Ghostscript not available")
    cmd = [
        GS_EXEC,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={pdfsetting}",
        "-dColorImageDownsampleType=/Bicubic",
        "-dColorImageResolution=150",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dGrayImageResolution=150",
        "-dMonoImageDownsampleType=/Subsample",
        "-dMonoImageResolution=300",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        f"-sOutputFile={output_path}",
        input_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Ghostscript failed: {result.stderr or result.stdout}")


def _pikepdf_compress(input_path: str, output_path: str, level: str):
    try:
        import pikepdf

        pdf = pikepdf.Pdf.open(input_path)

        # For newer versions of pikepdf (>=7): use string-based compression
        string_levels = {
            "light": "fast",
            "medium": "default",
            "strong": "maximum",
        }

        # For older versions (<7): CompressionLevel enum still exists
        enum_levels = {
            "light": getattr(getattr(pikepdf, "CompressionLevel", None), "low", None),
            "medium": getattr(getattr(pikepdf, "CompressionLevel", None), "medium", None),
            "strong": getattr(getattr(pikepdf, "CompressionLevel", None), "high", None),
        }

        comp_level = None

        # Prefer string-based compression if supported
        try:
            pdf.save(output_path, optimize_streams=True, compression=string_levels[level])
            pdf.close()
            return
        except Exception:
            pass

        # Fallback: use enum if available
        if enum_levels[level] is not None:
            pdf.save(output_path, optimize_streams=True, compression=enum_levels[level])
        else:
            pdf.save(output_path, optimize_streams=True)

        pdf.close()

    except ImportError:
        raise RuntimeError("pikepdf not available - install with: pip install pikepdf")
    except Exception as e:
        raise RuntimeError(f"PDF compression failed: {str(e)}")


# ---------- PDF compress preview ----------
@router.post("/pdf/compress-preview")
async def pdf_compress_preview(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed for compression preview")
    in_path = write_upload_to_temp(file, prefix="preview_in_")
    results = {}
    try:
        original_size = os.path.getsize(in_path)
        results["original"] = {
            "size_bytes": original_size,
            "size_readable": human_readable_size(original_size),
        }
        for level, gs_setting in GS_SETTINGS.items():
            out_tmp = None
            try:
                fd, out_tmp = tempfile.mkstemp(prefix=f"preview_{level}_", suffix=".pdf", dir=TMP_DIR)
                os.close(fd)
                # Try Ghostscript first, fallback to pikepdf
                try:
                    if GS_EXEC:
                        _gs_compress(in_path, out_tmp, gs_setting)
                    else:
                        _pikepdf_compress(in_path, out_tmp, level)
                except Exception as gs_error:
                    # fallback to pikepdf if GS failed
                    try:
                        _pikepdf_compress(in_path, out_tmp, level)
                    except Exception as pdf_error:
                        raise RuntimeError(f"Both compression methods failed. GS: {gs_error}, pikepdf: {pdf_error}")
                if os.path.exists(out_tmp):
                    size = os.path.getsize(out_tmp)
                    reduction = ((original_size - size) / original_size) * 100 if original_size > 0 else 0
                    results[level] = {
                        "size_bytes": size,
                        "size_readable": human_readable_size(size),
                        "reduction_percent": round(reduction, 1),
                    }
                else:
                    results[level] = {"error": "Output file not created"}
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if out_tmp and os.path.exists(out_tmp):
                    try:
                        os.remove(out_tmp)
                    except Exception:
                        pass
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass
    return {"results": results}


# ---------- PDF compress (actual) ----------
@router.post("/pdf/compress")
async def pdf_compress(file: UploadFile = File(...), level: str = Form("medium")):
    level = (level or "medium").lower()
    if level not in GS_SETTINGS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid level {level}. Must be one of: {list(GS_SETTINGS.keys())}",
        )
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed for compression")
    in_path = write_upload_to_temp(file, prefix="compress_in_")
    fd = None
    out_tmp = None
    try:
        fd, out_tmp = tempfile.mkstemp(prefix=f"compressed_{level}_", suffix=".pdf", dir=TMP_DIR)
        os.close(fd)
        compression_success = False
        error_messages = []
        # Try Ghostscript
        if GS_EXEC:
            try:
                _gs_compress(in_path, out_tmp, GS_SETTINGS[level])
                compression_success = True
            except Exception as e:
                error_messages.append(f"Ghostscript failed: {str(e)}")
        # Fallback to pikepdf
        if not compression_success:
            try:
                _pikepdf_compress(in_path, out_tmp, level)
                compression_success = True
            except Exception as e:
                error_messages.append(f"pikepdf failed: {str(e)}")
        if not compression_success:
            raise HTTPException(status_code=500, detail=f"All compression methods failed: {'; '.join(error_messages)}")
        if not os.path.exists(out_tmp) or os.path.getsize(out_tmp) == 0:
            raise HTTPException(status_code=500, detail="Compression produced empty or missing file")
        size_before = os.path.getsize(in_path)
        size_after = os.path.getsize(out_tmp)
        reduction = ((size_before - size_after) / size_before) * 100 if size_before > 0 else 0
        orig_name = Path(file.filename).stem if file.filename else "document"
        out_name = f"{orig_name}_compressed_{level}.pdf"
        final_name = unique_filename(out_name)
        final_path = os.path.join(UPLOAD_DIR, final_name)
        shutil.move(out_tmp, final_path)
        return {
            "message": f"PDF compressed successfully ({level} level)",
            "download_url": f"/api/files/{final_name}",
            "filename": final_name,
            "size_before": size_before,
            "size_after": size_after,
            "size_before_readable": human_readable_size(size_before),
            "size_after_readable": human_readable_size(size_after),
            "reduction_percent": round(reduction, 1),
        }
    finally:
        # cleanup temp files
        for path in [in_path, out_tmp]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


# ---------- PDF merge (max 15 files) ----------
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
                raise HTTPException(status_code=400, detail=f"All files must be PDF format. Found: {f.filename}")
            p = write_upload_to_temp(f, prefix="merge_in_")
            temp_paths.append(p)
        try:
            from PyPDF2 import PdfMerger
        except ImportError:
            raise HTTPException(status_code=500, detail="PyPDF2 required for merging. Install with: pip install PyPDF2")
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
        return {"message": f"Successfully merged {len(temp_paths)} PDF files", "download_url": f"/api/files/{out_name}", "filename": out_name}
    finally:
        for p in temp_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


# ---------- Conversions ----------
# 1) CSV -> Excel
@router.post("/convert/csv-to-excel")
async def csv_to_excel(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed for CSV->Excel conversion")
    try:
        import pandas as pd  # local import to avoid heavy import on startup
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas required: pip install pandas openpyxl")
    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_csv(saved_path, encoding="utf-8", errors="replace")
        out_name = f"converted_{int(time.time() * 1000)}.xlsx"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_excel(out_path, index=False, engine="openpyxl")
        return {"message": "CSV successfully converted to Excel", "download_url": f"/api/files/{out_name}", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


# 2) Excel -> CSV
@router.post("/convert/excel-to-csv")
async def excel_to_csv(file: UploadFile = File(...)):
    ext = (file.filename or "").lower()
    if not (ext.endswith(".xls") or ext.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only .xls/.xlsx files allowed for Excel->CSV conversion")
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas required: pip install pandas openpyxl")
    saved = save_upload_file(file)
    saved_path = os.path.join(UPLOAD_DIR, saved)
    try:
        df = pd.read_excel(saved_path, engine="openpyxl")
        out_name = f"converted_{int(time.time() * 1000)}.csv"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        df.to_csv(out_path, index=False, encoding="utf-8")
        return {"message": "Excel successfully converted to CSV", "download_url": f"/api/files/{out_name}", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


# 3) PDF -> CSV (table extraction using pdfplumber)
@router.post("/convert/pdf-to-csv")
async def pdf_to_csv(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed for PDF->CSV conversion")
    try:
        import pdfplumber
        import csv
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber required: pip install pdfplumber")
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
            # fallback to raw text -> single column
            with pdfplumber.open(in_path) as pdf:
                text_lines = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    text_lines.extend(text.splitlines())
                rows = [[line] for line in text_lines if line.strip()]
            if not rows:
                raise HTTPException(status_code=400, detail="No extractable content found in PDF")
        with open(out_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            for r in rows:
                writer.writerow(r)
        return {"message": "PDF content successfully extracted to CSV", "download_url": f"/api/files/{os.path.basename(out_path)}", "filename": os.path.basename(out_path)}
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


# 4) CSV -> PDF (simple table using reportlab)
@router.post("/convert/csv-to-pdf")
async def csv_to_pdf(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed for CSV->PDF conversion")
    try:
        import csv as csv_mod
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab required: pip install reportlab")
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
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ]
            )
        )
        doc.build([table])
        return {"message": "CSV successfully converted to PDF table", "download_url": f"/api/files/{os.path.basename(out_path)}", "filename": os.path.basename(out_path)}
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


# 5) PDF -> Excel (uses pdf_to_csv -> csv_to_excel approach)
@router.post("/convert/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    # We'll implement by streaming through pdf_to_csv then pandas conversion
    # For simplicity reuse pdf_to_csv logic and then convert resulting CSV to Excel
    # This endpoint requires pdfplumber and pandas
    try:
        import pdfplumber
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber & pandas required: pip install pdfplumber pandas openpyxl")
    # first extract tables to rows (very similar to pdf_to_csv)
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
            # fallback to text lines -> single column
            with pdfplumber.open(in_path) as pdf:
                text_lines = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    text_lines.extend(text.splitlines())
                rows = [[line] for line in text_lines if line.strip()]
            if not rows:
                raise HTTPException(status_code=400, detail="No tabular data found in PDF")
        out_name = f"extracted_{int(time.time() * 1000)}.csv"
        out_csv_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_csv_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv_mod.writer(fh)
            for r in rows:
                writer.writerow(r)
        # Convert CSV to Excel using pandas
        df = pd.read_csv(out_csv_path, header=0 if len(rows) > 1 else None)
        out_xlsx_name = f"converted_{int(time.time() * 1000)}.xlsx"
        out_xlsx_path = os.path.join(UPLOAD_DIR, out_xlsx_name)
        df.to_excel(out_xlsx_path, index=False, engine="openpyxl")
        # remove intermediate CSV if needed
        try:
            os.remove(out_csv_path)
        except Exception:
            pass
        return {"message": "PDF table data successfully converted to Excel", "download_url": f"/api/files/{out_xlsx_name}", "filename": out_xlsx_name}
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


# 6) Excel -> PDF
@router.post("/convert/excel-to-pdf")
async def excel_to_pdf(file: UploadFile = File(...)):
    try:
        import pandas as pd
        from reportlab.platypus import Table, SimpleDocTemplate
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas & reportlab required: pip install pandas reportlab openpyxl")
    in_path = write_upload_to_temp(file, prefix="xls2pdf_in_")
    out_name = f"excel_print_{int(time.time() * 1000)}.pdf"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    try:
        df = pd.read_excel(in_path, engine="openpyxl")
        data = [df.columns.tolist()] + df.values.tolist()
        doc = SimpleDocTemplate(out_path)
        table = Table(data, repeatRows=1)
        doc.build([table])
        return {"message": "Excel successfully converted to PDF", "download_url": f"/api/files/{out_name}", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel->PDF conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass


# 7) PDF -> Word
@router.post("/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed for PDF->Word conversion")
    try:
        from pdf2docx import Converter
    except ImportError:
        raise HTTPException(status_code=500, detail="pdf2docx required: pip install pdf2docx")
    in_path = write_upload_to_temp(file, prefix="pdf2word_in_")
    out_name = f"pdf2word_{int(time.time() * 1000)}.docx"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    try:
        cv = Converter(in_path)
        cv.convert(out_path, start=0, end=None)
        cv.close()
        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise HTTPException(status_code=500, detail="Conversion failed: output DOCX not created")
        return {"message": "PDF successfully converted to Word document", "download_url": f"/api/files/{out_name}", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF to Word conversion failed: {str(e)}")
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass
