"""
Universal data I/O, cleaning, visualization, and forecasting module.
Accepts ANY data format and cleans it universally.
"""
import os, json, hashlib, logging, pandas as pd, numpy as np, re, time
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

for directory in [DATA_DIR, RAW_DIR, CLEANED_DIR, CHARTS_DIR, MODELS_DIR, FORECASTS_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

def universal_load_any_file(path: str) -> pd.DataFrame:
    """Load ANY file format and convert to DataFrame - no expectations"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    file_ext = path.lower().split('.')[-1]
    df = None
    
    try:
        if file_ext == 'csv':
            for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                for separator in [',', ';', '\t', '|']:
                    try:
                        df = pd.read_csv(path, encoding=encoding, sep=separator, on_bad_lines='skip', low_memory=False)
                        if len(df.columns) > 1: break
                    except: continue
                if df is not None and len(df.columns) > 1: break
                    
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(path, engine='openpyxl' if file_ext == 'xlsx' else 'xlrd')
        elif file_ext == 'json':
            df = pd.read_json(path, lines=True)
        elif file_ext in ['txt', 'tsv']:
            df = pd.read_csv(path, sep='\t', on_bad_lines='skip')
            
        # Raw text parsing fallback
        if df is None:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            lines = content.split('\n')[:100]
            delimiters = [',', ';', '\t', '|', ':']
            delimiter_counts = {d: sum(line.count(d) for line in lines) for d in delimiters}
            best_delimiter = max(delimiter_counts.items(), key=lambda x: x[1])[0]
            
            data = []
            headers = lines[0].split(best_delimiter) if lines else ['Column_1']
            for line in lines[1:]:
                if line.strip():
                    row = line.split(best_delimiter)
                    while len(row) < len(headers): row.append('')
                    row = row[:len(headers)]
                    data.append(row)
            df = pd.DataFrame(data, columns=headers)
    
    except Exception as e:
        logger.error(f"Failed to load file {path}: {e}")
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.readlines()
            df = pd.DataFrame({'Raw_Content': [line.strip() for line in content if line.strip()]})
        except:
            df = pd.DataFrame({'Error': [f'Could not read file: {str(e)}']})
    
    if df is not None: df = make_universal_dataframe(df)
    logger.info(f"Universal load complete: {len(df)} rows, {len(df.columns)} columns")
    return df

def make_universal_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Make ANY DataFrame universally processable"""
    df_clean = df.copy()
    
    # Fix column names universally
    new_columns, column_counts = [], {}
    for col in df_clean.columns:
        col_str = str(col).strip()
        col_clean = re.sub(r'[^\w\s]', '_', col_str)
        col_clean = re.sub(r'\s+', '_', col_clean).strip('_')
        if not col_clean or col_clean.lower() in ['unnamed', 'column', 'field']:
            col_clean = f'Column_{len(new_columns) + 1}'
        
        original_col = col_clean
        counter = 1
        while col_clean in column_counts:
            col_clean = f"{original_col}_{counter}"
            counter += 1
        column_counts[col_clean] = True
        new_columns.append(col_clean)
    
    df_clean.columns = new_columns
    
    # Universal data type conversion
    for col in df_clean.columns:
        df_clean[col] = df_clean[col].astype(str)
        df_clean[col] = df_clean[col].replace(['nan', 'NaN', 'null', 'NULL', 'None', '<NA>'], '')
        
        try:
            cleaned_values = df_clean[col].str.replace(',', '').str.replace('$', '').str.replace('%', '').str.strip()
            numeric_values = pd.to_numeric(cleaned_values, errors='coerce')
            
            non_null_count = cleaned_values[cleaned_values != ''].count()
            numeric_count = numeric_values.notna().sum()
            
            if non_null_count > 0 and (numeric_count / non_null_count) > 0.7:
                df_clean[col] = numeric_values
            else:
                df_clean[col] = df_clean[col].fillna('').astype(str)
        except:
            df_clean[col] = df_clean[col].fillna('').astype(str)
    
    # Handle duplicates by sequencing
    if df_clean.duplicated().any():
        df_clean['_row_sequence'] = range(1, len(df_clean) + 1)
        if len(df_clean.columns) > 1:
            first_text_col = None
            for col in df_clean.columns:
                if df_clean[col].dtype == 'object' and col != '_row_sequence':
                    first_text_col = col
                    break
            
            if first_text_col:
                grouper = df_clean.drop('_row_sequence', axis=1)
                duplicated_mask = grouper.duplicated(keep=False)
                if duplicated_mask.any():
                    df_clean.loc[duplicated_mask, first_text_col] = (
                        df_clean.loc[duplicated_mask, first_text_col].astype(str) + 
                        '_v' + df_clean.loc[duplicated_mask].groupby(grouper.columns.tolist()).cumcount().add(1).astype(str)
                    )
        df_clean = df_clean.drop('_row_sequence', axis=1)
    
    # Final validation
    if df_clean.empty:
        df_clean = pd.DataFrame({'Data_Error': ['No processable data found']})
    
    df_clean = df_clean.dropna(how='all').fillna('')
    df_clean = df_clean.loc[:, (df_clean != '').any(axis=0)]
    
    logger.info(f"Universal DataFrame processing complete: {len(df_clean)} rows, {len(df_clean.columns)} columns")
    return df_clean

def universal_clean_pipeline(df: pd.DataFrame, aggressive: bool = False) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """Universal cleaning that accepts ANY input and produces clean output"""
    metadata = []
    timestamp = datetime.now().isoformat()
    initial_shape = df.shape
    
    df_clean = make_universal_dataframe(df)
    metadata.append({
        "step": "universal_processing", "timestamp": timestamp,
        "before_shape": initial_shape, "after_shape": df_clean.shape,
        "action": "standardized_format"
    })
    
    if aggressive:
        row_empty_pct = (df_clean == '').sum(axis=1) / len(df_clean.columns)
        rows_before = len(df_clean)
        df_clean = df_clean[row_empty_pct < 0.8]
        rows_removed = rows_before - len(df_clean)
        
        if rows_removed > 0:
            metadata.append({
                "step": "remove_empty_rows", "timestamp": timestamp,
                "rows_removed": rows_removed, "threshold": "80%_empty"
            })
        
        col_empty_pct = (df_clean == '').sum(axis=0) / len(df_clean)
        cols_before = len(df_clean.columns)
        df_clean = df_clean.loc[:, col_empty_pct < 0.9]
        cols_removed = cols_before - len(df_clean.columns)
        
        if cols_removed > 0:
            metadata.append({
                "step": "remove_empty_columns", "timestamp": timestamp,
                "columns_removed": cols_removed, "threshold": "90%_empty"
            })
    
    if df_clean.empty or len(df_clean.columns) == 0:
        df_clean = pd.DataFrame({'Processed_Data': ['Data processing completed but no structured data found']})
        metadata.append({"step": "fallback_creation", "timestamp": timestamp, "action": "created_fallback_dataframe"})
    
    final_metadata = {
        "pipeline_summary": {
            "initial_shape": initial_shape, "final_shape": df_clean.shape,
            "steps_completed": len(metadata), "processing_mode": "aggressive" if aggressive else "standard"
        }
    }
    metadata.append(final_metadata)
    
    logger.info(f"Universal cleaning pipeline: {initial_shape} -> {df_clean.shape}")
    return df_clean, metadata

# Legacy functions for backward compatibility
def load_raw_csv(path: str) -> pd.DataFrame:
    """Legacy function - now uses universal loader"""
    return universal_load_any_file(path)

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Legacy function - now uses universal processing"""
    clean_df, _ = universal_clean_pipeline(df)
    return clean_df

def get_schema_expectations() -> Dict[str, Any]:
    """Returns flexible schema that adapts to any data"""
    return {
        "required_columns": [],  # No requirements - we adapt
        "column_types": {},  # Auto-detected
        "validation_rules": {}  # Universal validation only
    }

def preview_rows(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Return top n rows for preview"""
    return df.head(n)

def describe_missing_and_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze data quality issues"""
    missing_analysis = {}
    for col in df.columns:
        missing_count = (df[col] == '').sum() if df[col].dtype == 'object' else df[col].isnull().sum()
        missing_pct = (missing_count / len(df)) * 100
        missing_analysis[col] = {"count": int(missing_count), "percentage": round(missing_pct, 2)}
    
    total_duplicates = df.duplicated().sum()
    duplicate_rows = df[df.duplicated()].head(5).to_dict('records')
    
    return {
        "missing_values": missing_analysis,
        "total_missing_cells": int(sum(v["count"] for v in missing_analysis.values())),
        "duplicate_rows": {"count": int(total_duplicates), "examples": duplicate_rows}
    }

def filter_dataframe(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """Apply filters to DataFrame universally"""
    df_filtered = df.copy()
    
    for filter_key, filter_values in filters.items():
        if filter_key in df_filtered.columns and filter_values:
            if isinstance(filter_values, list):
                df_filtered = df_filtered[df_filtered[filter_key].isin(filter_values)]
            elif isinstance(filter_values, dict):
                if 'start' in filter_values and 'end' in filter_values:
                    # Date range filter
                    try:
                        df_filtered[filter_key] = pd.to_datetime(df_filtered[filter_key], errors='coerce')
                        df_filtered = df_filtered[
                            (df_filtered[filter_key] >= pd.to_datetime(filter_values['start'])) &
                            (df_filtered[filter_key] <= pd.to_datetime(filter_values['end']))
                        ]
                    except: pass
                elif 'min' in filter_values or 'max' in filter_values:
                    # Numeric range filter
                    try:
                        df_filtered[filter_key] = pd.to_numeric(df_filtered[filter_key], errors='coerce')
                        if 'min' in filter_values:
                            df_filtered = df_filtered[df_filtered[filter_key] >= filter_values['min']]
                        if 'max' in filter_values:
                            df_filtered = df_filtered[df_filtered[filter_key] <= filter_values['max']]
                    except: pass
    
    logger.info(f"Filtering: {len(df)} -> {len(df_filtered)} rows")
    return df_filtered

def aggregate(df: pd.DataFrame, by: str, metric: str, agg: str) -> pd.DataFrame:
    """Aggregate data universally"""
    if by not in df.columns or metric not in df.columns:
        raise ValueError(f"Column not found: by='{by}', metric='{metric}'")
    
    # Ensure metric is numeric
    try:
        df[metric] = pd.to_numeric(df[metric], errors='coerce').fillna(0)
    except: pass
    
    if agg == "sum": result = df.groupby(by)[metric].sum().reset_index()
    elif agg == "mean": result = df.groupby(by)[metric].mean().reset_index()
    elif agg == "median": result = df.groupby(by)[metric].median().reset_index()
    elif agg == "count": result = df.groupby(by)[metric].count().reset_index()
    else: raise ValueError(f"Unsupported aggregation: {agg}")
    
    result = result.sort_values(metric, ascending=False).reset_index(drop=True)
    logger.info(f"Aggregated by {by}: {len(result)} groups")
    return result

def top_n_with_others(df: pd.DataFrame, group_key: str, metric: str, n: int, sort: str = "desc") -> pd.DataFrame:
    """Return top N groups plus 'Others' row"""
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
    
    return result

def prepare_timeseries_for_forecast(df: pd.DataFrame, company: Optional[str] = None, campaign: Optional[str] = None, freq: str = "M") -> pd.DataFrame:
    """Prepare timeseries data universally"""
    df_ts = df.copy()
    if company and 'Company' in df_ts.columns: df_ts = df_ts[df_ts['Company'] == company]
    if campaign and 'Campaign' in df_ts.columns: df_ts = df_ts[df_ts['Campaign'] == campaign]
    if len(df_ts) == 0: raise ValueError("No data remaining after filtering")
    
    result_df = pd.DataFrame()
    
    # Try to find date column
    date_col = None
    for col in df_ts.columns:
        if 'date' in col.lower() or 'time' in col.lower():
            try:
                pd.to_datetime(df_ts[col])
                date_col = col
                break
            except: pass
    
    result_df['ds'] = pd.to_datetime(df_ts[date_col]) if date_col else pd.date_range(start=datetime.now() - timedelta(days=30*len(df_ts)), periods=len(df_ts), freq=freq)
    
    # Find numeric column for target
    numeric_cols = [col for col in df_ts.columns if pd.api.types.is_numeric_dtype(df_ts[col])]
    target_col = numeric_cols[0] if numeric_cols else df_ts.columns[0]
    result_df['y'] = pd.to_numeric(df_ts[target_col], errors='coerce').fillna(0)
    
    result_df = result_df.sort_values('ds').drop_duplicates(subset=['ds']).reset_index(drop=True)
    return result_df

def generate_chart_payload(df: pd.DataFrame, chart_type: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """Generate JSON payload for frontend chart rendering"""
    if len(df) == 0: return {"error": "No data to chart"}
    
    labels = df.iloc[:, 0].astype(str).tolist()
    data_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not data_cols: 
        # If no numeric columns, use first column values as counts
        value_counts = df.iloc[:, 0].value_counts()
        return {
            "chart_data": {
                "chart": {"type": "bar"},
                "title": options.get('title', 'Data Distribution'),
                "xAxis": {"categories": value_counts.index.tolist()},
                "yAxis": {"title": {"text": "Count"}},
                "series": [{"name": "Count", "data": value_counts.values.tolist(), "type": chart_type}]
            },
            "raw_data": value_counts.reset_index().to_dict('records'),
            "metadata": {"chart_type": chart_type, "total_points": len(value_counts)}
        }
    
    default_colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777']
    series = []
    for i, col in enumerate(data_cols):
        series_data = df[col].fillna(0).tolist()
        color = options.get('colors', {}).get(col, default_colors[i % len(default_colors)])
        series.append({"name": col, "data": series_data, "color": color, "type": chart_type})
    
    chart_config = {
        "chart": {"type": chart_type},
        "title": options.get('title', 'Data Visualization'),
        "xAxis": {"categories": labels},
        "yAxis": {"title": {"text": "Value"}},
        "series": series
    }
    
    return {
        "chart_data": chart_config,
        "raw_data": df.to_dict('records'),
        "metadata": {"chart_type": chart_type, "total_points": len(df), "series_count": len(series)}
    }

def export_chart_image(chart_payload: Dict[str, Any], format: str = "png", background: str = "#ffffff", dpi: int = 300, filename: Optional[str] = None) -> str:
    """Export chart metadata (actual rendering would be client-side)"""
    if not filename: filename = f"chart_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
    output_path = CHARTS_DIR / filename
    
    metadata = {
        "chart_payload": chart_payload,
        "export_config": {"format": format, "background": background, "dpi": dpi, "filename": filename},
        "exported_at": datetime.now().isoformat()
    }
    
    with open(output_path.with_suffix('.json'), 'w') as f: json.dump(metadata, f, indent=2)
    return str(output_path)

def save_chart_metadata(chart_payload: Dict[str, Any], storage_path: str) -> str:
    """Save chart configuration and metadata"""
    chart_id = hashlib.md5(json.dumps(chart_payload, sort_keys=True).encode()).hexdigest()[:12]
    metadata = {"chart_id": chart_id, "chart_payload": chart_payload, "saved_at": datetime.now().isoformat()}
    metadata_path = CHARTS_DIR / f"{chart_id}.json"
    with open(metadata_path, 'w') as f: json.dump(metadata, f, indent=2)
    return chart_id

def prepare_forecast_input(df: pd.DataFrame, forecast_config: Dict[str, Any]) -> Dict[str, Any]:
    """Convert filtered timeseries into model-ready dataset"""
    ts_data = prepare_timeseries_for_forecast(df, forecast_config.get('company'), forecast_config.get('campaign'))
    if len(ts_data) < 2: raise ValueError("Insufficient data points for forecasting")
    
    test_size = forecast_config.get('test_split', 0.2)
    if test_size > 0:
        split_idx = int(len(ts_data) * (1 - test_size))
        train_data = ts_data.iloc[:split_idx].copy()
        test_data = ts_data.iloc[split_idx:].copy()
    else:
        train_data = ts_data.copy()
        test_data = pd.DataFrame()
    
    return {
        "train_data": train_data, "test_data": test_data,
        "data_info": {"total_periods": len(ts_data), "train_periods": len(train_data)}
    }

def run_forecast(model_type: str, train_df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Run forecasting model with fallback"""
    periods = config.get('periods', 12)
    
    try:
        if model_type == "prophet":
            from prophet import Prophet
            model = Prophet(yearly_seasonality=len(train_df) >= 24, weekly_seasonality=False, daily_seasonality=False)
            model.fit(train_df)
            future = model.make_future_dataframe(periods=periods, freq='M')
            forecast = model.predict(future)
            forecast_df = forecast.tail(periods)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
            forecast_df.columns = ['ds', 'y', 'y_lower', 'y_upper']
            metadata = {"model_type": "prophet", "periods_forecasted": periods}
        else:
            raise ImportError("Using simple forecast")
    except:
        # Simple trend fallback
        values = train_df['y'].values
        if len(values) < 2:
            forecast_values = [values[-1] if len(values) > 0 else 0] * periods
        else:
            x = np.arange(len(values))
            try:
                coeffs = np.polyfit(x, values, 1)
                future_x = np.arange(len(values), len(values) + periods)
                forecast_values = np.polyval(coeffs, future_x).tolist()
            except:
                forecast_values = [float(np.mean(values))] * periods
        
        timestamps = pd.date_range(start=datetime.now(), periods=periods, freq='M')
        forecast_df = pd.DataFrame({
            'ds': timestamps, 'y': forecast_values,
            'y_lower': [max(0, v * 0.8) for v in forecast_values],
            'y_upper': [v * 1.2 for v in forecast_values]
        })
        metadata = {"model_type": "simple_trend", "periods_forecasted": periods}
    
    return forecast_df, metadata

def persist_forecast_results(forecast_df: pd.DataFrame, metadata: Dict[str, Any], path: str) -> str:
    """Save forecast results"""
    forecast_id = f"forecast_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    forecast_csv_path = FORECASTS_DIR / f"{forecast_id}.csv"
    forecast_df.to_csv(forecast_csv_path, index=False)
    
    metadata_path = FORECASTS_DIR / f"{forecast_id}_metadata.json"
    with open(metadata_path, 'w') as f: json.dump(metadata, f, indent=2, default=str)
    return str(forecast_csv_path)

def log_action(action: str, user_id: str, input_file_id: str = None, output_path: str = None, params: Dict[str, Any] = None, summary_stats: Dict[str, Any] = None, errors: List[str] = None, artifact_id: str = None):
    """Log user actions"""
    log_entry = {
        "timestamp": datetime.now().isoformat(), "action": action, "user_id": user_id,
        "input_file_id": input_file_id, "params": params or {}, "artifact_id": artifact_id
    }
    log_file = LOGS_DIR / "actions.log"
    with open(log_file, 'a') as f: f.write(json.dumps(log_entry) + '\n')

def get_available_datasets() -> List[Dict[str, Any]]:
    """Return list of available datasets"""
    datasets = []
    for file_path in RAW_DIR.glob("*.csv"):
        try:
            stat = file_path.stat()
            datasets.append({
                "file_id": file_path.stem, "filename": file_path.name,
                "size_bytes": stat.st_size, "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        except Exception as e:
            logger.warning(f"Failed to read dataset {file_path}: {e}")
    return sorted(datasets, key=lambda x: x["modified_at"], reverse=True)

def calculate_data_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate data quality score"""
    total_cells = len(df) * len(df.columns)
    missing_cells = (df == '').sum().sum() if df.select_dtypes(include=['object']).shape[1] > 0 else df.isnull().sum().sum()
    missing_percentage = (missing_cells / total_cells) * 100 if total_cells > 0 else 0
    
    duplicate_rows = df.duplicated().sum()
    duplicate_percentage = (duplicate_rows / len(df)) * 100 if len(df) > 0 else 0
    
    completeness_score = max(0, 100 - missing_percentage)
    uniqueness_score = max(0, 100 - duplicate_percentage)
    overall_score = (completeness_score + uniqueness_score) / 2
    
    if overall_score >= 90: quality_rating = "Excellent"
    elif overall_score >= 75: quality_rating = "Good"
    elif overall_score >= 60: quality_rating = "Fair"
    else: quality_rating = "Poor"
    
    return {
        "overall_score": round(overall_score, 1), "quality_rating": quality_rating,
        "details": {"missing_percentage": round(missing_percentage, 2), "duplicate_rows": int(duplicate_rows), "total_rows": len(df)}
    }

def suggest_chart_type(df: pd.DataFrame, target_column: str = None) -> Dict[str, Any]:
    """Suggest appropriate chart type"""
    numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
    categorical_cols = len(df.select_dtypes(include=['object']).columns)
    total_rows = len(df)
    
    suggestions = []
    if categorical_cols >= 1 and numeric_cols >= 1:
        suggestions.append({"chart_type": "bar", "reason": "Mixed categorical and numeric data", "confidence": 0.8})
    if numeric_cols >= 2:
        suggestions.append({"chart_type": "scatter", "reason": "Multiple numeric columns", "confidence": 0.6})
    if total_rows <= 10 and categorical_cols >= 1:
        suggestions.append({"chart_type": "pie", "reason": "Small number of categories", "confidence": 0.7})
    
    if not suggestions: suggestions.append({"chart_type": "bar", "reason": "Default choice", "confidence": 0.5})
    suggestions.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {"recommended": suggestions[0]["chart_type"], "all_suggestions": suggestions}
