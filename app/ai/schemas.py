# app/ai/schemas.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class ScenarioRequest(BaseModel):
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario description")
    available_columns: List[str] = Field(..., description="Available columns in the dataset")

class ForecastRequest(BaseModel):
    dataset_id: Optional[str] = Field(None, description="ID of uploaded dataset")
    csv_data: Optional[List[Dict[str, Any]]] = Field(None, description="Raw CSV data as list of dictionaries")
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario")
    target_column: str = Field(..., description="Column to forecast")
    date_column: Optional[str] = Field(None, description="Date/time column for time series")
    model_preference: str = Field("auto", pattern="^(auto|gpt|prophet|hybrid)$")
    periods_ahead: int = Field(12, ge=1, le=120)
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)
    
    @validator('csv_data')
    def validate_data_source(cls, v, values):
        if not v and not values.get('dataset_id'):
            raise ValueError('Either csv_data or dataset_id must be provided')
        return v

class ForecastMetadata(BaseModel):
    model_used: str
    confidence_level: float
    generated_at: str
    data_points: int
    forecast_periods: int
    cost_estimate: str
    processing_time_ms: Optional[int] = None

class ForecastResult(BaseModel):
    forecast: List[float] = Field(..., description="Predicted values")
    lower: Optional[List[float]] = Field(None, description="Lower confidence bound")
    upper: Optional[List[float]] = Field(None, description="Upper confidence bound")
    timestamps: List[str] = Field(..., description="Future time periods")
    model_used: str
    confidence_level: Optional[float] = None
    model_performance: Optional[Dict[str, Union[str, float]]] = None

class ScenarioParsed(BaseModel):
    adjustments: Dict[str, Any] = Field(default_factory=dict)
    target_change: float = Field(0, description="Overall percentage change expected")
    time_horizon: str = Field("monthly", pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    confidence: str = Field("medium", pattern="^(low|medium|high)$")

class ForecastResponse(BaseModel):
    forecast: ForecastResult
    explanation: str = Field(..., description="Human-readable explanation of the forecast")
    scenario_parsed: ScenarioParsed
    metadata: ForecastMetadata

class ModelCapabilities(BaseModel):
    type: str = Field(..., pattern="^(llm|statistical|combined)$")
    cost: str = Field(..., pattern="^(free|low|medium|high)$")
    speed: str = Field(..., pattern="^(slow|medium|fast)$")
    accuracy: str = Field(..., pattern="^(basic|good|high|highest)$")

class AIUsageStats(BaseModel):
    requests_used: int
    requests_remaining: int
    reset_time: datetime
    total_cost: Optional[float] = None

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime = Field(default_factory=datetime.now)
    
class CacheStats(BaseModel):
    enabled: bool
    type: Optional[str] = None
    keys: Optional[int] = None
    memory_usage: Optional[str] = None
    error: Optional[str] = None
