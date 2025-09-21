# app/services/file_compression.py
import os
import tempfile
import zipfile
import shutil
import subprocess
from typing import Dict

class FileCompressionService:
    GS_PRESETS = {
        "light": "/screen",
        "medium": "/ebook",
        "strong": "/printer",
    }

    def __init__(self):
        pass

    def compress_file(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
        if os.path.getsize(input_path) == 0:
            raise RuntimeError("Input file is empty")

        method = self._get_zip_method(level)
        compresslevel = self._get_compression_level(level)

        try:
            with zipfile.ZipFile(output_path, "w", compression=method, compresslevel=compresslevel) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except TypeError:
            with zipfile.ZipFile(output_path, "w", compression=method) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except Exception as e:
            raise RuntimeError(f"File compression failed: {str(e)}")

    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """
        Compress a PDF using Ghostscript. Fallback: produce a .zip for non-PDFs or failures.
        """
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")

        if not input_path.lower().endswith(".pdf"):
            # Non-PDF fallback
            zip_output = output_path
            if not zip_output.lower().endswith(".zip"):
                zip_output = output_path + ".zip"
            return self.compress_file(input_path, zip_output, level)

        if level not in ["light", "medium", "strong"]:
            level = "medium"

        gs_preset = self.GS_PRESETS.get(level, "/ebook")
        if os.path.exists(output_path):
            os.remove(output_path)

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
            subprocess.run(gs_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            # Verify output is a valid PDF
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                with open(output_path, "rb") as f:
                    if f.read(4) != b"%PDF":
                        raise RuntimeError("Ghostscript output is not a valid PDF")
                return True

        except Exception:
            # Fallback: create a zip of the original PDF
            zip_out = output_path + ".zip" if not output_path.lower().endswith(".zip") else output_path
            self.compress_file(input_path, zip_out, level)
            return True

    def get_compression_preview(self, input_path: str, prefer_pdf: bool = False) -> Dict:
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")

        original_size = os.path.getsize(input_path)
        results = {"original": {"size_bytes": original_size, "size_readable": self._human_readable_size(original_size)}}

        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".pdf" if prefer_pdf else ".zip")
            try:
                if prefer_pdf and input_path.lower().endswith(".pdf"):
                    self.compress_pdf(input_path, temp_output, level)
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
