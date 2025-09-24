# app/ai/clients.py
import os
import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class OpenAIClient:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("AI_DEFAULT_MODEL", "gpt-4o-mini")
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
        self.base_url = "https://api.openai.com/v1"
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def chat_completion(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: Optional[str] = None
    ) -> str:
        """Send chat completion request to OpenAI API with retry logic"""
        
        try:
            import httpx
        except ImportError:
            raise Exception("httpx required for OpenAI client. Run: pip install httpx")
        
        model_to_use = model or self.model
        
        payload = {
            "model": model_to_use,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful data analyst assistant. Respond concisely and accurately."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                response.raise_for_status()
                result = response.json()
                
                if "choices" not in result or not result["choices"]:
                    raise ValueError("No response choices returned from OpenAI")
                
                content = result["choices"][0]["message"]["content"].strip()
                
                # Log usage for monitoring
                usage = result.get("usage", {})
                logger.info(f"OpenAI API call: {usage.get('total_tokens', 0)} tokens used")
                
                return content
                
        except Exception as e:
            if "httpx" in str(e.__class__):
                if "429" in str(e):
                    raise Exception("OpenAI API rate limit exceeded. Please try again later.")
                elif "401" in str(e):
                    raise Exception("Invalid OpenAI API key")
                elif "timeout" in str(e).lower():
                    raise Exception("Request timed out. Please try again.")
                else:
                    raise Exception(f"OpenAI API error: {str(e)}")
            else:
                logger.error(f"OpenAI API call failed: {str(e)}")
                raise

class LocalForecastClient:
    def __init__(self):
        self.models_available = self._check_available_models()
        logger.info(f"Local forecasting models available: {self.models_available}")
    
    def _check_available_models(self) -> Dict[str, bool]:
        """Check which forecasting libraries are available"""
        available = {}
        
        try:
            import prophet
            available["prophet"] = True
        except ImportError:
            available["prophet"] = False
            logger.warning("Prophet not available. Install with: pip install prophet")
        
        try:
            import statsmodels
            available["statsmodels"] = True
        except ImportError:
            available["statsmodels"] = False
        
        try:
            from sklearn.ensemble import RandomForestRegressor
            available["sklearn"] = True
        except ImportError:
            available["sklearn"] = False
        
        return available
    
    async def prophet_forecast(
        self,
        df: pd.DataFrame,
        target_column: str,
        date_column: Optional[str] = None,
        periods_ahead: int = 12,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """Generate forecast using Prophet model"""
        
        if not self.models_available.get("prophet", False):
            logger.warning("Prophet not available, using simple trend forecast")
            return await self._simple_trend_forecast(df, target_column, periods_ahead)
        
        try:
            from prophet import Prophet
            
            # Prepare data for Prophet
            prophet_df = self._prepare_prophet_data(df, target_column, date_column)
            
            # Initialize and fit model
            model = Prophet(
                interval_width=confidence_level,
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False
            )
            
            # Fit model (run in thread pool to avoid blocking)
            await asyncio.get_event_loop().run_in_executor(
                None, model.fit, prophet_df
            )
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=periods_ahead, freq='M')
            
            # Generate forecast
            forecast = await asyncio.get_event_loop().run_in_executor(
                None, model.predict, future
            )
            
            # Extract forecast values (only future periods)
            forecast_values = forecast['yhat'].tail(periods_ahead).tolist()
            lower_bound = forecast['yhat_lower'].tail(periods_ahead).tolist()
            upper_bound = forecast['yhat_upper'].tail(periods_ahead).tolist()
            timestamps = future['ds'].tail(periods_ahead).dt.strftime('%Y-%m-%d').tolist()
            
            return {
                "forecast": [round(v, 2) for v in forecast_values],
                "lower": [round(v, 2) for v in lower_bound],
                "upper": [round(v, 2) for v in upper_bound],
                "timestamps": timestamps,
                "model_used": "prophet",
                "confidence_level": confidence_level,
                "model_performance": self._calculate_model_metrics(prophet_df, model)
            }
            
        except ImportError:
            logger.warning("Prophet import failed, using simple trend forecast")
            return await self._simple_trend_forecast(df, target_column, periods_ahead)
        except Exception as e:
            logger.error(f"Prophet forecast failed: {str(e)}")
            # Fallback to simple trend extrapolation
            return await self._simple_trend_forecast(df, target_column, periods_ahead)
    
    def _prepare_prophet_data(self, df: pd.DataFrame, target_column: str, date_column: Optional[str] = None) -> pd.DataFrame:
        """Prepare data for Prophet (requires 'ds' and 'y' columns)"""
        
        prophet_df = pd.DataFrame()
        
        # Handle date column
        if date_column and date_column in df.columns:
            try:
                prophet_df['ds'] = pd.to_datetime(df[date_column])
            except:
                # If date parsing fails, create synthetic dates
                start_date = datetime.now() - timedelta(days=30 * len(df))
                prophet_df['ds'] = pd.date_range(start=start_date, periods=len(df), freq='M')
        else:
            # Create synthetic date index if no date column provided
            start_date = datetime.now() - timedelta(days=30 * len(df))
            prophet_df['ds'] = pd.date_range(start=start_date, periods=len(df), freq='M')
        
        # Target values - ensure numeric
        target_values = pd.to_numeric(df[target_column], errors='coerce')
        prophet_df['y'] = target_values.fillna(0)
        
        # Remove any rows with invalid dates or values
        prophet_df = prophet_df.dropna().reset_index(drop=True)
        
        if len(prophet_df) < 2:
            raise ValueError("Insufficient data points for forecasting (minimum 2 required)")
        
        return prophet_df
    
    def _calculate_model_metrics(self, df: pd.DataFrame, model) -> Dict[str, Any]:
        """Calculate basic model performance metrics"""
        try:
            # Simple validation on last 20% of data
            split_point = max(1, int(len(df) * 0.8))
            if split_point >= len(df) - 1:
                return {"accuracy": "insufficient_data_for_validation"}
            
            train_df = df.iloc[:split_point].copy()
            test_df = df.iloc[split_point:].copy()
            
            if len(test_df) < 1:
                return {"accuracy": "insufficient_test_data"}
            
            # Simple MAE calculation
            actual_mean = test_df['y'].mean()
            forecast_mean = train_df['y'].tail(5).mean()  # Use recent average as simple prediction
            mae = abs(actual_mean - forecast_mean)
            
            return {
                "mae": round(mae, 2),
                "accuracy": "good" if mae < train_df['y'].std() else "moderate"
            }
            
        except Exception as e:
            logger.warning(f"Could not calculate model metrics: {e}")
            return {"accuracy": "unknown"}
    
    async def _simple_trend_forecast(self, df: pd.DataFrame, target_column: str, periods_ahead: int) -> Dict[str, Any]:
        """Fallback simple trend extrapolation"""
        
        values = pd.to_numeric(df[target_column], errors='coerce').dropna()
        
        if len(values) < 2:
            raise ValueError("Insufficient data for trend forecast")
        
        # Calculate simple linear trend
        x = np.arange(len(values))
        try:
            coeffs = np.polyfit(x, values, 1)
        except:
            # If polyfit fails, use simple average
            avg_value = float(values.mean())
            forecast_values = [avg_value] * periods_ahead
        else:
            # Extrapolate trend
            future_x = np.arange(len(values), len(values) + periods_ahead)
            forecast_values = np.polyval(coeffs, future_x).tolist()
        
        # Simple confidence intervals (±15% of mean)
        mean_val = float(values.mean())
        margin = mean_val * 0.15
        
        # Generate timestamps
        timestamps = pd.date_range(
            start=datetime.now(),
            periods=periods_ahead,
            freq='M'
        ).strftime('%Y-%m-%d').tolist()
        
        return {
            "forecast": [round(v, 2) for v in forecast_values],
            "lower": [round(max(0, v - margin), 2) for v in forecast_values],
            "upper": [round(v + margin, 2) for v in forecast_values],
            "timestamps": timestamps,
            "model_used": "simple_trend",
            "confidence_level": 0.8,
            "model_performance": {"accuracy": "basic"}
        }
