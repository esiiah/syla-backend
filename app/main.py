# app/main.py
from dotenv import load_dotenv
load_dotenv() 

import logging
import time
import mimetypes
import re
import os
from typing import List, Dict, Any
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel

from .utils import clean_dataframe, detect_column_types, summarize_numeric
from .file_tools_full import router as file_tools_full_router, UPLOAD_DIR
from .routers import auth as auth_router
from .routers import password_recovery
from .routers import profile
from .ai.router import router as forecast_router, forecast_service
from .routers import chart_settings, notifications, search
from .routers import help, pricing
from app.routers import row_selection
from . import visual
from app import settings


PORT = int(os.getenv("PORT", "8080"))
# ------------------------------
# Environment validation
# ------------------------------
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    DATABASE_URL = os.getenv("DATABASE_PROD_URL")
else:
    DATABASE_URL = os.getenv("DATABASE_LOCAL_URL")

if not DATABASE_URL:
    raise EnvironmentError(f"❌ DATABASE URL not set for environment: {ENVIRONMENT}")

print(f"🔌 Using database URL for {ENVIRONMENT}: {DATABASE_URL}")

# ------------------------------
# Logging configuration
# ------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("syla-backend")

# ------------------------------
# FastAPI initialization
# ------------------------------
app = FastAPI(title="Syla Analytics")

# ADD THIS BLOCK HERE ↓↓↓
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    try:
        from .routers.password_recovery import Base, engine
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.warning(f"⚠️ Database table creation failed (may already exist): {e}")

# ------------------------------
# CORS middleware
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(',') if ',' in settings.CORS_ORIGINS else [settings.CORS_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ------------------------------
# Source Code API for AI Assistant
# ------------------------------
@app.get("/api/source/{file_path:path}")
async def get_source_code(file_path: str):
    """Serve source code files for AI assistant reading"""
    try:
        # Security: only allow specific directories
        allowed_dirs = ["frontend/src", "app"]
        
        # Check if path starts with allowed directory
        if not any(file_path.startswith(d) for d in allowed_dirs):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=403, detail="Invalid path")
        
        # Build full path relative to project root
        base_dir = Path(__file__).parent.parent
        full_path = base_dir / file_path
        
        # Check file exists and is a file
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Only serve text files
        allowed_extensions = {'.js', '.jsx', '.py', '.json', '.css', '.html', '.md', '.txt'}
        if full_path.suffix.lower() not in allowed_extensions:
            raise HTTPException(status_code=403, detail="File type not allowed")
        
        # Read and return file content
        return FileResponse(
            full_path,
            media_type="text/plain",
            headers={"Content-Type": "text/plain; charset=utf-8"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Source code retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        

@app.get("/api/source-index")
async def get_source_index():
    """List available source files for AI assistant"""
    try:
        base_dir = Path(__file__).parent.parent
        frontend_src = base_dir / "frontend" / "src"
        app_dir = base_dir / "app"
        
        files = []
        
        # Frontend files
        if frontend_src.exists():
            for ext in ['.jsx', '.js', '.css']:
                files.extend([
                    f"frontend/src/{f.relative_to(frontend_src)}"
                    for f in frontend_src.rglob(f"*{ext}")
                ])
        
        # Backend files
        if app_dir.exists():
            for ext in ['.py']:
                files.extend([
                    f"app/{f.relative_to(app_dir)}"
                    for f in app_dir.rglob(f"*{ext}")
                    if not f.name.startswith('__')
                ])
        
        return {"files": sorted(files), "total": len(files)}
    except Exception as e:
        logger.error(f"Source index failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ------------------------------
# Pydantic Models
# ------------------------------
class ChartPayloadRequest(BaseModel):
    file_id: str = None
    csv_data: List[Dict[str, Any]] = None
    filters: Dict[str, Any] = {}
    aggregation: Dict[str, str] = {}
    display: Dict[str, Any] = {}
    preview_only: bool = False

class ChartSaveRequest(BaseModel):
    chart_payload: Dict[str, Any]
    description: str = ""
    owner_id: str = None

class ChartExportRequest(BaseModel):
    chart_id: str = None
    chart_payload: Dict[str, Any] = None
    format: str = "png"
    background: str = "#ffffff"
    dpi: int = 300
    filename: str = None
    include_metadata: bool = False

class ForecastRequest(BaseModel):
    file_id: str = None
    csv_data: List[Dict[str, Any]] = None
    filters: Dict[str, Any] = {}
    company: str = None
    campaign: str = None
    method: str = "prophet"
    horizon: int = 12
    ci: float = 0.95
    regressors: List[str] = []
    config: Dict[str, Any] = {}

# ------------------------------
# Helper Functions
# ------------------------------
def sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "uploaded_file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base

def unique_filename(name: str) -> str:
    safe = sanitize_filename(name)
    ts = int(time.time() * 1000)
    return f"{ts}_{safe}"

# ------------------------------
# FRONTEND DIRECTORY - MUST BE DEFINED EARLY
# ------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "dist")
FRONTEND_DIR = os.path.abspath(FRONTEND_DIR)

logger.info(f"🔍 Looking for frontend at: {FRONTEND_DIR}")
logger.info(f"🔍 __file__ is: {__file__}")
logger.info(f"🔍 dirname is: {os.path.dirname(__file__)}")

# ------------------------------
# PRIMARY UPLOAD ENDPOINT (MUST BE FIRST)
# ------------------------------
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Primary upload endpoint for CSV/Excel chart data"""
    filename = file.filename or "uploaded_file"
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File is empty")
        
        saved_name = unique_filename(filename)
        raw_path = visual.RAW_DIR / saved_name
        
        with open(raw_path, "wb") as f:
            f.write(raw)
        
        try:
            df = visual.universal_load_any_file(str(raw_path))
            df_clean, cleaning_metadata = visual.universal_clean_pipeline(df, aggressive=False)
            logger.info(f"Universal processing: {len(df_clean)} rows, {len(df_clean.columns)} cols")
            
            column_types = detect_column_types(df_clean)
            summary = summarize_numeric(df_clean)
            
            cleaned_name = f"cleaned_{saved_name}"
            cleaned_path = visual.CLEANED_DIR / cleaned_name
            df_clean.to_csv(cleaned_path, index=False)
            
            x_axis = df_clean.columns[0] if len(df_clean.columns) > 0 else "Column_1"
            numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
            if numeric_cols:
                y_axis = numeric_cols[0]
            elif len(df_clean.columns) > 1:
                y_axis = df_clean.columns[1]
            else:
                y_axis = x_axis
            
            return JSONResponse(content={
                "file_id": saved_name,
                "filename": filename,
                "path": str(raw_path),
                "cleaned_path": str(cleaned_path),
                "rows": len(df_clean),
                "columns": list(df_clean.columns),
                "types": column_types,
                "summary": summary,
                "data": df_clean.to_dict(orient="records"),
                "chart_title": filename.split('.')[0],
                "x_axis": x_axis,
                "y_axis": y_axis,
                "download_url": f"/api/files/{saved_name}",
                "cleaning_metadata": cleaning_metadata,
                "processing_mode": "universal",
                "message": f"Successfully processed {len(df_clean)} rows and {len(df_clean.columns)} columns"
            })
            
        except Exception as e:
            logger.error(f"Universal processing failed: {e}")
            try:
                with open(raw_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                lines = [line.strip() for line in content.split('\n')[:1000] if line.strip()]
                df_fallback = pd.DataFrame({'Raw_Content': lines})
                
                cleaned_name = f"cleaned_{saved_name}"
                cleaned_path = visual.CLEANED_DIR / cleaned_name
                df_fallback.to_csv(cleaned_path, index=False)
                
                return JSONResponse(content={
                    "file_id": saved_name,
                    "filename": filename,
                    "rows": len(df_fallback),
                    "columns": ["Raw_Content"],
                    "types": {"Raw_Content": "categorical"},
                    "summary": {"Raw_Content": {"unique": len(set(lines)), "top_values": {}}},
                    "data": df_fallback.to_dict(orient="records"),
                    "chart_title": filename,
                    "x_axis": "Raw_Content",
                    "y_axis": "Raw_Content",
                    "message": "File processed as raw text content",
                    "processing_mode": "fallback"
                })
            except Exception as fallback_error:
                logger.error(f"Even fallback processing failed: {fallback_error}")
                raise HTTPException(status_code=500, detail=f"Could not process file: {str(e)}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed completely")
        raise HTTPException(status_code=500, detail=f"Server error: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            pass

# ------------------------------
# Health Check
# ------------------------------
@app.get("/api/health")
def health_check():
    return {"message": "Backend is running", "ai_enabled": True, "status": "ok"}

# ------------------------------
# Include routers AFTER primary endpoints
# ------------------------------
app.include_router(auth_router.router)
app.include_router(password_recovery.router)
app.include_router(profile.router)
app.include_router(forecast_router)
app.include_router(chart_settings.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(help.router)
app.include_router(pricing.router)
app.include_router(file_tools_full_router)
app.include_router(row_selection.router, prefix="/api", tags=["row_selection"])

# ------------------------------
# SSR Data Endpoint for Crawlers
# ------------------------------
@app.get("/api/ssr-meta")
def get_ssr_meta(path: str = "/"):
    """Provide metadata for SSR/crawlers based on route"""
    routes = {
        "/": {
            "title": "Syla Analytics – AI Data Forecasting & Visualization",
            "description": "Clean, visualize, and convert your data with intelligent AI automation. Upload CSV/Excel files for instant analysis.",
            "keywords": "AI forecasting, data visualization, CSV analysis, Excel tools, data cleaning"
        },
        "/forecast": {
            "title": "AI Forecasting - Syla Analytics",
            "description": "Generate accurate AI-powered forecasts from your data. Prophet and GPT-based models available.",
            "keywords": "AI forecasting, predictive analytics, time series, Prophet, GPT forecasting"
        },
        "/tools/compress": {
            "title": "File Compression Tools - Syla Analytics",
            "description": "Compress images, PDFs, and documents with smart AI-powered optimization.",
            "keywords": "file compression, image optimization, PDF compression"
        },
        "/tools/convert": {
            "title": "File Conversion Tools - Syla Analytics",
            "description": "Convert between CSV, Excel, PDF, and other formats instantly.",
            "keywords": "file conversion, CSV to Excel, PDF conversion, format converter"
        },
        "/tools/merge": {
            "title": "PDF Merge Tool - Syla Analytics",
            "description": "Merge multiple PDF files into a single document.",
            "keywords": "PDF merge, combine PDFs, PDF tools"
        },
        "/editing": {
            "title": "Chart Editing - Syla Analytics",
            "description": "Advanced chart editing and customization tools for data visualization.",
            "keywords": "chart editing, data visualization, chart customization"
        },
        "/pricing": {
            "title": "Pricing - Syla Analytics",
            "description": "View our pricing plans for advanced AI forecasting and data analysis features.",
            "keywords": "pricing, plans, subscription, AI tools"
        },
        "/help": {
            "title": "Help & Support - Syla Analytics",
            "description": "Get help with using Syla Analytics features and tools.",
            "keywords": "help, support, documentation, FAQ"
        },
        "/docs": {
            "title": "Documentation - Syla Analytics",
            "description": "Complete documentation for Syla Analytics API and features.",
            "keywords": "documentation, API docs, guides, tutorials"
        }
    }
    
    meta = routes.get(path, routes["/"])
    return {
        "title": meta["title"],
        "description": meta["description"],
        "keywords": meta["keywords"],
        "url": f"https://sylaanalytics.com{path}",
        "image": "https://sylaanalytics.com/favicon.png"
    }
# ------------------------------
# Chart & Data Processing Endpoints
# ------------------------------
@app.get("/api/preview")
async def get_preview(file_id: str, n: int = 10):
    try:
        file_path = visual.RAW_DIR / file_id
        if not file_path.exists():
            file_path = visual.CLEANED_DIR / f"cleaned_{file_id}"
            if not file_path.exists():
                raise HTTPException(404, "File not found")
        df = visual.load_raw_csv(str(file_path))
        preview_data = visual.preview_rows(df, n)
        schema = visual.get_schema_expectations()
        return {
            "preview_rows": preview_data.to_dict('records'),
            "schema": schema,
            "total_rows": len(df),
            "columns": list(df.columns)
        }
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        raise HTTPException(500, f"Preview error: {e}")

@app.post("/api/chart/payload")
async def generate_chart_payload(request: ChartPayloadRequest):
    try:
        if request.file_id:
            file_path = visual.CLEANED_DIR / f"cleaned_{request.file_id}"
            if not file_path.exists():
                file_path = visual.RAW_DIR / request.file_id
            df = visual.load_raw_csv(str(file_path))
        elif request.csv_data:
            df = pd.DataFrame(request.csv_data)
        else:
            raise HTTPException(400, "Either file_id or csv_data required")
        
        df_filtered = visual.filter_dataframe(df, request.filters) if request.filters else df
        if df_filtered.empty:
            return {"error": "No data after filtering"}
        
        agg_config = request.aggregation
        if agg_config.get('by') and agg_config.get('metric'):
            df_agg = visual.aggregate(df_filtered, agg_config['by'], agg_config['metric'],
                                      agg_config.get('agg', 'sum'))
        else:
            df_agg = df_filtered
        
        display_config = request.display
        if display_config.get('top_n') and display_config['top_n'] > 0:
            group_key = agg_config.get('by', df_agg.columns[0])
            metric_key = agg_config.get('metric', df_agg.select_dtypes(include=['number']).columns[0])
            df_final = visual.top_n_with_others(df_agg, group_key, metric_key,
                                                display_config['top_n'], display_config.get('sort', 'desc'))
        else:
            df_final = df_agg
        
        chart_payload = visual.generate_chart_payload(df_final,
                                                      display_config.get('chart_type', 'bar'),
                                                      display_config)
        chart_id_temp = f"temp_{int(time.time())}"
        
        return {
            "chart_payload": chart_payload,
            "chart_id_temp": chart_id_temp,
            "data_summary": {
                "original_rows": len(df),
                "filtered_rows": len(df_filtered),
                "final_rows": len(df_final)
            }
        }
    except Exception as e:
        logger.error(f"Chart payload generation failed: {e}")
        raise HTTPException(500, f"Chart generation error: {e}")

@app.post("/api/charts/save")
async def save_chart(request: ChartSaveRequest):
    try:
        chart_id = visual.save_chart_metadata(request.chart_payload, str(visual.CHARTS_DIR))
        visual.log_action(
            action="chart_save",
            user_id=request.owner_id or "anonymous",
            artifact_id=chart_id,
            params={"description": request.description}
        )
        return {
            "chart_id": chart_id,
            "saved_path": str(visual.CHARTS_DIR / f"{chart_id}.json"),
            "metadata_path": str(visual.CHARTS_DIR / f"{chart_id}.json")
        }
    except Exception as e:
        logger.error(f"Chart save failed: {e}")
        raise HTTPException(500, f"Save error: {e}")

@app.post("/api/charts/export")
async def export_chart(request: ChartExportRequest):
    try:
        chart_payload = request.chart_payload
        if request.chart_id and not chart_payload:
            chart_file = visual.CHARTS_DIR / f"{request.chart_id}.json"
            if chart_file.exists():
                import json
                with open(chart_file) as f:
                    saved_chart = json.load(f)
                    chart_payload = saved_chart.get('chart_payload', {})
        if not chart_payload:
            raise HTTPException(400, "No chart data provided")
        
        export_path = visual.export_chart_image(chart_payload,
                                                format=request.format,
                                                background=request.background,
                                                dpi=request.dpi,
                                                filename=request.filename)
        return {
            "export_job_id": f"job_{int(time.time())}",
            "status": "completed",
            "download_url": f"/api/files/charts/{os.path.basename(export_path)}"
        }
    except Exception as e:
        logger.error(f"Chart export failed: {e}")
        raise HTTPException(500, f"Export error: {e}")

# ------------------------------
# Forecast Endpoints
# ------------------------------
@app.post("/api/forecast")
async def create_forecast(request: ForecastRequest):
    try:
        if request.file_id:
            file_path = visual.CLEANED_DIR / f"cleaned_{request.file_id}"
            if not file_path.exists():
                file_path = visual.RAW_DIR / request.file_id
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            df = visual.load_raw_csv(str(file_path))
        elif request.csv_data:
            df = pd.DataFrame(request.csv_data)
        else:
            raise HTTPException(400, "Either file_id or csv_data required")
        
        df_filtered = visual.filter_dataframe(df, request.filters) if request.filters else df
        if df_filtered.empty:
            raise HTTPException(status_code=400, detail="No data after filtering")
        
        target_column = None
        if request.config and isinstance(request.config, dict):
            target_column = request.config.get('target_column')
        if not target_column:
            numeric_cols = df_filtered.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                target_column = numeric_cols[0]
        if not target_column:
            raise HTTPException(status_code=400, detail="Could not determine target column")
        
        date_column = None
        for candidate in ['date', 'ds', 'timestamp', 'created_at']:
            if candidate in df_filtered.columns:
                date_column = candidate
                break
        
        method = (request.method or 'hybrid').lower()
        if method in ['prophet']:
            model_preference = 'prophet'
        elif method in ['gpt']:
            model_preference = 'gpt'
        else:
            model_preference = 'hybrid'
        
        scenario_text = ''
        if request.config and isinstance(request.config, dict):
            scenario_text = request.config.get('scenario_text', '')
        
        data_records = df_filtered.to_dict(orient='records')
        user_id = (request.config or {}).get('user_id', 'system')
        
        result = await forecast_service.create_forecast(
            data=data_records,
            scenario=scenario_text or "",
            target_column=target_column,
            date_column=date_column,
            model_preference=model_preference,
            periods_ahead=int(request.horizon or 12),
            confidence_level=float(request.ci or 0.95),
            user_id=user_id
        )
        
        return JSONResponse(content={
            "job_id": f"forecast_{int(time.time())}",
            "status": "completed",
            "forecast_result": result
        })
    except Exception as e:
        logger.exception(f"Forecast failed: {e}")
        raise HTTPException(status_code=500, detail=f"Forecast error: {e}")

@app.get("/api/forecast/{job_id}")
async def get_forecast_status(job_id: str):
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100
    }

# ------------------------------
# Model & Dataset Endpoints
# ------------------------------
@app.get("/api/models/{model_id}")
async def get_model_metadata(model_id: str):
    try:
        model_file = visual.MODELS_DIR / f"{model_id}.json"
        if not model_file.exists():
            raise HTTPException(404, "Model not found")
        import json
        with open(model_file) as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"Model metadata retrieval failed: {e}")
        raise HTTPException(500, f"Model error: {e}")

@app.get("/api/datasets")
async def list_datasets():
    try:
        datasets = visual.get_available_datasets()
        return {"datasets": datasets}
    except Exception as e:
        logger.error(f"Dataset listing failed: {e}")
        raise HTTPException(500, f"Dataset error: {e}")

# ------------------------------
# Static file serving for uploads
# ------------------------------
@app.get("/api/files/{saved_filename}")
async def serve_uploaded_file(saved_filename: str):
    if "/" in saved_filename or "\\" in saved_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    mime_type, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=mime_type or "application/octet-stream",
                        filename=os.path.basename(path))

# ------------------------------
# Upload directory mount
# ------------------------------
os.makedirs(UPLOAD_DIR, exist_ok=True)
uploads_path = Path(UPLOAD_DIR).parent
if uploads_path.exists():
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
    logger.info(f"✅ Uploads mounted at /uploads from {uploads_path}")
else:
    logger.warning(f"⚠️ Uploads directory not found at {uploads_path}")

# ------------------------------
# Frontend static files setup
# ------------------------------
if os.path.exists(FRONTEND_DIR):
    logger.info(f"✅ Frontend directory exists: {FRONTEND_DIR}")
    contents = os.listdir(FRONTEND_DIR)
    logger.info(f"📁 Contents: {contents}")
    
    # Mount assets directory
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        logger.info(f"✅ Assets mounted from {assets_dir}")
    
    # Check service worker
    sw_path = os.path.join(FRONTEND_DIR, "service-worker.js")
    logger.info(f"🔍 Checking service worker at: {sw_path}")
    if os.path.exists(sw_path):
        logger.info(f"✅ service-worker.js EXISTS at {sw_path}")
    else:
        logger.error(f"❌ service-worker.js NOT FOUND at {sw_path}")
    
    # Check index.html
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        logger.info(f"✅ index.html found at {index_path}")
    else:
        logger.error(f"❌ index.html NOT FOUND at {index_path}")
else:
    logger.error(f"❌ Frontend directory DOES NOT EXIST: {FRONTEND_DIR}")

# ------------------------------
# Service Worker Route (BEFORE SPA FALLBACK)
# ------------------------------
@app.get("/service-worker.js")
async def serve_service_worker():
    sw_path = os.path.join(FRONTEND_DIR, "service-worker.js")
    logger.info(f"🔍 Service worker requested. Looking at: {sw_path}")
    
    if not os.path.exists(sw_path):
        logger.error(f"❌ service-worker.js NOT FOUND at {sw_path}")
        raise HTTPException(status_code=404, detail="Service worker not found")
    
    logger.info(f"✅ Serving service-worker.js from {sw_path}")
    return FileResponse(sw_path, media_type="application/javascript", headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Service-Worker-Allowed": "/"
    })

# ------------------------------
# Static files from root (favicon, manifest, etc.) - BEFORE SPA FALLBACK
# ------------------------------
@app.get("/favicon.png")
async def serve_favicon():
    favicon_path = os.path.join(FRONTEND_DIR, "favicon.png")
    if not os.path.exists(favicon_path):
        logger.error(f"❌ favicon.png NOT FOUND at {favicon_path}")
        raise HTTPException(status_code=404, detail="Favicon not found")
    logger.info(f"✅ Serving favicon.png from {favicon_path}")
    return FileResponse(favicon_path, media_type="image/png")

@app.get("/manifest.json")
async def serve_manifest():
    manifest_path = os.path.join(FRONTEND_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        logger.error(f"❌ manifest.json NOT FOUND at {manifest_path}")
        raise HTTPException(status_code=404, detail="Manifest not found")
    logger.info(f"✅ Serving manifest.json from {manifest_path}")
    return FileResponse(manifest_path, media_type="application/json")

@app.get("/ads.txt")
async def serve_ads():
    ads_path = os.path.join(FRONTEND_DIR, "ads.txt")
    if not os.path.exists(ads_path):
        raise HTTPException(status_code=404, detail="ads.txt not found")
    return FileResponse(ads_path, media_type="text/plain")

@app.get("/robots.txt")
async def serve_robots():
    robots_path = os.path.join(FRONTEND_DIR, "robots.txt")
    if not os.path.exists(robots_path):
        raise HTTPException(status_code=404, detail="robots.txt not found")
    return FileResponse(robots_path, media_type="text/plain")

@app.get("/sitemap.xml")
async def serve_sitemap():
    sitemap_path = os.path.join(FRONTEND_DIR, "sitemap.xml")
    if not os.path.exists(sitemap_path):
        raise HTTPException(status_code=404, detail="sitemap.xml not found")
    return FileResponse(sitemap_path, media_type="application/xml")
    
# ------------------------------
# SPA Fallback (MUST BE LAST)
# ------------------------------
@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    logger.info(f"🔍 SPA fallback triggered for: {full_path}")
    
    if full_path.startswith("api/"):
        logger.warning(f"❌ API route not found: {full_path}")
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    if full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if full_path.startswith("uploads/"):
        raise HTTPException(status_code=404, detail="Upload not found")

    index_path = os.path.join(FRONTEND_DIR, "index.html")
    
    if not os.path.isfile(index_path):
        logger.error(f"❌ index.html NOT FOUND at {index_path}")
        raise HTTPException(status_code=404, detail="Frontend not found - index.html missing")
    
    # Read and inject meta tags
    with open(index_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Get meta data for this route
    path_for_meta = f"/{full_path}" if full_path else "/"
    meta = get_ssr_meta(path_for_meta)
    
    # Inject meta tags
    meta_tags = f'''
    <title>{meta["title"]}</title>
    <meta name="description" content="{meta["description"]}" />
    <meta name="keywords" content="{meta["keywords"]}" />
    <meta property="og:title" content="{meta["title"]}" />
    <meta property="og:description" content="{meta["description"]}" />
    <meta property="og:url" content="{meta["url"]}" />
    <meta property="og:image" content="{meta["image"]}" />
    <meta name="twitter:title" content="{meta["title"]}" />
    <meta name="twitter:description" content="{meta["description"]}" />
    <meta name="twitter:image" content="{meta["image"]}" />
    <link rel="canonical" href="{meta["url"]}" />
    '''
    
    # Replace existing title and inject meta
    import re
    html_content = re.sub(r'<title>.*?</title>', '', html_content)
    html_content = html_content.replace('</head>', f'{meta_tags}</head>')
    
    logger.info(f"✅ Serving index.html with SSR meta for: {full_path}")
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)
