"""
ml/train.py
===========
Full model-improvement pipeline:

1. Load train / test splits (or prepare them from CS2CD).
2. Train three candidate models:
      a) XGBoost          – strong gradient-boosted baseline
      b) Random Forest    – diverse ensemble, good OOB estimate
      c) Isolation Forest – unsupervised anomaly screener
3. Hyperparameter tuning with RandomizedSearchCV (XGB & RF).
4. Per-model threshold optimisation (maximise F1, cap FPR ≤ 10 %).
5. Side-by-side comparison table; select the best model by PR-AUC.
6. Save best model + its configuration; update docs/evaluation_results.md.
7. Generalisation check: evaluate on held-out test set (unseen matches).

Usage
-----
    python -m ml.train                          # defaults
    python -m ml.train --data-dir data/processed --tune --output models/best.joblib
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from ml.dataset import load_data, prepare_dataset
from ml.evaluate import (
    compare_models,
    evaluate_model,
    find_best_threshold,
    save_evaluation_md,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────── #
# Feature columns (all 31 engineered features)
# ──────────────────────────────────────────────────────────────────────────── #

FEATURE_COLS = [
    # ── Aim kinematics ──────────────────────────────────────────
    "mean_angular_velocity",
    "max_angular_velocity",
    "std_angular_velocity",
    "mean_aim_acceleration",
    "max_aim_acceleration",
    "std_aim_acceleration",
    "mean_aim_jerk",
    "max_aim_jerk",
    "snap_score",
    "steady_aim_score",
    # ── Movement behaviour ───────────────────────────────────────
    "mean_speed",
    "max_speed",
    "std_speed",
    "mean_move_acceleration",
    "max_move_acceleration",
    "strafing_events",
    "direction_entropy",
    "movement_consistency",
    "accuracy_while_moving",
    # ── Weapon-specific behaviour ────────────────────────────────
    "weapon_accuracy",
    "headshot_pct",
    "shots_per_second",
    "recoil_yaw_std",
    "recoil_pitch_std",
    "recoil_consistency",
    "shots_vs_hits_ratio",
    # ── Reaction behaviour (zeros until visibility data present) ─
    "mean_reaction_time",
    "min_reaction_time",
    "std_reaction_time",
    "mean_alignment_latency",
    "fast_reaction_ratio",
]


# ──────────────────────────────────────────────────────────────────────────── #
# Helpers
# ──────────────────────────────────────────────────────────────────────────── #

def _resolve_feature_cols(df: pd.DataFrame) -> list[str]:
    """Return only the FEATURE_COLS that are actually present in the DataFrame."""
    present = [c for c in FEATURE_COLS if c in df.columns]
    missing = set(FEATURE_COLS) - set(present)
    if missing:
        logger.warning("Missing feature columns (will be skipped): %s", missing)
    return present


def _class_weight(y: pd.Series) -> float:
    """Scale-pos-weight for XGBoost: ratio of negatives to positives."""
    n_neg = (y == 0).sum()
    n_pos = (y == 1).sum()
    return float(n_neg / n_pos) if n_pos > 0 else 1.0


def save_model(model, output_path: str | Path, config: dict | None = None) -> None:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, out)
    logger.info("Model saved → %s", out)
    if config:
        cfg_path = out.with_suffix(".json")
        cfg_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
        logger.info("Config saved → %s", cfg_path)


# ──────────────────────────────────────────────────────────────────────────── #
# Model builders
# ──────────────────────────────────────────────────────────────────────────── #

def _build_xgb(scale_pos_weight: float = 1.0) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )


def _build_rf() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])


def _build_iforest() -> IsolationForest:
    """Unsupervised anomaly screener – trained on clean windows only."""
    return IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )


# ──────────────────────────────────────────────────────────────────────────── #
# Hyperparameter search spaces
# ──────────────────────────────────────────────────────────────────────────── #

XGB_PARAM_DIST = {
    "n_estimators":     [200, 300, 500],
    "max_depth":        [4, 5, 6, 7],
    "learning_rate":    [0.01, 0.03, 0.05, 0.1],
    "subsample":        [0.6, 0.7, 0.8, 1.0],
    "colsample_bytree": [0.6, 0.7, 0.8, 1.0],
    "min_child_weight": [1, 3, 5, 10],
    "reg_alpha":        [0, 0.1, 0.5, 1.0],
    "reg_lambda":       [1, 2, 5],
}

RF_PARAM_DIST = {
    "clf__n_estimators":   [200, 300, 500],
    "clf__max_depth":      [8, 10, 12, None],
    "clf__min_samples_leaf": [2, 5, 10],
    "clf__max_features":   ["sqrt", "log2", 0.5],
}


def tune_model(model, param_dist: dict, X_train, y_train,
               n_iter: int = 20, cv: int = 3) -> tuple:
    """
    RandomizedSearchCV tuning. Returns (best_estimator, best_params).
    Uses PR-AUC as the scoring metric to handle class imbalance better than
    accuracy.
    """
    searcher = RandomizedSearchCV(
        estimator=model,
        param_distributions=param_dist,
        n_iter=n_iter,
        scoring="average_precision",
        cv=cv,
        refit=True,
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )
    searcher.fit(X_train, y_train)
    logger.info("Best CV PR-AUC: %.4f | Params: %s",
                searcher.best_score_, searcher.best_params_)
    return searcher.best_estimator_, searcher.best_params_


# ──────────────────────────────────────────────────────────────────────────── #
# Isolation Forest wrapper (converts anomaly score → probability-like score)
# ──────────────────────────────────────────────────────────────────────────── #

class IForestWrapper:
    """
    Wraps IsolationForest to expose predict_proba-compatible interface
    for use with evaluate_model / find_best_threshold.
    """
    def __init__(self, iforest: IsolationForest):
        self.iforest = iforest
        self._score_min = 0.0
        self._score_range = 1.0

    def fit(self, X_clean):
        self.iforest.fit(X_clean)
        raw = -self.iforest.score_samples(X_clean)
        self._score_min   = raw.min()
        self._score_range = raw.max() - raw.min() + 1e-9
        return self

    def predict_proba(self, X):
        raw   = -self.iforest.score_samples(X)
        score = (raw - self._score_min) / self._score_range
        score = np.clip(score, 0, 1)
        return np.column_stack([1 - score, score])

    def predict(self, X, threshold: float = 0.5):
        return (self.predict_proba(X)[:, 1] >= threshold).astype(int)


# ──────────────────────────────────────────────────────────────────────────── #
# Main training pipeline
# ──────────────────────────────────────────────────────────────────────────── #

def main():
    parser = argparse.ArgumentParser(description="Improved cheat-detection training pipeline")
    parser.add_argument("--data-dir",  default="data/processed", help="Directory with train/test parquets")
    parser.add_argument("--output",    default="models/best_detector.joblib", help="Path to save best model")
    parser.add_argument("--tune",      action="store_true", help="Run hyperparameter search (slower)")
    parser.add_argument("--n-iter",    type=int, default=20, help="RandomizedSearch iterations per model")
    parser.add_argument("--max-fpr",   type=float, default=0.10, help="Max false-positive rate for threshold opt.")
    parser.add_argument("--report",    default="docs/evaluation_results.md")
    args = parser.parse_args()

    # ── 1. Load data ──────────────────────────────────────────────────────
    train_path = Path(args.data_dir) / "train_features.parquet"
    test_path  = Path(args.data_dir) / "test_features.parquet"

    if not train_path.exists() or not test_path.exists():
        logger.info("Dataset not found – downloading and preparing 100 matches …")
        prepare_dataset(total_matches=100, output_dir=args.data_dir)

    train_df = load_data(train_path)
    test_df  = load_data(test_path)

    feat_cols = _resolve_feature_cols(train_df)
    logger.info("Using %d feature columns.", len(feat_cols))

    X_train = train_df[feat_cols].fillna(0)
    y_train = train_df["is_cheater"]
    X_test  = test_df[feat_cols].fillna(0)
    y_test  = test_df["is_cheater"]

    spw = _class_weight(y_train)
    logger.info("Class balance: %.1f : 1 (neg : pos) → scale_pos_weight = %.2f", spw, spw)

    # ── 2. Build / tune models ────────────────────────────────────────────
    trained: dict = {}
    best_params: dict = {}

    # — XGBoost —
    logger.info("=== XGBoost ===")
    xgb_base = _build_xgb(scale_pos_weight=spw)
    if args.tune:
        logger.info("Tuning XGBoost …")
        xgb_tuned, xgb_params = tune_model(
            _build_xgb(scale_pos_weight=spw), XGB_PARAM_DIST,
            X_train, y_train, n_iter=args.n_iter,
        )
        trained["XGBoost"] = xgb_tuned
        best_params["XGBoost"] = xgb_params
    else:
        xgb_base.fit(X_train, y_train)
        trained["XGBoost"] = xgb_base

    # — Random Forest —
    logger.info("=== Random Forest ===")
    rf_base = _build_rf()
    if args.tune:
        logger.info("Tuning Random Forest …")
        rf_tuned, rf_params = tune_model(
            _build_rf(), RF_PARAM_DIST,
            X_train, y_train, n_iter=args.n_iter,
        )
        trained["RandomForest"] = rf_tuned
        best_params["RandomForest"] = rf_params
    else:
        rf_base.fit(X_train, y_train)
        trained["RandomForest"] = rf_base

    # — Isolation Forest (unsupervised; trained only on clean windows) —
    logger.info("=== Isolation Forest ===")
    X_clean = X_train[y_train == 0]
    iforest = IForestWrapper(_build_iforest()).fit(X_clean)
    trained["IsolationForest"] = iforest

    # ── 3. Threshold optimisation (on training set, by CV fold ideally) ──
    logger.info("=== Threshold optimisation (max FPR = %.0f%%) ===", args.max_fpr * 100)
    opt_thresholds: dict[str, float] = {}
    for name, mdl in trained.items():
        t, m = find_best_threshold(mdl, X_train, y_train, max_fpr=args.max_fpr)
        opt_thresholds[name] = t
        logger.info("  %s → threshold = %.2f  |  F1 = %.4f  |  FPR = %.4f",
                    name, t, m["f1"], m["false_positive_rate"])

    # ── 4. Compare models on held-out test set ───────────────────────────
    logger.info("=== Test-set evaluation ===")
    comparison = compare_models(trained, X_test, y_test, thresholds=opt_thresholds)
    print("\n" + comparison.to_string(index=False))

    # ── 5. Select best model by PR-AUC ───────────────────────────────────
    test_metrics = {
        name: evaluate_model(mdl, X_test, y_test,
                              threshold=opt_thresholds.get(name, 0.5),
                              model_name=name)
        for name, mdl in trained.items()
    }
    best_name = max(test_metrics, key=lambda n: test_metrics[n]["pr_auc"])
    best_metrics = test_metrics[best_name]
    logger.info("Best model: %s  (PR-AUC = %.4f)", best_name, best_metrics["pr_auc"])

    # ── 6. Save best model + config ──────────────────────────────────────
    config = {
        "model_name":   best_name,
        "threshold":    opt_thresholds.get(best_name, 0.5),
        "feature_cols": feat_cols,
        "pr_auc":       best_metrics["pr_auc"],
        "roc_auc":      best_metrics["roc_auc"],
        "f1":           best_metrics["f1"],
        "tuned":        args.tune,
        "hyperparams":  best_params.get(best_name, {}),
    }
    save_model(trained[best_name], args.output, config=config)

    # ── 7. Generalisation check (log FP / FN breakdown) ──────────────────
    logger.info("=== Generalisation check ===")
    for name, m in test_metrics.items():
        logger.info(
            "  %-20s | TP=%d FP=%d FN=%d TN=%d | FPR=%.3f FNR=%.3f",
            name, m["tp"], m["fp"], m["fn"], m["tn"],
            m["false_positive_rate"], m["false_negative_rate"],
        )

    # ── 8. Write evaluation report ────────────────────────────────────────
    extra_notes = (
        f"Tuning: {'RandomizedSearchCV (n_iter=' + str(args.n_iter) + ')' if args.tune else 'disabled'}.\n"
        f"Threshold optimised to maximise F1 with FPR ≤ {args.max_fpr:.0%}.\n"
        f"Reaction-time features are zero-padded stubs pending visibility-timestamp data.\n"
        f"Models trained on {len(X_train):,} windows, evaluated on {len(X_test):,} unseen windows."
    )
    save_evaluation_md(
        comparison_df=comparison,
        best_model_metrics=best_metrics,
        output_path=args.report,
        extra_notes=extra_notes,
    )


if __name__ == "__main__":
    main()
