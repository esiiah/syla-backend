# app/services/pdf_compression.py
import os
import tempfile
import subprocess
import shutil
from typing import Optional, Tuple

try:
    import pikepdf
except ImportError:
    pikepdf = None

class PDFCompressionService:
    """Dedicated service for PDF compression with multiple methods and compression levels"""
    
    def __init__(self):
        self.gs_exec = self._find_ghostscript()
        
    def _find_ghostscript(self) -> Optional[str]:
        """Find Ghostscript executable"""
        candidates = ["gs", "gswin64c", "gswin32c", "ghostscript"]
        for candidate in candidates:
            path = shutil.which(candidate)
            if path:
                return path
        return None
    
    def _get_compression_settings(self, level: str) -> dict:
        """Get compression settings based on level"""
        settings = {
            "light": {
                "pdfsetting": "/printer",
                "color_resolution": 300,
                "gray_resolution": 300,
                "mono_resolution": 600,
                "compression_quality": 0.9
            },
            "medium": {
                "pdfsetting": "/ebook", 
                "color_resolution": 150,
                "gray_resolution": 150,
                "mono_resolution": 300,
                "compression_quality": 0.7
            },
            "strong": {
                "pdfsetting": "/screen",
                "color_resolution": 72,
                "gray_resolution": 72, 
                "mono_resolution": 150,
                "compression_quality": 0.4
            }
        }
        return settings.get(level.lower(), settings["medium"])
    
    def compress_with_ghostscript(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress PDF using Ghostscript"""
        if not self.gs_exec:
            raise RuntimeError("Ghostscript not found")
            
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
            "-dQUIET", 
            "-dBATCH",
            f"-sOutputFile={output_path}",
            input_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(f"Ghostscript failed: {result.stderr or result.stdout}")
            return True
        except subprocess.TimeoutExpired:
            raise RuntimeError("Compression timeout - file too large")
        except Exception as e:
            raise RuntimeError(f"Ghostscript error: {str(e)}")
    
    def compress_with_pikepdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress PDF using pikepdf with corrected parameters"""
        if not pikepdf:
            raise RuntimeError("pikepdf not installed")
            
        try:
            with pikepdf.Pdf.open(input_path) as pdf:
                # Apply compression based on level
                settings = self._get_compression_settings(level)
                
                # Use correct pikepdf parameters
                save_kwargs = {
                    "compress_streams": True,
                    "stream_decode_level": pikepdf.StreamDecodeLevel.generalized,
                    "object_stream_mode": pikepdf.ObjectStreamMode.generate,
                    "normalize_content": True,
                    "linearize": True
                }
                
                # Adjust quality based on compression level
                if level == "strong":
                    save_kwargs["recompress_flate"] = True
                    save_kwargs["compression_level"] = 9
                elif level == "light":  
                    save_kwargs["compression_level"] = 1
                else:  # medium
                    save_kwargs["compression_level"] = 6
                
                pdf.save(output_path, **save_kwargs)
            return True
            
        except Exception as e:
            raise RuntimeError(f"pikepdf compression failed: {str(e)}")
    
    def get_compression_preview(self, input_path: str) -> dict:
        """Get compression preview for different levels"""
        original_size = os.path.getsize(input_path)
        results = {
            "original": {
                "size_bytes": original_size,
                "size_readable": self._human_readable_size(original_size)
            }
        }
        
        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".pdf")
            try:
                success = self.compress_pdf(input_path, temp_output, level)
                if success and os.path.exists(temp_output):
                    compressed_size = os.path.getsize(temp_output)
                    reduction = ((original_size - compressed_size) / original_size) * 100
                    results[level] = {
                        "size_bytes": compressed_size,
                        "size_readable": self._human_readable_size(compressed_size),
                        "reduction_percent": round(reduction, 1)
                    }
                else:
                    results[level] = {"error": "Compression failed"}
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if os.path.exists(temp_output):
                    try:
                        os.remove(temp_output)
                    except:
                        pass
        
        return {"results": results}
    
    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Main compression method that tries multiple approaches"""
        level = level.lower()
        if level not in ["light", "medium", "strong"]:
            level = "medium"
            
        errors = []
        
        # Try Ghostscript first (usually more reliable)
        if self.gs_exec:
            try:
                self.compress_with_ghostscript(input_path, output_path, level)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    return True
            except Exception as e:
                errors.append(f"Ghostscript: {str(e)}")
        
        # Fallback to pikepdf
        try:
            self.compress_with_pikepdf(input_path, output_path, level)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return True
        except Exception as e:
            errors.append(f"pikepdf: {str(e)}")
        
        # If both methods failed
        error_msg = "; ".join(errors) if errors else "Unknown compression error"
        raise RuntimeError(f"All compression methods failed: {error_msg}")
    
    @staticmethod
    def _human_readable_size(size_bytes: int) -> str:
        """Convert bytes to human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        size_bytes = float(size_bytes)
        i = 0
        
        while size_bytes >= 1024.0 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
            
        return f"{size_bytes:.1f} {size_names[i]}"
