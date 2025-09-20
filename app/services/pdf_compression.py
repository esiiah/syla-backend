# app/services/pdf_compression.py
import os
import tempfile
import subprocess
import shutil
from typing import Optional

try:
    import pikepdf
except Exception:
    pikepdf = None

class PDFCompressionService:
    """Service for PDF compression using Ghostscript and pikepdf as fallback."""

    def __init__(self):
        self.gs_exec = self._find_ghostscript()

    def _find_ghostscript(self) -> Optional[str]:
        candidates = ["gs", "gswin64c", "gswin32c", "ghostscript"]
        for candidate in candidates:
            path = shutil.which(candidate)
            if path:
                return path
        return None

    def _get_compression_settings(self, level: str) -> dict:
        level = (level or "medium").lower()
        settings_map = {
            "light": {
                "pdfsetting": "/printer",
                "color_resolution": 300,
                "gray_resolution": 300,
                "mono_resolution": 600
            },
            "medium": {
                "pdfsetting": "/ebook",
                "color_resolution": 150,
                "gray_resolution": 150,
                "mono_resolution": 300
            },
            "strong": {
                "pdfsetting": "/screen",
                "color_resolution": 72,
                "gray_resolution": 72,
                "mono_resolution": 150
            }
        }
        return settings_map.get(level, settings_map["medium"])

    def compress_with_ghostscript(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress PDF using Ghostscript if available."""
        if not self.gs_exec:
            raise RuntimeError("Ghostscript not found on server")
        settings = self._get_compression_settings(level)
        cmd = [
            self.gs_exec,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={settings['pdfsetting']}",
            "-dColorImageDownsampleType=/Bicubic",
            f"-dColorImageResolution={settings['color_resolution']}",
            "-dGrayImageDownsampleType=/Bicubic",
            f"-dGrayImageResolution={settings['gray_resolution']}",
            "-dMonoImageDownsampleType=/Bicubic",
            f"-dMonoImageResolution={settings['mono_resolution']}",
            "-dNOPAUSE",
            "-dBATCH",
            "-dQUIET",
            f"-sOutputFile={output_path}",
            input_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(result.stderr or result.stdout or "Ghostscript returned non-zero status")
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise RuntimeError("Ghostscript produced empty output")
            return True
        except subprocess.TimeoutExpired:
            raise RuntimeError("Ghostscript timeout (file probably too large)")
        except Exception as e:
            raise RuntimeError(f"Ghostscript error: {str(e)}")

    def compress_with_pikepdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress using pikepdf (best-effort)."""
        if not pikepdf:
            raise RuntimeError("pikepdf is not installed on the server")
        try:
            # open and resave with stream compression and linearize if possible
            with pikepdf.open(input_path) as pdf:
                save_kwargs = {"linearize": True, "compress_streams": True}
                # For strong compression: attempt to recompress streams more aggressively
                if (level or "").lower() == "strong":
                    # pikepdf allows recompressing some streams; keep this minimal and safe
                    save_kwargs["recompress_flate"] = True
                pdf.save(output_path, **save_kwargs)
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise RuntimeError("pikepdf saved empty output")
            return True
        except Exception as e:
            raise RuntimeError(f"pikepdf compression failed: {str(e)}")

    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """
        Try Ghostscript first (if available), then fall back to pikepdf.
        Raises RuntimeError with aggregated messages if all methods fail.
        """
        errors = []
        level = (level or "medium").lower()
        # Ghostscript first
        if self.gs_exec:
            try:
                self.compress_with_ghostscript(input_path, output_path, level)
                return True
            except Exception as e:
                errors.append(f"Ghostscript: {str(e)}")
        # pikepdf fallback
        try:
            self.compress_with_pikepdf(input_path, output_path, level)
            return True
        except Exception as e:
            errors.append(f"pikepdf: {str(e)}")
        # Both failed
        raise RuntimeError("All compression methods failed: " + " | ".join(errors))

    @staticmethod
    def get_compression_preview(input_path: str):
        """Return size preview for each compression level (best-effort)."""
        original_size = os.path.getsize(input_path)
        results = {"original": {"size_bytes": original_size}}
        for level in ["light", "medium", "strong"]:
            temp_out = tempfile.mktemp(suffix=".pdf")
            try:
                service = PDFCompressionService()
                # Use try/except to avoid throwing out of the loop
                try:
                    service.compress_pdf(input_path, temp_out, level)
                    if os.path.exists(temp_out):
                        compressed = os.path.getsize(temp_out)
                        reduction = ((original_size - compressed) / original_size) * 100 if original_size > 0 else 0
                        results[level] = {
                            "size_bytes": compressed,
                            "reduction_percent": round(reduction, 1)
                        }
                    else:
                        results[level] = {"error": "no output"}
                except Exception as e:
                    results[level] = {"error": str(e)}
            finally:
                try:
                    if os.path.exists(temp_out):
                        os.remove(temp_out)
                except Exception:
                    pass
        return results

    @staticmethod
    def human_readable_size(size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        s = float(size_bytes)
        while s >= 1024 and i < len(units) - 1:
            s /= 1024.0
            i += 1
        return f"{s:.1f} {units[i]}"
