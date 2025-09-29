# app/ai/schemas.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class ForecastRequest(BaseModel):
    csv_data: List[Dict[str, Any]] = Field(..., description="Raw CSV data as list of dictionaries")
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario")
    target_column: str = Field(..., description="Column to forecast")
    date_column: Optional[str] = Field(None, description="Date/time column for time series")
    model_preference: str = Field("hybrid", pattern="^(hybrid|gpt|prophet|auto)$")
    periods_ahead: int = Field(12, ge=1, le=120)
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)
    
    @validator('csv_data')
    def validate_data_not_empty(cls, v):
        if not v:
            raise ValueError('csv_data cannot be empty')
        return v
    
    @validator('scenario_text')
    def validate_scenario_not_empty(cls, v):
        if not v.strip():
            raise ValueError('scenario_text cannot be empty')
        return v

class ScenarioRequest(BaseModel):
    scenario_text: str = Field(..., max_length=500, description="Natural language scenario description")
    available_columns: List[str] = Field(..., description="Available columns in the dataset")
    
    @validator('scenario_text')
    def validate_scenario_text(cls, v):
        if not v.strip():
            raise ValueError('scenario_text cannot be empty')
        return v

class ForecastResult(BaseModel):
    forecast: List[float] = Field(..., description="Predicted values")
    lower: List[float] = Field(..., description="Lower confidence bound")
    upper: List[float] = Field(..., description="Upper confidence bound")
    timestamps: List[str] = Field(..., description="Future time periods")
    model_used: str = Field(..., description="Model that generated the forecast")
    confidence_level: Optional[float] = Field(None, description="Confidence level used")
    reasoning: Optional[str] = Field(None, description="Model reasoning or notes")

class ScenarioParsed(BaseModel):
    adjustments: Dict[str, Any] = Field(default_factory=dict)
    target_change: float = Field(0, description="Overall percentage change expected")
    time_horizon: str = Field("monthly", pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    confidence: str = Field("medium", pattern="^(low|medium|high)$")

class ForecastMetadata(BaseModel):
    model_used: str
    confidence_level: float
    generated_at: str
    data_points: int
    forecast_periods: int
    target_column: str
    scenario: str

class ForecastResponse(BaseModel):
    forecast: ForecastResult
    explanation: str = Field(..., description="Human-readable explanation of the forecast")
    scenario_parsed: ScenarioParsed
    metadata: ForecastMetadata

class ModelInfo(BaseModel):
    type: str = Field(..., pattern="^(llm|statistical|combined)$")
    cost: str = Field(..., pattern="^(free|low|medium|high)$")
    speed: str = Field(..., pattern="^(slow|medium|fast)$")
    accuracy: str = Field(..., pattern="^(basic|good|high|highest)$")
    description: str
    available: bool

class ModelsResponse(BaseModel):
    models: Dict[str, ModelInfo]
    default: str
    recommended: str

class UsageStats(BaseModel):
    requests_used: int
    requests_remaining: int
    reset_time: str

class UsageResponse(BaseModel):
    usage: UsageStats

class HealthResponse(BaseModel):
    status: str
    openai_available: bool
    timestamp: str

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
