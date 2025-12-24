# app/ai/forecast_service.py (UPDATED)
import asyncio
import json
import logging
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib

from .validation import (
    calculate_all_metrics,
    train_test_split_timeseries,
    calculate_confidence_score,
    detect_data_type,
    validate_forecast_requirements
)
from .data_quality import (
    comprehensive_data_quality_report,
    clean_data_for_forecasting
)
from .models import (
    ModelSelector,
    fit_and_forecast,
    apply_scenario_adjustments
)

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
        
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = {"count": 1, "reset_time": now + timedelta(hours=1)}
            return True
        
        user_limits = self.rate_limits[user_id]
        
        if now > user_limits["reset_time"]:
            self.rate_limits[user_id] = {"count": 1, "reset_time": now + timedelta(hours=1)}
            return True
        
        if user_limits["count"] >= limit_per_hour:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            return False
        
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
        """Main forecast generation with full validation pipeline"""
        
        logger.info(f"🎯 Starting forecast - User: {user_id}, Model: {model_preference}, Target: {target_column}")
        
        try:
            # STEP 1: Convert to DataFrame
            df = pd.DataFrame(data)
            logger.info(f"✓ Data loaded: {len(df)} rows, {len(df.columns)} columns")
            
            # STEP 2: Detect data type
            data_type, detected_date_col = detect_data_type(df)
            if detected_date_col:
                date_column = detected_date_col
            
            logger.info(f"✓ Data type: {data_type}, Date column: {date_column or 'None (will generate)'}")
            
            # STEP 3: Validate requirements
            validation = validate_forecast_requirements(df, target_column, min_points=3)
            
            if not validation["valid"]:
                raise ValueError(f"Data validation failed: {', '.join(validation['issues'])}")
            
            if validation["warnings"]:
                logger.warning(f"Data warnings: {', '.join(validation['warnings'])}")
            
            # STEP 4: Data quality report
            quality_report = comprehensive_data_quality_report(df, target_column)
            logger.info(f"✓ Data quality: {quality_report['overall_quality']['rating']} ({quality_report['overall_quality']['score']}%)")
            
            # STEP 5: Clean data
            df_clean, cleaning_log = clean_data_for_forecasting(
                df, 
                target_column,
                remove_outliers=False,  # Don't remove outliers by default
                fill_missing=True
            )
            
            if cleaning_log["rows_removed"] > 0:
                logger.info(f"✓ Cleaned data: removed {cleaning_log['rows_removed']} rows")
            
            # STEP 6: Prepare time series
            ts_df = self._prepare_time_series(df_clean, target_column, date_column)
            logger.info(f"✓ Time series prepared: {len(ts_df)} periods")
            
            # STEP 7: Parse scenario
            scenario_params = await self._parse_scenario(scenario, df.columns.tolist())
            logger.info(f"✓ Scenario parsed: {scenario_params.get('adjustments', {}).get('multiplier', 1.0)}x multiplier")
            
            # STEP 8: Select best model
            selected_model = ModelSelector.select_best_model(
                ts_df,
                quality_report,
                user_preference=model_preference
            )
            logger.info(f"✓ Model selected: {selected_model}")
            
            # STEP 9: Train/test split for validation (if enough data)
            validation_metrics = None
            if len(ts_df) >= 10:
                try:
                    train_df, test_df = train_test_split_timeseries(ts_df, test_size=0.2)
                    
                    # Fit on train, predict on test
                    val_forecast, _ = fit_and_forecast(train_df, selected_model, len(test_df))
                    
                    # Calculate metrics
                    actual = test_df['y'].values
                    predicted = val_forecast['y'].values[:len(actual)]
                    validation_metrics = calculate_all_metrics(actual, predicted)
                    
                    logger.info(f"✓ Validation MAPE: {validation_metrics['mape']:.2f}%")
                except Exception as e:
                    logger.warning(f"Validation failed: {e}")
            
            # STEP 10: Fit final model on full data
            forecast_df, model_metadata = fit_and_forecast(
                ts_df,
                selected_model,
                periods_ahead,
                config={"interval_width": confidence_level}
            )
            
            # STEP 11: Apply scenario adjustments
            forecast_adjusted = apply_scenario_adjustments(forecast_df, scenario_params)
            
            # STEP 12: Calculate confidence score
            confidence = calculate_confidence_score(ts_df, validation_metrics)
            
            # STEP 13: Generate AI explanation
            explanation = await self._generate_explanation(
                ts_df,
                forecast_adjusted,
                scenario_params,
                target_column,
                quality_report,
                validation_metrics
            )
            
            # STEP 14: Assemble final result
            result = {
                "forecast": {
                    "forecast": forecast_adjusted['y'].round(2).tolist(),
                    "lower": forecast_adjusted['y_lower'].round(2).tolist(),
                    "upper": forecast_adjusted['y_upper'].round(2).tolist(),
                    "timestamps": forecast_adjusted['ds'].dt.strftime('%Y-%m-%d').tolist(),
                    "model_used": selected_model,
                    "confidence_level": confidence_level
                },
                "explanation": explanation,
                "scenario_parsed": scenario_params,
                "validation": {
                    "metrics": validation_metrics,
                    "confidence_score": confidence,
                    "data_quality": quality_report["overall_quality"]
                },
                "metadata": {
                    "model_used": selected_model,
                    "model_metadata": model_metadata,
                    "data_type": data_type,
                    "generated_at": datetime.now().isoformat(),
                    "data_points": len(ts_df),
                    "forecast_periods": periods_ahead,
                    "target_column": target_column,
                    "scenario": scenario[:100] + "..." if len(scenario) > 100 else scenario,
                    "cleaning_log": cleaning_log
                }
            }
            
            logger.info(f"✅ Forecast completed successfully for user {user_id}")
            return result
            
        except Exception as e:
            logger.exception(f"❌ Forecast generation failed for user {user_id}")
            raise Exception(f"Forecast generation failed: {str(e)}")

    def _prepare_time_series(
        self,
        df: pd.DataFrame,
        target_column: str,
        date_column: Optional[str] = None
    ) -> pd.DataFrame:
        """Prepare data for time series forecasting"""
        ts_df = pd.DataFrame()
        
        # Handle dates
        if date_column and date_column in df.columns:
            try:
                ts_df['ds'] = pd.to_datetime(df[date_column], errors='coerce')
                ts_df = ts_df.dropna(subset=['ds'])
                logger.info(f"Using provided date column: {date_column}")
            except:
                date_column = None
        
        if date_column is None or len(ts_df) == 0:
            # Create synthetic monthly dates
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30 * len(df))
            ts_df['ds'] = pd.date_range(start=start_date, periods=len(df), freq='M')
            logger.info(f"Generated synthetic monthly dates")
        
        # Target values
        ts_df['y'] = pd.to_numeric(df[target_column], errors='coerce').fillna(0)
        
        # Sort by date and remove duplicates
        ts_df = ts_df.sort_values('ds').drop_duplicates(subset=['ds']).reset_index(drop=True)
        
        return ts_df

    async def _parse_scenario(self, scenario: str, available_columns: List[str]) -> Dict[str, Any]:
        """Parse natural language scenario using GPT or fallback"""
        if self.openai_client and scenario.strip():
            try:
                logger.info("Using GPT for scenario parsing")
                return await self._gpt_parse_scenario(scenario, available_columns)
            except Exception as e:
                logger.warning(f"GPT scenario parsing failed: {e}, using fallback")
        
        return self._fallback_scenario_parsing(scenario)

    async def _gpt_parse_scenario(self, scenario: str, available_columns: List[str]) -> Dict[str, Any]:
        """Use OpenAI to parse scenario into structured parameters"""
        prompt = f"""Parse this business scenario into structured parameters for forecasting:

Scenario: "{scenario}"
Available columns: {', '.join(available_columns)}

Extract:
1. Percentage changes (e.g., "increase 10%" -> 1.1 multiplier, "decrease 15%" -> 0.85 multiplier)
2. When the change starts (immediately, next month, Q2, etc.)
3. Ramp-up period (gradual over 3 months, immediate, etc.)

Respond with valid JSON only (no markdown, no explanation):
{{
  "adjustments": {{
    "multiplier": 1.0,
    "start_period": 0,
    "ramp_periods": 0
  }},
  "target_change": 0,
  "time_horizon": "monthly",
  "confidence": "medium"
}}"""

        try:
            response = await self.openai_client.chat_completion(prompt, max_tokens=300, temperature=0.1)
            
            # Clean response
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response.split("```json")[1].split("```")[0].strip()
            elif clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1].split("```")[0].strip()
            
            parsed = json.loads(clean_response)
            return self._validate_scenario_params(parsed)
            
        except Exception as e:
            logger.error(f"GPT scenario parsing error: {e}")
            return self._fallback_scenario_parsing(scenario)

    def _fallback_scenario_parsing(self, scenario: str) -> Dict[str, Any]:
        """Pattern-based scenario parsing as fallback"""
        scenario_lower = scenario.lower()
        
        adjustments = {
            "multiplier": 1.0,
            "start_period": 0,
            "ramp_periods": 0
        }
        
        # Extract percentage
        import re
        percentage_match = re.search(r'(\d+(?:\.\d+)?)\s*%', scenario)
        
        if percentage_match:
            pct = float(percentage_match.group(1))
            
            if any(word in scenario_lower for word in ['increase', 'grow', 'up', 'rise']):
                adjustments["multiplier"] = 1.0 + (pct / 100)
            elif any(word in scenario_lower for word in ['decrease', 'decline', 'down', 'fall']):
                adjustments["multiplier"] = 1.0 - (pct / 100)
        else:
            # Default adjustments based on keywords
            if any(word in scenario_lower for word in ['increase', 'grow']):
                adjustments["multiplier"] = 1.1
            elif any(word in scenario_lower for word in ['decrease', 'decline']):
                adjustments["multiplier"] = 0.9
        
        # Detect ramp-up
        if 'gradual' in scenario_lower:
            adjustments["ramp_periods"] = 3
        
        # Detect start timing
        if any(word in scenario_lower for word in ['next month', 'month 2', 'starting']):
            adjustments["start_period"] = 1
        
        return {
            "adjustments": adjustments,
            "target_change": (adjustments["multiplier"] - 1.0) * 100,
            "time_horizon": "monthly",
            "confidence": "medium"
        }

    def _validate_scenario_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize scenario parameters"""
        return {
            "adjustments": params.get("adjustments", {"multiplier": 1.0, "start_period": 0, "ramp_periods": 0}),
            "target_change": params.get("target_change", 0),
            "time_horizon": params.get("time_horizon", "monthly"),
            "confidence": params.get("confidence", "medium")
        }

    async def _generate_explanation(
        self,
        ts_df: pd.DataFrame,
        forecast_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        target_column: str,
        quality_report: Dict[str, Any],
        validation_metrics: Optional[Dict[str, float]]
    ) -> str:
        """Generate comprehensive explanation using GPT"""
        
        if not self.openai_client:
            return self._fallback_explanation(ts_df, forecast_df, scenario_params, target_column)
        
        # Prepare context
        historical_stats = {
            "mean": float(ts_df['y'].mean()),
            "min": float(ts_df['y'].min()),
            "max": float(ts_df['y'].max()),
            "trend": float(ts_df['y'].iloc[-1] - ts_df['y'].iloc[0])
        }
        
        forecast_stats = {
            "mean": float(forecast_df['y'].mean()),
            "min": float(forecast_df['y'].min()),
            "max": float(forecast_df['y'].max()),
            "trend": float(forecast_df['y'].iloc[-1] - forecast_df['y'].iloc[0])
        }
        
        prompt = f"""Analyze this forecast and generate a clear business explanation:

Target: {target_column}
Historical Data: {len(ts_df)} periods
- Mean: {historical_stats['mean']:.2f}
- Range: {historical_stats['min']:.2f} to {historical_stats['max']:.2f}
- Overall trend: {historical_stats['trend']:.2f}

Forecast: {len(forecast_df)} periods ahead
- Predicted mean: {forecast_stats['mean']:.2f}
- Predicted range: {forecast_stats['min']:.2f} to {forecast_stats['max']:.2f}
- Expected trend: {forecast_stats['trend']:.2f}

Scenario Applied: {json.dumps(scenario_params)}
Data Quality: {quality_report['overall_quality']['rating']} ({quality_report['overall_quality']['score']}%)
Validation Accuracy: {f"MAPE {validation_metrics['mape']:.1f}%" if validation_metrics else "Not available (insufficient data)"}

Generate a 3-4 sentence business-friendly explanation covering:
1. What the forecast shows
2. How the scenario affected predictions
3. Key insights or expectations
4. Confidence level and caveats

Be specific with numbers. Avoid jargon."""

        try:
            explanation = await self.openai_client.chat_completion(prompt, max_tokens=300, temperature=0.7)
            return explanation.strip()
        except Exception as e:
            logger.error(f"GPT explanation failed: {e}")
            return self._fallback_explanation(ts_df, forecast_df, scenario_params, target_column)

    def _fallback_explanation(
        self,
        ts_df: pd.DataFrame,
        forecast_df: pd.DataFrame,
        scenario_params: Dict[str, Any],
        target_column: str
    ) -> str:
        """Generate basic explanation without GPT"""
        
        avg_forecast = forecast_df['y'].mean()
        avg_historical = ts_df['y'].mean()
        
        pct_change = ((avg_forecast - avg_historical) / avg_historical) * 100
        
        multiplier = scenario_params.get("adjustments", {}).get("multiplier", 1.0)
        scenario_change = (multiplier - 1.0) * 100
        
        explanation = f"Forecast for {target_column} shows an average value of {avg_forecast:.2f} over the prediction period, "
        
        if pct_change > 5:
            explanation += f"representing a {pct_change:.1f}% increase from historical average. "
        elif pct_change < -5:
            explanation += f"representing a {pct_change:.1f}% decrease from historical average. "
        else:
            explanation += f"remaining relatively stable compared to historical average. "
        
        if abs(scenario_change) > 1:
            explanation += f"The scenario adjustment of {scenario_change:+.1f}% has been applied to the base forecast. "
        
        explanation += "Results reflect both historical trends and scenario assumptions."
        
        return explanation
