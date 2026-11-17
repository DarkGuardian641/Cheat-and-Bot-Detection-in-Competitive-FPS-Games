"""
backend/pipeline.py
===================
End-to-end pipeline to convert real CS2 .dem files into ML predictions.

Steps:
1. Parse demo telemetry and game events using demoparser2.
2. Clean and preprocess extracted telemetry and merge event signals (shots/hits/kills).
3. Generate 256-tick sliding windows (128-tick step) per player.
4. Extract 31 ML kinematic & behavioral features matching ml.features.
5. Perform model inference with thresholding and anomaly/suspicion scoring.
6. Aggregate results at player and match level.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from ml.features import (
    extract_aim_features,
    extract_movement_features,
    extract_weapon_features,
    extract_reaction_features,
)

logger = logging.getLogger(__name__)


def load_model_and_config(
    model_path: Optional[str | Path] = None,
    config_path: Optional[str | Path] = None,
) -> Tuple[Any, Dict[str, Any]]:
    """
    Load trained cheat detector model and its configuration.
    Falls back to best_detector or detector_baseline if available.
    """
    root_dir = Path(__file__).resolve().parent.parent
    models_dir = root_dir / "models"

    # Auto-resolve model path
    if model_path is None:
        if (models_dir / "best_detector.joblib").exists():
            model_path = models_dir / "best_detector.joblib"
        elif (models_dir / "detector_baseline.joblib").exists():
            model_path = models_dir / "detector_baseline.joblib"
        else:
            raise FileNotFoundError(f"No trained model found in {models_dir}")
    else:
        model_path = Path(model_path)

    # Auto-resolve config path
    if config_path is None:
        cfg_candidate = model_path.with_suffix(".json")
        if cfg_candidate.exists():
            config_path = cfg_candidate
        elif (models_dir / "best_detector.json").exists():
            config_path = models_dir / "best_detector.json"

    model = joblib.load(model_path)

    config = {}
    if config_path and Path(config_path).exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    # Fallback default configuration if config json missing
    if "feature_cols" not in config:
        config["feature_cols"] = [
            "mean_angular_velocity", "max_angular_velocity", "std_angular_velocity",
            "mean_aim_acceleration", "max_aim_acceleration", "std_aim_acceleration",
            "mean_aim_jerk", "max_aim_jerk", "snap_score", "steady_aim_score",
            "mean_speed", "max_speed", "std_speed",
            "mean_move_acceleration", "max_move_acceleration", "strafing_events",
            "direction_entropy", "movement_consistency", "accuracy_while_moving",
            "weapon_accuracy", "headshot_pct", "shots_per_second",
            "recoil_yaw_std", "recoil_pitch_std", "recoil_consistency", "shots_vs_hits_ratio",
            "mean_reaction_time", "min_reaction_time", "std_reaction_time",
            "mean_alignment_latency", "fast_reaction_ratio",
        ]
    if "threshold" not in config:
        config["threshold"] = 0.50

    return model, config


def preprocess_telemetry(
    telemetry_df: pd.DataFrame,
    events: Optional[Dict[str, pd.DataFrame]] = None,
) -> pd.DataFrame:
    """
    Clean telemetry data, fill missing values, and merge event flags (shots, hits, kills).
    """
    df = telemetry_df.copy()

    # Ensure required columns exist
    for col in ["X", "Y", "Z", "pitch", "yaw"]:
        if col not in df.columns:
            df[col] = 0.0

    # Fill NaN values using forward/backward fill per player
    coord_cols = ["X", "Y", "Z", "pitch", "yaw"]
    df[coord_cols] = df.groupby("steamid")[coord_cols].ffill().bfill().fillna(0.0)

    # Handle game_time / seconds
    if "game_time" not in df.columns:
        if "seconds" in df.columns:
            df["game_time"] = df["seconds"]
        else:
            # Estimate from tick (assume 64 tick base)
            df["game_time"] = df["tick"] / 64.0

    df["game_time"] = df["game_time"].fillna(0.0)

    # Alive flag
    if "is_alive" not in df.columns:
        df["is_alive"] = True
    else:
        df["is_alive"] = df["is_alive"].fillna(True).astype(bool)

    # Initialize event indicator columns
    df["shot"] = 0
    df["hit"] = 0
    df["headshot"] = 0

    if events:
        # Merge weapon_fire events -> shot flag
        fire_df = events.get("weapon_fire")
        if fire_df is not None and not fire_df.empty and "tick" in fire_df.columns:
            # Player id resolution in event
            user_col = "user_steamid" if "user_steamid" in fire_df.columns else "user_id"
            if user_col in fire_df.columns:
                fire_df["user_id_str"] = fire_df[user_col].astype(str)
                fire_ticks = set(zip(fire_df["user_id_str"], fire_df["tick"]))
                df["shot"] = [1 if (str(s), t) in fire_ticks else 0 for s, t in zip(df["steamid"], df["tick"])]

        # Merge player_hurt / player_death -> hit and headshot flags
        hurt_df = events.get("player_hurt")
        if hurt_df is not None and not hurt_df.empty and "tick" in hurt_df.columns:
            att_col = "attacker_steamid" if "attacker_steamid" in hurt_df.columns else "attacker_id"
            if att_col in hurt_df.columns:
                hurt_df["att_id_str"] = hurt_df[att_col].astype(str)
                hits = set(zip(hurt_df["att_id_str"], hurt_df["tick"]))
                df["hit"] = [1 if (str(s), t) in hits else 0 for s, t in zip(df["steamid"], df["tick"])]

        death_df = events.get("player_death")
        if death_df is not None and not death_df.empty and "tick" in death_df.columns:
            att_col = "attacker_steamid" if "attacker_steamid" in death_df.columns else "attacker_id"
            if att_col in death_df.columns and "headshot" in death_df.columns:
                death_df["att_id_str"] = death_df[att_col].astype(str)
                hs_deaths = death_df[death_df["headshot"] == True]
                headshots = set(zip(hs_deaths["att_id_str"], hs_deaths["tick"]))
                df["headshot"] = [1 if (str(s), t) in headshots else 0 for s, t in zip(df["steamid"], df["tick"])]

    return df


def generate_windows(
    telemetry_df: pd.DataFrame,
    window_ticks: int = 256,
    step_ticks: int = 128,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Divide player telemetry into 256-tick sliding windows and compute feature vectors.

    Returns:
    - metadata_df: window identifiers (steamid, player_name, start_tick, end_tick)
    - features_df: engineered 31 features ready for ML inference
    """
    meta_records = []
    feature_records = []

    alive_df = telemetry_df[telemetry_df["is_alive"] == True].sort_values("tick")

    for steamid, player_df in alive_df.groupby("steamid"):
        if len(player_df) < window_ticks:
            continue

        player_name = str(player_df.get("player_name", pd.Series(["Unknown"])).iloc[0])
        ticks = player_df["tick"].values
        g_time = player_df["game_time"].values
        yaw = player_df["yaw"].values
        pitch = player_df["pitch"].values
        x = player_df["X"].values
        y = player_df["Y"].values
        z = player_df["Z"].values
        shot_arr = player_df.get("shot", pd.Series(0, index=player_df.index)).values
        hit_arr = player_df.get("hit", pd.Series(0, index=player_df.index)).values
        hs_arr = player_df.get("headshot", pd.Series(0, index=player_df.index)).values

        n_ticks = len(player_df)
        for start in range(0, n_ticks - window_ticks + 1, step_ticks):
            end = start + window_ticks

            w_time = g_time[start:end]
            dt = np.diff(w_time, prepend=w_time[0])

            # 1. Aim kinematics
            aim = extract_aim_features(yaw[start:end], pitch[start:end], dt)

            # 2. Movement behaviour
            move = extract_movement_features(
                x[start:end], y[start:end], z[start:end], dt,
                shot_flags=shot_arr[start:end],
                hit_flags=hit_arr[start:end],
            )

            # 3. Weapon behaviour
            weapon = extract_weapon_features(
                weapon_ids=np.array([]),
                shot_flags=shot_arr[start:end],
                hit_flags=hit_arr[start:end],
                headshot_flags=hs_arr[start:end],
                recoil_yaw=np.zeros(window_ticks),
                recoil_pitch=np.zeros(window_ticks),
                dt=dt,
            )

            # 4. Reaction behaviour
            reaction = extract_reaction_features(
                visibility_ts=np.array([]),
                fire_ts=np.array([]),
                crosshair_align_ts=np.array([]),
            )

            window_features = {
                **aim,
                **move,
                **weapon,
                **reaction,
            }

            meta_records.append({
                "steamid": str(steamid),
                "player_name": player_name,
                "start_tick": int(ticks[start]),
                "end_tick": int(ticks[end - 1]),
                "start_time": float(w_time[0]),
                "end_time": float(w_time[-1]),
            })
            feature_records.append(window_features)

    metadata_df = pd.DataFrame(meta_records)
    features_df = pd.DataFrame(feature_records)
    return metadata_df, features_df


def predict_windows(
    model: Any,
    config: Dict[str, Any],
    features_df: pd.DataFrame,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Run model inference on feature matrix.
    Returns:
    - probabilities (float 0.0 - 1.0)
    - predictions (0 for clean, 1 for suspicious/cheater)
    """
    if features_df.empty:
        return np.array([]), np.array([])

    feature_cols = config.get("feature_cols", list(features_df.columns))
    # Align columns
    present_cols = [c for c in feature_cols if c in features_df.columns]
    X = features_df[present_cols].copy()
    for missing_col in set(feature_cols) - set(present_cols):
        X[missing_col] = 0.0
    X = X[feature_cols].fillna(0.0).values

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X)[:, 1]
    elif hasattr(model, "decision_function"):
        raw = model.decision_function(X)
        probs = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    else:
        probs = model.predict(X).astype(float)

    threshold = float(config.get("threshold", 0.50))
    preds = (probs >= threshold).astype(int)
    return probs, preds


def aggregate_analysis(
    metadata_df: pd.DataFrame,
    features_df: pd.DataFrame,
    probs: np.ndarray,
    preds: np.ndarray,
    threshold: float,
    match_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Aggregate window-level predictions at player and match level.
    """
    if metadata_df.empty or len(probs) == 0:
        return {
            "match_info": match_info or {},
            "status": "completed",
            "total_windows": 0,
            "suspicious_windows_count": 0,
            "suspicious_players": [],
            "player_summaries": {},
            "evidence_windows": [],
        }

    results_df = metadata_df.copy()
    results_df["suspicion_score"] = probs
    results_df["is_suspicious"] = preds

    # Aggregate by player
    player_summaries = {}
    suspicious_players = []

    for steamid, p_df in results_df.groupby("steamid"):
        player_name = p_df["player_name"].iloc[0]
        total_w = len(p_df)
        sus_w = int(p_df["is_suspicious"].sum())
        mean_score = float(p_df["suspicion_score"].mean())
        max_score = float(p_df["suspicion_score"].max())
        pct_suspicious = float(sus_w / total_w) if total_w > 0 else 0.0

        summary = {
            "steamid": steamid,
            "player_name": player_name,
            "total_windows": total_w,
            "suspicious_windows": sus_w,
            "suspicious_ratio": round(pct_suspicious, 4),
            "mean_suspicion_score": round(mean_score, 4),
            "max_suspicion_score": round(max_score, 4),
            "status": "Flagged" if (pct_suspicious >= 0.15 or sus_w >= 5) else "Clean",
        }
        player_summaries[steamid] = summary
        if summary["status"] == "Flagged":
            suspicious_players.append(summary)

    # Sort evidence windows (highest suspicion score first)
    evidence_df = results_df[results_df["is_suspicious"] == 1].sort_values("suspicion_score", ascending=False)
    evidence_windows = []
    for _, row in evidence_df.head(50).iterrows():
        evidence_windows.append({
            "steamid": row["steamid"],
            "player_name": row["player_name"],
            "start_tick": int(row["start_tick"]),
            "end_tick": int(row["end_tick"]),
            "start_time": round(float(row["start_time"]), 2),
            "end_time": round(float(row["end_time"]), 2),
            "suspicion_score": round(float(row["suspicion_score"]), 4),
        })

    return {
        "match_info": match_info or {},
        "status": "completed",
        "threshold_used": threshold,
        "total_windows": len(results_df),
        "suspicious_windows_count": int(results_df["is_suspicious"].sum()),
        "suspicious_players": sorted(suspicious_players, key=lambda x: x["suspicious_ratio"], reverse=True),
        "player_summaries": player_summaries,
        "evidence_windows": evidence_windows,
    }


def analyze_demo_file(
    demo_path: str | Path,
    model_path: Optional[str | Path] = None,
    config_path: Optional[str | Path] = None,
    output_dir: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """
    Complete end-to-end demo analysis:
    - Parses CS2 .dem
    - Preprocesses telemetry
    - Slices 256-tick windows
    - Runs ML inference
    - Aggregates and saves analysis report
    """
    demo_file = Path(demo_path)
    from backend.parser import CS2DemoParser
    parser = CS2DemoParser(demo_file)

    logger.info("Parsing telemetry and events from %s...", demo_file.name)
    telemetry, events, header = parser.parse_full()

    logger.info("Preprocessing telemetry (rows: %d)...", len(telemetry))
    clean_df = preprocess_telemetry(telemetry, events)

    logger.info("Extracting 256-tick windows...")
    metadata_df, features_df = generate_windows(clean_df, window_ticks=256, step_ticks=128)
    logger.info("Extracted %d sliding windows.", len(features_df))

    logger.info("Loading model and running predictions...")
    model, config = load_model_and_config(model_path, config_path)
    probs, preds = predict_windows(model, config, features_df)

    match_info = {
        "demo_filename": demo_file.name,
        "map_name": header.get("map_name", "unknown"),
        "server_name": header.get("server_name", "unknown"),
        "model_name": config.get("model_name", "Detector"),
    }

    report = aggregate_analysis(
        metadata_df=metadata_df,
        features_df=features_df,
        probs=probs,
        preds=preds,
        threshold=config.get("threshold", 0.50),
        match_info=match_info,
    )

    if output_dir:
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / f"{demo_file.stem}_analysis.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logger.info("Saved analysis report to %s", report_file)

    return report
