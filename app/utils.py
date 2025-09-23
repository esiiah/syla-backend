# app/utils.py
import os
import re
from typing import Optional

import numpy as np
import pandas as pd

# === DATAFRAME UTILS ===

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

# --- Header normalization
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

def _ensure_unique_columns(cols):
    out = []
    counts = {}
    for c in cols:
        base = "" if c is None else str(c).strip()
        if base == "":
            base = "column"
        if base in counts:
            counts[base] += 1
            out.append(f"{base}_{counts[base]}")
        else:
            counts[base] = 0
            out.append(base)
    return out

# --- Numeric conversion
def _to_numeric_series(s):
    """Robust numeric coercion for Series, DataFrame, ndarray."""
    if s is None:
        return pd.Series([], dtype=float)

    if isinstance(s, pd.DataFrame):
        if s.shape[1] == 1:
            s = s.iloc[:, 0]
        else:
            s = pd.Series(s.astype(str).agg(" | ".join, axis=1), index=s.index)

    if isinstance(s, np.ndarray):
        if s.ndim > 1:
            s = pd.Series([" | ".join(map(str, row)) for row in s])
        else:
            s = pd.Series(s)

    if not isinstance(s, pd.Series):
        s = pd.Series(s)

    if s.empty:
        return s

    def _safe_str(v):
        if isinstance(v, (list, tuple, set, np.ndarray)):
            return " | ".join(map(str, v.flatten() if isinstance(v, np.ndarray) else v))
        if pd.isna(v):
            return ""
        return str(v)

    s2 = s.map(_safe_str).str.strip()
    s2 = s2.replace({"": np.nan})

    s2 = s2.replace(to_replace=CURRENCY_SIGNS, value="", regex=True)
    s2 = s2.replace(to_replace=THOUSAND_SEP, value="", regex=True)
    s2 = s2.replace(to_replace=PERCENT, value="", regex=True)

    return pd.to_numeric(s2, errors="coerce")

# --- DataFrame cleaning
def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [_normalize_header_name(c) for c in df.columns]
    df.columns = _ensure_unique_columns(df.columns)
    df = df.dropna(axis=1, how="all")

    for i in range(df.shape[1]):
        col_series = df.iloc[:, i]

        def _collapse_val(v):
            if isinstance(v, (list, tuple, set, np.ndarray)):
                return " | ".join(map(str, v.flatten() if isinstance(v, np.ndarray) else v))
            return v

        s = col_series.map(_collapse_val)

        numeric = _to_numeric_series(s)
        if numeric.notna().sum() >= max(1, int(0.3 * len(df))):
            df.iloc[:, i] = numeric.fillna(0)
            continue

        dt = pd.to_datetime(s.astype(str), errors="coerce", infer_datetime_format=True)
        if dt.notna().sum() >= max(1, int(0.7 * len(df))):
            df.iloc[:, i] = dt
            continue

        df.iloc[:, i] = s.map(lambda x: "" if pd.isna(x) else str(x)).fillna("")

    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(0)
    for col in df.columns.difference(df.select_dtypes(include=[np.number]).columns):
        df[col] = df[col].fillna("")

    return df

# --- Column type detection
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

# --- Summarize numeric/categorical columns
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
