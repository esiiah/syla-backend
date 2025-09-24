# app/ai/router.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta

from .service import AIForecastService
from .schemas import ForecastRequest, ForecastResponse, ScenarioRequest
from ..routers.auth import require_auth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forecast", tags=["ai-forecast"])

# Initialize service
ai_service = AIForecastService()

class WhatIfRequest(BaseModel):
    dataset_id: Optional[str] = None
    csv_data: Optional[List[Dict[str, Any]]] = None
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario description")
    target_column: str = Field(..., description="Column to forecast")
    date_column: Optional[str] = None
    model_preference: Optional[str] = Field("auto", regex="^(auto|gpt|prophet|hybrid)$")
    periods_ahead: int = Field(12, ge=1, le=120, description="Periods to forecast (1-120)")
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)

@router.post("/whatif", response_model=ForecastResponse)
async def create_whatif_forecast(
    request: WhatIfRequest,
    current_user: dict = Depends(require_auth)
):
    """Generate AI-powered what-if forecasts from natural language scenarios"""
    try:
        if not request.csv_data and not request.dataset_id:
            raise HTTPException(400, "Either csv_data or dataset_id required")
        
        # Rate limiting check
        user_id = current_user.get("id", "anonymous")
        if not ai_service.check_rate_limit(user_id):
            raise HTTPException(429, "Rate limit exceeded. Try again later.")
        
        # Process forecast
        result = await ai_service.process_forecast_request(
            data=request.csv_data,
            scenario=request.scenario_text,
            target_column=request.target_column,
            date_column=request.date_column,
            model_preference=request.model_preference,
            periods_ahead=request.periods_ahead,
            confidence_level=request.confidence_level,
            user_id=user_id
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Forecast error for user {user_id}")
        raise HTTPException(500, f"Forecast generation failed: {str(e)}")

@router.post("/scenario/parse")
async def parse_scenario_text(
    request: ScenarioRequest,
    current_user: dict = Depends(require_auth)
):
    """Parse natural language scenario into structured parameters"""
    try:
        parsed = await ai_service.parse_scenario_text(
            request.scenario_text,
            request.available_columns
        )
        return JSONResponse(content={"parsed_scenario": parsed})
        
    except Exception as e:
        logger.exception("Scenario parsing failed")
        raise HTTPException(500, f"Scenario parsing failed: {str(e)}")

@router.get("/models")
async def list_available_models(current_user: dict = Depends(require_auth)):
    """List available forecasting models and their capabilities"""
    return {
        "models": {
            "gpt-4o-mini": {"type": "llm", "cost": "low", "speed": "fast", "accuracy": "good"},
            "prophet": {"type": "statistical", "cost": "free", "speed": "fast", "accuracy": "high"},
            "hybrid": {"type": "combined", "cost": "medium", "speed": "medium", "accuracy": "highest"}
        },
        "default": "hybrid"
    }

@router.get("/usage/{user_id}")
async def get_user_usage(
    user_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get AI usage statistics for user"""
    if current_user.get("id") != user_id and not current_user.get("is_admin"):
        raise HTTPException(403, "Access denied")
    
    usage = ai_service.get_user_usage(user_id)
    return {"usage": usage}

@router.delete("/cache/clear")
async def clear_user_cache(current_user: dict = Depends(require_auth)):
    """Clear cached forecasts for current user"""
    user_id = current_user.get("id")
    cleared_count = ai_service.clear_user_cache(user_id)
    return {"message": f"Cleared {cleared_count} cached forecasts"}
