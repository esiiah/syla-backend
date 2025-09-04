import re
import pandas as pd
import numpy as np

CURRENCY_SIGNS = r"[₹$€£]"
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

def _to_numeric_series(s) -> pd.Series:
    # Accept single-column DataFrames too
    if isinstance(s, pd.DataFrame) and s.shape[1] == 1:
        s = s.iloc[:, 0]
    if not isinstance(s, pd.Series):
        return s  # fallback for anything else

    if s.dtype != object:
        return s

    s2 = s.astype(str).str.strip()
    s2 = s2.replace({"": np.nan, "nan": np.nan, "None": np.nan})

    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)

    return pd.to_numeric(s2, errors="coerce")

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = _normalize_headers(df)
    for col in df.columns:
        df[col] = _to_numeric_series(df[col])
        # Try datetime conversion if still object
        if df[col].dtype == object:
            try:
                dt = pd.to_datetime(df[col], errors="raise", infer_datetime_format=True)
                if dt.notna().mean() >= 0.7:
                    df[col] = dt
            except Exception:
                pass
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
        s = nums[col]
        result[col] = {
            "count": int(s.count()),
            "min": float(s.min()) if s.count() else 0.0,
            "max": float(s.max()) if s.count() else 0.0,
            "mean": float(s.mean()) if s.count() else 0.0,
            "sum": float(s.sum()) if s.count() else 0.0,
        }
    return result
