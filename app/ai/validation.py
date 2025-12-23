# app/ai/validation.py
"""
Forecast validation and accuracy metrics calculation
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def calculate_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Calculate Mean Absolute Percentage Error
    MAPE = (1/n) * Σ|actual - predicted| / |actual| * 100
    """
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    # Remove zeros to avoid division by zero
    mask = actual != 0
    if not mask.any():
        return float('inf')
    
    mape = np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100
    return float(mape)


def calculate_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Calculate Root Mean Squared Error
    RMSE = sqrt((1/n) * Σ(actual - predicted)²)
    """
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    mse = np.mean((actual - predicted) ** 2)
    rmse = np.sqrt(mse)
    return float(rmse)


def calculate_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Calculate Mean Absolute Error
    MAE = (1/n) * Σ|actual - predicted|
    """
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    mae = np.mean(np.abs(actual - predicted))
    return float(mae)


def calculate_r_squared(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Calculate R² (coefficient of determination)
    R² = 1 - (SS_res / SS_tot)
    """
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    
    if ss_tot == 0:
        return 0.0
    
    r2 = 1 - (ss_res / ss_tot)
    return float(r2)


def calculate_all_metrics(actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
    """Calculate all accuracy metrics"""
    return {
        "mape": calculate_mape(actual, predicted),
        "rmse": calculate_rmse(actual, predicted),
        "mae": calculate_mae(actual, predicted),
        "r_squared": calculate_r_squared(actual, predicted)
    }


def train_test_split_timeseries(
    df: pd.DataFrame, 
    test_size: float = 0.2
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split time series data maintaining temporal order
    """
    if test_size <= 0 or test_size >= 1:
        raise ValueError("test_size must be between 0 and 1")
    
    split_idx = int(len(df) * (1 - test_size))
    
    if split_idx < 2:
        raise ValueError("Insufficient data for train/test split")
    
    train = df.iloc[:split_idx].copy()
    test = df.iloc[split_idx:].copy()
    
    return train, test


def cross_validate_forecast(
    model_fn,
    df: pd.DataFrame,
    n_splits: int = 5,
    horizon: int = 1
) -> Dict[str, Any]:
    """
    Time series cross-validation with expanding window
    """
    if len(df) < n_splits + horizon:
        raise ValueError(f"Insufficient data: need at least {n_splits + horizon} points")
    
    all_metrics = []
    predictions = []
    actuals = []
    
    min_train_size = len(df) // (n_splits + 1)
    
    for i in range(n_splits):
        train_end = min_train_size * (i + 1)
        test_end = min(train_end + horizon, len(df))
        
        if test_end <= train_end:
            break
        
        train_data = df.iloc[:train_end].copy()
        test_data = df.iloc[train_end:test_end].copy()
        
        try:
            forecast = model_fn(train_data, len(test_data))
            
            actual_vals = test_data['y'].values
            pred_vals = forecast[:len(actual_vals)]
            
            metrics = calculate_all_metrics(actual_vals, pred_vals)
            all_metrics.append(metrics)
            
            predictions.extend(pred_vals)
            actuals.extend(actual_vals)
            
        except Exception as e:
            logger.warning(f"Cross-validation fold {i} failed: {e}")
            continue
    
    if not all_metrics:
        return {
            "mean_mape": None,
            "mean_rmse": None,
            "mean_mae": None,
            "mean_r_squared": None,
            "n_folds": 0,
            "predictions": [],
            "actuals": []
        }
    
    return {
        "mean_mape": np.mean([m["mape"] for m in all_metrics]),
        "mean_rmse": np.mean([m["rmse"] for m in all_metrics]),
        "mean_mae": np.mean([m["mae"] for m in all_metrics]),
        "mean_r_squared": np.mean([m["r_squared"] for m in all_metrics]),
        "n_folds": len(all_metrics),
        "predictions": predictions,
        "actuals": actuals,
        "fold_metrics": all_metrics
    }


def calculate_confidence_score(
    df: pd.DataFrame,
    validation_metrics: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Calculate overall confidence score based on data quality and validation
    """
    factors = {}
    
    # Data quantity factor (more data = higher confidence)
    data_count = len(df)
    if data_count >= 24:
        data_factor = 1.0
    elif data_count >= 12:
        data_factor = 0.8
    elif data_count >= 6:
        data_factor = 0.6
    else:
        data_factor = 0.4
    factors["data_quantity"] = data_factor
    
    # Data quality factor (low variance = higher confidence)
    values = df['y'].values
    cv = np.std(values) / np.mean(values) if np.mean(values) != 0 else float('inf')
    
    if cv < 0.2:
        quality_factor = 1.0
    elif cv < 0.5:
        quality_factor = 0.8
    elif cv < 1.0:
        quality_factor = 0.6
    else:
        quality_factor = 0.4
    factors["data_quality"] = quality_factor
    
    # Validation factor (if metrics available)
    if validation_metrics and "mape" in validation_metrics:
        mape = validation_metrics["mape"]
        if mape < 10:
            validation_factor = 1.0
        elif mape < 20:
            validation_factor = 0.8
        elif mape < 30:
            validation_factor = 0.6
        else:
            validation_factor = 0.4
        factors["validation_accuracy"] = validation_factor
    else:
        validation_factor = 0.7  # Default when no validation
        factors["validation_accuracy"] = validation_factor
    
    # Overall confidence (weighted average)
    weights = {
        "data_quantity": 0.3,
        "data_quality": 0.3,
        "validation_accuracy": 0.4
    }
    
    overall = sum(factors[k] * weights[k] for k in factors.keys())
    overall_pct = overall * 100
    
    # Determine rating
    if overall_pct >= 80:
        rating = "High"
    elif overall_pct >= 60:
        rating = "Medium"
    elif overall_pct >= 40:
        rating = "Low"
    else:
        rating = "Very Low"
    
    return {
        "overall_score": round(overall_pct, 1),
        "rating": rating,
        "factors": factors,
        "recommendations": _generate_confidence_recommendations(factors, data_count, cv)
    }


def _generate_confidence_recommendations(
    factors: Dict[str, float],
    data_count: int,
    cv: float
) -> List[str]:
    """Generate recommendations based on confidence factors"""
    recommendations = []
    
    if factors["data_quantity"] < 0.8:
        recommendations.append(
            f"Collect more data (currently {data_count} points, recommend 12+ for monthly forecasts)"
        )
    
    if factors["data_quality"] < 0.8:
        recommendations.append(
            f"High volatility detected (CV={cv:.2f}). Consider removing outliers or using robust forecasting methods"
        )
    
    if factors.get("validation_accuracy", 1.0) < 0.8:
        recommendations.append(
            "Low validation accuracy. Review data for anomalies or consider alternative models"
        )
    
    if not recommendations:
        recommendations.append("Data quality is good. Forecast should be reliable.")
    
    return recommendations


def detect_data_type(df: pd.DataFrame) -> Tuple[str, Optional[str]]:
    """
    Detect if data is time series or cross-sectional
    Returns: (data_type, date_column_name)
    """
    date_indicators = ['date', 'time', 'timestamp', 'ds', 'period', 'month', 'year']
    
    for col in df.columns:
        col_lower = col.lower()
        
        # Check if column name suggests date
        if any(indicator in col_lower for indicator in date_indicators):
            try:
                pd.to_datetime(df[col], errors='coerce')
                non_null_ratio = df[col].notna().sum() / len(df)
                
                if non_null_ratio > 0.7:
                    return "time_series", col
            except:
                continue
    
    # Check if data has sequential pattern (even without dates)
    if len(df) >= 3:
        # If values show temporal pattern, assume time series
        return "time_series", None
    
    return "cross_sectional", None


def validate_forecast_requirements(
    df: pd.DataFrame,
    target_column: str,
    min_points: int = 3
) -> Dict[str, Any]:
    """
    Validate that data meets minimum requirements for forecasting
    """
    issues = []
    warnings = []
    
    # Check data size
    if len(df) < min_points:
        issues.append(f"Insufficient data: {len(df)} points (need at least {min_points})")
    elif len(df) < 6:
        warnings.append(f"Limited data ({len(df)} points). Forecast accuracy may be reduced.")
    
    # Check target column
    if target_column not in df.columns:
        issues.append(f"Target column '{target_column}' not found")
    else:
        # Check for nulls
        null_count = df[target_column].isnull().sum()
        if null_count > 0:
            null_pct = (null_count / len(df)) * 100
            if null_pct > 20:
                issues.append(f"Too many missing values in target: {null_pct:.1f}%")
            else:
                warnings.append(f"Missing values in target: {null_count} ({null_pct:.1f}%)")
        
        # Check for variance
        target_values = df[target_column].dropna()
        if len(target_values) > 0:
            if target_values.std() == 0:
                issues.append("Target column has zero variance (all values identical)")
    
    is_valid = len(issues) == 0
    
    return {
        "valid": is_valid,
        "issues": issues,
        "warnings": warnings,
        "data_points": len(df),
        "target_column": target_column
    }
