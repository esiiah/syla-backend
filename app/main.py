# app/main.py
import io
import logging
import os
import time
import mimetypes
import re
from typing import List, Dict, Any

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # syla-backend/
ENV_PATH = os.path.join(BASE_DIR, "frontend", ".env")
load_dotenv(ENV_PATH)

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel

# Import existing routers
from .utils import clean_dataframe, detect_column_types, summarize_numeric
from .file_tools_full import router as file_tools_full_router, UPLOAD_DIR
from .routers import auth as auth_router
from .routers import password_recovery
from .routers import profile
from .ai.router import router as ai_router

# Import new visual module
from . import visual

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syla-backend")

app = FastAPI(title="Syla Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# Include routers
app.include_router(file_tools_full_router)
app.include_router(auth_router.router)
app.include_router(password_recovery.router)
app.include_router(profile.router)
app.include_router(ai_router)

# Mount uploaded files directory
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# Frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "dist")

# Pydantic models for new endpoints
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

# Utility functions
def sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "uploaded_file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base

def unique_filename(name: str) -> str:
    safe = sanitize_filename(name)
    ts = int(time.time() * 1000)
    return f"{ts}_{safe}"

# Routes
@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀", "ai_enabled": True}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Enhanced upload with visual.py integration"""
    filename = file.filename or "uploaded_file"
    
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Save raw file first
        saved_name = unique_filename(filename)
        raw_path = visual.RAW_DIR / saved_name
        with open(raw_path, "wb") as f:
            f.write(raw)
        
        # Process with visual.py if it's tabular data
        if filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            try:
                # Load and validate using visual.py
                df = visual.load_raw_csv(str(raw_path))
                
                # Get data quality analysis
                quality_info = visual.describe_missing_and_duplicates(df)
                data_quality = visual.calculate_data_quality_score(df)
                
                # Clean data with default settings
                df_clean, cleaning_metadata = visual.clean_pipeline(df, {
                    'deduplicate': True,
                    'fill_method': 'none',
                    'remove_negatives': False,
                    'drop_threshold': 0.0
                })
                
                # Get preview and summary
                preview_data = visual.preview_rows(df_clean, 10)
                column_types = detect_column_types(df_clean)
                summary = summarize_numeric(df_clean)
                
                # Suggest chart type
                chart_suggestions = visual.suggest_chart_type(df_clean)
                
                # Save cleaned version
                cleaned_name = f"cleaned_{saved_name}"
                cleaned_path = visual.CLEANED_DIR / cleaned_name
                df_clean.to_csv(cleaned_path, index=False)
                
                # Log the action
                visual.log_action(
                    action="upload",
                    user_id="system", # TODO: Get from auth
                    input_file_id=saved_name,
                    output_path=str(cleaned_path),
                    summary_stats={
                        "original_rows": len(df),
                        "cleaned_rows": len(df_clean),
                        "columns": len(df_clean.columns)
                    }
                )
                
                # Determine axis suggestions
                x_axis = df_clean.columns[0] if len(df_clean.columns) else ""
                numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
                y_axis = numeric_cols[0] if numeric_cols else x_axis
                
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
                    "preview_rows": preview_data.to_dict(orient="records"),
                    "chart_title": filename,
                    "x_axis": x_axis,
                    "y_axis": y_axis,
                    "download_url": f"/api/files/{saved_name}",
                    "quality_analysis": quality_info,
                    "data_quality_score": data_quality,
                    "chart_suggestions": chart_suggestions,
                    "cleaning_metadata": cleaning_metadata
                })
                
            except Exception as e:
                logger.error(f"Visual processing failed: {e}")
                # Fallback to original processing
                pass
        
        # Non-tabular files or fallback
        return JSONResponse(content={
            "file_id": saved_name,
            "filename": filename,
            "path": str(raw_path),
            "size": len(raw),
            "download_url": f"/api/files/{saved_name}",
            "rows": 0,
            "columns": [],
            "types": {},
            "summary": {},
            "data": []
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Server error: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            pass

@app.get("/api/preview")
async def get_preview(file_id: str, n: int = 10):
    """Get preview of uploaded file using visual.py"""
    try:
        file_path = visual.RAW_DIR / file_id
        if not file_path.exists():
            # Try cleaned directory
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
    """Generate chart payload using visual.py"""
    try:
        # Load data
        if request.file_id:
            file_path = visual.CLEANED_DIR / f"cleaned_{request.file_id}"
            if not file_path.exists():
                file_path = visual.RAW_DIR / request.file_id
            df = visual.load_raw_csv(str(file_path))
        elif request.csv_data:
            df = pd.DataFrame(request.csv_data)
        else:
            raise HTTPException(400, "Either file_id or csv_data required")
        
        # Apply filters
        if request.filters:
            df_filtered = visual.filter_dataframe(df, request.filters)
        else:
            df_filtered = df
        
        if df_filtered.empty:
            return {"error": "No data after filtering"}
        
        # Apply aggregation
        agg_config = request.aggregation
        if agg_config.get('by') and agg_config.get('metric'):
            df_agg = visual.aggregate(
                df_filtered,
                agg_config['by'],
                agg_config['metric'], 
                agg_config.get('agg', 'sum')
            )
        else:
            df_agg = df_filtered
        
        # Apply display options (top N, etc.)
        display_config = request.display
        if display_config.get('top_n') and display_config['top_n'] > 0:
            group_key = agg_config.get('by', df_agg.columns[0])
            metric_key = agg_config.get('metric', df_agg.select_dtypes(include=['number']).columns[0])
            
            df_final = visual.top_n_with_others(
                df_agg,
                group_key,
                metric_key,
                display_config['top_n'],
                display_config.get('sort', 'desc')
            )
        else:
            df_final = df_agg
        
        # Generate chart payload
        chart_payload = visual.generate_chart_payload(
            df_final,
            display_config.get('chart_type', 'bar'),
            display_config
        )
        
        # Create temporary chart ID for preview
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
    """Save chart configuration using visual.py"""
    try:
        chart_id = visual.save_chart_metadata(
            request.chart_payload,
            str(visual.CHARTS_DIR)
        )
        
        # Log the save action
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
    """Export chart using visual.py"""
    try:
        chart_payload = request.chart_payload
        
        # If chart_id provided, load the chart
        if request.chart_id and not chart_payload:
            chart_file = visual.CHARTS_DIR / f"{request.chart_id}.json"
            if chart_file.exists():
                import json
                with open(chart_file) as f:
                    saved_chart = json.load(f)
                    chart_payload = saved_chart.get('chart_payload', {})
        
        if not chart_payload:
            raise HTTPException(400, "No chart data provided")
        
        # Export chart
        export_path = visual.export_chart_image(
            chart_payload,
            format=request.format,
            background=request.background,
            dpi=request.dpi,
            filename=request.filename
        )
        
        # For now, return immediate response (in production, this might be async)
        return {
            "export_job_id": f"job_{int(time.time())}",
            "status": "completed",
            "download_url": f"/api/files/charts/{os.path.basename(export_path)}"
        }
        
    except Exception as e:
        logger.error(f"Chart export failed: {e}")
        raise HTTPException(500, f"Export error: {e}")

@app.post("/api/forecast")
async def create_forecast(request: ForecastRequest):
    """Generate forecast using visual.py and AI integration"""
    try:
        # Load data
        if request.file_id:
            file_path = visual.CLEANED_DIR / f"cleaned_{request.file_id}"
            if not file_path.exists():
                file_path = visual.RAW_DIR / request.file_id
            df = visual.load_raw_csv(str(file_path))
        elif request.csv_data:
            df = pd.DataFrame(request.csv_data)
        else:
            raise HTTPException(400, "Either file_id or csv_data required")
        
        # Apply filters
        if request.filters:
            df_filtered = visual.filter_dataframe(df, request.filters)
        else:
            df_filtered = df
        
        # Prepare forecast input
        forecast_config = {
            'company': request.company,
            'campaign': request.campaign,
            'test_split': 0.2,
            'regressors': request.regressors
        }
        
        forecast_input = visual.prepare_forecast_input(df_filtered, forecast_config)
        
        # Run forecast
        model_config = {
            'periods': request.horizon,
            'confidence_level': request.ci,
            'regressors': request.regressors,
            **request.config
        }
        
        forecast_df, metadata = visual.run_forecast(
            request.method,
            forecast_input['train_data'],
            model_config
        )
        
        # Save forecast results
        forecast_path = visual.persist_forecast_results(forecast_df, metadata, str(visual.FORECASTS_DIR))
        
        # Log forecast action
        visual.log_action(
            action="forecast",
            user_id="system", # TODO: Get from auth
            input_file_id=request.file_id,
            output_path=forecast_path,
            params={
                "method": request.method,
                "horizon": request.horizon,
                "company": request.company
            },
            artifact_id=os.path.basename(forecast_path)
        )
        
        # For immediate response (production might use job queue)
        return {
            "job_id": f"forecast_{int(time.time())}",
            "status": "completed",
            "forecast_csv_path": forecast_path,
            "forecast_metadata": metadata,
            "forecast_data": forecast_df.to_dict('records')
        }
        
    except Exception as e:
        logger.error(f"Forecast failed: {e}")
        raise HTTPException(500, f"Forecast error: {e}")

@app.get("/api/forecast/{job_id}")
async def get_forecast_status(job_id: str):
    """Get forecast job status (placeholder for async implementation)"""
    # In a real implementation, this would check job status from a queue
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100
    }

@app.get("/api/models/{model_id}")
async def get_model_metadata(model_id: str):
    """Get saved model metadata"""
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
    """List available datasets using visual.py"""
    try:
        datasets = visual.get_available_datasets()
        return {"datasets": datasets}
    except Exception as e:
        logger.error(f"Dataset listing failed: {e}")
        raise HTTPException(500, f"Dataset error: {e}")

# Existing file serving endpoint
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

# SPA fallback handler
@app.get("/{path:path}")
async def spa_fallback(request: Request, path: str):
    """Serve static files and handle SPA routing."""
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Try to serve static file first
    file_path = os.path.join(FRONTEND_DIR, path)
    
    # If it's a file and exists, serve it
    if os.path.isfile(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(file_path, media_type=mime_type)
    
    # For directories or non-existent files, try index.html in that directory
    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path, media_type="text/html")
    
    # Fallback to root index.html for SPA routing
    root_index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(root_index):
        return FileResponse(root_index, media_type="text/html")
    
    # If no index.html exists, return 404
    raise HTTPException(status_code=404, detail="Page not found")
