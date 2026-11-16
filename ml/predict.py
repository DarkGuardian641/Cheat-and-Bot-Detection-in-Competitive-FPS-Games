import joblib
from pathlib import Path
import numpy as np

def load_detector_model(model_path: str | Path):
    return joblib.load(model_path)

def score_player_windows(model, feature_matrix: np.ndarray) -> np.ndarray:
    """
    Score sliding telemetry windows for a player.
    Returns suspicion / anomaly score between 0.0 and 1.0.
    """
    if hasattr(model, "predict_proba"):
        return model.predict_proba(feature_matrix)[:, 1]
    return model.predict(feature_matrix)
