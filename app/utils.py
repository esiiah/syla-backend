# backend/utils.py
import re
import pandas as pd
import numpy as np

CURRENCY_SIGNS = r"[₹$€£¥]"
THOUSAND_SEP = r","
PERCENT = r"%"

# Map approximate header names to canonical names (optional)
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
    """
    Try to coerce a series to numeric by removing currency symbols, commas, percent sign.
    If coercion fails, return original series.
    """
    if s is None or s.empty:
        return s

    # Already numeric
    if pd.api.types.is_numeric_dtype(s):
        return s

    s2 = s.astype(str).str.strip()
    s2 = s2.replace({"": np.nan, "nan": np.nan, "None": np.nan})
    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)
    # convert commas used as decimals (rare) not handled here
    return pd.to_numeric(s2, errors="coerce")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Normalize headers (mapping) but keep them unique (main.main handles duplicate numbering).
    - Try to coerce columns to numeric where possible.
    - Try to detect datetimes and coerce if majority parse.
    - Drop columns fully empty and fill NaNs (numbers -> 0, categorical -> '')
    """
    # normalize header names (mapping common names)
    df = df.copy()
    df.columns = [_normalize_header_name(c) for c in df.columns]

    # Drop empty-all columns early
    df = df.dropna(axis=1, how="all")

    # Coerce numeric candidates
    for col in df.columns:
        # try numeric conversion
        numeric = _to_numeric_series(df[col])
        if numeric.notna().sum() >= max(1, int(0.3 * len(df))):  # at least 30% parseable
            df[col] = numeric
        else:
            # try datetime if many parse
            try:
                dt = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                if dt.notna().sum() >= max(1, int(0.7 * len(df))):  # 70% datetime parse
                    df[col] = dt
                else:
                    # leave as string/ categorical
                    df[col] = df[col].astype(str).fillna("")
            except Exception:
                df[col] = df[col].astype(str).fillna("")

    # After type conversions, fill numeric columns with 0 and categorical with ""
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
    """
    Return a summary for each column. For numeric columns: count,min,max,mean,sum.
    For non-numeric: unique count and top values.
    """
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
            # categorical summary
            top = df[col].astype(str).value_counts().head(5).to_dict()
            result[col] = {"unique": int(df[col].nunique()), "top_values": top}
    return result
