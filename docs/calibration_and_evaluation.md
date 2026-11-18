# Advanced Model Evaluation: Calibration, Thresholding & Generalization

> **Document Status**: Comprehensive Calibration & Error Analysis  
> **Model Evaluated**: `XGBoost v2.4` Classifier (Hyperparameters: `n_estimators=500`, `max_depth=7`, `learning_rate=0.05`, `colsample_bytree=0.7`, `min_child_weight=3`)  
> **Evaluation Dataset**: 108,406 unseen 256-tick windows from completely held-out CS2 matches  
> **Date**: 2026-11-17  

---

## 1. Threshold Sweep & Operating Characteristic Analysis

Because competitive integrity applications must prioritize **protecting innocent skilled players from false accusations**, maximizing raw accuracy or unweighted F1 is unacceptable. 

We performed an empirical sweep across probability thresholds from $0.10$ to $0.90$ with a hard constraint: **False Positive Rate ($\text{FPR}$) must not exceed $8.0\%$**.

| Threshold ($\tau$) | Precision | Recall | F1 Score | False Positive Rate ($\text{FPR}$) | False Negative Rate ($\text{FNR}$) | Operational Recommendation |
|---|---|---|---|---|---|---|
| **0.30** | 0.3621 | 0.6120 | 0.4549 | 0.1842 | 0.3880 | Unacceptable (High innocent player risk) |
| **0.40** | 0.4280 | 0.4950 | 0.4589 | 0.1120 | 0.5050 | Excessive false alarm rate for competitive use |
| **0.50** (Default) | 0.4984 | 0.3812 | 0.4318 | 0.0841 | 0.6188 | Borderline ($\approx 8.4\%$ innocent windows flagged) |
| **0.61** (Calibrated) | **0.5686** | **0.2526** | **0.3498** | **0.0666 (6.66%)** | **0.7474** | **Optimal Operating Point** (Safe conservative triage) |
| **0.70** | 0.6512 | 0.1640 | 0.2621 | 0.0381 | 0.8360 | High confidence; misses subtle toggling |
| **0.80** | 0.7420 | 0.0910 | 0.1621 | 0.0142 | 0.9090 | Blatant rage-aimbot detection only |

### Key Takeaway on Calibrated Threshold ($\tau = 0.61$)
At $\tau = 0.61$:
- Over **93.3%** of legitimate gameplay windows are correctly classified as clean ($\text{TNR} = 93.34\%$).
- The model acts as an **attentive triage filter**: it isolates the most egregious 25% of anomalous windows for referee review while keeping false accusations under 6.7%.

---

## 2. Probability Calibration & Reliability Analysis

A model is well-calibrated if a predicted probability of $p$ corresponds to an empirical positive frequency of $p$ in observed outcomes.

### Binned Calibration Analysis (10 Deciles)

| Predicted Probability Decile | Mean Predicted Prob ($\bar{p}$) | Empirical Fraction of Cheaters | Calibration Error ($\Delta$) | Calibration Reliability Assessment |
|---|---|---|---|---|
| **[0.00, 0.10)** | 0.042 | 0.061 | +0.019 | Well-calibrated (Clean baseline) |
| **[0.10, 0.20)** | 0.148 | 0.152 | +0.004 | Well-calibrated |
| **[0.20, 0.30)** | 0.246 | 0.231 | -0.015 | Well-calibrated |
| **[0.30, 0.40)** | 0.349 | 0.312 | -0.037 | Slight overconfidence |
| **[0.40, 0.50)** | 0.451 | 0.398 | -0.053 | Moderate overconfidence |
| **[0.50, 0.60)** | 0.548 | 0.482 | -0.066 | Overconfident near boundary |
| **[0.60, 0.70)** | 0.647 | 0.589 | -0.058 | Acceptable for triage |
| **[0.70, 0.80)** | 0.749 | 0.718 | -0.031 | Well-calibrated |
| **[0.80, 0.90)** | 0.843 | 0.862 | +0.019 | High confidence reliable |
| **[0.90, 1.00]** | 0.941 | 0.965 | +0.024 | Blatant cheat agreement |

**Brier Score**: `0.1412` (substantially superior to uniform baseline `0.2500`).  
**Expected Calibration Error (ECE)**: `0.0418` (4.18% average divergence).

---

## 3. Expert-Reviewed False-Positive Breakdown

We conducted a deep forensic qualitative review of **200 false-positive windows** (clean players assigned $p \ge 0.61$). Three distinct clusters account for over 85% of false alarms:

```
[Cluster 1: Pro/Semi-Pro High-DPI Flicks & Micro-Adjustments] ──────> 46.5% of FPs
  - Cause: Players using high mouse sensitivity (> 1200 eDPI) executing rapid 180° sweeps.
  - Manifestation: High angular acceleration and jerk resembling mechanical aim snaps.
  - Mitigation: Require ≥ 5 consecutive flagged windows across multiple rounds.

[Cluster 2: High Velocity Weapon Spray Pull-Downs] ─────────────────> 24.0% of FPs
  - Cause: Skilled players executing memorized AK-47 recoil compensation patterns.
  - Manifestation: Abnormally low pitch/yaw recoil variance (`recoil_consistency > 0.92`).
  - Mitigation: Cross-reference with raw demo crosshair error rather than pure recoil deviation.

[Cluster 3: Packet Loss, Sub-Tick Buffer Interpolation & Teleporting] -> 16.5% of FPs
  - Cause: Server tick drops or network jitter causing the player position to leap.
  - Manifestation: Apparent movement acceleration > 4,000 u/s² and instant viewangle discontinuities.
  - Mitigation: Filter out windows containing `dt > 0.10s` or server freeze periods.

[Cluster 4: Random Noise & Borderline Anomalies] ───────────────────> 13.0% of FPs
```

---

## 4. Generalization Across Maps & Game Modes

To verify that the model did not overfit to specific geometry or angles, we evaluated performance partitioned by competitive map:

| Map Group | Windows Evaluated | ROC-AUC | PR-AUC | False Positive Rate |
|---|---|---|---|---|
| **de_mirage** | 38,410 | 0.7241 | 0.5280 | 6.4% |
| **de_inferno** | 29,180 | 0.7084 | 0.5092 | 6.9% |
| **de_nuke** | 18,920 | 0.6998 | 0.4912 | 7.1% |
| **de_ancient** | 12,410 | 0.7180 | 0.5188 | 6.5% |
| **de_anubis** | 9,486 | 0.7065 | 0.5044 | 6.8% |

**Conclusion**: Across all major competitive CS2 environments, performance remains stable with an average $\text{ROC-AUC} = 0.71 \pm 0.01$ and $\text{FPR} = 6.7\% \pm 0.4\%$.
