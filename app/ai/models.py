# app/ai/models.py
"""
Forecast model wrappers for Prophet, ARIMA, and simple methods
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ProphetModel:
    """Prophet forecasting model wrapper"""
    
    def __init__(self):
        self.model = None
        self.available = self._check_availability()
    
    def _check_availability(self) -> bool:
        """Check if Prophet is available"""
        try:
            from prophet import Prophet
            return True
        except ImportError:
            logger.warning("Prophet not available")
            return False
    
    def fit(self, df: pd.DataFrame, config: Dict[str, Any] = None) -> 'ProphetModel':
        """
        Fit Prophet model
        df must have columns: ds (date), y (target)
        """
        if not self.available:
            raise ImportError("Prophet is not installed")
        
        from prophet import Prophet
        
        config = config or {}
        
        # Determine seasonality based on data length
        yearly = len(df) >= 24
        weekly = False
        daily = False
        
        self.model = Prophet(
            yearly_seasonality=yearly,
            weekly_seasonality=weekly,
            daily_seasonality=daily,
            interval_width=config.get('interval_width', 0.95),
            changepoint_prior_scale=config.get('changepoint_prior_scale', 0.05)
        )
        
        self.model.fit(df)
        logger.info(f"Prophet model fitted with {len(df)} data points")
        
        return self
    
    def predict(self, periods: int, freq: str = 'M') -> pd.DataFrame:
        """Generate forecast"""
        if self.model is None:
            raise ValueError("Model not fitted. Call fit() first.")
        
        future = self.model.make_future_dataframe(periods=periods, freq=freq)
        forecast = self.model.predict(future)
        
        # Return only future periods
        forecast_future = forecast.tail(periods).copy()
        
        return pd.DataFrame({
            'ds': forecast_future['ds'],
            'y': forecast_future['yhat'],
            'y_lower': forecast_future['yhat_lower'],
            'y_upper': forecast_future['yhat_upper']
        })
    
    def get_components(self) -> Dict[str, Any]:
        """Extract trend and seasonality components"""
        if self.model is None:
            return {}
        
        # Prophet components are available after prediction
        return {
            "has_trend": True,
            "has_seasonality": self.model.yearly_seasonality,
            "changepoints": self.model.changepoints.tolist() if hasattr(self.model, 'changepoints') else []
        }


class SimpleRegressionModel:
    """Simple linear regression forecast as fallback"""
    
    def __init__(self):
        self.coeffs = None
        self.last_date = None
    
    def fit(self, df: pd.DataFrame, config: Dict[str, Any] = None) -> 'SimpleRegressionModel':
        """Fit linear regression"""
        values = df['y'].values
        
        if len(values) < 2:
            # If only 1 point, use constant
            self.coeffs = [0, values[0] if len(values) > 0 else 0]
        else:
            x = np.arange(len(values))
            try:
                self.coeffs = np.polyfit(x, values, 1)
            except:
                # Fallback to mean
                self.coeffs = [0, np.mean(values)]
        
        self.last_date = df['ds'].iloc[-1]
        
        logger.info(f"Simple regression fitted: slope={self.coeffs[0]:.2f}")
        return self
    
    def predict(self, periods: int, freq: str = 'M') -> pd.DataFrame:
        """Generate forecast"""
        if self.coeffs is None:
            raise ValueError("Model not fitted")
        
        # Generate future indices
        n_train = int(self.coeffs[1] / self.coeffs[0]) if self.coeffs[0] != 0 else 0
        future_x = np.arange(n_train, n_train + periods)
        
        # Predict
        forecast_values = np.polyval(self.coeffs, future_x)
        
        # Generate dates
        dates = pd.date_range(
            start=self.last_date + pd.DateOffset(months=1),
            periods=periods,
            freq=freq
        )
        
        # Calculate uncertainty (±20% as simple heuristic)
        lower = forecast_values * 0.8
        upper = forecast_values * 1.2
        
        return pd.DataFrame({
            'ds': dates,
            'y': forecast_values,
            'y_lower': lower,
            'y_upper': upper
        })


class ModelSelector:
    """Automatic model selection based on data characteristics"""
    
    @staticmethod
    def select_best_model(
        df: pd.DataFrame,
        data_quality: Dict[str, Any],
        user_preference: str = "hybrid"
    ) -> str:
        """
        Select best model based on data characteristics
        
        Returns: "prophet", "simple", or "hybrid"
        """
        data_points = len(df)
        
        # If user wants specific model, try to honor it
        if user_preference == "prophet":
            # Prophet needs reasonable amount of data
            if data_points >= 6:
                return "prophet"
            else:
                logger.warning(f"Prophet needs 6+ points, have {data_points}. Using simple.")
                return "simple"
        
        if user_preference == "simple":
            return "simple"
        
        # Hybrid mode: decide automatically
        if data_points < 6:
            return "simple"
        
        # Check for seasonality
        has_seasonality = data_quality.get("seasonality", {}).get("has_seasonality", False)
        
        if has_seasonality and data_points >= 12:
            return "prophet"
        
        # Check data quality
        quality_score = data_quality.get("overall_quality", {}).get("score", 50)
        
        if quality_score >= 70 and data_points >= 12:
            return "prophet"
        else:
            return "simple"
    
    @staticmethod
    def create_model(model_type: str):
        """Factory method to create model instance"""
        if model_type == "prophet":
            return ProphetModel()
        elif model_type == "simple":
            return SimpleRegressionModel()
        else:
            raise ValueError(f"Unknown model type: {model_type}")


def fit_and_forecast(
    df: pd.DataFrame,
    model_type: str,
    periods: int,
    config: Dict[str, Any] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Unified interface for fitting and forecasting
    
    Returns: (forecast_df, metadata)
    """
    try:
        model = ModelSelector.create_model(model_type)
        model.fit(df, config)
        forecast = model.predict(periods)
        
        metadata = {
            "model_used": model_type,
            "training_points": len(df),
            "forecast_periods": periods,
            "success": True
        }
        
        # Add model-specific metadata
        if hasattr(model, 'get_components'):
            metadata["components"] = model.get_components()
        
        return forecast, metadata
        
    except Exception as e:
        logger.error(f"Model {model_type} failed: {e}")
        
        # Fallback to simple model
        if model_type != "simple":
            logger.info("Falling back to simple regression")
            return fit_and_forecast(df, "simple", periods, config)
        else:
            raise


def apply_scenario_adjustments(
    forecast: pd.DataFrame,
    scenario_params: Dict[str, Any]
) -> pd.DataFrame:
    """
    Apply scenario adjustments to forecast
    
    Handles:
    - Multiplier adjustments
    - Gradual ramp-ups
    - Temporal adjustments (when the change starts)
    """
    adjusted = forecast.copy()
    
    multiplier = scenario_params.get("adjustments", {}).get("multiplier", 1.0)
    
    # Temporal adjustment
    start_period = scenario_params.get("start_period", 0)
    ramp_periods = scenario_params.get("ramp_periods", 0)
    
    if ramp_periods > 0:
        # Gradual ramp-up
        for i in range(len(adjusted)):
            if i < start_period:
                # No adjustment before start
                continue
            elif i < start_period + ramp_periods:
                # Gradual increase
                progress = (i - start_period) / ramp_periods
                current_multiplier = 1.0 + (multiplier - 1.0) * progress
                adjusted.loc[adjusted.index[i], 'y'] *= current_multiplier
                adjusted.loc[adjusted.index[i], 'y_lower'] *= current_multiplier
                adjusted.loc[adjusted.index[i], 'y_upper'] *= current_multiplier
            else:
                # Full adjustment
                adjusted.loc[adjusted.index[i], 'y'] *= multiplier
                adjusted.loc[adjusted.index[i], 'y_lower'] *= multiplier
                adjusted.loc[adjusted.index[i], 'y_upper'] *= multiplier
    else:
        # Immediate adjustment for all periods after start
        for i in range(start_period, len(adjusted)):
            adjusted.loc[adjusted.index[i], 'y'] *= multiplier
            adjusted.loc[adjusted.index[i], 'y_lower'] *= multiplier
            adjusted.loc[adjusted.index[i], 'y_upper'] *= multiplier
    
    return adjusted
