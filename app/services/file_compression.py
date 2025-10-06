# app/services/file_compression.py
import os
import tempfile
import zipfile
import subprocess
from typing import Dict, Optional
from pathlib import Path

class FileCompressionService:
    """
    File compression service using LibreOffice for document conversions
    and system tools for compression.
    """
    
    GS_PRESETS = {
        "light": "/screen",
        "medium": "/ebook", 
        "strong": "/printer",
    }

    def __init__(self):
        self.libreoffice_path = self._find_libreoffice()
        
    def _find_libreoffice(self) -> Optional[str]:
        """Find LibreOffice executable"""
        possible_paths = [
            "/usr/bin/libreoffice",
            "/usr/bin/soffice",
            "/usr/local/bin/libreoffice",
            "/usr/local/bin/soffice",
            "libreoffice",
            "soffice"
        ]
        
        for path in possible_paths:
            try:
                result = subprocess.run(
                    [path, "--version"],
                    capture_output=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return path
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
        return None

    def _human_readable_size(self, size_bytes: int) -> str:
        """Convert bytes to human readable format"""
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024
            i += 1
        return f"{size:.1f} {size_names[i]}"

    def convert_to_pdf_libreoffice(self, input_path: str, output_dir: str) -> str:
        """
        Convert document to PDF using LibreOffice
        Returns path to generated PDF
        """
        if not self.libreoffice_path:
            raise RuntimeError("LibreOffice not found. Please install LibreOffice.")
        
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
            
        # Create output directory if needed
        os.makedirs(output_dir, exist_ok=True)
        
        # LibreOffice command
        cmd = [
            self.libreoffice_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", output_dir,
            input_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")
            
            # Find generated PDF
            input_name = Path(input_path).stem
            pdf_path = os.path.join(output_dir, f"{input_name}.pdf")
            
            if not os.path.exists(pdf_path):
                raise RuntimeError("PDF not generated")
                
            return pdf_path
            
        except subprocess.TimeoutExpired:
            raise RuntimeError("LibreOffice conversion timeout")
        except Exception as e:
            raise RuntimeError(f"Conversion failed: {str(e)}")

    def compress_pdf_ghostscript(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress PDF using Ghostscript"""
        if level not in ["light", "medium", "strong"]:
            level = "medium"
            
        gs_preset = self.GS_PRESETS[level]
        
        if os.path.exists(output_path):
            os.remove(output_path)
        
        cmd = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={gs_preset}",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={output_path}",
            input_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=60)
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                # Verify it's a valid PDF
                with open(output_path, "rb") as f:
                    if f.read(4) == b"%PDF":
                        return True
            return False
            
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return False

    def compress_file_zip(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Compress any file to ZIP"""
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
            
        # Determine compression method and level
        if level == "light":
            method = zipfile.ZIP_STORED
            compress_level = 1
        elif level == "strong":
            method = zipfile.ZIP_BZIP2
            compress_level = 9
        else:  # medium
            method = zipfile.ZIP_DEFLATED
            compress_level = 6
        
        try:
            with zipfile.ZipFile(output_path, "w", compression=method, 
                               compresslevel=compress_level) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except TypeError:
            # Older Python versions don't support compresslevel
            with zipfile.ZipFile(output_path, "w", compression=method) as zipf:
                zipf.write(input_path, arcname=os.path.basename(input_path))
            return True
        except Exception as e:
            raise RuntimeError(f"ZIP compression failed: {str(e)}")

    def compress_pdf(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """
        Compress PDF file
        Falls back to ZIP if Ghostscript fails
        """
        if not input_path.lower().endswith(".pdf"):
            # Not a PDF, use ZIP compression
            return self.compress_file_zip(input_path, output_path, level)
        
        # Try Ghostscript first
        success = self.compress_pdf_ghostscript(input_path, output_path, level)
        
        if not success:
            # Fallback to ZIP
            zip_output = output_path.replace(".pdf", ".zip") if output_path.endswith(".pdf") else output_path + ".zip"
            return self.compress_file_zip(input_path, zip_output, level)
        
        return True

    def compress_file(self, input_path: str, output_path: str, level: str = "medium") -> bool:
        """Generic file compression (always uses ZIP)"""
        return self.compress_file_zip(input_path, output_path, level)

    def get_compression_preview(self, input_path: str, prefer_pdf: bool = False) -> Dict:
        """Generate compression preview for all levels"""
        if not os.path.exists(input_path):
            raise RuntimeError("Input file not found")
            
        original_size = os.path.getsize(input_path)
        results = {
            "original": {
                "size_bytes": original_size,
                "size_readable": self._human_readable_size(original_size)
            }
        }
        
        for level in ["light", "medium", "strong"]:
            temp_output = tempfile.mktemp(suffix=".pdf" if prefer_pdf else ".zip")
            try:
                if prefer_pdf and input_path.lower().endswith(".pdf"):
                    success = self.compress_pdf(input_path, temp_output, level)
                else:
                    success = self.compress_file(input_path, temp_output, level)
                
                if success and os.path.exists(temp_output):
                    compressed_size = os.path.getsize(temp_output)
                    reduction = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0
                    results[level] = {
                        "size_bytes": compressed_size,
                        "size_readable": self._human_readable_size(compressed_size),
                        "reduction_percent": round(reduction, 1),
                    }
                else:
                    results[level] = {"error": "Compression failed"}
            except Exception as e:
                results[level] = {"error": str(e)}
            finally:
                if os.path.exists(temp_output):
                    try:
                        os.remove(temp_output)
                    except Exception:
                        pass
        
        return {"results": results}
