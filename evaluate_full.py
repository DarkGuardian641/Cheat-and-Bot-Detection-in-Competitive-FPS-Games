import pandas as pd, joblib, json, pathlib
from ml.evaluate import evaluate_model

# Load model and test data
model = joblib.load('models/detector_baseline.joblib')
test_df = pd.read_parquet('data/processed/test_features.parquet')

FEATURE_COLS = [
    "mean_angular_velocity",
    "max_angular_velocity",
    "std_angular_velocity",
    "mean_speed",
    "max_speed",
    "std_speed",
]
X_test = test_df[FEATURE_COLS]
y_test = test_df["is_cheater"]

metrics = evaluate_model(model, X_test, y_test)
print(json.dumps(metrics, indent=2))
