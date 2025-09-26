# app/visual.py
"""
Centralized data I/O, cleaning, visualization, and forecasting module.
"""
import os, json, hashlib, logging, pandas as pd, numpy as np
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
        "column_types": {"Company": "string", "Country": "string", "Date": "datetime", "Revenue": "numeric", "Expenses": "numeric", "Profit": "numeric", "Employees": "numeric", "Campaign": "string"},
        "validation_rules": {"Revenue": {"min": 0, "max": 10000000}, "Expenses": {"min": 0, "max": 10000000}, "Employees": {"min": 1, "max": 1000}}
    }

def load_raw_csv(path: str) -> pd.DataFrame:
    """Load CSV and enforce expected schema."""
    if not os.path.exists(path): raise FileNotFoundError(f"File not found: {path}")
    try: df = pd.read_csv(path)
    except Exception as e: raise ValueError(f"Failed to read CSV: {e}")
    schema = get_schema_expectations()
    missing_cols = set(schema["required_columns"]) - set(df.columns)
    if missing_cols: raise ValueError(f"Missing required columns: {missing_cols}")
    logger.info(f"Loaded CSV with {len(df)} rows and columns: {list(df.columns)}")
    return df

def preview_rows(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Return top n rows for preview."""
    return df.head(n)

def describe_missing_and_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze data quality issues in the DataFrame."""
    # Missing values analysis
    missing_analysis = {}
    for col in df.columns:
        missing_count = df[col].isnull().sum()
        missing_pct = (missing_count / len(df)) * 100
        missing_analysis[col] = {"count": int(missing_count), "percentage": round(missing_pct, 2)}
    
    # Duplicate analysis
    total_duplicates = df.duplicated().sum()
    duplicate_rows = df[df.duplicated()].head(5).to_dict('records')
    
    # Company-specific duplicates
    company_campaign_counts = df.groupby(['Company', 'Campaign']).size().reset_index(name='count')
    high_count_campaigns = company_campaign_counts[company_campaign_counts['count'] > 5]
    
    return {
        "missing_values": missing_analysis,
        "total_missing_cells": int(df.isnull().sum().sum()),
        "duplicate_rows": {"count": int(total_duplicates), "examples": duplicate_rows},
        "campaign_duplicates": {"high_frequency_campaigns": high_count_campaigns.to_dict('records'), "total_campaigns": len(df['Campaign'].unique()) if 'Campaign' in df.columns else 0}
    }

def clean_pipeline(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """Run cleaning pipeline with configurable steps."""
    df_clean = df.copy()
    metadata = []
    initial_shape = df_clean.shape
    timestamp = datetime.now().isoformat()
    
    # Step 1: Schema enforcement and type conversion
    if config.get('enforce_schema', True):
        schema = get_schema_expectations()
        
        # Convert Date column
        if 'Date' in df_clean.columns:
            try: df_clean['Date'] = pd.to_datetime(df_clean['Date'])
            except:
                invalid_dates = df_clean[pd.to_datetime(df_clean['Date'], errors='coerce').isnull()]
                metadata.append({"step": "date_conversion", "timestamp": timestamp, "before_count": len(df_clean), "after_count": len(df_clean), "invalid_samples": invalid_dates.head(3).to_dict('records'), "action": "marked_invalid_dates"})
                df_clean['Date'] = pd.to_datetime(df_clean['Date'], errors='coerce')
        
        # Convert numeric columns
        numeric_cols = ['Revenue', 'Expenses', 'Profit', 'Employees']
        for col in numeric_cols:
            if col in df_clean.columns:
                original_dtype = df_clean[col].dtype
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                metadata.append({"step": f"convert_{col.lower()}", "timestamp": timestamp, "original_dtype": str(original_dtype), "new_dtype": str(df_clean[col].dtype), "null_created": int(df_clean[col].isnull().sum())})
    
    # Step 2: Deduplication
    if config.get('deduplicate', False):
        before_dedup = len(df_clean)
        if config.get('dedup_subset'): df_clean = df_clean.drop_duplicates(subset=config['dedup_subset'], keep='first')
        else: df_clean = df_clean.drop_duplicates(keep='first')
        after_dedup = len(df_clean)
        removed_count = before_dedup - after_dedup
        metadata.append({"step": "deduplication", "timestamp": timestamp, "before_count": before_dedup, "after_count": after_dedup, "removed_count": removed_count, "method": "keep_first"})
    
    # Step 3: Missing value handling
    fill_method = config.get('fill_method', 'none')
    if fill_method != 'none':
        before_fill_nulls = df_clean.isnull().sum().sum()
        if fill_method == 'median_by_company' and 'Company' in df_clean.columns:
            numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                df_clean[col] = df_clean.groupby('Company')[col].transform(lambda x: x.fillna(x.median()))
        elif fill_method == 'ffill': df_clean = df_clean.fillna(method='ffill')
        after_fill_nulls = df_clean.isnull().sum().sum()
        metadata.append({"step": "missing_value_fill", "timestamp": timestamp, "method": fill_method, "before_null_count": int(before_fill_nulls), "after_null_count": int(after_fill_nulls), "filled_count": int(before_fill_nulls - after_fill_nulls)})
    
    # Step 4: Remove negative values
    if config.get('remove_negatives', False):
        numeric_cols = ['Revenue', 'Expenses', 'Profit']
        for col in numeric_cols:
            if col in df_clean.columns:
                before_neg = (df_clean[col] < 0).sum()
                df_clean.loc[df_clean[col] < 0, col] = np.nan
                metadata.append({"step": f"remove_negatives_{col.lower()}", "timestamp": timestamp, "negative_values_found": int(before_neg), "action": "set_to_nan"})
    
    # Step 5: Drop threshold
    drop_threshold = config.get('drop_threshold', 0.5)
    if drop_threshold < 1.0:
        before_cols = len(df_clean.columns)
        col_missing_pct = df_clean.isnull().mean()
        cols_to_drop = col_missing_pct[col_missing_pct > drop_threshold].index
        df_clean = df_clean.drop(columns=cols_to_drop)
        before_rows = len(df_clean)
        row_missing_pct = df_clean.isnull().sum(axis=1) / len(df_clean.columns)
        df_clean = df_clean[row_missing_pct <= drop_threshold]
        after_rows = len(df_clean)
        metadata.append({"step": "drop_high_missing", "timestamp": timestamp, "threshold": drop_threshold, "columns_dropped": list(cols_to_drop), "rows_before": before_rows, "rows_after": after_rows, "cols_before": before_cols, "cols_after": len(df_clean.columns)})
    
    final_metadata = {"pipeline_summary": {"initial_shape": initial_shape, "final_shape": df_clean.shape, "rows_removed": initial_shape[0] - df_clean.shape[0], "cols_removed": initial_shape[1] - df_clean.shape[1], "steps_executed": len(metadata)}}
    metadata.append(final_metadata)
    logger.info(f"Cleaning pipeline complete: {initial_shape} -> {df_clean.shape}")
    return df_clean, metadata

def filter_dataframe(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """Apply filters to DataFrame in deterministic order."""
    df_filtered = df.copy()
    if filters.get('companies') and 'Company' in df_filtered.columns: df_filtered = df_filtered[df_filtered['Company'].isin(filters['companies'])]
    if filters.get('countries') and 'Country' in df_filtered.columns: df_filtered = df_filtered[df_filtered['Country'].isin(filters['countries'])]
    if filters.get('campaigns') and 'Campaign' in df_filtered.columns: df_filtered = df_filtered[df_filtered['Campaign'].isin(filters['campaigns'])]
    
    date_range = filters.get('date_range')
    if date_range and 'Date' in df_filtered.columns:
        if 'start' in date_range: df_filtered = df_filtered[df_filtered['Date'] >= pd.to_datetime(date_range['start'])]
        if 'end' in date_range: df_filtered = df_filtered[df_filtered['Date'] <= pd.to_datetime(date_range['end'])]
    
    if 'Revenue' in df_filtered.columns:
        if filters.get('min_revenue') is not None: df_filtered = df_filtered[df_filtered['Revenue'] >= filters['min_revenue']]
        if filters.get('max_revenue') is not None: df_filtered = df_filtered[df_filtered['Revenue'] <= filters['max_revenue']]
    
    logger.info(f"Filtering: {len(df)} -> {len(df_filtered)} rows")
    return df_filtered

def aggregate(df: pd.DataFrame, by: str, metric: str, agg: str) -> pd.DataFrame:
    """Aggregate data by specified column and metric."""
    if by not in df.columns or metric not in df.columns: raise ValueError(f"Column not found: by='{by}', metric='{metric}'")
    
    if agg == "sum": result = df.groupby(by)[metric].sum().reset_index()
    elif agg == "mean": result = df.groupby(by)[metric].mean().reset_index()
    elif agg == "median": result = df.groupby(by)[metric].median().reset_index()
    else: raise ValueError(f"Unsupported aggregation: {agg}")
    
    result = result.sort_values(metric, ascending=False).reset_index(drop=True)
    logger.info(f"Aggregated by {by}: {len(result)} groups")
    return result

def top_n_with_others(df: pd.DataFrame, group_key: str, metric: str, n: int, sort: str = "desc") -> pd.DataFrame:
    """Return top N groups plus 'Others' row for remainder."""
    if n <= 0 or n >= len(df): return df.copy()
    
    ascending = (sort == "asc")
    df_sorted = df.sort_values(metric, ascending=ascending).reset_index(drop=True)
    top_n_df = df_sorted.head(n).copy()
    others_df = df_sorted.tail(len(df_sorted) - n)
    
    if len(others_df) > 0:
        others_sum = others_df[metric].sum()
        others_row = pd.DataFrame([{group_key: "Others", metric: others_sum}])
        result = pd.concat([top_n_df, others_row], ignore_index=True)
    else: result = top_n_df
    
    logger.info(f"Top {n} with others: {len(result)} total groups")
    return result

def prepare_timeseries_for_forecast(df: pd.DataFrame, company: Optional[str] = None, campaign: Optional[str] = None, freq: str = "M") -> pd.DataFrame:
    """Prepare timeseries data for forecasting models."""
    df_ts = df.copy()
    if company and 'Company' in df_ts.columns: df_ts = df_ts[df_ts['Company'] == company]
    if campaign and 'Campaign' in df_ts.columns: df_ts = df_ts[df_ts['Campaign'] == campaign]
    if len(df_ts) == 0: raise ValueError("No data remaining after filtering")
    
    result_df = pd.DataFrame()
    result_df['ds'] = pd.to_datetime(df_ts['Date']) if 'Date' in df_ts.columns else pd.date_range(start=datetime.now() - timedelta(days=30*len(df_ts)), periods=len(df_ts), freq=freq)
    result_df['y'] = df_ts['Revenue'] if 'Revenue' in df_ts.columns else 0
    
    if 'Employees' in df_ts.columns: result_df['employees'] = df_ts['Employees'].values
    
    if 'Campaign' in df_ts.columns:
        campaigns = df_ts['Campaign'].unique()
        for camp in campaigns: result_df[f'campaign_{camp.lower()}'] = (df_ts['Campaign'] == camp).astype(int).values
    
    result_df = result_df.sort_values('ds').drop_duplicates(subset=['ds']).reset_index(drop=True)
    
    if freq == "M":
        full_range = pd.date_range(start=result_df['ds'].min(), end=result_df['ds'].max(), freq='MS')
        result_df = result_df.set_index('ds').reindex(full_range).fillna(method='ffill').reset_index()
        result_df = result_df.rename(columns={'index': 'ds'})
    
    logger.info(f"Prepared timeseries: {len(result_df)} periods")
    return result_df

def generate_chart_payload(df: pd.DataFrame, chart_type: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """Generate JSON payload for frontend chart rendering."""
    if len(df) == 0: return {"error": "No data to chart"}
    
    labels = df.iloc[:, 0].astype(str).tolist()
    data_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not data_cols: return {"error": "No numeric data found"}
    
    color_mapping = options.get('colors', {})
    default_colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777']
    
    series = []
    for i, col in enumerate(data_cols):
        series_data = df[col].fillna(0).tolist()
        color = color_mapping.get(col, color_mapping.get(f'series_{i}', default_colors[i % len(default_colors)]))
        series.append({"name": col, "data": series_data, "color": color, "type": chart_type})
    
    chart_config = {"chart": {"type": chart_type}, "title": options.get('title', 'Data Visualization'), "xAxis": {"categories": labels}, "yAxis": {"title": {"text": "Value"}}, "series": series}
    if chart_type == "stacked_bar": chart_config["plotOptions"] = {"series": {"stacking": "normal"}}
    
    payload = {"chart_data": chart_config, "raw_data": df.to_dict('records'), "metadata": {"chart_type": chart_type, "total_points": len(df), "series_count": len(series), "generated_at": datetime.now().isoformat()}}
    logger.info(f"Generated {chart_type} chart payload with {len(series)} series")
    return payload

def export_chart_image(chart_payload: Dict[str, Any], format: str = "png", background: str = "#ffffff", dpi: int = 300, filename: Optional[str] = None) -> str:
    """Export chart as image file (server-side rendering placeholder)."""
    if not filename: filename = f"chart_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
    output_path = CHARTS_DIR / filename
    
    metadata = {"chart_payload": chart_payload, "export_config": {"format": format, "background": background, "dpi": dpi, "filename": filename}, "exported_at": datetime.now().isoformat()}
    
    with open(output_path.with_suffix('.json'), 'w') as f: json.dump(metadata, f, indent=2)
    logger.info(f"Chart export metadata saved: {output_path}")
    return str(output_path)

def save_chart_metadata(chart_payload: Dict[str, Any], storage_path: str) -> str:
    """Save chart configuration and metadata."""
    chart_id = hashlib.md5(json.dumps(chart_payload, sort_keys=True).encode()).hexdigest()[:12]
    metadata = {"chart_id": chart_id, "chart_payload": chart_payload, "saved_at": datetime.now().isoformat(), "storage_path": storage_path}
    metadata_path = CHARTS_DIR / f"{chart_id}.json"
    with open(metadata_path, 'w') as f: json.dump(metadata, f, indent=2)
    logger.info(f"Chart metadata saved: {chart_id}")
    return chart_id

def prepare_forecast_input(df: pd.DataFrame, forecast_config: Dict[str, Any]) -> Dict[str, Any]:
    """Convert filtered timeseries into model-ready dataset."""
    ts_data = prepare_timeseries_for_forecast(df, forecast_config.get('company'), forecast_config.get('campaign'))
    if len(ts_data) < 2: raise ValueError("Insufficient data points for forecasting (minimum 2 required)")
    
    test_size = forecast_config.get('test_split', 0.2)
    if test_size > 0:
        split_idx = int(len(ts_data) * (1 - test_size))
        train_data = ts_data.iloc[:split_idx].copy()
        test_data = ts_data.iloc[split_idx:].copy()
    else:
        train_data = ts_data.copy()
        test_data = pd.DataFrame()
    
    regressor_cols = [col for col in ts_data.columns if col not in ['ds', 'y']]
    
    result = {
        "train_data": train_data,
        "test_data": test_data,
        "regressors": regressor_cols,
        "data_info": {"total_periods": len(ts_data), "train_periods": len(train_data), "test_periods": len(test_data), "date_range": {"start": ts_data['ds'].min().isoformat(), "end": ts_data['ds'].max().isoformat()}}
    }
    
    logger.info(f"Prepared forecast input: {len(train_data)} train, {len(test_data)} test periods")
    return result

def run_forecast(model_type: str, train_df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Run forecasting model and return predictions with metadata."""
    periods = config.get('periods', 12)
    confidence_level = config.get('confidence_level', 0.95)
    
    if model_type == "prophet":
        try:
            from prophet import Prophet
            model = Prophet(interval_width=confidence_level, yearly_seasonality=len(train_df) >= 24, weekly_seasonality=False, daily_seasonality=False)
            
            regressors = config.get('regressors', [])
            for regressor in regressors:
                if regressor in train_df.columns: model.add_regressor(regressor)
            
            model.fit(train_df)
            future = model.make_future_dataframe(periods=periods, freq='M')
            
            for regressor in regressors:
                if regressor in train_df.columns: future[regressor] = future[regressor].fillna(train_df[regressor].iloc[-1])
            
            forecast = model.predict(future)
            forecast_df = forecast.tail(periods)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
            forecast_df.columns = ['ds', 'y', 'y_lower', 'y_upper']
            
            train_mae = np.mean(np.abs(train_df['y'] - model.predict(train_df[['ds']])['yhat']))
            
            metadata = {"model_type": "prophet", "periods_forecasted": periods, "confidence_level": confidence_level, "regressors_used": regressors, "training_periods": len(train_df), "mae_on_training": round(train_mae, 2), "seasonality_components": {"yearly": model.yearly_seasonality, "weekly": model.weekly_seasonality, "daily": model.daily_seasonality}}
            
        except ImportError:
            logger.warning("Prophet not available, using simple forecast")
            return _simple_forecast_fallback(train_df, periods, confidence_level)
        except Exception as e:
            logger.error(f"Prophet forecast failed: {e}")
            return _simple_forecast_fallback(train_df, periods, confidence_level)
    else:
        return _simple_forecast_fallback(train_df, periods, confidence_level)
    
    logger.info(f"Generated {model_type} forecast: {len(forecast_df)} periods")
    return forecast_df, metadata

def _simple_forecast_fallback(train_df: pd.DataFrame, periods: int, confidence_level: float) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Simple linear trend forecast as fallback."""
    values = train_df['y'].values
    
    if len(values) < 2:
        last_value = values[-1] if len(values) > 0 else 0
        forecast_values = [last_value] * periods
    else:
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)
        future_x = np.arange(len(values), len(values) + periods)
        forecast_values = np.polyval(coeffs, future_x)
    
    mean_val = np.mean(values)
    margin = mean_val * 0.2
    last_date = train_df['ds'].max()
    future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=periods, freq='MS')
    
    forecast_df = pd.DataFrame({'ds': future_dates, 'y': forecast_values, 'y_lower': [max(0, v - margin) for v in forecast_values], 'y_upper': [v + margin for v in forecast_values]})
    
    metadata = {"model_type": "simple_trend", "periods_forecasted": periods, "confidence_level": 0.8, "training_periods": len(train_df), "method": "linear_extrapolation"}
    
    return forecast_df, metadata

def persist_forecast_results(forecast_df: pd.DataFrame, metadata: Dict[str, Any], path: str) -> str:
    """Save forecast results and metadata to disk."""
    forecast_id = f"forecast_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hashlib.md5(str(metadata).encode()).hexdigest()[:8]}"
    
    forecast_csv_path = FORECASTS_DIR / f"{forecast_id}.csv"
    forecast_df.to_csv(forecast_csv_path, index=False)
    
    metadata_path = FORECASTS_DIR / f"{forecast_id}_metadata.json"
    full_metadata = {"forecast_id": forecast_id, "forecast_csv_path": str(forecast_csv_path), "created_at": datetime.now().isoformat(), **metadata}
    
    with open(metadata_path, 'w') as f: json.dump(full_metadata, f, indent=2, default=str)
    logger.info(f"Forecast results saved: {forecast_id}")
    return str(forecast_csv_path)

def log_action(action: str, user_id: str, input_file_id: str = None, output_path: str = None, params: Dict[str, Any] = None, summary_stats: Dict[str, Any] = None, errors: List[str] = None, artifact_id: str = None):
    """Log user actions for auditing and metadata tracking."""
    log_entry = {"timestamp": datetime.now().isoformat(), "action": action, "user_id": user_id, "input_file_id": input_file_id, "output_path": output_path, "params": params or {}, "summary_stats": summary_stats or {}, "errors": errors or [], "artifact_id": artifact_id}
    
    log_file = LOGS_DIR / "actions.log"
    with open(log_file, 'a') as f: f.write(json.dumps(log_entry) + '\n')
    
    daily_log = LOGS_DIR / f"actions_{datetime.now().strftime('%Y%m%d')}.jsonl"
    with open(daily_log, 'a') as f: f.write(json.dumps(log_entry) + '\n')

def get_available_datasets() -> List[Dict[str, Any]]:
    """Return list of available datasets in raw storage."""
    datasets = []
    
    for file_path in RAW_DIR.glob("*.csv"):
        try:
            stat = file_path.stat()
            df = pd.read_csv(file_path, nrows=1)
            datasets.append({"file_id": file_path.stem, "filename": file_path.name, "path": str(file_path), "size_bytes": stat.st_size, "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(), "columns": list(df.columns), "estimated_rows": sum(1 for line in open(file_path)) - 1})
        except Exception as e:
            logger.warning(f"Failed to read dataset {file_path}: {e}")
    
    return sorted(datasets, key=lambda x: x["modified_at"], reverse=True)

def validate_chart_configuration(chart_type: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """Validate chart configuration and return corrected options with warnings."""
    warnings = []
    validated_options = options.copy()
    
    valid_chart_types = ["bar", "stacked_bar", "line", "area", "pie", "scatter"]
    if chart_type not in valid_chart_types:
        warnings.append(f"Invalid chart type '{chart_type}', defaulting to 'bar'")
        chart_type = "bar"
    
    colors = validated_options.get('colors', {})
    color_regex = r'^#[0-9A-Fa-f]{6}$'
    import re
    
    for key, color in colors.items():
        if not re.match(color_regex, str(color)):
            warnings.append(f"Invalid color '{color}' for '{key}', using default")
            validated_options['colors'][key] = '#2563eb'
    
    sort_options = validated_options.get('sort', 'desc')
    if sort_options not in ['asc', 'desc', 'none']:
        warnings.append(f"Invalid sort option '{sort_options}', using 'desc'")
        validated_options['sort'] = 'desc'
    
    if chart_type == "pie" and validated_options.get('stacking'):
        warnings.append("Stacking not applicable for pie charts")
        validated_options.pop('stacking', None)
    
    return {"validated_options": validated_options, "warnings": warnings, "chart_type": chart_type}

def calculate_data_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate overall data quality score and detailed metrics."""
    total_cells = len(df) * len(df.columns)
    missing_cells = df.isnull().sum().sum()
    missing_percentage = (missing_cells / total_cells) * 100
    
    duplicate_rows = df.duplicated().sum()
    duplicate_percentage = (duplicate_rows / len(df)) * 100
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outliers_count = 0
    
    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        outliers = df[(df[col] < Q1 - 1.5*IQR) | (df[col] > Q3 + 1.5*IQR)]
        outliers_count += len(outliers)
    
    outlier_percentage = (outliers_count / len(df)) * 100 if len(df) > 0 else 0
    
    completeness_score = max(0, 100 - missing_percentage)
    uniqueness_score = max(0, 100 - duplicate_percentage)
    consistency_score = max(0, 100 - outlier_percentage)
    
    overall_score = (completeness_score + uniqueness_score + consistency_score) / 3
    
    if overall_score >= 90: quality_rating = "Excellent"
    elif overall_score >= 75: quality_rating = "Good"
    elif overall_score >= 60: quality_rating = "Fair"
    else: quality_rating = "Poor"
    
    return {
        "overall_score": round(overall_score, 1),
        "quality_rating": quality_rating,
        "metrics": {"completeness": round(completeness_score, 1), "uniqueness": round(uniqueness_score, 1), "consistency": round(consistency_score, 1)},
        "details": {"missing_cells": int(missing_cells), "missing_percentage": round(missing_percentage, 2), "duplicate_rows": int(duplicate_rows), "outliers_detected": int(outliers_count), "total_rows": len(df), "total_columns": len(df.columns)}
    }

def suggest_chart_type(df: pd.DataFrame, target_column: str = None) -> Dict[str, Any]:
    """Suggest appropriate chart type based on data characteristics."""
    suggestions = []
    
    numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
    categorical_cols = len(df.select_dtypes(include=['object']).columns)
    total_rows = len(df)
    
    date_cols = []
    for col in df.columns:
        try: pd.to_datetime(df[col]); date_cols.append(col)
        except: continue
    
    has_time_series = len(date_cols) > 0
    
    if has_time_series and numeric_cols >= 1:
        suggestions.append({"chart_type": "line", "reason": "Time series data detected - line charts show trends over time", "confidence": 0.9})
    
    if categorical_cols >= 1 and numeric_cols >= 1:
        if total_rows <= 10: suggestions.append({"chart_type": "pie", "reason": "Small number of categories - pie chart shows distribution", "confidence": 0.7})
        suggestions.append({"chart_type": "bar", "reason": "Categorical data with numeric values - bar chart compares categories", "confidence": 0.8})
    
    if numeric_cols >= 2: suggestions.append({"chart_type": "scatter", "reason": "Multiple numeric columns - scatter plot shows relationships", "confidence": 0.6})
    
    if not suggestions: suggestions.append({"chart_type": "bar", "reason": "Default choice for mixed data types", "confidence": 0.5})
    
    suggestions.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {"recommended": suggestions[0]["chart_type"], "all_suggestions": suggestions, "data_analysis": {"numeric_columns": numeric_cols, "categorical_columns": categorical_cols, "has_time_series": has_time_series, "total_rows": total_rows}}
