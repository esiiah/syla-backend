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
        try:
            if re.match(pattern, n, flags=re.IGNORECASE):
                return target
        except re.error:
            continue
    return n


def _ensure_unique_columns(cols):
    """Make columns unique after any normalization: name, name_1, name_2..."""
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


def _to_numeric_series(s):
    """
    Accepts Series, DataFrame, ndarray.
    Returns a pd.Series of numerics where possible.
    Safely handles nested objects and NaN.
    """
    if s is None:
        return pd.Series([], dtype=float)

    # Convert DataFrame -> Series by joining columns per-row
    if isinstance(s, pd.DataFrame):
        if s.shape[1] == 1:
            s = s.iloc[:, 0]
        else:
            s = pd.Series(s.astype(str).agg(" | ".join, axis=1), index=s.index)

    if isinstance(s, np.ndarray):
        if s.ndim > 1:
            s = pd.Series([" | ".join(map(str, row)) for row in s], index=getattr(s, "index", None))
        else:
            s = pd.Series(s)

    if not isinstance(s, pd.Series):
        s = pd.Series(s)

    if s.empty:
        return s

    # Collapse nested structures safely
    def _safe_str(v):
        if isinstance(v, (list, tuple, set, np.ndarray)):
            return " | ".join(map(str, v.flatten() if isinstance(v, np.ndarray) else v))
        if pd.isna(v):
            return ""
        return str(v)

    s2 = s.map(_safe_str).str.strip()
    s2 = s2.replace({"": np.nan})

    # Remove currency symbols, thousands separators, percentages
    s2 = s2.str.replace(CURRENCY_SIGNS, "", regex=True)
    s2 = s2.str.replace(THOUSAND_SEP, "", regex=True)
    s2 = s2.str.replace(PERCENT, "", regex=True)

    return pd.to_numeric(s2, errors="coerce")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Robust cleaning:
      - normalize headers (then re-unique)
      - collapse multi-column cells or array-like cells into single string per-row
      - coerce numeric/date when appropriate
      - ensure operations use positional access to avoid label-duplication issues
    """
    df = df.copy()

    # Normalize header names
    df.columns = [_normalize_header_name(c) for c in df.columns]

    # Make sure normalization didn't create duplicates
    df.columns = _ensure_unique_columns(df.columns)

    # Remove entirely empty columns
    df = df.dropna(axis=1, how="all")

    # Process columns by position
    for i in range(df.shape[1]):
        col_series = df.iloc[:, i]

        # Collapse nested structures to simple strings
        def _collapse_val(v):
            if isinstance(v, (list, tuple, set, np.ndarray)):
                return " | ".join(map(str, v.flatten() if isinstance(v, np.ndarray) else v))
            return v

        s = col_series.map(_collapse_val)

        # Try numeric coercion (if >=30% parse numeric)
        numeric = _to_numeric_series(s)
        if numeric.notna().sum() >= max(1, int(0.3 * len(df))):
            df.iloc[:, i] = numeric.fillna(0)
            continue

        # Try datetime (if >=70% parse to datetime)
        dt = pd.to_datetime(s.astype(str), errors="coerce", infer_datetime_format=True)
        if dt.notna().sum() >= max(1, int(0.7 * len(df))):
            df.iloc[:, i] = dt
            continue

        # Fallback to string
        df.iloc[:, i] = s.map(lambda x: "" if pd.isna(x) else str(x)).fillna("")

    # final fills: numeric cols -> fill 0, others -> fill ""
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(0)
    for col in df.columns.difference(df.select_dtypes(include=[np.number]).columns):
        df[col] = df[col].fillna("")

    return df


def detect_column_types(df: pd.DataFrame) -> dict:
    """Return a dict of column_name -> 'numeric'|'datetime'|'categorical'"""
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
    """Summarize numeric columns, fallback to top categorical values"""
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
