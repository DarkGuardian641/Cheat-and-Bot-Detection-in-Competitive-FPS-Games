from pathlib import Path
import pandas as pd

def load_data(file_path: Path | str) -> pd.DataFrame:
    """Load dataset from Parquet or CSV."""
    p = Path(file_path)
    return pd.read_parquet(p) if p.suffix == ".parquet" else pd.read_csv(p)

def split_by_match(df: pd.DataFrame, match_col: str = "match_id", test_size: float = 0.2):
    """
    Split dataset ensuring all records from a given match stay in either
    train or test, preventing data leakage across rounds/ticks.
    """
    unique_matches = df[match_col].drop_duplicates().sample(frac=1.0, random_state=42)
    n_test = int(len(unique_matches) * test_size)
    test_matches = set(unique_matches.iloc[:n_test])

    train_df = df[~df[match_col].isin(test_matches)]
    test_df = df[df[match_col].isin(test_matches)]
    return train_df, test_df
