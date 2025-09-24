# app/config/ai_settings.py
import os
from typing import Dict, Any

class AISettings:
    # Feature flags
    AI_ENABLED: bool = os.getenv("AI_ENABLED", "true").lower() == "true"
    AI_CACHE_ENABLED: bool = os.getenv("AI_CACHE_ENABLED", "true").lower() == "true"
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    AI_DEFAULT_MODEL: str = os.getenv("AI_DEFAULT_MODEL", "gpt-4o-mini")
    AI_TIMEOUT_SECONDS: int = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
    AI_MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "1500"))
    
    # Cache Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    AI_CACHE_TTL_MINUTES: int = int(os.getenv("AI_CACHE_TTL_MINUTES", "30"))
    
    # Rate Limiting
    AI_RATE_LIMIT_PER_HOUR: int = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", "50"))
    AI_RATE_LIMIT_PER_DAY: int = int(os.getenv("AI_RATE_LIMIT_PER_DAY", "200"))
    
    # Model Selection
    AVAILABLE_MODELS: Dict[str, Dict[str, str]] = {
        "gpt-4o-mini": {
            "type": "llm",
            "provider": "openai",
            "cost": "low",
            "speed": "fast",
            "description": "Fast, cost-effective model for basic forecasting"
        },
        "prophet": {
            "type": "statistical",
            "provider": "local",
            "cost": "free", 
            "speed": "fast",
            "description": "Facebook Prophet for time series forecasting"
        },
        "hybrid": {
            "type": "combined",
            "provider": "mixed",
            "cost": "medium",
            "speed": "medium", 
            "description": "Combines LLM interpretation with statistical forecasting"
        }
    }
    
    # Default Model Preferences by Use Case
    MODEL_PREFERENCES: Dict[str, str] = {
        "default": "hybrid",
        "cost_sensitive": "prophet", 
        "speed_sensitive": "prophet",
        "accuracy_focused": "hybrid",
        "explanation_focused": "gpt-4o-mini"
    }
    
    # Forecasting Limits
    MAX_FORECAST_PERIODS: int = int(os.getenv("AI_MAX_FORECAST_PERIODS", "120"))
    MIN_DATA_POINTS: int = int(os.getenv("AI_MIN_DATA_POINTS", "3"))
    MAX_DATA_POINTS: int = int(os.getenv("AI_MAX_DATA_POINTS", "10000"))
    
    # Prompt Configuration
    MAX_SCENARIO_LENGTH: int = int(os.getenv("AI_MAX_SCENARIO_LENGTH", "500"))
    DEFAULT_TEMPERATURE: float = float(os.getenv("AI_DEFAULT_TEMPERATURE", "0.7"))
    
    # Cost Management
    DAILY_COST_LIMIT_USD: float = float(os.getenv("AI_DAILY_COST_LIMIT", "10.0"))
    COST_ALERTS_ENABLED: bool = os.getenv("AI_COST_ALERTS", "true").lower() == "true"
    
    # Model-specific settings
    PROPHET_SETTINGS: Dict[str, Any] = {
        "yearly_seasonality": True,
        "weekly_seasonality": False,
        "daily_seasonality": False,
        "confidence_interval": 0.95
    }
    
    # Validation settings
    FORECAST_VALIDATION: Dict[str, Any] = {
        "max_change_ratio": float(os.getenv("AI_MAX_CHANGE_RATIO", "3.0")),
        "enable_reasonableness_check": True,
        "enable_smoothing": True
    }

    @classmethod
    def get_model_config(cls, model_name: str) -> Dict[str, str]:
        """Get configuration for a specific model"""
        return cls.AVAILABLE_MODELS.get(model_name, cls.AVAILABLE_MODELS["hybrid"])
    
    @classmethod
    def is_model_available(cls, model_name: str) -> bool:
        """Check if a model is available"""
        if model_name in ["prophet", "hybrid"]:
            return True
        elif model_name.startswith("gpt"):
            return bool(cls.OPENAI_API_KEY)
        return False
    
    @classmethod
    def get_recommended_model(cls, use_case: str = "default") -> str:
        """Get recommended model for use case"""
        recommended = cls.MODEL_PREFERENCES.get(use_case, "hybrid")
        
        # Fallback if recommended model not available
        if not cls.is_model_available(recommended):
            if cls.is_model_available("prophet"):
                return "prophet"
            elif cls.is_model_available("gpt-4o-mini"):
                return "gpt-4o-mini"
            else:
                raise ValueError("No AI models available. Check configuration.")
        
        return recommended
    
    @classmethod
    def validate_settings(cls) -> Dict[str, str]:
        """Validate AI settings and return any errors"""
        errors = {}
        
        if not cls.AI_ENABLED:
            return {"info": "AI features disabled"}
        
        if not cls.OPENAI_API_KEY and not cls._check_local_models():
            errors["models"] = "No AI models available. Set OPENAI_API_KEY or install Prophet."
        
        if cls.AI_RATE_LIMIT_PER_HOUR <= 0:
            errors["rate_limit"] = "Rate limit must be positive"
        
        if cls.MAX_FORECAST_PERIODS <= 0 or cls.MAX_FORECAST_PERIODS > 365:
            errors["forecast_periods"] = "Forecast periods must be between 1-365"
        
        return errors
    
    @classmethod
    def _check_local_models(cls) -> bool:
        """Check if local forecasting models are available"""
        try:
            import prophet
            return True
        except ImportError:
            try:
                import statsmodels
                return True
            except ImportError:
                return False
