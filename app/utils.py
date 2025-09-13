import re
import numpy as np
import pandas as pd

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
        if re.match(pattern, n, flags=re.IGNORECASE):
            return target
    return n


def _to_numeric_series(s: pd.Series) -> pd.Series:
    """
    Robust numeric coercion.  Forces Series to string first,
    so .str methods never hit a DataFrame or numeric dtype.
    """
    if s is None or s.empty:
        return s

    # Always work on a string copy
    s2 = s.astype(str).str.strip()

    # normalise blanks / NA markers
    s2 = s2.replace({"": np.nan, "nan": np.nan, "None": np.nan})

    # remove currency signs, thousand separators, percent sign
    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)

    return pd.to_numeric(s2, errors="coerce")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generic cleaner:
      • normalise headers
      • collapse list/array cells to plain strings
      • try numeric, then datetime, else keep as string
    Works even with duplicate columns already deduped.
    """
    df = df.copy()

    # normalise header names
    df.columns = [str(_normalize_header_name(c)) for c in df.columns]

    # drop columns that are completely empty
    df = df.dropna(axis=1, how="all")

    for col in df.columns:
        s = df[col]

        # collapse list / ndarray cells to single string per row
        def _collapse_val(v):
            if isinstance(v, (list, tuple, set)):
                return " | ".join(map(str, v))
            if isinstance(v, np.ndarray):
                return " | ".join(map(str, v.flatten().tolist()))
            return v
        s = s.map(_collapse_val)

        # ---- 1️⃣ Try numeric ----
        numeric = _to_numeric_series(s)
        if numeric.notna().sum() >= max(1, int(0.3 * len(df))):
            df[col] = numeric.fillna(0)
            continue

        # ---- 2️⃣ Try datetime ----
        dt = pd.to_datetime(s.astype(str), errors="coerce", infer_datetime_format=True)
        if dt.notna().sum() >= max(1, int(0.7 * len(df))):
            df[col] = dt
            continue

        # ---- 3️⃣ Fallback: plain string ----
        df[col] = s.astype(str).fillna("")

    # final fill for non-numeric columns to remove NaN
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
