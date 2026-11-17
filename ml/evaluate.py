"""
ml/evaluate.py
==============
Evaluation utilities for the cheat / bot detection pipeline.

Provides
--------
* evaluate_model      – full metrics at a given threshold
* find_best_threshold – optimise threshold on PR curve to maximise F1
                        while capping the false-positive rate
* compare_models      – side-by-side metric table for a list of models
* save_evaluation_md  – write / update docs/evaluation_results.md
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    auc,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
)


# ──────────────────────────────────────────────────────────────────────────── #
# Core evaluation
# ──────────────────────────────────────────────────────────────────────────── #

def evaluate_model(
    model,
    X_test,
    y_test,
    threshold: float = 0.5,
    model_name: str = "model",
) -> dict:
    """
    Compute full evaluation metrics for a classifier at the given threshold.

    Returns a dict with:
        roc_auc, pr_auc, f1, precision, recall,
        false_positive_rate, false_negative_rate,
        confusion_matrix (list[list[int]]),
        classification_report (dict),
        threshold (float)
    """
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_test)[:, 1]
    elif hasattr(model, "decision_function"):
        raw = model.decision_function(X_test)
        probs = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    else:
        probs = model.predict(X_test).astype(float)

    preds = (probs >= threshold).astype(int)
    y_arr = np.asarray(y_test)

    unique = np.unique(y_arr)
    if len(unique) > 1:
        roc_auc = float(roc_auc_score(y_arr, probs))
        prec_curve, rec_curve, _ = precision_recall_curve(y_arr, probs)
        pr_auc = float(auc(rec_curve, prec_curve))
    else:
        roc_auc = 1.0 if np.all(preds == y_arr) else 0.0
        pr_auc  = float(np.mean(preds == y_arr))

    report = classification_report(y_arr, preds, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_arr, preds)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    f1  = report.get("1", report.get("1.0", {})).get("f1-score", 0.0)
    prec = report.get("1", report.get("1.0", {})).get("precision", 0.0)
    rec  = report.get("1", report.get("1.0", {})).get("recall", 0.0)

    return {
        "model_name":           model_name,
        "threshold":            threshold,
        "roc_auc":              roc_auc,
        "pr_auc":               pr_auc,
        "f1":                   f1,
        "precision":            prec,
        "recall":               rec,
        "false_positive_rate":  fpr,
        "false_negative_rate":  fnr,
        "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
        "confusion_matrix":     cm.tolist(),
        "classification_report": report,
    }


# ──────────────────────────────────────────────────────────────────────────── #
# Threshold optimisation
# ──────────────────────────────────────────────────────────────────────────── #

def find_best_threshold(
    model,
    X_val,
    y_val,
    max_fpr: float = 0.10,
    metric: str = "f1",
) -> tuple[float, dict]:
    """
    Sweep the precision-recall curve to find the threshold that maximises
    `metric` (default: F1) while keeping FPR ≤ `max_fpr`.

    Returns (best_threshold, metrics_at_best_threshold).
    """
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_val)[:, 1]
    elif hasattr(model, "decision_function"):
        raw = model.decision_function(X_val)
        probs = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    else:
        return 0.5, evaluate_model(model, X_val, y_val, threshold=0.5)

    y_arr = np.asarray(y_val)
    thresholds = np.linspace(0.05, 0.95, 91)

    best_thresh = 0.5
    best_score  = -1.0

    for t in thresholds:
        preds = (probs >= t).astype(int)
        cm = confusion_matrix(y_arr, preds)
        if cm.size < 4:
            continue
        tn, fp, fn, tp = cm.ravel()
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        if fpr > max_fpr:
            continue

        rep = classification_report(y_arr, preds, output_dict=True, zero_division=0)
        score = rep.get("1", rep.get("1.0", {})).get(metric, 0.0)
        if score > best_score:
            best_score  = score
            best_thresh = float(t)

    metrics = evaluate_model(model, X_val, y_val, threshold=best_thresh)
    return best_thresh, metrics


# ──────────────────────────────────────────────────────────────────────────── #
# Multi-model comparison
# ──────────────────────────────────────────────────────────────────────────── #

def compare_models(
    models: dict,          # {name: fitted_model}
    X_test,
    y_test,
    thresholds: dict | None = None,   # {name: threshold} or None → 0.5
) -> pd.DataFrame:
    """
    Return a DataFrame with one row per model showing key metrics.
    """
    rows = []
    thresholds = thresholds or {}
    for name, mdl in models.items():
        t = thresholds.get(name, 0.5)
        m = evaluate_model(mdl, X_test, y_test, threshold=t, model_name=name)
        rows.append({
            "Model":     name,
            "Threshold": f"{t:.2f}",
            "ROC-AUC":   f"{m['roc_auc']:.4f}",
            "PR-AUC":    f"{m['pr_auc']:.4f}",
            "F1":        f"{m['f1']:.4f}",
            "Precision": f"{m['precision']:.4f}",
            "Recall":    f"{m['recall']:.4f}",
            "FPR":       f"{m['false_positive_rate']:.4f}",
            "FNR":       f"{m['false_negative_rate']:.4f}",
            "TP": m["tp"], "FP": m["fp"], "FN": m["fn"], "TN": m["tn"],
        })
    return pd.DataFrame(rows)


# ──────────────────────────────────────────────────────────────────────────── #
# Markdown report writer
# ──────────────────────────────────────────────────────────────────────────── #

def save_evaluation_md(
    comparison_df: pd.DataFrame,
    best_model_metrics: dict,
    output_path: str | Path = "docs/evaluation_results.md",
    extra_notes: str = "",
) -> None:
    """Write a human-readable evaluation report to `output_path`."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    m = best_model_metrics
    cm = m["confusion_matrix"]
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")

    md = f"""# Cheat Detection – Evaluation Results

> Last updated: {ts}

---

## Model Comparison

{comparison_df.to_markdown(index=False)}

---

## Best Model: `{m['model_name']}` (threshold = {m['threshold']:.2f})

| Metric | Value |
|--------|-------|
| ROC-AUC | {m['roc_auc']:.4f} |
| PR-AUC  | {m['pr_auc']:.4f}  |
| F1      | {m['f1']:.4f}      |
| Precision | {m['precision']:.4f} |
| Recall    | {m['recall']:.4f}    |
| False-Positive Rate | {m['false_positive_rate']:.4f} |
| False-Negative Rate | {m['false_negative_rate']:.4f} |

### Confusion Matrix

|  | Predicted Clean | Predicted Cheater |
|---|---|---|
| **Actually Clean**   | {cm[0][0]} (TN) | {cm[0][1]} (FP) |
| **Actually Cheater** | {cm[1][0]} (FN) | {cm[1][1]} (TP) |

### False-Positive Analysis
- **{cm[0][1]}** legitimate players flagged as cheaters out of **{cm[0][0] + cm[0][1]}** clean windows.
- FPR = {m['false_positive_rate']:.2%} — this is the fraction of clean windows incorrectly flagged.

### False-Negative Analysis
- **{cm[1][0]}** cheater windows missed out of **{cm[1][0] + cm[1][1]}** cheater windows.
- FNR = {m['false_negative_rate']:.2%} — this is the fraction of cheaters that slipped through.

---

## Notes
{extra_notes if extra_notes else '_No additional notes._'}
"""
    out.write_text(md, encoding="utf-8")
    print(f"Evaluation report saved → {out}")
