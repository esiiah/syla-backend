# app/ai/router.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from .forecast_service import ForecastService
from ..routers.auth import require_auth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forecast", tags=["ai-forecast"])

# Initialize the forecast service
forecast_service = ForecastService()

class WhatIfRequest(BaseModel):
    csv_data: List[Dict[str, Any]] = Field(..., description="CSV data as list of dictionaries")
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario description")
    target_column: str = Field(..., description="Column to forecast")
    date_column: Optional[str] = Field(None, description="Date/time column for time series")
    model_preference: str = Field("hybrid", regex="^(hybrid|gpt|prophet|auto)$")
    periods_ahead: int = Field(12, ge=1, le=120, description="Periods to forecast (1-120)")
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)

class ScenarioRequest(BaseModel):
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario description")
    available_columns: List[str] = Field(..., description="Available columns in the dataset")

# In app/ai/router.py, update the whatif endpoint
@router.post("/whatif")
async def create_whatif_forecast(
    request: WhatIfRequest,
    current_user: dict = Depends(require_auth)
):
    """Generate AI-powered what-if forecasts from natural language scenarios"""
    
    try:
        user_id = current_user.get("id", "anonymous")
        
        # Validate BEFORE rate limiting
        if not request.csv_data:
            raise HTTPException(status_code=400, detail="csv_data is required")
        
        if not request.target_column:
            raise HTTPException(status_code=400, detail="target_column is required")
        
        # Rate limiting check
        if not forecast_service.check_rate_limit(user_id):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        logger.info(f"Starting forecast for user {user_id}: target={request.target_column}, model={request.model_preference}")
        
        # Generate forecast - wrap in try-catch
        try:
            result = await forecast_service.create_forecast(
                data=request.csv_data,
                scenario=request.scenario_text,
                target_column=request.target_column,
                date_column=request.date_column,
                model_preference=request.model_preference,
                periods_ahead=request.periods_ahead,
                confidence_level=request.confidence_level,
                user_id=user_id
            )
        except Exception as forecast_error:
            logger.error(f"Forecast generation failed: {str(forecast_error)}")
            # Return user-friendly error
            raise HTTPException(
                status_code=500, 
                detail=f"Forecast failed: {str(forecast_error)[:200]}"
            )
        
        logger.info(f"Forecast completed successfully for user {user_id}")
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Forecast validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected forecast error")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)[:200]}")

@router.post("/scenario/parse")
async def parse_scenario_text(
    request: ScenarioRequest,
    current_user: dict = Depends(require_auth)
):
    """Parse natural language scenario into structured parameters"""
    
    try:
        user_id = current_user.get("id", "anonymous")
        
        if not request.scenario_text.strip():
            raise HTTPException(status_code=400, detail="scenario_text cannot be empty")
        
        # Parse scenario using the forecast service
        parsed = await forecast_service._parse_scenario(request.scenario_text, request.available_columns)
        
        return JSONResponse(content={"parsed_scenario": parsed})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Scenario parsing failed")
        raise HTTPException(status_code=500, detail=f"Scenario parsing failed: {str(e)}")

@router.get("/models")
async def list_available_models(current_user: dict = Depends(require_auth)):
    """List available forecasting models and their capabilities"""
    
    models = {
        "gpt": {
            "type": "llm",
            "cost": "low",
            "speed": "fast",
            "accuracy": "good",
            "description": "GPT-4o-mini language model for scenario-based forecasting",
            "available": forecast_service.openai_client is not None
        },
        "prophet": {
            "type": "statistical",
            "cost": "free",
            "speed": "fast",
            "accuracy": "high",
            "description": "Facebook Prophet for time series forecasting",
            "available": True  # Fallback to simple trend if Prophet unavailable
        },
        "hybrid": {
            "type": "combined",
            "cost": "medium",
            "speed": "medium",
            "accuracy": "highest",
            "description": "Combines statistical forecasting with AI scenario interpretation",
            "available": True
        }
    }
    
    return {
        "models": models,
        "default": "hybrid",
        "recommended": "gpt" if forecast_service.openai_client else "hybrid"
    }

@router.get("/usage/{user_id}")
async def get_user_usage(
    user_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get AI usage statistics for user"""
    
    # Check authorization
    if current_user.get("id") != user_id and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get usage from rate limiter
    user_limits = forecast_service.rate_limits.get(user_id, {"count": 0, "reset_time": datetime.now()})
    
    return {
        "usage": {
            "requests_used": user_limits["count"],
            "requests_remaining": max(0, 50 - user_limits["count"]),
            "reset_time": user_limits["reset_time"].isoformat()
        }
    }

@router.delete("/cache/clear")
async def clear_user_cache(current_user: dict = Depends(require_auth)):
    """Clear cached forecasts for current user (placeholder for future caching)"""
    user_id = current_user.get("id")
    # For now, just return success since we don't have caching implemented
    return {"message": f"Cache cleared for user {user_id}"}

@router.get("/health")
async def forecast_health_check():
    """Health check for forecast service"""
    
    return {
        "status": "healthy",
        "openai_available": forecast_service.openai_client is not None,
        "timestamp": datetime.now().isoformat()
    }
