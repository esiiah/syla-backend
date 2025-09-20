# app/services/pdf_compression.py
import os
import tempfile
from typing import Optional
try:
    import pikepdf
except ImportError:
    pikepdf = None

class PDFCompressionService:
    """Robust PDF compression using pikepdf only, with multiple levels"""

    def __init__(self):
        if not pikepdf:
            raise RuntimeError("pikepdf not installed")
    
    def _get_compression_settings(self, level: str) -> dict:
        """Return compression parameters based on level"""
        settings = {
            "light": {"normalize": True, "linearize": True, "recompress_flate": False},
            "medium": {"normalize": True, "linearize": True, "recompress_flate": True},
            "strong": {"normalize": True, "linearize": True, "recompress_flate": True, "max_stream_decode": True}
        }
        return settings.get(level.lower(), settings["medium"])

    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress a PDF file safely with pikepdf"""
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
        if os.path.getsize(input_path) == 0:
            raise RuntimeError("Input file is empty")
        
        settings = self._get_compression_settings(level)
        
        try:
            with pikepdf.Pdf.open(input_path, allow_overwriting_input=True) as pdf:
                # Strong compression: optional image stream processing
                if level.lower() == "strong":
                    for page in pdf.pages:
                        self._compress_page_images(page)
                
                # Save with chosen settings
                save_kwargs = {
                    "compress_streams": True,
                    "normalize_content": settings.get("normalize", True),
                    "linearize": settings.get("linearize", True),
                    "recompress_flate": settings.get("recompress_flate", False),
                    "object_stream_mode": pikepdf.ObjectStreamMode.generate
                }
                if settings.get("max_stream_decode"):
                    save_kwargs["stream_decode_level"] = pikepdf.StreamDecodeLevel.all
                
                pdf.save(output_path, **save_kwargs)
            return True
        except Exception as e:
            raise RuntimeError(f"PDF compression failed: {str(e)}")
    
    def _compress_page_images(self, page):
        """Optional image compression placeholder for strong mode"""
        try:
            xobjects = page.Resources.get("/XObject", {})
            for name, obj in xobjects.items():
                if getattr(obj, "/Subtype", None) == pikepdf.Name("/Image"):
                    # Placeholder for image recompression if needed
                    pass
        except Exception:
            # Ignore image errors
            pass

    def get_compression_preview(self, input_path: str) -> dict:
        """Return estimated sizes for light/medium/strong compression"""
        original_size = os.path.getsize(input_path)
        results = {"original": {"size_bytes": original_size, "size_readable": self._human_readable_size(original_size)}}
        
        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".pdf")
            try:
                self.compress_pdf(input_path, temp_output, level)
                compressed_size = os.path.getsize(temp_output)
                reduction = ((original_size - compressed_size) / original_size) * 100
                results[level] = {
                    "size_bytes": compressed_size,
                    "size_readable": self._human_readable_size(compressed_size),
                    "reduction_percent": round(reduction, 1)
                }
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if os.path.exists(temp_output):
                    os.remove(temp_output)
        return {"results": results}

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
