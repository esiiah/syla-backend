# app/services/file_compression.py
import os
import tempfile
import zipfile
import zlib
from typing import Dict


class FileCompressionService:
    """Robust file compression for PDFs and Office docs using zipfile + zlib"""

    def __init__(self):
        pass

    def compress_file(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """
        Compress any file (PDF, DOCX, XLSX, PPTX, etc.) using zlib and zipfile
        level: "light" (fast, minimal compression), "medium" (balanced), "strong" (max)
        """
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
        if os.path.getsize(input_path) == 0:
            raise RuntimeError("Input file is empty")

        method = self._get_zip_method(level)

        try:
            with zipfile.ZipFile(output_path, "w", compression=method, compresslevel=self._get_compression_level(level)) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except Exception as e:
            raise RuntimeError(f"File compression failed: {str(e)}")

    def get_compression_preview(self, input_path: str) -> Dict:
        """Return estimated sizes for light/medium/strong compression as zip archives"""
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")

        original_size = os.path.getsize(input_path)
        results = {
            "original": {
                "size_bytes": original_size,
                "size_readable": self._human_readable_size(original_size),
            }
        }

        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".zip")
            try:
                self.compress_file(input_path, temp_output, level)
                compressed_size = os.path.getsize(temp_output)
                reduction = ((original_size - compressed_size) / original_size) * 100
                results[level] = {
                    "size_bytes": compressed_size,
                    "size_readable": self._human_readable_size(compressed_size),
                    "reduction_percent": round(reduction, 1),
                }
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if os.path.exists(temp_output):
                    os.remove(temp_output)

        return {"results": results}

    @staticmethod
    def _get_zip_method(level: str):
        """Choose compression method for zipfile"""
        level = level.lower()
        if level == "light":
            return zipfile.ZIP_STORED  # no compression
        elif level == "medium":
            return zipfile.ZIP_DEFLATED  # standard deflate
        elif level == "strong":
            return zipfile.ZIP_BZIP2  # stronger
        return zipfile.ZIP_DEFLATED

    @staticmethod
    def _get_compression_level(level: str) -> int:
        """Map levels to zlib compression levels"""
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
        """Convert bytes to human-readable format"""
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024
            i += 1
        return f"{size:.1f} {size_names[i]}"
