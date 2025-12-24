# app/ai/data_quality.py
"""
Data quality checks and outlier detection for forecasting
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def detect_outliers_iqr(series: pd.Series, multiplier: float = 1.5) -> Dict[str, Any]:
    """
    Detect outliers using Interquartile Range (IQR) method
    """
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    outliers_mask = (series < lower_bound) | (series > upper_bound)
    outliers = series[outliers_mask]
    
    return {
        "outlier_count": len(outliers),
        "outlier_percentage": (len(outliers) / len(series)) * 100,
        "outlier_indices": outliers.index.tolist(),
        "outlier_values": outliers.tolist(),
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound),
        "method": "IQR"
    }


def detect_outliers_zscore(series: pd.Series, threshold: float = 3.0) -> Dict[str, Any]:
    """
    Detect outliers using Z-score method
    """
    mean = series.mean()
    std = series.std()
    
    if std == 0:
        return {
            "outlier_count": 0,
            "outlier_percentage": 0.0,
            "outlier_indices": [],
            "outlier_values": [],
            "method": "Z-score",
            "note": "Zero standard deviation"
        }
    
    z_scores = np.abs((series - mean) / std)
    outliers_mask = z_scores > threshold
    outliers = series[outliers_mask]
    
    return {
        "outlier_count": len(outliers),
        "outlier_percentage": (len(outliers) / len(series)) * 100,
        "outlier_indices": outliers.index.tolist(),
        "outlier_values": outliers.tolist(),
        "z_scores": z_scores[outliers_mask].tolist(),
        "method": "Z-score",
        "threshold": threshold
    }


def check_missing_values(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Comprehensive missing value analysis
    """
    missing_summary = {}
    
    for col in df.columns:
        missing_count = df[col].isnull().sum()
        missing_pct = (missing_count / len(df)) * 100
        
        missing_summary[col] = {
            "count": int(missing_count),
            "percentage": round(missing_pct, 2),
            "positions": df[df[col].isnull()].index.tolist()
        }
    
    total_cells = len(df) * len(df.columns)
    total_missing = sum(v["count"] for v in missing_summary.values())
    
    return {
        "by_column": missing_summary,
        "total_missing_cells": total_missing,
        "total_missing_percentage": round((total_missing / total_cells) * 100, 2),
        "columns_with_missing": [k for k, v in missing_summary.items() if v["count"] > 0]
    }


def check_data_consistency(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """
    Check for data consistency issues
    """
    issues = []
    warnings = []
    
    # Check for duplicates
    duplicates = df.duplicated().sum()
    if duplicates > 0:
        warnings.append(f"Found {duplicates} duplicate rows")
    
    # Check target column data type
    if target_column in df.columns:
        target = df[target_column]
        
        # Check if numeric
        if not pd.api.types.is_numeric_dtype(target):
            try:
                pd.to_numeric(target, errors='raise')
            except:
                issues.append(f"Target column '{target_column}' contains non-numeric values")
        
        # Check for negative values (warning for some domains)
        negative_count = (target < 0).sum()
        if negative_count > 0:
            warnings.append(f"Target column contains {negative_count} negative values")
        
        # Check for zero variance
        if target.std() == 0:
            issues.append("Target column has zero variance (all identical values)")
    
    return {
        "issues": issues,
        "warnings": warnings,
        "duplicate_rows": int(duplicates),
        "has_issues": len(issues) > 0
    }


def calculate_data_statistics(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """
    Calculate comprehensive statistics for the dataset
    """
    if target_column not in df.columns:
        return {"error": f"Column '{target_column}' not found"}
    
    series = pd.to_numeric(df[target_column], errors='coerce').dropna()
    
    if len(series) == 0:
        return {"error": "No valid numeric data in target column"}
    
    return {
        "count": len(series),
        "mean": float(series.mean()),
        "median": float(series.median()),
        "std": float(series.std()),
        "min": float(series.min()),
        "max": float(series.max()),
        "range": float(series.max() - series.min()),
        "cv": float(series.std() / series.mean()) if series.mean() != 0 else float('inf'),
        "skewness": float(series.skew()),
        "kurtosis": float(series.kurtosis()),
        "q25": float(series.quantile(0.25)),
        "q75": float(series.quantile(0.75)),
        "iqr": float(series.quantile(0.75) - series.quantile(0.25))
    }


def detect_seasonality(series: pd.Series, min_periods: int = 12) -> Dict[str, Any]:
    """
    Simple seasonality detection using autocorrelation
    """
    if len(series) < min_periods:
        return {
            "has_seasonality": False,
            "reason": f"Insufficient data (need {min_periods}+ periods)",
            "data_points": len(series)
        }
    
    # Calculate autocorrelation for different lags
    lags_to_test = [3, 4, 6, 12]  # quarterly, tertiary, semi-annual, annual
    autocorrelations = {}
    
    for lag in lags_to_test:
        if len(series) > lag:
            corr = series.autocorr(lag=lag)
            if not np.isnan(corr):
                autocorrelations[lag] = float(corr)
    
    # Strong correlation (>0.5) suggests seasonality
    strong_correlations = {k: v for k, v in autocorrelations.items() if abs(v) > 0.5}
    
    has_seasonality = len(strong_correlations) > 0
    
    if has_seasonality:
        strongest_lag = max(strong_correlations, key=lambda k: abs(strong_correlations[k]))
        period_names = {3: "Quarterly", 4: "Tertiary", 6: "Semi-annual", 12: "Annual"}
        
        return {
            "has_seasonality": True,
            "period": strongest_lag,
            "period_name": period_names.get(strongest_lag, f"{strongest_lag}-period"),
            "correlation": strong_correlations[strongest_lag],
            "all_correlations": autocorrelations
        }
    
    return {
        "has_seasonality": False,
        "reason": "No strong periodic patterns detected",
        "all_correlations": autocorrelations
    }


def detect_trend(series: pd.Series) -> Dict[str, Any]:
    """
    Detect trend using linear regression
    """
    if len(series) < 3:
        return {
            "has_trend": False,
            "reason": "Insufficient data for trend detection"
        }
    
    x = np.arange(len(series))
    y = series.values
    
    # Remove NaN values
    mask = ~np.isnan(y)
    x = x[mask]
    y = y[mask]
    
    if len(x) < 3:
        return {
            "has_trend": False,
            "reason": "Too many missing values"
        }
    
    # Linear regression
    coeffs = np.polyfit(x, y, 1)
    slope = coeffs[0]
    
    # Calculate R-squared
    y_pred = np.polyval(coeffs, x)
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    # Determine trend strength
    has_trend = abs(r_squared) > 0.5
    
    if slope > 0:
        direction = "increasing"
    elif slope < 0:
        direction = "decreasing"
    else:
        direction = "flat"
    
    return {
        "has_trend": has_trend,
        "direction": direction,
        "slope": float(slope),
        "r_squared": float(r_squared),
        "trend_strength": "strong" if abs(r_squared) > 0.7 else "moderate" if abs(r_squared) > 0.5 else "weak"
    }


def comprehensive_data_quality_report(
    df: pd.DataFrame,
    target_column: str
) -> Dict[str, Any]:
    """
    Generate comprehensive data quality report
    """
    report = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "data_shape": {"rows": len(df), "columns": len(df.columns)},
        "target_column": target_column
    }
    
    # Missing values
    report["missing_values"] = check_missing_values(df)
    
    # Consistency checks
    report["consistency"] = check_data_consistency(df, target_column)
    
    # Statistics
    report["statistics"] = calculate_data_statistics(df, target_column)
    
    # Outliers (both methods)
    if target_column in df.columns:
        series = pd.to_numeric(df[target_column], errors='coerce').dropna()
        if len(series) > 0:
            report["outliers"] = {
                "iqr_method": detect_outliers_iqr(series),
                "zscore_method": detect_outliers_zscore(series)
            }
            
            # Trend and seasonality
            report["trend"] = detect_trend(series)
            report["seasonality"] = detect_seasonality(series)
    
    # Overall quality score
    quality_score = _calculate_quality_score(report)
    report["overall_quality"] = quality_score
    
    return report


def _calculate_quality_score(report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate overall data quality score
    """
    score_factors = []
    
    # Missing values factor
    missing_pct = report.get("missing_values", {}).get("total_missing_percentage", 0)
    if missing_pct < 5:
        score_factors.append(1.0)
    elif missing_pct < 10:
        score_factors.append(0.8)
    elif missing_pct < 20:
        score_factors.append(0.6)
    else:
        score_factors.append(0.4)
    
    # Consistency factor
    consistency = report.get("consistency", {})
    if consistency.get("has_issues", False):
        score_factors.append(0.5)
    elif consistency.get("warnings", []):
        score_factors.append(0.8)
    else:
        score_factors.append(1.0)
    
    # Outliers factor
    outliers = report.get("outliers", {}).get("iqr_method", {})
    outlier_pct = outliers.get("outlier_percentage", 0)
    if outlier_pct < 5:
        score_factors.append(1.0)
    elif outlier_pct < 10:
        score_factors.append(0.8)
    elif outlier_pct < 20:
        score_factors.append(0.6)
    else:
        score_factors.append(0.4)
    
    # Calculate overall score
    overall = (sum(score_factors) / len(score_factors)) * 100
    
    if overall >= 80:
        rating = "Excellent"
    elif overall >= 60:
        rating = "Good"
    elif overall >= 40:
        rating = "Fair"
    else:
        rating = "Poor"
    
    return {
        "score": round(overall, 1),
        "rating": rating,
        "factors": {
            "missing_values": score_factors[0],
            "consistency": score_factors[1] if len(score_factors) > 1 else 1.0,
            "outliers": score_factors[2] if len(score_factors) > 2 else 1.0
        }
    }


def clean_data_for_forecasting(
    df: pd.DataFrame,
    target_column: str,
    remove_outliers: bool = False,
    fill_missing: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Clean data based on quality report recommendations
    """
    df_clean = df.copy()
    cleaning_log = {
        "original_rows": len(df),
        "actions": []
    }
    
    # Handle missing values
    if fill_missing and target_column in df_clean.columns:
        missing_count = df_clean[target_column].isnull().sum()
        if missing_count > 0:
            # Forward fill, then backward fill, then fill with mean
            df_clean[target_column] = df_clean[target_column].fillna(method='ffill')
            df_clean[target_column] = df_clean[target_column].fillna(method='bfill')
            df_clean[target_column] = df_clean[target_column].fillna(df_clean[target_column].mean())
            
            cleaning_log["actions"].append({
                "action": "filled_missing_values",
                "column": target_column,
                "count": int(missing_count)
            })
    
    # Remove outliers if requested
    if remove_outliers and target_column in df_clean.columns:
        series = pd.to_numeric(df_clean[target_column], errors='coerce')
        outlier_info = detect_outliers_iqr(series)
        
        if outlier_info["outlier_count"] > 0:
            outlier_indices = outlier_info["outlier_indices"]
            df_clean = df_clean.drop(outlier_indices)
            
            cleaning_log["actions"].append({
                "action": "removed_outliers",
                "column": target_column,
                "count": outlier_info["outlier_count"]
            })
    
    # Remove duplicates
    duplicates = df_clean.duplicated().sum()
    if duplicates > 0:
        df_clean = df_clean.drop_duplicates()
        cleaning_log["actions"].append({
            "action": "removed_duplicates",
            "count": int(duplicates)
        })
    
    cleaning_log["final_rows"] = len(df_clean)
    cleaning_log["rows_removed"] = cleaning_log["original_rows"] - cleaning_log["final_rows"]
    
    return df_clean, cleaning_log
