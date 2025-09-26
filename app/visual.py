# app/visual.py
"""
Centralized data I/O, cleaning, visualization, and forecasting module.
This module handles all data transformations and chart generation for the Syla Analytics app.
"""

import os
import json
import hashlib
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Storage directories
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
CLEANED_DIR = DATA_DIR / "cleaned"
CHARTS_DIR = DATA_DIR / "charts"
MODELS_DIR = DATA_DIR / "models" 
FORECASTS_DIR = DATA_DIR / "forecasts"
LOGS_DIR = DATA_DIR / "logs"

# Ensure directories exist
for directory in [DATA_DIR, RAW_DIR, CLEANED_DIR, CHARTS_DIR, MODELS_DIR, FORECASTS_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

def get_schema_expectations() -> Dict[str, Any]:
    """Returns expected column types and required columns for EK Technologies data."""
    return {
        "required_columns": ["Company", "Country", "Date", "Revenue", "Expenses", "Profit", "Employees", "Campaign"],
        "column_types": {
            "Company": "string",
            "Country": "string", 
            "Date": "datetime",
            "Revenue": "numeric",
            "Expenses": "numeric",
            "Profit": "numeric",
            "Employees": "numeric",
            "Campaign": "string"
        },
        "validation_rules": {
            "Revenue": {"min": 0, "max": 10000000},
            "Expenses": {"min": 0, "max": 10000000},
            "Employees": {"min": 1, "max": 1000}
        }
    }

def load_raw_csv(path: str) -> pd.DataFrame:
    """
    Load CSV and enforce expected schema.
    
    Args:
        path: File path to CSV
        
    Returns:
        DataFrame with validated schema
        
    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If required columns are missing
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    try:
        df = pd.read_csv(path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV: {e}")
    
    schema = get_schema_expectations()
    missing_cols = set(schema["required_columns"]) - set(df.columns)
    
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    logger.info(f"Loaded CSV with {len(df)} rows and columns: {list(df.columns)}")
    return df

def preview_rows(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Return top n rows for preview."""
    return df.head(n)

def describe_missing_and_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze data quality issues in the DataFrame.
    
    Returns:
        Dictionary with missing value counts, duplicates, and examples
    """
    # Missing values analysis
    missing_analysis = {}
    for col in df.columns:
        missing_count = df[col].isnull().sum()
        missing_pct = (missing_count / len(df)) * 100
        missing_analysis[col] = {
            "count": int(missing_count),
            "percentage": round(missing_pct, 2)
        }
    
    # Duplicate analysis
    total_duplicates = df.duplicated().sum()
    duplicate_rows = df[df.duplicated()].head(5).to_dict('records')
    
    # Company-specific duplicates (as mentioned in spec - Zambia had 49 campaigns)
    company_campaign_counts = df.groupby(['Company', 'Campaign']).size().reset_index(name='count')
    high_count_campaigns = company_campaign_counts[company_campaign_counts['count'] > 5]
    
    return {
        "missing_values": missing_analysis,
        "total_missing_cells": int(df.isnull().sum().sum()),
        "duplicate_rows": {
            "count": int(total_duplicates),
            "examples": duplicate_rows
        },
        "campaign_duplicates": {
            "high_frequency_campaigns": high_count_campaigns.to_dict('records'),
            "total_campaigns": len(df['Campaign'].unique()) if 'Campaign' in df.columns else 0
        }
    }

def clean_pipeline(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Run cleaning pipeline with configurable steps.
    
    Args:
        df: Input DataFrame
        config: Cleaning configuration with keys:
            - deduplicate: bool
            - fill_method: str ("median_by_company", "ffill", "none")  
            - remove_negatives: bool
            - drop_threshold: float (max % missing per row/column)
            
    Returns:
        Tuple of (cleaned_df, metadata_list)
    """
    df_clean = df.copy()
    metadata = []
    
    initial_shape = df_clean.shape
    timestamp = datetime.now().isoformat()
    
    # Step 1: Schema enforcement and type conversion
    if config.get('enforce_schema', True):
        schema = get_schema_expectations()
        
        # Convert Date column
        if 'Date' in df_clean.columns:
            try:
                df_clean['Date'] = pd.to_datetime(df_clean['Date'])
            except:
                invalid_dates = df_clean[pd.to_datetime(df_clean['Date'], errors='coerce').isnull()]
                metadata.append({
                    "step": "date_conversion",
                    "timestamp": timestamp,
                    "before_count": len(df_clean),
                    "after_count": len(df_clean),
                    "invalid_samples": invalid_dates.head(3).to_dict('records'),
                    "action": "marked_invalid_dates"
                })
                df_clean['Date'] = pd.to_datetime(df_clean['Date'], errors='coerce')
        
        # Convert numeric columns
        numeric_cols = ['Revenue', 'Expenses', 'Profit', 'Employees']
        for col in numeric_cols:
            if col in df_clean.columns:
                original_dtype = df_clean[col].dtype
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                metadata.append({
                    "step": f"convert_{col.lower()}",
                    "timestamp": timestamp,
                    "original_dtype": str(original_dtype),
                    "new_dtype": str(df_clean[col].dtype),
                    "null_created": int(df_clean[col].isnull().sum())
                })
    
    # Step 2: Deduplication
    if config.get('deduplicate', False):
        before_dedup = len(df_clean)
        
        # Define duplicate criteria - full row or by key columns
        if config.get('dedup_subset'):
            df_clean = df_clean.drop_duplicates(subset=config['dedup_subset'], keep='first')
        else:
            df_clean = df_clean.drop_duplicates(keep='first')
            
        after_dedup = len(df_clean)
        removed_count = before_dedup - after_dedup
        
        metadata.append({
            "step": "deduplication", 
            "timestamp": timestamp,
            "before_count": before_dedup,
            "after_count": after_dedup,
            "removed_count": removed_count,
            "method": "keep_first"
        })
    
    # Step 3: Missing value handling
    fill_method = config.get('fill_method', 'none')
    if fill_method != 'none':
        before_fill_nulls = df_clean.isnull().sum().sum()
        
        if fill_method == 'median_by_company' and 'Company' in df_clean.columns:
            numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                df_clean[col] = df_clean.groupby('Company')[col].transform(
                    lambda x: x.fillna(x.median())
                )
        elif fill_method == 'ffill':
            df_clean = df_clean.fillna(method='ffill')
        
        after_fill_nulls = df_clean.isnull().sum().sum()
        
        metadata.append({
            "step": "missing_value_fill",
            "timestamp": timestamp,
            "method": fill_method,
            "before_null_count": int(before_fill_nulls),
            "after_null_count": int(after_fill_nulls),
            "filled_count": int(before_fill_nulls - after_fill_nulls)
        })
    
    # Step 4: Remove negative values
    if config.get('remove_negatives', False):
        numeric_cols = ['Revenue', 'Expenses', 'Profit']
        for col in numeric_cols:
            if col in df_clean.columns:
                before_neg = (df_clean[col] < 0).sum()
                df_clean.loc[df_clean[col] < 0, col] = np.nan
                metadata.append({
                    "step": f"remove_negatives_{col.lower()}",
                    "timestamp": timestamp,
                    "negative_values_found": int(before_neg),
                    "action": "set_to_nan"
                })
    
    # Step 5: Drop threshold - remove rows/columns with too many missing values  
    drop_threshold = config.get('drop_threshold', 0.5)  # 50% missing threshold
    if drop_threshold < 1.0:
        # Drop columns with > threshold missing
        before_cols = len(df_clean.columns)
        col_missing_pct = df_clean.isnull().mean()
        cols_to_drop = col_missing_pct[col_missing_pct > drop_threshold].index
        df_clean = df_clean.drop(columns=cols_to_drop)
        
        # Drop rows with > threshold missing
        before_rows = len(df_clean)
        row_missing_pct = df_clean.isnull().sum(axis=1) / len(df_clean.columns)
        df_clean = df_clean[row_missing_pct <= drop_threshold]
        after_rows = len(df_clean)
        
        metadata.append({
            "step": "drop_high_missing",
            "timestamp": timestamp,
            "threshold": drop_threshold,
            "columns_dropped": list(cols_to_drop),
            "rows_before": before_rows,
            "rows_after": after_rows,
            "cols_before": before_cols,
            "cols_after": len(df_clean.columns)
        })
    
    final_metadata = {
        "pipeline_summary": {
            "initial_shape": initial_shape,
            "final_shape": df_clean.shape,
            "rows_removed": initial_shape[0] - df_clean.shape[0],
            "cols_removed": initial_shape[1] - df_clean.shape[1],
            "steps_executed": len(metadata)
        }
    }
    metadata.append(final_metadata)
    
    logger.info(f"Cleaning pipeline complete: {initial_shape} -> {df_clean.shape}")
    return df_clean, metadata

def filter_dataframe(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """
    Apply filters to DataFrame in deterministic order.
    
    Args:
        filters: Dictionary with keys:
            - companies: List[str]
            - countries: List[str] 
            - campaigns: List[str]
            - date_range: Dict with 'start' and 'end'
            - min_revenue: float
            - max_revenue: float
    """
    df_filtered = df.copy()
    
    # Filter by companies
    if filters.get('companies'):
        if 'Company' in df_filtered.columns:
            df_filtered = df_filtered[df_filtered['Company'].isin(filters['companies'])]
    
    # Filter by countries  
    if filters.get('countries'):
        if 'Country' in df_filtered.columns:
            df_filtered = df_filtered[df_filtered['Country'].isin(filters['countries'])]
    
    # Filter by campaigns
    if filters.get('campaigns'):
        if 'Campaign' in df_filtered.columns:
            df_filtered = df_filtered[df_filtered['Campaign'].isin(filters['campaigns'])]
    
    # Filter by date range
    date_range = filters.get('date_range')
    if date_range and 'Date' in df_filtered.columns:
        if 'start' in date_range:
            start_date = pd.to_datetime(date_range['start'])
            df_filtered = df_filtered[df_filtered['Date'] >= start_date]
        if 'end' in date_range:
            end_date = pd.to_datetime(date_range['end'])
            df_filtered = df_filtered[df_filtered['Date'] <= end_date]
    
    # Filter by revenue range
    if 'Revenue' in df_filtered.columns:
        if filters.get('min_revenue') is not None:
            df_filtered = df_filtered[df_filtered['Revenue'] >= filters['min_revenue']]
        if filters.get('max_revenue') is not None:
            df_filtered = df_filtered[df_filtered['Revenue'] <= filters['max_revenue']]
    
    logger.info(f"Filtering: {len(df)} -> {len(df_filtered)} rows")
    return df_filtered

def aggregate(df: pd.DataFrame, by: str, metric: str, agg: str) -> pd.DataFrame:
    """
    Aggregate data by specified column and metric.
    
    Args:
        by: Grouping column ("Company", "Campaign", "Country", "Date")
        metric: Target metric ("Revenue", "Expenses", "Profit", "Employees")  
        agg: Aggregation function ("sum", "mean", "median")
    """
    if by not in df.columns or metric not in df.columns:
        raise ValueError(f"Column not found: by='{by}', metric='{metric}'")
    
    if agg == "sum":
        result = df.groupby(by)[metric].sum().reset_index()
    elif agg == "mean":
        result = df.groupby(by)[metric].mean().reset_index()
    elif agg == "median":
        result = df.groupby(by)[metric].median().reset_index()
    else:
        raise ValueError(f"Unsupported aggregation: {agg}")
    
    # Sort by metric descending by default
    result = result.sort_values(metric, ascending=False).reset_index(drop=True)
    
    logger.info(f"Aggregated by {by}: {len(result)} groups")
    return result

def top_n_with_others(df: pd.DataFrame, group_key: str, metric: str, n: int, sort: str = "desc") -> pd.DataFrame:
    """
    Return top N groups plus 'Others' row for remainder.
    
    Args:
        df: DataFrame with aggregated data
        group_key: Column name for grouping 
        metric: Metric column for ranking
        n: Number of top groups to keep
        sort: "desc" or "asc"
    """
    if n <= 0 or n >= len(df):
        return df.copy()
    
    # Sort data
    ascending = (sort == "asc")
    df_sorted = df.sort_values(metric, ascending=ascending).reset_index(drop=True)
    
    # Split into top N and others
    top_n_df = df_sorted.head(n).copy()
    others_df = df_sorted.tail(len(df_sorted) - n)
    
    if len(others_df) > 0:
        # Create "Others" row
        others_sum = others_df[metric].sum()
        others_row = pd.DataFrame([{
            group_key: "Others",
            metric: others_sum
        }])
        
        result = pd.concat([top_n_df, others_row], ignore_index=True)
    else:
        result = top_n_df
    
    logger.info(f"Top {n} with others: {len(result)} total groups")
    return result

def prepare_timeseries_for_forecast(
    df: pd.DataFrame, 
    company: Optional[str] = None, 
    campaign: Optional[str] = None, 
    freq: str = "M"
) -> pd.DataFrame:
    """
    Prepare timeseries data for forecasting models.
    
    Returns DataFrame with columns: ds (datetime), y (revenue), and optional regressors
    """
    df_ts = df.copy()
    
    # Filter by company/campaign if specified
    if company and 'Company' in df_ts.columns:
        df_ts = df_ts[df_ts['Company'] == company]
    if campaign and 'Campaign' in df_ts.columns:
        df_ts = df_ts[df_ts['Campaign'] == campaign]
    
    if len(df_ts) == 0:
        raise ValueError("No data remaining after filtering")
    
    # Create Prophet-compatible format
    result_df = pd.DataFrame()
    result_df['ds'] = pd.to_datetime(df_ts['Date']) if 'Date' in df_ts.columns else pd.date_range(
        start=datetime.now() - timedelta(days=30*len(df_ts)), 
        periods=len(df_ts), 
        freq=freq
    )
    result_df['y'] = df_ts['Revenue'] if 'Revenue' in df_ts.columns else 0
    
    # Add regressors if available
    if 'Employees' in df_ts.columns:
        result_df['employees'] = df_ts['Employees'].values
    
    # Create campaign dummies
    if 'Campaign' in df_ts.columns:
        campaigns = df_ts['Campaign'].unique()
        for camp in campaigns:
            result_df[f'campaign_{camp.lower()}'] = (df_ts['Campaign'] == camp).astype(int).values
    
    # Sort by date and remove duplicates
    result_df = result_df.sort_values('ds').drop_duplicates(subset=['ds']).reset_index(drop=True)
    
    # Fill missing periods if needed
    if freq == "M":
        full_range = pd.date_range(start=result_df['ds'].min(), end=result_df['ds'].max(), freq='MS')
        result_df = result_df.set_index('ds').reindex(full_range).fillna(method='ffill').reset_index()
        result_df = result_df.rename(columns={'index': 'ds'})
    
    logger.info(f"Prepared timeseries: {len(result_df)} periods")
    return result_df

def generate_chart_payload(df: pd.DataFrame, chart_type: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate JSON payload for frontend chart rendering.
    
    Args:
        df: Aggregated DataFrame
        chart_type: "bar", "stacked_bar", "line", "area"
        options: Chart configuration options
        
    Returns:
        Chart payload dictionary with data, labels, colors, metadata
    """
    if len(df) == 0:
        return {"error": "No data to chart"}
    
    # Extract basic data
    labels = df.iloc[:, 0].astype(str).tolist()  # First column as labels
    data_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if not data_cols:
        return {"error": "No numeric data found"}
    
    # Generate color palette
    color_mapping = options.get('colors', {})
    default_colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777']
    
    series = []
    for i, col in enumerate(data_cols):
        series_data = df[col].fillna(0).tolist()
        
        # Assign colors
        if col in color_mapping:
            color = color_mapping[col]
        elif f'series_{i}' in color_mapping:
            color = color_mapping[f'series_{i}']
        else:
            color = default_colors[i % len(default_colors)]
        
        series.append({
            "name": col,
            "data": series_data,
            "color": color,
            "type": chart_type
        })
    
    # Chart-specific configurations
    chart_config = {
        "chart": {"type": chart_type},
        "title": options.get('title', 'Data Visualization'),
        "xAxis": {"categories": labels},
        "yAxis": {"title": {"text": "Value"}},
        "series": series
    }
    
    # Add stacking for stacked charts
    if chart_type == "stacked_bar":
        chart_config["plotOptions"] = {"series": {"stacking": "normal"}}
    
    payload = {
        "chart_data": chart_config,
        "raw_data": df.to_dict('records'),
        "metadata": {
            "chart_type": chart_type,
            "total_points": len(df),
            "series_count": len(series),
            "generated_at": datetime.now().isoformat()
        }
    }
    
    logger.info(f"Generated {chart_type} chart payload with {len(series)} series")
    return payload

def export_chart_image(
    chart_payload: Dict[str, Any], 
    format: str = "png", 
    background: str = "#ffffff", 
    dpi: int = 300, 
    filename: Optional[str] = None
) -> str:
    """
    Export chart as image file (server-side rendering placeholder).
    
    Args:
        chart_payload: Chart configuration
        format: "png", "svg", "pdf"
        background: Background color (default white)
        dpi: Resolution for raster formats
        filename: Output filename
        
    Returns:
        Path to saved file
    """
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chart_{timestamp}.{format}"
    
    output_path = CHARTS_DIR / filename
    
    # Placeholder for actual chart rendering
    # In practice, this would use libraries like:
    # - matplotlib/seaborn for Python-based rendering
    # - playwright/selenium for browser-based rendering  
    # - or convert frontend canvas/SVG to image
    
    # For now, save metadata
    metadata = {
        "chart_payload": chart_payload,
        "export_config": {
            "format": format,
            "background": background,
            "dpi": dpi,
            "filename": filename
        },
        "exported_at": datetime.now().isoformat()
    }
    
    with open(output_path.with_suffix('.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Chart export metadata saved: {output_path}")
    return str(output_path)

def save_chart_metadata(chart_payload: Dict[str, Any], storage_path: str) -> str:
    """
    Save chart configuration and metadata.
    
    Returns:
        chart_id for referencing the saved chart
    """
    chart_id = hashlib.md5(json.dumps(chart_payload, sort_keys=True).encode()).hexdigest()[:12]
    
    metadata = {
        "chart_id": chart_id,
        "chart_payload": chart_payload,
        "saved_at": datetime.now().isoformat(),
        "storage_path": storage_path
    }
    
    metadata_path = CHARTS_DIR / f"{chart_id}.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Chart metadata saved: {chart_id}")
    return chart_id

def prepare_forecast_input(df: pd.DataFrame, forecast_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert filtered timeseries into model-ready dataset.
    
    Returns:
        Dictionary with training data, test split, and features info
    """
    # Prepare Prophet-style data
    ts_data = prepare_timeseries_for_forecast(
        df, 
        forecast_config.get('company'),
        forecast_config.get('campaign')
    )
    
    if len(ts_data) < 2:
        raise ValueError("Insufficient data points for forecasting (minimum 2 required)")
    
    # Split into train/test if requested
    test_size = forecast_config.get('test_split', 0.2)
    if test_size > 0:
        split_idx = int(len(ts_data) * (1 - test_size))
        train_data = ts_data.iloc[:split_idx].copy()
        test_data = ts_data.iloc[split_idx:].copy()
    else:
        train_data = ts_data.copy()
        test_data = pd.DataFrame()
    
    # Identify available regressors
    regressor_cols = [col for col in ts_data.columns if col not in ['ds', 'y']]
    
    result = {
        "train_data": train_data,
        "test_data": test_data, 
        "regressors": regressor_cols,
        "data_info": {
            "total_periods": len(ts_data),
            "train_periods": len(train_data),
            "test_periods": len(test_data),
            "date_range": {
                "start": ts_data['ds'].min().isoformat(),
                "end": ts_data['ds'].max().isoformat()
            }
        }
    }
    
    logger.info(f"Prepared forecast input: {len(train_data)} train, {len(test_data)} test periods")
    return result

def run_forecast(model_type: str, train_df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Run forecasting model and return predictions with metadata.
    
    Args:
        model_type: "prophet" or "hybrid"
        train_df: Training data with 'ds' and 'y' columns
        config: Model configuration
        
    Returns:
        Tuple of (forecast_df, metadata)
    """
    periods = config.get('periods', 12)
    confidence_level = config.get('confidence_level', 0.95)
    
    if model_type == "prophet":
        try:
            from prophet import Prophet
            
            # Configure Prophet model
            model = Prophet(
                interval_width=confidence_level,
                yearly_seasonality=len(train_df) >= 24,  # Only if 2+ years of data
                weekly_seasonality=False,
                daily_seasonality=False
            )
            
            # Add regressors if specified
            regressors = config.get('regressors', [])
            for regressor in regressors:
                if regressor in train_df.columns:
                    model.add_regressor(regressor)
            
            # Fit model
            model.fit(train_df)
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=periods, freq='M')
            
            # Add regressor values to future (forward-fill last known values)
            for regressor in regressors:
                if regressor in train_df.columns:
                    last_val = train_df[regressor].iloc[-1]
                    future[regressor] = future[regressor].fillna(last_val)
            
            # Generate forecast
            forecast = model.predict(future)
            
            # Extract forecast portion
            forecast_df = forecast.tail(periods)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
            forecast_df.columns = ['ds', 'y', 'y_lower', 'y_upper']
            
            # Calculate performance metrics on training data
            train_mae = np.mean(np.abs(train_df['y'] - model.predict(train_df[['ds']])['yhat']))
            
            metadata = {
                "model_type": "prophet",
                "periods_forecasted": periods,
                "confidence_level": confidence_level,
                "regressors_used": regressors,
                "training_periods": len(train_df),
                "mae_on_training": round(train_mae, 2),
                "seasonality_components": {
                    "yearly": model.yearly_seasonality,
                    "weekly": model.weekly_seasonality,
                    "daily": model.daily_seasonality
                }
            }
            
        except ImportError:
            logger.warning("Prophet not available, using simple forecast")
            return _simple_forecast_fallback(train_df, periods, confidence_level)
        except Exception as e:
            logger.error(f"Prophet forecast failed: {e}")
            return _simple_forecast_fallback(train_df, periods, confidence_level)
    
    else:  # hybrid or fallback
        return _simple_forecast_fallback(train_df, periods, confidence_level)
    
    logger.info(f"Generated {model_type} forecast: {len(forecast_df)} periods")
    return forecast_df, metadata

def _simple_forecast_fallback(train_df: pd.DataFrame, periods: int, confidence_level: float) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Simple linear trend forecast as fallback."""
    values = train_df['y'].values
    
    if len(values) < 2:
        # Constant forecast if insufficient data
        last_value = values[-1] if len(values) > 0 else 0
        forecast_values = [last_value] * periods
    else:
        # Linear trend extrapolation
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)
        future_x = np.arange(len(values), len(values) + periods)
        forecast_values = np.polyval(coeffs, future_x)
    
    # Simple confidence intervals (±20% of mean)
    mean_val = np.mean(values)
    margin = mean_val * 0.2
    
    # Generate future dates
    last_date = train_df['ds'].max()
    future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=periods, freq='MS')
    
    forecast_df = pd.DataFrame({
        'ds': future_dates,
        'y': forecast_values,
        'y_lower': [max(0, v - margin) for v in forecast_values],
        'y_upper': [v + margin for v in forecast_values]
    })
    
    metadata = {
        "model_type": "simple_trend",
        "periods_forecasted": periods,
        "confidence_level": 0.8,
        "training_periods": len(train_df),
        "method": "linear_extrapolation"
    }

    return forecast_df, metadata

def persist_forecast_results(forecast_df: pd.DataFrame, metadata: Dict[str, Any]) -> str:
    """Save forecast data and metadata as JSON."""
    forecast_id = hashlib.md5(json.dumps(metadata, sort_keys=True).encode()).hexdigest()[:12]
    output_path = FORECASTS_DIR / f"forecast_{forecast_id}.json"
    payload = {"metadata": metadata, "forecast": forecast_df.to_dict("records")}
    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    logger.info(f"Forecast results saved: {forecast_id}")
    return str(output_path)


def log_action(user: str, action: str, details: Dict[str, Any]) -> None:
    """Audit logging for user actions."""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "user": user,
        "action": action,
        "details": details
    }
    log_file = LOGS_DIR / "audit_log.jsonl"
    with open(log_file, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    logger.info(f"Action logged: {action} by {user}")


def get_available_datasets() -> List[str]:
    """List available CSV datasets."""
    datasets = [f.name for f in DATA_DIR.glob("*.csv")]
    logger.info(f"Found {len(datasets)} datasets")
    return datasets


def validate_chart_configuration(options: Dict[str, Any]) -> Dict[str, Any]:
    """Validate chart configuration options."""
    required_keys = ["title", "xAxis", "yAxis"]
    errors = []
    for key in required_keys:
        if key not in options:
            errors.append(f"Missing required option: {key}")
    if "colors" in options and not isinstance(options["colors"], dict):
        errors.append("Colors must be a dictionary")
    return {"valid": len(errors) == 0, "errors": errors}


def calculate_data_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
    """Comprehensive data quality assessment."""
    total_cells = df.size
    missing_cells = df.isnull().sum().sum()
    duplicate_rows = df.duplicated().sum()
    missing_score = 1 - (missing_cells / total_cells if total_cells > 0 else 0)
    duplicate_score = 1 - (duplicate_rows / len(df) if len(df) > 0 else 0)
    final_score = round(((missing_score + duplicate_score) / 2) * 100, 2)
    return {
        "total_cells": int(total_cells),
        "missing_cells": int(missing_cells),
        "duplicate_rows": int(duplicate_rows),
        "quality_score": final_score
    }


def suggest_chart_type(df: pd.DataFrame, options: Dict[str, Any] = None) -> str:
    """Suggest chart type based on data characteristics."""
    numeric_cols = df.select_dtypes(include=[np.number]).shape[1]
    if "Date" in df.columns and numeric_cols == 1:
        return "line"
    if numeric_cols > 1:
        return "stacked_bar"
    if df.shape[0] <= 10:
        return "bar"
    return "area"
