# app/ai/__init__.py
"""
Clean AI forecasting module for Syla Analytics

This module provides:
- ForecastService: Main forecasting logic
- OpenAIClient: GPT-based forecasting and scenario parsing
- Clean router with proper error handling
- Pydantic schemas for request/response validation
"""

from .forecast_service import ForecastService
from .openai_client import OpenAIClient
from .schemas import (
    ForecastRequest,
    ForecastResponse,
    ForecastResult,
    ScenarioRequest,
    ScenarioParsed,
    ModelsResponse,
    UsageResponse,
    HealthResponse,
    ErrorResponse
)

__all__ = [
    "ForecastService",
    "OpenAIClient", 
    "ForecastRequest",
    "ForecastResponse",
    "ForecastResult",
    "ScenarioRequest",
    "ScenarioParsed",
    "ModelsResponse",
    "UsageResponse",
    "HealthResponse",
    "ErrorResponse"
]
