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
                "compression_quality": 0.9,
                "pikepdf_level": 1
            },
            "medium": {
                "pdfsetting": "/ebook", 
                "color_resolution": 150,
                "gray_resolution": 150,
                "mono_resolution": 300,
                "compression_quality": 0.7,
                "pikepdf_level": 2
            },
            "strong": {
                "pdfsetting": "/screen",
                "color_resolution": 72,
                "gray_resolution": 72, 
                "mono_resolution": 150,
                "compression_quality": 0.4,
                "pikepdf_level": 3
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
        """FIXED: Compress PDF using pikepdf with proper compression methods"""
        if not pikepdf:
            raise RuntimeError("pikepdf not installed")
            
        try:
            settings = self._get_compression_settings(level)
            
            with pikepdf.Pdf.open(input_path, allow_overwriting_input=True) as pdf:
                # Apply different compression strategies based on level
                if level == "light":
                    # Light compression - minimal changes
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        normalize_content=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate,
                        linearize=True
                    )
                elif level == "medium":
                    # Medium compression - balanced approach
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
                        normalize_content=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate,
                        linearize=True,
                        recompress_flate=True
                    )
                else:  # strong
                    # Strong compression - maximum compression
                    # For strong compression, we need to manually process images
                    for page_num, page in enumerate(pdf.pages):
                        self._compress_page_images(page, settings)
                    
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        stream_decode_level=pikepdf.StreamDecodeLevel.all,
                        normalize_content=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate,
                        linearize=True,
                        recompress_flate=True,
                        deterministic_id=True
                    )
                    
            return True
            
        except Exception as e:
            raise RuntimeError(f"pikepdf compression failed: {str(e)}")
    
    def _compress_page_images(self, page, settings):
        """Helper method to compress images in a PDF page"""
        if not pikepdf:
            return
            
        try:
            # This is a simplified approach - in practice, you'd want more sophisticated image handling
            for name, obj in page.Resources.get("/XObject", {}).items():
                if (hasattr(obj, "/Subtype") and 
                    obj.get("/Subtype") == pikepdf.Name("/Image")):
                    
                    # Try to reduce image quality for strong compression
                    if "/Filter" in obj and obj["/Filter"] == pikepdf.Name("/DCTDecode"):
                        # JPEG image - we could re-encode with lower quality
                        # For now, just mark it for potential re-compression
                        pass
                        
        except Exception:
            # If image compression fails, continue without it
            pass
    
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
        """FIXED: Main compression method that tries multiple approaches with better error messages"""
        level = level.lower()
        if level not in ["light", "medium", "strong"]:
            level = "medium"
        
        # Validate input file
        if not os.path.exists(input_path):
            raise RuntimeError("PDF compression failed: Input file not found")
            
        if os.path.getsize(input_path) == 0:
            raise RuntimeError("PDF compression failed: Input file is empty")
            
        errors = []
        
        # Try Ghostscript first (usually more reliable)
        if self.gs_exec:
            try:
                self.compress_with_ghostscript(input_path, output_path, level)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    return True
                else:
                    errors.append("Ghostscript: Output file was not created or is empty")
            except Exception as e:
                errors.append(f"Ghostscript: {str(e)}")
        else:
            errors.append("Ghostscript: Not found on system")
        
        # Fallback to pikepdf
        if pikepdf:
            try:
                self.compress_with_pikepdf(input_path, output_path, level)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    return True
                else:
                    errors.append("pikepdf: Output file was not created or is empty")
            except Exception as e:
                errors.append(f"pikepdf: {str(e)}")
        else:
            errors.append("pikepdf: Not installed")
        
        # If both methods failed, provide clear error message
        if not errors:
            error_msg = "PDF compression failed: No compression methods available"
        else:
            error_msg = f"PDF compression failed: {'; '.join(errors)}"
            
        raise RuntimeError(error_msg)
    
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

# FIXED: Usage example with better error handling
def create_compression_endpoint():
    """Example of how to use this service in your FastAPI endpoint"""
    from fastapi import HTTPException, UploadFile
    import tempfile
    
    async def compress_pdf_endpoint(file: UploadFile, level: str = "medium"):
        compression_service = PDFCompressionService()
        
        # Save uploaded file temporarily
        temp_input = tempfile.mktemp(suffix=".pdf")
        temp_output = tempfile.mktemp(suffix=".pdf")
        
        try:
            # Save uploaded file
            with open(temp_input, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Compress the PDF
            success = compression_service.compress_pdf(temp_input, temp_output, level)
            
            if success:
                # Return the compressed file
                with open(temp_output, "rb") as f:
                    compressed_content = f.read()
                
                return {
                    "success": True,
                    "message": f"PDF compressed successfully using {level} compression",
                    "original_size": len(content),
                    "compressed_size": len(compressed_content),
                    "reduction_percent": round(((len(content) - len(compressed_content)) / len(content)) * 100, 1)
                }
            else:
                raise HTTPException(status_code=500, detail="PDF compression failed")
                
        except RuntimeError as e:
            # Return specific compression error
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            # Return generic error
            raise HTTPException(status_code=500, detail=f"PDF compression failed: {str(e)}")
        finally:
            # Clean up temporary files
            for temp_file in [temp_input, temp_output]:
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                    except:
                        pass
                        
    return compress_pdf_endpoint
