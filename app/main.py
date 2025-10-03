import io
import logging
import time
import mimetypes
import re
import os
from typing import List, Dict, Any

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel

from .utils import clean_dataframe, detect_column_types, summarize_numeric
from .file_tools_full import router as file_tools_full_router, UPLOAD_DIR
from .routers import auth as auth_router
from .routers import password_recovery
from .routers import profile
from .ai.router import router as forecast_router
from .routers import chart_settings, notifications, search
from . import visual

# ------------------------------
# Environment loading & validation
# ------------------------------
from app import settings  # ensures .env is loaded

required_vars = ["DATABASE_PUBLIC_URL", "JWT_SECRET", "FRONTEND_URL"]
for var in required_vars:
    if not getattr(settings, var, None):
        raise EnvironmentError(f"❌ {var} is not set in environment or .env")

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

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ------------------------------
# CORS middleware
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# ------------------------------
# Include routers
# ------------------------------
app.include_router(file_tools_full_router)
app.include_router(auth_router.router)
app.include_router(password_recovery.router)
app.include_router(profile.router)
app.include_router(forecast_router)
app.include_router(chart_settings.router)
app.include_router(notifications.router)
app.include_router(search.router)

# ------------------------------
# Upload directory & static files
# ------------------------------
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# ------------------------------
# Frontend static files
# ------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

logger.info("✅ FastAPI app initialized successfully")

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

def sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "uploaded_file")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base

def unique_filename(name: str) -> str:
    safe = sanitize_filename(name)
    ts = int(time.time() * 1000)
    return f"{ts}_{safe}"

@app.get("/api/health")
def health_check():
    return {"message": "Backend is running 🚀", "ai_enabled": True}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
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
            logger.info(f"Universal processing result: {len(df_clean)} rows, {len(df_clean.columns)} columns")
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

from .ai.router import forecast_service

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

@app.get("/{path:path}")
async def spa_fallback(request: Request, path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(file_path, media_type=mime_type)

    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path, media_type="text/html")

    root_index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(root_index):
        return FileResponse(root_index, media_type="text/html")

    raise HTTPException(status_code=404, detail="Page not found")
