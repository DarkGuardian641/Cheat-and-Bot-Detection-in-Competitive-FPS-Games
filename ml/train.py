import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

def train_baseline(X_train, y_train, model_type: str = "xgboost"):
    """Train either XGBoost or Random Forest baseline."""
    if model_type == "xgboost":
        model = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
    else:
        model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)

    model.fit(X_train, y_train)
    return model

def save_model(model, output_path: str | Path):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
