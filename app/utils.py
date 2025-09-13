# app/utils.py
import re
import pandas as pd
import numpy as np

CURRENCY_SIGNS = r"[₹$€£¥]"
THOUSAND_SEP = r","
PERCENT = r"%"

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


def _normalize_header_name(name: str) -> str:
    if name is None:
        return ""
    n = str(name).strip()
    for pattern, target in HEADER_MAP.items():
        try:
            if re.match(pattern, n, flags=re.IGNORECASE):
                return target
        except re.error:
            continue
    return n


def _to_numeric_series(s: pd.Series) -> pd.Series:
    """Try to coerce a series to numeric by stripping currency/commas/percent.
    Robust to receiving a DataFrame or 2D ndarray as input (flattens to strings)."""
    if s is None:
        return s

    # If we received a DataFrame (happens when label maps to multiple columns),
    # collapse into a single Series by joining row values with " | ".
    if isinstance(s, pd.DataFrame):
        if s.shape[1] == 1:
            s = s.iloc[:, 0]
        else:
            s = s.astype(str).agg(" | ".join, axis=1)
            s = pd.Series(s)

    # If numpy ndarray (2D), flatten similarly
    if isinstance(s, np.ndarray):
        if s.ndim > 1:
            s = pd.Series([" | ".join(map(str, row)) for row in s])
        else:
            s = pd.Series(s)

    # now operate assuming s is a Series
    if not isinstance(s, pd.Series):
        s = pd.Series(s)

    if s.empty:
        return s

    if pd.api.types.is_numeric_dtype(s):
        return s

    s2 = s.astype(str).str.strip()
    s2 = s2.replace({"": np.nan, "nan": np.nan, "None": np.nan})
    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)
    return pd.to_numeric(s2, errors="coerce")



def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Normalize headers
    - Try numeric coercion
    - Try datetime coercion
    - Fallback to string
    """
    df = df.copy()
    df.columns = [_normalize_header_name(c) for c in df.columns]

    # Drop fully empty cols
    df = df.dropna(axis=1, how="all")

    for col in df.columns:
        col_data = df[col]

        # If selection returned a DataFrame (duplicate labels or multi-col cell),
        # flatten to a single Series.
        if isinstance(col_data, pd.DataFrame):
            if col_data.shape[1] == 1:
                col_data = col_data.iloc[:, 0]
            else:
                col_data = col_data.astype(str).agg(" | ".join, axis=1)
                col_data = pd.Series(col_data, index=df.index)
        elif isinstance(col_data, np.ndarray):
            if getattr(col_data, "ndim", 1) > 1:
                col_data = pd.Series([" | ".join(map(str, row)) for row in col_data], index=df.index)
            else:
                col_data = pd.Series(col_data, index=df.index)

        # Ensure we are working with a Series
        if not isinstance(col_data, pd.Series):
            col_data = pd.Series(col_data, index=df.index)

        # Try numeric
        numeric = _to_numeric_series(col_data)
        if numeric.notna().sum() >= max(1, int(0.3 * len(df))):
            df[col] = numeric
            continue

        # Try datetime
        dt = pd.to_datetime(col_data, errors="coerce", infer_datetime_format=True)
        if dt.notna().sum() >= max(1, int(0.7 * len(df))):
            df[col] = dt
            continue

        # Fallback string
        df[col] = col_data.astype(str).fillna("")

    # Fill NaNs
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
    result = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            s = df[col].dropna()
            result[col] = {
                "count": int(s.count()),
                "min": float(s.min()) if not s.empty else None,
                "max": float(s.max()) if not s.empty else None,
                "mean": float(s.mean()) if not s.empty else None,
                "sum": float(s.sum()) if not s.empty else None,
            }
        else:
            top = df[col].astype(str).value_counts().head(5).to_dict()
            result[col] = {"unique": int(df[col].nunique()), "top_values": top}
    return result
