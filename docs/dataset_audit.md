# Dataset & Label Audit: CS2CD (Counter-Strike 2 Cheat Detection)

> **Document Status**: Comprehensive Audit & Provenance Report  
> **Target Dataset**: [CS2CD on Hugging Face (`CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection`)](https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection)  
> **Audit Date**: 2026-11-17  
> **Author**: ML & Data Engineering Team  

---

## 1. Executive Summary & Core Findings

This audit evaluates the quality, provenance, completeness, and limitations of the primary dataset used for model training and evaluation: the **CS2CD** dataset. 

While CS2CD provides a valuable collection of real-world CS2 competitive match telemetry, **several structural limitations and label-quality nuances directly impact how model outputs must be interpreted**:

1. **Match-Level vs. Player-Level Labels**: CS2CD classifies entire matches as either containing an identified cheater (`cheater`, 317 matches) or being clean (`clean`, 478 matches). In cheat matches, cheating players are identified via their Steam IDs in the metadata, while non-cheating teammates and opponents in the same match are labeled clean. However, the exact **start and end ticks** during which a cheat (e.g. aimbot toggle) was active are not annotated. As a result, when a window is labeled `is_cheater=1`, it represents gameplay by an account confirmed to have cheated during that match, but individual rounds or windows may contain passive or non-cheating gameplay (label noise).
2. **Missing Visibility & Reaction Timestamps**: The raw CS2CD tick stream does not record enemy client visibility raycasts (`visibility_ts`, `fire_ts`, `crosshair_align_ts`). Therefore, reaction-time features in the feature matrix are currently zero-padded stubs.
3. **Imbalanced Representation of Cheat Categories**: The training labels represent general match-level community/VAC bans (primarily aimbot and spinbot/anti-aim). Specialized cheat vectors like wallhacks (ESP), triggerbots, and bunnyhop movement scripts are **not individually sub-labeled** in the ground truth.
4. **License and Usage Terms**: The dataset is provided for academic, research, and non-commercial integrity investigation under open data sharing terms. Raw demos contain public Steam64 IDs and competitive tick telemetry.

---

## 2. Dataset Overview & Schema

### 2.1 File Structure & Size
- **Total Matches**: 795 official competitive CS2 matches.
  - **Clean Matches**: 478 matches.
  - **Cheater Matches**: 317 matches (containing $\ge 1$ identified cheater account).
- **Extracted 256-Tick Windows**:
  - **Training Set**: 399,156 windows (derived from 75% match-held-out split).
  - **Test Set**: 108,406 windows (derived from 25% match-held-out split).
- **Match-Held-Out Strategy**: Demos from the test set were completely held out from training (`split_by_match`) to avoid data leakage caused by player identity or map-specific crosshair habits.

### 2.2 Telemetry Field Inventory

| Field Name | In CS2CD Raw? | Extraction Status | Quality / Fidelity Note |
|---|---|---|---|
| `tick` | Yes | Extracted | Monotonically increasing 64-tick / sub-tick timeline. |
| `game_time` | Yes | Extracted | Floating-point server match time in seconds. |
| `steamid` | Yes | Extracted | 64-bit Steam ID identifying the actor. |
| `pitch`, `yaw` | Yes | Extracted | Continuous viewangles ($[-89^\circ, 89^\circ]$ and $[-180^\circ, 180^\circ]$). High precision. |
| `X`, `Y`, `Z` | Yes | Extracted | World coordinates of player origin. |
| `is_alive` | Yes | Filtered | Windows are extracted exclusively from alive sequences. |
| `shot` / `hit` | Partial | Extracted | Inferred from parsed combat event streams (`weapon_fire`, `player_hurt`). |
| `headshot` | Partial | Extracted | Hitgroup bitmask from `player_death`. |
| `visibility_ts` | **No** | **Stubbed (0.0)** | **Missing**: Parser does not log when an opponent entered the player's viewport. |
| `crosshair_align_ts` | **No** | **Stubbed (0.0)** | **Missing**: Sub-tick crosshair-to-bone raycast intersection not stored. |
| `weapon_id` | Partial | Extracted | Extracted during event parsing; weapon categories normalized. |

---

## 3. Label Provenance & Ground Truth Audit

### 3.1 How Labels Were Generated
In the CS2CD repository:
- Demos were collected from competitive matchmaking where post-match VACnet or third-party platform bans (e.g. FACEIT/ESEA) occurred.
- Cheater accounts were tagged based on confirmed ban execution and match reports.
- Clean accounts were sourced from verified high-trust / pro matchmaking pools with zero subsequent ban history over longitudinal monitoring.

### 3.2 Label Limitations & Noise Sources
1. **Window-Level Temporal Dilution**: A cheater does not toggle their cheat on every single frame. When a cheater dies early in a round, buys weapons during freeze time, or walks safely through spawn, their 256-tick window is still annotated as `is_cheater=1`. This creates **positive label noise**, explaining why the trained XGBoost model exhibits an FNR of 74.7% at strict conservative false-positive thresholds—many "cheater" windows are biologically normal gameplay.
2. **Subtle vs. Blatant Cheating**: Match collections skew toward detectable or flagged accounts. Closeted "legit-cheaters" using humanized smoothing curves ($\Delta \theta \approx 0.15^\circ/\text{tick}$) may blend into high-tier human distribution.
3. **Absence of Ground-Truth Cheat Taxonomy**: CS2CD does not supply separate binary flags for `is_aimbot`, `is_wallhack`, `is_triggerbot`, or `is_bhop`. Treating model predictions as a universal verdict oversimplifies cheat taxonomy.

---

## 4. Representativeness & Generalization

| Attribute | Training Dataset (CS2CD) | Intended Real-World Use (Match Inspector) | Assessment |
|---|---|---|---|
| **Tickrate** | 64-tick standard & early sub-tick | CS2 Sub-Tick (Valve Protocol 14041) & 128t | **Good**: Angular velocities normalize by $\Delta t$. |
| **Map Pool** | Mirage, Inferno, Nuke, Overpass, Ancient | Full Active Duty + Reserves Pool | **Good**: Normalized kinematic derivatives are map-invariant. |
| **Skill Tier** | Mid-to-high competitive matchmaking | Premier, FACEIT, amateur esports, tournament replays | **Moderate Risk**: Tier-1 pro aim can trigger false positives if thresholds are too low. |
| **Game Version** | CS2 Launch through mid-2024 patches | Current CS2 Sub-tick build | **Good**: Core viewangle formats (`demoparser2`) remain consistent. |

---

## 5. Governance & Operational Recommendations

1. **Communicate Uncertainty in User Reports**: Never present a model probability as proof of guilt. A score of `0.78` indicates an elevated statistical anomaly resembling banned accounts in CS2CD, but human review is strictly required.
2. **Explicitly Label Triggerbot & Wallhack Signals as Research / Observational**: Because visibility raycasts and spatial occlusion data are not validated in CS2CD, the platform must mark wall penetration and reaction metrics as **Contextual Observational Signals** rather than model-validated cheat categories.
3. **Maintain Conservative Decision Thresholds**: To prevent false accusations of innocent skilled players, the production threshold must remain calibrated to keep the False Positive Rate ($\text{FPR}$) strictly below $7.0\%$.
