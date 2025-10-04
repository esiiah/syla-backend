# app/ai/forecast_service.py
import asyncio
import json
import logging
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib

logger = logging.getLogger(__name__)

class ForecastService:
    def __init__(self):
        self.openai_client = None
        self.rate_limits = {}

        try:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key and openai_key.startswith("sk-"):
                from .openai_client import OpenAIClient
                self.openai_client = OpenAIClient()
                logger.info("OpenAI client initialized successfully")
            else:
                logger.warning("OPENAI_API_KEY not configured or invalid")
        except Exception as e:
            logger.warning(f"OpenAI client initialization failed: {e}")
    
    def check_rate_limit(self, user_id: str, limit_per_hour: int = 50) -> bool:
        """Simple rate limiting"""
        now = datetime.now()
        
        # Initialize user if not in rate_limits
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = {"count": 1, "reset_time": now + timedelta(hours=1)}
            return True
        
        user_limits = self.rate_limits[user_id]
        
        # Reset if time expired
        if now > user_limits["reset_time"]:
            self.rate_limits[user_id] = {"count": 1, "reset_time": now + timedelta(hours=1)}
            return True
        
        # Check limit
        if user_limits["count"] >= limit_per_hour:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            return False
        
        # Increment count
        self.rate_limits[user_id]["count"] += 1
        return True

    async def create_forecast(
        self,
        data: List[Dict[str, Any]],
        scenario: str,
        target_column: str,
        date_column: Optional[str] = None,
        model_preference: str = "hybrid",
        periods_ahead: int = 12,
        confidence_level: float = 0.95,
        user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """Main forecast generation method"""
        
        logger.info(f"Starting forecast - User: {user_id}, Model: {model_preference}, Target: {target_column}")
        
        try:
            # Step 1: Validate and prepare data
            df = self._prepare_dataframe(data, target_column, date_column)
            logger.info(f"✓ Prepared dataframe: {len(df)} rows, {len(df.columns)} columns")
            
            # Step 2: Parse scenario
            scenario_params = await self._parse_scenario(scenario, df.columns.tolist())
            logger.info(f"✓ Parsed scenario: {scenario_params}")
            
            # Step 3: Prepare time series
            ts_df = self._prepare_time_series(df, target_column, date_column)
            logger.info(f"✓ Time series prepared: {len(ts_df)} periods")
            
            # Step 4: Generate forecast based on model preference
            logger.info(f"Generating forecast with model: {model_preference}")
            forecast_result = await self._generate_forecast(
                ts_df, scenario_params, target_column,
                model_preference, periods_ahead, confidence_level
            )
            logger.info(f"✓ Forecast generated: {len(forecast_result.get('forecast', []))} periods")
            
            # Step 5: Generate explanation
            explanation = await self._generate_explanation(
                ts_df, scenario_params, forecast_result, target_column
            )
            logger.info(f"✓ Explanation generated")
            
            # Step 6: Assemble final result
            result = {
                "forecast": forecast_result,
                "explanation": explanation,
                "scenario_parsed": scenario_params,
                "metadata": {
                    "model_used": forecast_result.get("model_used", "unknown"),
                    "confidence_level": confidence_level,
                    "generated_at": datetime.now().isoformat(),
                    "data_points": len(df),
                    "forecast_periods": periods_ahead,
                    "target_column": target_column,
                    "scenario": scenario[:100] + "..." if len(scenario) > 100 else scenario
                }
            }
            
            logger.info(f"✓ Forecast completed successfully for user {user_id}")
            return result
            
        except Exception as e:
            logger.exception(f"✗ Forecast generation failed for user {user_id}")
            raise Exception(f"Forecast generation failed: {str(e)}")

    def _prepare_dataframe(self, data: List[Dict], target_column: str, date_column: Optional[str]) -> pd.DataFrame:
        """Convert input data to clean DataFrame"""
        if not data:
            raise ValueError("No data provided")
        
        df = pd.DataFrame(data)
        logger.info(f"Initial dataframe shape: {df.shape}")
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found. Available: {list(df.columns)}")
        
        # Clean target column - convert to numeric
        try:
            df[target_column] = pd.to_numeric(df[target_column], errors='coerce')
            df[target_column] = df[target_column].fillna(0)
            logger.info(f"Target column '{target_column}' converted to numeric")
        except Exception as e:
            raise ValueError(f"Cannot convert target column to numeric: {e}")
        
        # Clean date column if provided
        if date_column and date_column in df.columns:
            try:
                df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
                df = df.dropna(subset=[date_column])
                df = df.sort_values(date_column).reset_index(drop=True)
                logger.info(f"Date column '{date_column}' processed successfully")
            except Exception as e:
                logger.warning(f"Date column processing failed: {e}")
                date_column = None
        
        if len(df) < 2:
            raise ValueError("Need at least 2 data points for forecasting")
            
        return df

    def _prepare_time_series(self, df: pd.DataFrame, target_column: str, date_column: Optional[str]) -> pd.DataFrame:
        """Prepare data for time series forecasting"""
        ts_df = pd.DataFrame()
        
        # Handle dates
        if date_column and date_column in df.columns:
            ts_df['ds'] = df[date_column]
            logger.info(f"Using provided date column: {date_column}")
        else:
            # Create synthetic monthly dates
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30 * len(df))
            ts_df['ds'] = pd.date_range(start=start_date, periods=len(df), freq='M')
            logger.info(f"Generated synthetic monthly dates")
        
        # Target values
        ts_df['y'] = df[target_column].astype(float)
        
        # Remove any remaining nulls
        ts_df = ts_df.dropna().reset_index(drop=True)
        
        return ts_df

    async def _parse_scenario(self, scenario: str, available_columns: List[str]) -> Dict[str, Any]:
        """Parse natural language scenario"""
        if self.openai_client:
            try:
                logger.info("Using LLM for scenario parsing")
                return await self._llm_parse_scenario(scenario, available_columns)
            except Exception as e:
                logger.warning(f"LLM scenario parsing failed: {e}, falling back to pattern matching")
        
        logger.info("Using fallback pattern matching for scenario parsing")
        return self._fallback_scenario_parsing(scenario)

    async def _llm_parse_scenario(self, scenario: str, available_columns: List[str]) -> Dict[str, Any]:
        """Use OpenAI to parse scenario"""
        prompt = f"""Parse this business scenario into structured parameters for forecasting:

Scenario: "{scenario}"
Available columns: {', '.join(available_columns)}

Extract:
1. Percentage changes (e.g., "increase 10%" -> 1.1 multiplier)
2. Time horizon expectations
3. Confidence level

Respond with valid JSON only:
{{
  "adjustments": {{
    "multiplier": 1.0,
    "trend_change": 0.0
  }},
  "target_change": 0,
  "time_horizon": "monthly",
  "confidence": "medium"
}}"""

        try:
            response = await self.openai_client.chat_completion(prompt, max_tokens=300, temperature=0.1)
            parsed = json.loads(response.strip())
            return self._validate_scenario_params(parsed)
        except Exception as e:
            logger.error(f"LLM scenario parsing error: {e}")
            return self._fallback_scenario_parsing(scenario)

    def _fallback_scenario_parsing(self, scenario: str) -> Dict[str, Any]:
        """Simple pattern-based scenario parsing"""
        scenario_lower = scenario.lower()
        
        adjustments = {"multiplier": 1.0, "trend_change": 0.0}
        
        # Look for percentage increases/decreases
        if "increase" in scenario_lower or "grow" in scenario_lower or "up" in scenario_lower:
            if "20%" in scenario_lower or "twenty percent" in scenario_lower:
                adjustments["multiplier"] = 1.2
            elif "15%" in scenario_lower or "fifteen percent" in scenario_lower:
                adjustments["multiplier"] = 1.15
            elif "10%" in scenario_lower or "ten percent" in scenario_lower:
                adjustments["multiplier"] = 1.1
            elif "5%" in scenario_lower or "five percent" in scenario_lower:
                adjustments["multiplier"] = 1.05
            else:
                adjustments["multiplier"] = 1.1
                
        elif "decrease" in scenario_lower or "decline" in scenario_lower or "down" in scenario_lower:
            if "20%" in scenario_lower:
                adjustments["multiplier"] = 0.8
            elif "15%" in scenario_lower:
                adjustments["multiplier"] = 0.85
            elif "10%" in scenario_lower:
                adjustments["multiplier"] = 0.9
            elif "5%" in scenario_lower:
                adjustments["multiplier"] = 0.95
            else:
                adjustments["multiplier"] = 0.9
        
        return {
            "adjustments": adjustments,
            "target_change": (adjustments["multiplier"] - 1.0) * 100,
            "time_horizon": "monthly",
            "confidence": "medium"
        }

    def _validate_scenario_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate parsed scenario parameters"""
        return {
            "adjustments": params.get("adjustments", {"multiplier": 1.0}),
            "target_change": params.get("target_change", 0),
            "time_horizon": params.get("time_horizon", "monthly"),
            "confidence": params.get("confidence", "medium")
        }

    async def _generate_forecast(
        self,
        ts_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        target_column: str,
        model_preference: str,
        periods_ahead: int,
        confidence_level: float
    ) -> Dict[str, Any]:
        """Generate forecast using specified method"""
        
        logger.info(f"Generating forecast with model: {model_preference}")
        
        if model_preference == "gpt" and self.openai_client:
            logger.info("Using GPT model")
            return await self._gpt_forecast(ts_df, scenario_params, periods_ahead)
        elif model_preference == "prophet":
            logger.info("Using Prophet model")
            return self._prophet_forecast(ts_df, periods_ahead, confidence_level)
        else:  # hybrid or fallback
            logger.info("Using hybrid approach")
            return await self._hybrid_forecast(ts_df, scenario_params, periods_ahead, confidence_level)

    async def _gpt_forecast(self, ts_df: pd.DataFrame, scenario_params: Dict[str, Any], periods_ahead: int) -> Dict[str, Any]:
        """Pure GPT-based forecasting"""
        if not self.openai_client:
            logger.error("OpenAI client not available, falling back to simple forecast")
            return self._simple_forecast(ts_df, periods_ahead)
        
        recent_data = ts_df['y'].tail(min(20, len(ts_df))).tolist()
        
        prompt = f"""You are a data analyst. Based on this historical data trend and business scenario, generate a {periods_ahead}-period forecast.

Historical data (most recent {len(recent_data)} points): {recent_data}
Business scenario: {json.dumps(scenario_params)}

Generate a realistic forecast as a JSON object with exactly this format:
{{
  "forecast": [list of {periods_ahead} numbers],
  "lower": [list of {periods_ahead} numbers for lower confidence bound],
  "upper": [list of {periods_ahead} numbers for upper confidence bound],
  "reasoning": "Brief explanation of forecast logic"
}}

Make sure all arrays have exactly {periods_ahead} values. Base the forecast on trends in the historical data and apply the scenario adjustments logically."""

        try:
            logger.info("Calling GPT API for forecast")
            response = await self.openai_client.chat_completion(prompt, max_tokens=800, temperature=0.3)
            
            result = json.loads(response.strip())
            
            if not all(key in result for key in ['forecast', 'lower', 'upper']):
                raise ValueError("GPT response missing required keys")
            
            if not all(len(result[key]) == periods_ahead for key in ['forecast', 'lower', 'upper']):
                raise ValueError("GPT response arrays have wrong length")
            
            last_date = ts_df['ds'].iloc[-1]
            timestamps = pd.date_range(
                start=last_date + pd.DateOffset(months=1),
                periods=periods_ahead,
                freq='M'
            ).strftime('%Y-%m-%d').tolist()
            
            logger.info("GPT forecast generated successfully")
            return {
                "forecast": [round(float(v), 2) for v in result["forecast"]],
                "lower": [round(float(v), 2) for v in result["lower"]],
                "upper": [round(float(v), 2) for v in result["upper"]],
                "timestamps": timestamps,
                "model_used": "gpt-4o-mini",
                "reasoning": result.get("reasoning", "GPT-generated forecast")
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"GPT returned invalid JSON: {response[:200]}")
            return self._simple_forecast(ts_df, periods_ahead)
        except Exception as e:
            logger.error(f"GPT forecast failed: {e}")
            return self._simple_forecast(ts_df, periods_ahead)

    def _prophet_forecast(self, ts_df: pd.DataFrame, periods_ahead: int, confidence_level: float) -> Dict[str, Any]:
        """Prophet-based forecasting"""
        try:
            from prophet import Prophet
            logger.info("✓ Prophet imported successfully")
            
            model = Prophet(
                yearly_seasonality=len(ts_df) >= 24,
                weekly_seasonality=False,
                daily_seasonality=False,
                interval_width=confidence_level
            )
            
            logger.info("Fitting Prophet model")
            model.fit(ts_df)
            
            future = model.make_future_dataframe(periods=periods_ahead, freq='M')
            forecast = model.predict(future)
            
            future_forecast = forecast.tail(periods_ahead)
            
            logger.info("✓ Prophet forecast completed")
            return {
                "forecast": future_forecast['yhat'].round(2).tolist(),
                "lower": future_forecast['yhat_lower'].round(2).tolist(),
                "upper": future_forecast['yhat_upper'].round(2).tolist(),
                "timestamps": future_forecast['ds'].dt.strftime('%Y-%m-%d').tolist(),
                "model_used": "prophet",
                "confidence_level": confidence_level
            }
            
        except ImportError:
            logger.error("✗ Prophet not available, falling back to simple forecast")
            return self._simple_forecast(ts_df, periods_ahead)
        except Exception as e:
            logger.error(f"✗ Prophet forecast failed: {e}")
            return self._simple_forecast(ts_df, periods_ahead)

    async def _hybrid_forecast(self, ts_df: pd.DataFrame, scenario_params: Dict[str, Any], 
                             periods_ahead: int, confidence_level: float) -> Dict[str, Any]:
        """Hybrid approach: statistical + scenario adjustments"""
        
        logger.info("Starting hybrid forecast")
        base_forecast = self._simple_forecast(ts_df, periods_ahead)
        
        multiplier = scenario_params.get("adjustments", {}).get("multiplier", 1.0)
        
        if multiplier != 1.0:
            logger.info(f"Applying scenario multiplier: {multiplier}")
            adjusted_forecast = [v * multiplier for v in base_forecast["forecast"]]
            adjusted_lower = [v * multiplier for v in base_forecast["lower"]]
            adjusted_upper = [v * multiplier for v in base_forecast["upper"]]
            
            base_forecast.update({
                "forecast": [round(v, 2) for v in adjusted_forecast],
                "lower": [round(v, 2) for v in adjusted_lower],
                "upper": [round(v, 2) for v in adjusted_upper],
                "model_used": "hybrid",
                "scenario_applied": f"Applied {multiplier}x multiplier based on scenario"
            })
        
        return base_forecast

    def _simple_forecast(self, ts_df: pd.DataFrame, periods_ahead: int) -> Dict[str, Any]:
        """Simple trend-based forecast as fallback"""
        
        logger.info("Generating simple trend-based forecast")
        values = ts_df['y'].values
        
        if len(values) < 2:
            last_value = float(values[-1]) if len(values) > 0 else 0
            forecast_values = [last_value] * periods_ahead
            logger.info(f"Insufficient data, using last value: {last_value}")
        else:
            x = np.arange(len(values))
            try:
                coeffs = np.polyfit(x, values, 1)
                future_x = np.arange(len(values), len(values) + periods_ahead)
                forecast_values = np.polyval(coeffs, future_x).tolist()
                logger.info(f"Linear trend fitted successfully")
            except Exception:
                mean_value = float(np.mean(values))
                forecast_values = [mean_value] * periods_ahead
                logger.warning(f"Polyfit failed, using mean: {mean_value}")
        
        lower_bound = [max(0, v * 0.8) for v in forecast_values]
        upper_bound = [v * 1.2 for v in forecast_values]
        
        last_date = ts_df['ds'].iloc[-1]
        timestamps = pd.date_range(
            start=last_date + pd.DateOffset(months=1),
            periods=periods_ahead,
            freq='M'
        ).strftime('%Y-%m-%d').tolist()
        
        return {
            "forecast": [round(v, 2) for v in forecast_values],
            "lower": [round(v, 2) for v in lower_bound],
            "upper": [round(v, 2) for v in upper_bound],
            "timestamps": timestamps,
            "model_used": "simple_trend",
            "confidence_level": 0.8
        }

    async def _generate_explanation(self, ts_df: pd.DataFrame, scenario_params: Dict[str, Any], 
                                  forecast_result: Dict[str, Any], target_column: str) -> str:
        """Generate explanation of the forecast"""
        
        if self.openai_client:
            try:
                logger.info("Generating LLM explanation")
                return await self._llm_explanation(ts_df, scenario_params, forecast_result, target_column)
            except Exception as e:
                logger.warning(f"LLM explanation failed: {e}")
        
        model_used = forecast_result.get("model_used", "unknown")
        avg_forecast = np.mean(forecast_result.get("forecast", [0]))
        
        explanation = f"Generated forecast for {target_column} using {model_used} model. "
        explanation += f"Average projected value: {avg_forecast:.2f}. "
        
        multiplier = scenario_params.get("adjustments", {}).get("multiplier", 1.0)
        if multiplier != 1.0:
            change_pct = (multiplier - 1.0) * 100
            explanation += f"Applied {change_pct:+.1f}% adjustment based on your scenario. "
        
        explanation += "Forecast reflects historical trends and scenario assumptions."
        
        logger.info("Fallback explanation generated")
        return explanation

    async def _llm_explanation(self, ts_df: pd.DataFrame, scenario_params: Dict[str, Any], 
                             forecast_result: Dict[str, Any], target_column: str) -> str:
        """Generate explanation using OpenAI"""
        
        prompt = f"""Generate a clear, business-friendly explanation for this forecast:

Target Column: {target_column}
Historical Data Points: {len(ts_df)}
Recent Trend: {ts_df['y'].tail(5).tolist()}
Forecast Values (first 5): {forecast_result.get('forecast', [])[:5]}
Model Used: {forecast_result.get('model_used', 'unknown')}
Scenario Applied: {json.dumps(scenario_params)}

Write 2-3 sentences explaining:
1. What the forecast shows
2. How the scenario influenced the results
3. Key insights or expectations

Keep it concise and avoid technical jargon."""

        try:
            explanation = await self.openai_client.chat_completion(prompt, max_tokens=200, temperature=0.7)
            logger.info("LLM explanation generated successfully")
            return explanation.strip()
        except Exception as e:
            logger.error(f"LLM explanation failed: {e}")
            return f"Forecast generated for {target_column} showing projected trends based on historical data and scenario assumptions."
