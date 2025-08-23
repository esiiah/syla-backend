import re
import pandas as pd
import numpy as np

CURRENCY_SIGNS = r"[₹$€£]"
THOUSAND_SEP = r","
PERCENT = r"%"

# Lightweight header mapping for common ad metrics
HEADER_MAP = {
    r"^\s*amount\s*spent.*$": "Amount Spent",
    r"^\s*spend.*$": "Amount Spent",
    r"^\s*ctr.*$": "CTR (%)",
    r"^\s*click[-\s_]*through.*$": "CTR (%)",
    r"^\s*roas.*$": "ROAS",
    r"^\s*cpc.*$": "CPC",
    r"^\s*cpr.*$": "CPR",
    r"^\s*impressions.*$": "Impressions",
    r"^\s*reach.*$": "Reach",
    r"^\s*clicks.*$": "Clicks",
    r"^\s*unique\s*clicks.*$": "Unique Clicks",
}

def _normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    new_cols = []
    for c in df.columns:
        base = str(c).strip()
        mapped = None
        for pattern, target in HEADER_MAP.items():
            if re.match(pattern, base, flags=re.IGNORECASE):
                mapped = target
                break
        new_cols.append(mapped or base)
    df.columns = new_cols
    return df

def _to_numeric_series(s: pd.Series) -> pd.Series:
    # Try to coerce strings like "₹1,200.50", "5%", "1,000" → numbers
    if s.dtype != object:
        return s

    # Strip whitespace
    s2 = s.astype(str).str.strip()

    # Empty-like values to NaN
    s2 = s2.replace({"": np.nan, "nan": np.nan, "None": np.nan})

    # Percent → number (as percentage, not fraction)
    is_percent = s2.str.contains(PERCENT, regex=True, na=False)
    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)

    numeric = pd.to_numeric(s2, errors="coerce")

    # If many percent tokens existed, keep as percentage value
    if is_percent.sum() > max(2, int(0.2 * len(s))):
        return numeric  # already the number shown in percent units
    return numeric

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Automated cleaning:
    - normalize headers
    - trim strings
    - parse currency/percent/commas into numbers
    - infer numerics
    - fill missing
    """
    df = _normalize_headers(df)

    # Trim string cells
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].astype(str).str.strip()

    # Convert numeric-like object columns
    for col in df.columns:
        if df[col].dtype == object:
            numeric_try = _to_numeric_series(df[col])
            # Heuristic: if at least 60% converted, treat as numeric
            if pd.api.types.is_numeric_dtype(numeric_try) and numeric_try.notna().mean() >= 0.6:
                df[col] = numeric_try

    # Datetime inference
    for col in df.columns:
        if df[col].dtype == object:
            try:
                dt = pd.to_datetime(df[col], errors="raise", infer_datetime_format=True)
                # If many parsed successfully, keep as datetime
                if dt.notna().mean() >= 0.7:
                    df[col] = dt
            except Exception:
                pass

    # Drop fully-empty columns, fill remaining NaNs (numeric→0, others→"")
    df = df.dropna(axis=1, how="all")
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(0)
    for col in df.columns.difference(df.select_dtypes(include=[np.number]).columns):
        df[col] = df[col].fillna("")

    return df

def detect_column_types(df: pd.DataFrame) -> dict:
    out = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            out[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            out[col] = "datetime"
        else:
            out[col] = "categorical"
    return out

def summarize_numeric(df: pd.DataFrame) -> dict:
    nums = df.select_dtypes(include=[np.number])
    result = {}
    for col in nums.columns:
        series = nums[col]
        result[col] = {
            "count": int(series.count()),
            "min": float(series.min()) if series.count() else 0.0,
            "max": float(series.max()) if series.count() else 0.0,
            "mean": float(series.mean()) if series.count() else 0.0,
            "sum": float(series.sum()) if series.count() else 0.0,
        }
    return result
