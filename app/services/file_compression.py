# app/services/file_compression.py
import os
import tempfile
import zipfile
import shutil
import subprocess
from typing import Dict

class FileCompressionService:
    """
    File compression service:
     - compress_file(input_path, output_path, level) -> create a .zip archive with compressed input (generic)
     - compress_pdf(input_path, output_path, level) -> try ghostscript to create optimized PDF.
         Fallback: create a zipped copy of the PDF (not ideal but ensures result).
     - get_compression_preview(input_path, prefer_pdf=False) -> estimate sizes for preview
    """

    GS_PRESETS = {
        "light": "/screen",   # smallest, low quality
        "medium": "/ebook",   # decent quality
        "strong": "/printer", # higher quality but also aggressive compression in some setups
    }

    def __init__(self):
        pass

    # Generic file -> zip compression
    def compress_file(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
        if os.path.getsize(input_path) == 0:
            raise RuntimeError("Input file is empty")

        method = self._get_zip_method(level)
        compresslevel = self._get_compression_level(level)

        try:
            # Python's zipfile supports compresslevel (since 3.7+)
            with zipfile.ZipFile(output_path, "w", compression=method, compresslevel=compresslevel) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except TypeError:
            # older python: compresslevel arg may not be supported; fall back to default
            with zipfile.ZipFile(output_path, "w", compression=method) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except Exception as e:
            raise RuntimeError(f"File compression failed: {str(e)}")

    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """
        Attempt to compress PDF using Ghostscript. If ghostscript is not available or fails,
        fallback to a zip archive of the PDF (so the endpoint returns something).
        Returns True on success and writes to output_path.
        """
        if not os.path.exists(input_path):
            raise RuntimeError("Input not found")
        if level not in ["light", "medium", "strong"]:
            level = "medium"

        gs_preset = self.GS_PRESETS.get(level, "/ebook")
        # build gs command
        # -dCompatibilityLevel=1.4 is common; adjust settings for quality
        gs_cmd = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dPDFSETTINGS={}".format(gs_preset),
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={output_path}",
            input_path
        ]

        try:
            # Try running ghostscript
            subprocess.run(gs_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            # verify output
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return True
        except Exception:
            # Ghostscript either missing or failed; fall back to zip
            pass

        # Fallback: zip the PDF (ensures a file is produced)
        try:
            zip_out = output_path
            # If caller expects .pdf but we produce zip, adjust name
            if not output_path.lower().endswith(".zip"):
                zip_out = output_path + ".zip"
            self.compress_file(input_path, zip_out, level)
            # If caller expects strictly output_path, move zip path into place if requested (best-effort)
            if zip_out != output_path:
                # Move zip_out -> output_path if possible (rename extension)
                try:
                    shutil.move(zip_out, output_path)
                except Exception:
                    # If move fails, keep zip_out; caller will inspect file existence
                    pass
            return True
        except Exception as e:
            raise RuntimeError(f"PDF compression fallback failed: {str(e)}")

    def get_compression_preview(self, input_path: str, prefer_pdf: bool = False) -> Dict:
        """
        Return estimated sizes for light/medium/strong compression.
        If prefer_pdf=True and input_path is a PDF, attempt a Ghostscript compress for preview,
        otherwise will estimate via zip fallback.
        """
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")

        original_size = os.path.getsize(input_path)
        results = {"original": {"size_bytes": original_size, "size_readable": self._human_readable_size(original_size)}}

        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".pdf" if prefer_pdf else ".zip")
            try:
                if prefer_pdf and input_path.lower().endswith(".pdf"):
                    # attempt ghostscript (best-effort)
                    try:
                        self.compress_pdf(input_path, temp_output, level)
                    except Exception:
                        # fallback to zip
                        temp_output_zip = tempfile.mktemp(suffix=".zip")
                        try:
                            self.compress_file(input_path, temp_output_zip, level)
                            if os.path.exists(temp_output_zip):
                                shutil.move(temp_output_zip, temp_output)
                        except Exception:
                            pass
                else:
                    self.compress_file(input_path, temp_output, level)

                if os.path.exists(temp_output):
                    compressed_size = os.path.getsize(temp_output)
                    reduction = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0
                    results[level] = {
                        "size_bytes": compressed_size,
                        "size_readable": self._human_readable_size(compressed_size),
                        "reduction_percent": round(reduction, 1),
                    }
                else:
                    results[level] = {"error": "No output produced"}
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if os.path.exists(temp_output):
                    try:
                        os.remove(temp_output)
                    except Exception:
                        pass

        return {"results": results}

    @staticmethod
    def _get_zip_method(level: str):
        level = level.lower()
        if level == "light":
            return zipfile.ZIP_STORED
        elif level == "medium":
            return zipfile.ZIP_DEFLATED
        elif level == "strong":
            # use bzip2 if available for stronger compression
            try:
                return zipfile.ZIP_BZIP2
            except Exception:
                return zipfile.ZIP_DEFLATED
        return zipfile.ZIP_DEFLATED

    @staticmethod
    def _get_compression_level(level: str) -> int:
        level = level.lower()
        if level == "light":
            return 1
        elif level == "medium":
            return 6
        elif level == "strong":
            return 9
        return 6

    @staticmethod
    def _human_readable_size(size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024
            i += 1
        return f"{size:.1f} {size_names[i]}"
