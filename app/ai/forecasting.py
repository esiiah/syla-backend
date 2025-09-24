# app/ai/forecasting.py
import pandas as pd
import numpy as np
from typing import Optional, Tuple, Dict, Any, List
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def validate_forecast_data(
    df: pd.DataFrame, 
    target_column: str, 
    date_column: Optional[str] = None
) -> pd.DataFrame:
    """Validate and clean data for forecasting"""
    
    if df.empty:
        raise ValueError("DataFrame is empty")
    
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in data")
    
    # Create a copy to avoid modifying original
    df_clean = df.copy()
    
    # Validate target column can be converted to numeric
    try:
        df_clean[target_column] = pd.to_numeric(df_clean[target_column], errors='coerce')
    except Exception as e:
        raise ValueError(f"Target column '{target_column}' cannot be converted to numeric: {e}")
    
    # Remove rows where target is null
    initial_rows = len(df_clean)
    df_clean = df_clean.dropna(subset=[target_column])
    
    if df_clean.empty:
        raise ValueError("No valid numeric data in target column")
    
    removed_rows = initial_rows - len(df_clean)
    if removed_rows > 0:
        logger.warning(f"Removed {removed_rows} rows with invalid target values")
    
    # Validate date column if provided
    if date_column and date_column in df.columns:
        try:
            df_clean[date_column] = pd.to_datetime(df_clean[date_column])
            df_clean = df_clean.sort_values(date_column).reset_index(drop=True)
        except Exception as e:
            logger.warning(f"Could not parse date column '{date_column}': {e}")
            date_column = None
    
    # Minimum data requirements
    if len(df_clean) < 3:
        raise ValueError("Minimum 3 data points required for forecasting")
    
    logger.info(f"Data validation complete: {len(df_clean)} valid rows, target='{target_column}'")
    
    return df_clean

def prepare_time_series(
    df: pd.DataFrame,
    target_column: str,
    date_column: Optional[str] = None,
    freq: str = 'M'
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Prepare time series data for forecasting models"""
    
    metadata = {
        "original_rows": len(df),
        "has_date_column": date_column is not None,
        "frequency": freq,
        "target_stats": {}
    }
    
    # Calculate target statistics
    target_values = df[target_column]
    metadata["target_stats"] = {
        "mean": float(target_values.mean()),
        "std": float(target_values.std()),
        "min": float(target_values.min()),
        "max": float(target_values.max()),
        "null_count": int(target_values.isnull().sum())
    }
    
    # Create time series DataFrame
    ts_df = pd.DataFrame()
    
    if date_column and date_column in df.columns:
        # Use provided date column
        ts_df['ds'] = pd.to_datetime(df[date_column])
        ts_df['y'] = target_values
        
        # Remove duplicates and sort
        ts_df = ts_df.drop_duplicates(subset=['ds']).sort_values('ds').reset_index(drop=True)
        
        # Check for gaps in time series
        date_range = pd.date_range(start=ts_df['ds'].min(), end=ts_df['ds'].max(), freq=freq)
        if len(date_range) != len(ts_df):
            logger.warning(f"Time series has gaps. Expected {len(date_range)} periods, got {len(ts_df)}")
    else:
        # Create synthetic time index
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * len(df))  # Assume monthly data
        
        ts_df['ds'] = pd.date_range(start=start_date, periods=len(df), freq=freq)
        ts_df['y'] = target_values.reset_index(drop=True)
        
        metadata["synthetic_dates"] = True
    
    # Handle missing values in target
    if ts_df['y'].isnull().any():
        # Forward fill missing values
        ts_df['y'] = ts_df['y'].fillna(method='ffill').fillna(method='bfill')
        logger.warning("Filled missing values in target column")
    
    metadata["final_rows"] = len(ts_df)
    
    return ts_df, metadata

def detect_seasonality(values: List[float], periods: List[int] = [12, 4, 7]) -> Dict[str, Any]:
    """Detect potential seasonality in time series data"""
    
    if len(values) < 24:  # Need at least 2 years of monthly data
        return {"has_seasonality": False, "reason": "insufficient_data"}
    
    seasonality_info = {}
    
    try:
        from scipy.stats import pearsonr
        from scipy.fft import fft
        
        # Simple autocorrelation check
        for period in periods:
            if len(values) > period * 2:
                # Calculate correlation with lagged values
                lag_values = values[:-period]
                current_values = values[period:]
                
                if len(lag_values) > 0 and len(current_values) > 0:
                    corr, p_value = pearsonr(current_values, lag_values)
                    seasonality_info[f"period_{period}"] = {
                        "correlation": round(corr, 3),
                        "p_value": round(p_value, 3),
                        "significant": p_value < 0.05 and abs(corr) > 0.3
                    }
        
        # Determine overall seasonality
        significant_seasons = [
            info for info in seasonality_info.values() 
            if info.get("significant", False)
        ]
        
        return {
            "has_seasonality": len(significant_seasons) > 0,
            "details": seasonality_info,
            "strongest_period": max(
                seasonality_info.keys(),
                key=lambda k: abs(seasonality_info[k]["correlation"])
            ) if seasonality_info else None
        }
        
    except ImportError:
        logger.warning("scipy not available for seasonality detection")
        return {"has_seasonality": False, "reason": "scipy_not_available"}
    except Exception as e:
        logger.error(f"Seasonality detection failed: {e}")
        return {"has_seasonality": False, "reason": "error", "error": str(e)}

def calculate_forecast_accuracy(actual: List[float], predicted: List[float]) -> Dict[str, float]:
    """Calculate common forecast accuracy metrics"""
    
    if len(actual) != len(predicted) or len(actual) == 0:
        return {"error": "mismatched_lengths"}
    
    actual_arr = np.array(actual)
    pred_arr = np.array(predicted)
    
    # Remove any NaN values
    mask = ~(np.isnan(actual_arr) | np.isnan(pred_arr))
    if not mask.any():
        return {"error": "no_valid_pairs"}
    
    actual_clean = actual_arr[mask]
    pred_clean = pred_arr[mask]
    
    # Calculate metrics
    errors = actual_clean - pred_clean
    abs_errors = np.abs(errors)
    
    metrics = {
        "mae": float(np.mean(abs_errors)),  # Mean Absolute Error
        "rmse": float(np.sqrt(np.mean(errors ** 2))),  # Root Mean Square Error
        "mape": float(np.mean(np.abs(errors / (actual_clean + 1e-8)) * 100)),  # Mean Absolute Percentage Error
        "bias": float(np.mean(errors)),  # Bias (positive = under-forecasting)
        "r_squared": float(np.corrcoef(actual_clean, pred_clean)[0, 1] ** 2) if len(actual_clean) > 1 else 0
    }
    
    return metrics

def smooth_forecast_values(values: List[float], method: str = "simple", window: int = 3) -> List[float]:
    """Apply smoothing to forecast values to reduce noise"""
    
    if len(values) < window:
        return values
    
    values_arr = np.array(values)
    
    if method == "simple":
        # Simple moving average
        smoothed = np.convolve(values_arr, np.ones(window)/window, mode='same')
        
        # Handle edges
        smoothed[:window//2] = values_arr[:window//2]
        smoothed[-window//2:] = values_arr[-window//2:]
        
        return smoothed.tolist()
    
    elif method == "exponential":
        # Exponential smoothing
        alpha = 0.3
        smoothed = [values[0]]
        
        for i in range(1, len(values)):
            smoothed.append(alpha * values[i] + (1 - alpha) * smoothed[i-1])
        
        return smoothed
    
    else:
        return values

def validate_forecast_reasonableness(
    historical_values: List[float],
    forecast_values: List[float],
    max_change_ratio: float = 3.0
) -> Dict[str, Any]:
    """Validate that forecast values are reasonable given historical data"""
    
    if not historical_values or not forecast_values:
        return {"reasonable": True, "reason": "insufficient_data"}
    
    hist_mean = np.mean(historical_values)
    hist_std = np.std(historical_values)
    hist_max = np.max(historical_values)
    hist_min = np.min(historical_values)
    
    forecast_mean = np.mean(forecast_values)
    forecast_max = np.max(forecast_values)
    forecast_min = np.min(forecast_values)
    
    issues = []
    
    # Check for extreme values
    if forecast_max > hist_max * max_change_ratio:
        issues.append(f"Forecast maximum ({forecast_max:.2f}) is {forecast_max/hist_max:.1f}x historical maximum")
    
    if forecast_min < hist_min / max_change_ratio and hist_min > 0:
        issues.append(f"Forecast minimum ({forecast_min:.2f}) is unusually low compared to historical minimum")
    
    # Check for mean shift
    mean_ratio = abs(forecast_mean / hist_mean) if hist_mean != 0 else 1
    if mean_ratio > max_change_ratio or mean_ratio < 1/max_change_ratio:
        issues.append(f"Forecast mean ({forecast_mean:.2f}) differs significantly from historical mean ({hist_mean:.2f})")
    
    # Check for unrealistic patterns
    if all(v == forecast_values[0] for v in forecast_values):
        issues.append("Forecast shows no variation (all values identical)")
    
    return {
        "reasonable": len(issues) == 0,
        "issues": issues,
        "metrics": {
            "historical_mean": round(hist_mean, 2),
            "forecast_mean": round(forecast_mean, 2),
            "mean_ratio": round(mean_ratio, 2)
        }
    }
