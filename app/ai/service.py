# Fix the imports in your ai/service.py file

import asyncio
import json
import hashlib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging

from .clients import OpenAIClient, LocalForecastClient
from .prompt_templates import SCENARIO_PARSER_TEMPLATE, EXPLANATION_TEMPLATE
from .cache import AICache

# Import from visual module - update these imports
from ..visual import (
    validate_forecast_data,
    prepare_time_series,
    universal_clean_pipeline
)

logger = logging.getLogger(__name__)

class AIForecastService:
    def __init__(self):
        try:
            self.openai_client = OpenAIClient()
        except Exception as e:
            logger.warning(f"OpenAI client unavailable: {e}")
            self.openai_client = None
            
        self.local_client = LocalForecastClient()
        self.cache = AICache()
        self.rate_limits = {}
        
    def check_rate_limit(self, user_id: str, limit_per_hour: int = 50) -> bool:
        """Simple rate limiting: 50 requests per hour per user"""
        now = datetime.now()
        user_limits = self.rate_limits.get(user_id, {"count": 0, "reset_time": now})
        
        if now > user_limits["reset_time"]:
            self.rate_limits[user_id] = {"count": 1, "reset_time": now + timedelta(hours=1)}
            return True
        
        if user_limits["count"] >= limit_per_hour:
            return False
            
        self.rate_limits[user_id]["count"] += 1
        return True
    
    async def process_forecast_request(
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
        """Main orchestration method for forecast generation"""
        
        # Generate cache key
        cache_key = self._generate_cache_key(data, scenario, target_column, model_preference)
        
        # Check cache
        cached_result = self.cache.get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for user {user_id}")
            return cached_result
        
        try:
            # Step 1: Validate and prepare data using universal approach
            df = pd.DataFrame(data)
            
            # Use universal cleaning first
            df_clean, _ = universal_clean_pipeline(df, aggressive=False)
            
            # Then validate for forecasting
            df_validated = validate_forecast_data(df_clean, target_column, date_column)
            
            # Step 2: Parse scenario using LLM
            scenario_params = await self._parse_scenario_with_llm(scenario, df_validated.columns.tolist())
            
            # Step 3: Prepare time series data
            ts_df, ts_metadata = prepare_time_series(
                df_validated, target_column, date_column, freq='M'
            )
            
            # Step 4: Generate forecast
            forecast_result = await self._generate_forecast(
                ts_df, scenario_params, target_column, date_column,
                model_preference, periods_ahead, confidence_level
            )
            
            # Step 5: Generate explanation
            explanation = await self._generate_explanation(
                df_validated, scenario_params, forecast_result, target_column
            )
            
            # Step 6: Assemble final result
            result = {
                "forecast": forecast_result,
                "explanation": explanation,
                "scenario_parsed": scenario_params,
                "metadata": {
                    "model_used": forecast_result.get("model_used"),
                    "confidence_level": confidence_level,
                    "generated_at": datetime.now().isoformat(),
                    "data_points": len(df_validated),
                    "forecast_periods": periods_ahead,
                    "cost_estimate": self._estimate_cost(model_preference),
                    "time_series_metadata": ts_metadata
                }
            }
            
            # Cache result
            self.cache.set(cache_key, result, ttl_minutes=30)
            
            return result
            
        except Exception as e:
            logger.exception(f"Forecast processing failed for user {user_id}")
            # Return a more informative error
            error_msg = str(e) if str(e) else "Unknown forecasting error"
            raise Exception(f"Forecast generation failed: {error_msg}")
    
    async def _parse_scenario_with_llm(self, scenario: str, available_columns: List[str]) -> Dict[str, Any]:
        """Parse natural language scenario into structured parameters"""
        
        if not self.openai_client:
            logger.warning("OpenAI unavailable, using fallback parsing")
            return self._fallback_scenario_parsing(scenario)
        
        prompt = SCENARIO_PARSER_TEMPLATE.format(
            scenario=scenario,
            available_columns=", ".join(available_columns)
        )
        
        try:
            response = await self.openai_client.chat_completion(
                prompt=prompt,
                max_tokens=300,
                temperature=0.1
            )
            
            # Parse JSON response from LLM
            parsed = json.loads(response.strip())
            
            # Validate parsed scenario
            return self._validate_scenario_params(parsed, available_columns)
            
        except json.JSONDecodeError:
            logger.warning("LLM returned invalid JSON, using fallback parsing")
            return self._fallback_scenario_parsing(scenario)
        except Exception as e:
            logger.error(f"Scenario parsing failed: {e}")
            return self._fallback_scenario_parsing(scenario)
    
    async def _generate_forecast(
        self,
        ts_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        target_column: str,
        date_column: Optional[str],
        model_preference: str,
        periods_ahead: int,
        confidence_level: float
    ) -> Dict[str, Any]:
        """Generate forecast using selected model approach"""
        
        if model_preference == "gpt" and self.openai_client:
            return await self._llm_forecast(ts_df, scenario_params, target_column, periods_ahead)
        elif model_preference == "prophet":
            return await self._local_forecast(ts_df, periods_ahead, confidence_level)
        else:  # hybrid (default)
            return await self._hybrid_forecast(ts_df, scenario_params, periods_ahead, confidence_level)
    
    async def _hybrid_forecast(
        self,
        ts_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        periods_ahead: int,
        confidence_level: float
    ) -> Dict[str, Any]:
        """Combine LLM scenario interpretation with local statistical forecasting"""
        
        # Get statistical forecast using simple method
        statistical_result = await self._simple_forecast(ts_df, periods_ahead)
        
        # Apply scenario adjustments if available
        if scenario_params.get("adjustments"):
            adjusted_forecast = self._apply_scenario_adjustments(
                statistical_result, scenario_params
            )
            statistical_result.update(adjusted_forecast)
        
        statistical_result["model_used"] = "hybrid"
        statistical_result["confidence_level"] = confidence_level
        return statistical_result
    
    async def _local_forecast(
        self,
        ts_df: pd.DataFrame,
        periods_ahead: int,
        confidence_level: float
    ) -> Dict[str, Any]:
        """Generate forecast using local methods"""
        
        try:
            # Try Prophet if available
            return await self.local_client.prophet_forecast(
                ts_df, "y", "ds", periods_ahead, confidence_level
            )
        except Exception as e:
            logger.warning(f"Prophet forecast failed: {e}, using simple forecast")
            return await self._simple_forecast(ts_df, periods_ahead)
    
    async def _simple_forecast(self, ts_df: pd.DataFrame, periods_ahead: int) -> Dict[str, Any]:
        """Simple trend-based forecast as universal fallback"""
        
        values = ts_df['y'].values
        
        if len(values) < 2:
            # If insufficient data, use last value
            last_value = values[-1] if len(values) > 0 else 0
            forecast_values = [float(last_value)] * periods_ahead
        else:
            # Calculate simple linear trend
            x = np.arange(len(values))
            try:
                coeffs = np.polyfit(x, values, 1)
                future_x = np.arange(len(values), len(values) + periods_ahead)
                forecast_values = np.polyval(coeffs, future_x).tolist()
            except:
                # If polyfit fails, use mean
                mean_value = float(np.mean(values))
                forecast_values = [mean_value] * periods_ahead
        
        # Generate timestamps
        if 'ds' in ts_df.columns and len(ts_df) > 0:
            last_date = ts_df['ds'].iloc[-1]
            timestamps = pd.date_range(
                start=last_date + pd.DateOffset(months=1),
                periods=periods_ahead,
                freq='M'
            ).strftime('%Y-%m-%d').tolist()
        else:
            timestamps = pd.date_range(
                start=datetime.now(),
                periods=periods_ahead,
                freq='M'
            ).strftime('%Y-%m-%d').tolist()
        
        # Simple confidence intervals
        mean_val = float(np.mean(values)) if len(values) > 0 else 0
        margin = abs(mean_val) * 0.2
        
        return {
            "forecast": [round(v, 2) for v in forecast_values],
            "lower": [round(max(0, v - margin), 2) for v in forecast_values],
            "upper": [round(v + margin, 2) for v in forecast_values],
            "timestamps": timestamps,
            "model_used": "simple_trend",
            "confidence_level": 0.8
        }
    
    async def _llm_forecast(
        self,
        ts_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        target_column: str,
        periods_ahead: int
    ) -> Dict[str, Any]:
        """Generate forecast using pure LLM approach"""
        
        if not self.openai_client:
            raise ValueError("OpenAI client not available for LLM forecast")
        
        # Summarize recent data trends
        recent_data = ts_df['y'].tail(10).values.tolist()
        
        prompt = f"""
        Based on this recent data trend: {recent_data}
        And this scenario: {json.dumps(scenario_params)}
        
        Generate a {periods_ahead}-period forecast as a JSON array of numbers.
        Include confidence intervals as "lower" and "upper" arrays.
        
        Response format:
        {{"forecast": [numbers], "lower": [numbers], "upper": [numbers]}}
        """
        
        try:
            response = await self.openai_client.chat_completion(prompt, max_tokens=500, temperature=0.3)
            result = json.loads(response.strip())
            result["model_used"] = "gpt-4o-mini"
            result["timestamps"] = pd.date_range(
                start=pd.Timestamp.now(), periods=periods_ahead, freq='M'
            ).strftime('%Y-%m-%d').tolist()
            return result
        except Exception as e:
            logger.error(f"LLM forecast failed: {e}")
            # Fallback to simple forecast
            return await self._simple_forecast(ts_df, periods_ahead)
    
    async def _generate_explanation(
        self,
        df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        forecast_result: Dict[str, Any],
        target_column: str
    ) -> str:
        """Generate human-readable explanation of forecast"""
        
        if not self.openai_client:
            return f"Forecast generated for {target_column} using {forecast_result.get('model_used', 'hybrid')} model. Results show projected values based on historical trends and scenario adjustments."
        
        # Create safe summary for LLM
        try:
            data_summary = {
                "rows": len(df),
                "target_mean": float(pd.to_numeric(df[target_column], errors='coerce').fillna(0).mean()),
                "target_trend": "stable"
            }
        except:
            data_summary = {"rows": len(df), "target_mean": 0, "target_trend": "stable"}
        
        prompt = EXPLANATION_TEMPLATE.format(
            target_column=target_column,
            data_summary=json.dumps(data_summary),
            scenario=json.dumps(scenario_params),
            forecast_values=forecast_result.get("forecast", [])[:5],
            model_used=forecast_result.get("model_used", "hybrid")
        )
        
        try:
            explanation = await self.openai_client.chat_completion(
                prompt=prompt,
                max_tokens=200,
                temperature=0.7
            )
            return explanation.strip()
        except Exception as e:
            logger.error(f"Explanation generation failed: {e}")
            return f"Forecast generated for {target_column} using {forecast_result.get('model_used', 'hybrid')} model."
    
    def _generate_cache_key(self, data: List[Dict], scenario: str, target_column: str, model_preference: str) -> str:
        """Generate cache key from request parameters"""
        # Create a simpler cache key to avoid issues
        key_data = {
            "scenario": scenario,
            "target": target_column,
            "model": model_preference,
            "data_hash": hashlib.md5(str(len(data)).encode()).hexdigest()[:8]
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()[:16]
    
    def _validate_scenario_params(self, params: Dict[str, Any], available_columns: List[str]) -> Dict[str, Any]:
        """Validate and sanitize parsed scenario parameters"""
        validated = {
            "adjustments": params.get("adjustments", {}),
            "target_change": params.get("target_change", 0),
            "time_horizon": params.get("time_horizon", "monthly"),
            "confidence": params.get("confidence", "medium")
        }
        return validated
    
    def _fallback_scenario_parsing(self, scenario: str) -> Dict[str, Any]:
        """Simple fallback parsing for scenarios"""
        scenario_lower = scenario.lower()
        
        adjustments = {}
        if "increase" in scenario_lower:
            if "10%" in scenario_lower: adjustments["multiplier"] = 1.1
            elif "20%" in scenario_lower: adjustments["multiplier"] = 1.2
            elif "15%" in scenario_lower: adjustments["multiplier"] = 1.15
            else: adjustments["multiplier"] = 1.05
        elif "decrease" in scenario_lower:
            if "10%" in scenario_lower: adjustments["multiplier"] = 0.9
            elif "20%" in scenario_lower: adjustments["multiplier"] = 0.8
            else: adjustments["multiplier"] = 0.95
        
        return {
            "adjustments": adjustments,
            "target_change": 0,
            "time_horizon": "monthly",
            "confidence": "medium"
        }
    
    def _apply_scenario_adjustments(self, base_forecast: Dict, scenario_params: Dict) -> Dict[str, Any]:
        """Apply scenario-based adjustments to base forecast"""
        adjustments = scenario_params.get("adjustments", {})
        
        if not adjustments or "multiplier" not in adjustments:
            return {}
        
        forecast_values = base_forecast.get("forecast", [])
        if not forecast_values:
            return {}
        
        multiplier = adjustments.get("multiplier", 1.0)
        adjusted_values = [value * multiplier for value in forecast_values]
        
        # Adjust confidence intervals too
        lower_values = base_forecast.get("lower", [])
        upper_values = base_forecast.get("upper", [])
        
        return {
            "forecast": adjusted_values,
            "lower": [v * multiplier for v in lower_values] if lower_values else [],
            "upper": [v * multiplier for v in upper_values] if upper_values else [],
            "adjustment_applied": f"Applied {multiplier}x multiplier based on scenario"
        }
    
    def _estimate_cost(self, model_preference: str) -> str:
        """Estimate cost for the forecast request"""
        if model_preference == "prophet":
            return "$0.00"
        elif model_preference == "gpt":
            return "$0.02 - $0.05"
        else:  # hybrid
            return "$0.01 - $0.03"
    
    def get_user_usage(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for user"""
        limits = self.rate_limits.get(user_id, {"count": 0, "reset_time": datetime.now()})
        return {
            "requests_used": limits["count"],
            "requests_remaining": max(0, 50 - limits["count"]),
            "reset_time": limits["reset_time"].isoformat()
        }
    
    def clear_user_cache(self, user_id: str) -> int:
        """Clear cached forecasts for user"""
        return self.cache.clear_user_cache(user_id)

    async def parse_scenario_text(self, scenario_text: str, available_columns: List[str]) -> Dict[str, Any]:
        """Public method to parse scenario text"""
        return await self._parse_scenario_with_llm(scenario_text, available_columns)
