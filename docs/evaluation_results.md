# Cheat Detection – Evaluation Results

> Last updated: 2026-11-17 01:31

---

## Model Comparison

| Model           |   Threshold |   ROC-AUC |   PR-AUC |     F1 |   Precision |   Recall |    FPR |    FNR |   TP |   FP |    FN |    TN |
|:----------------|------------:|----------:|---------:|-------:|------------:|---------:|-------:|-------:|-----:|-----:|------:|------:|
| XGBoost         |        0.61 |    0.7127 |   0.5143 | 0.3498 |      0.5686 |   0.2526 | 0.0666 | 0.7474 | 7060 | 5356 | 20885 | 75105 |
| RandomForest    |        0.61 |    0.7006 |   0.5041 | 0.3026 |      0.644  |   0.1978 | 0.038  | 0.8022 | 5527 | 3055 | 22418 | 77406 |
| IsolationForest |        0.26 |    0.4866 |   0.2573 | 0.1185 |      0.2551 |   0.0772 | 0.0783 | 0.9228 | 2157 | 6298 | 25788 | 74163 |

---

## Best Model: `XGBoost` (threshold = 0.61)

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.7127 |
| PR-AUC  | 0.5143  |
| F1      | 0.3498      |
| Precision | 0.5686 |
| Recall    | 0.2526    |
| False-Positive Rate | 0.0666 |
| False-Negative Rate | 0.7474 |

### Confusion Matrix

|  | Predicted Clean | Predicted Cheater |
|---|---|---|
| **Actually Clean**   | 75105 (TN) | 5356 (FP) |
| **Actually Cheater** | 20885 (FN) | 7060 (TP) |

### False-Positive Analysis
- **5356** legitimate players flagged as cheaters out of **80461** clean windows.
- FPR = 6.66% — this is the fraction of clean windows incorrectly flagged.

### False-Negative Analysis
- **20885** cheater windows missed out of **27945** cheater windows.
- FNR = 74.74% — this is the fraction of cheaters that slipped through.

---

## Notes
Tuning: RandomizedSearchCV (n_iter=30).
Threshold optimised to maximise F1 with FPR ≤ 8%.
Reaction-time features are zero-padded stubs pending visibility-timestamp data.
Models trained on 399,156 windows, evaluated on 108,406 unseen windows.
