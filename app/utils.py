import pandas as pd

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Basic cleaning function: drops empty columns and fills NaNs."""
    df = df.dropna(axis=1, how="all")
    df = df.fillna("")
    return df
