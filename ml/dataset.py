"""
ml/dataset.py
=============
Downloads CS2CD match files from Hugging Face, extracts sliding-window
feature vectors, and saves train / test Parquet splits.

Feature groups extracted per window
------------------------------------
1. Aim kinematics      (extract_aim_features)
2. Movement behaviour  (extract_movement_features)
3. Weapon behaviour    (extract_weapon_features)
4. Reaction behaviour  (extract_reaction_features – stub until visibility
                        timestamps become available in the raw data)
"""

import argparse
import json
import logging
import os
from pathlib import Path
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import pandas as pd
from huggingface_hub import hf_hub_download, get_token
import pyarrow.parquet as pq

from ml.features import (
    extract_aim_features,
    extract_movement_features,
    extract_weapon_features,
    extract_reaction_features,
)

logger = logging.getLogger(__name__)

HF_REPO_ID = "CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection"


# ──────────────────────────────────────────────────────────────────────────── #
# Data-loading helpers
# ──────────────────────────────────────────────────────────────────────────── #

def load_data(file_path: "Path | str") -> pd.DataFrame:
    """Load a processed dataset from Parquet or CSV."""
    p = Path(file_path)
    return pd.read_parquet(p) if p.suffix == ".parquet" else pd.read_csv(p)


def _get_optional_col(df: pd.DataFrame, col: str, dtype, default) -> np.ndarray:
    """Return column values if present, otherwise an array of `default`."""
    if col in df.columns:
        return df[col].fillna(default).astype(dtype).values
    return np.full(len(df), default, dtype=dtype)


# ──────────────────────────────────────────────────────────────────────────── #
# Train / test split (by match to prevent leakage)
# ──────────────────────────────────────────────────────────────────────────── #

def split_by_match(
    df: pd.DataFrame,
    match_col: str = "match_id",
    test_size: float = 0.25,
    random_state: int = 42,
):
    """
    Stratified match-level split.
    All windows from one match stay in the same fold to prevent data leakage.
    """
    match_labels = df.groupby(match_col)["is_cheater"].max().reset_index()
    rng = dict(frac=1.0, random_state=random_state)

    cheater_matches = match_labels[match_labels["is_cheater"] == 1][match_col].sample(**rng).tolist()
    clean_matches   = match_labels[match_labels["is_cheater"] == 0][match_col].sample(**rng).tolist()

    if len(cheater_matches) >= 2 and len(clean_matches) >= 2:
        n_test_c = max(1, int(len(cheater_matches) * test_size))
        n_test_n = max(1, int(len(clean_matches)   * test_size))
        test_matches = set(cheater_matches[:n_test_c] + clean_matches[:n_test_n])
    else:
        unique = match_labels[match_col].drop_duplicates().sample(**rng)
        test_matches = set(unique.iloc[:max(1, int(len(unique) * test_size))])

    train_df = df[~df[match_col].isin(test_matches)].copy()
    test_df  = df[ df[match_col].isin(test_matches)].copy()
    return train_df, test_df


# ──────────────────────────────────────────────────────────────────────────── #
# Window extraction
# ──────────────────────────────────────────────────────────────────────────── #

def extract_match_windows(
    tick_df: pd.DataFrame,
    cheaters: "set[str]",
    match_id: str,
    window_ticks: int = 256,
    step_ticks: int = 128,
) -> pd.DataFrame:
    """
    Slice per-player tick data into sliding windows and compute all feature
    groups: aim, movement, weapon, and reaction.
    """
    records = []
    alive_df = tick_df[tick_df["is_alive"] == True].sort_values("tick")

    for steamid, player_df in alive_df.groupby("steamid"):
        if len(player_df) < window_ticks:
            continue

        is_cheater = int(steamid in cheaters)

        # Core arrays (always present)
        ticks   = player_df["tick"].values
        g_time  = player_df["game_time"].values
        yaw     = player_df["yaw"].values
        pitch   = player_df["pitch"].values
        x       = player_df["X"].values
        y       = player_df["Y"].values
        z       = player_df["Z"].values

        # Optional arrays – gracefully absent in many raw files
        shot_arr    = _get_optional_col(player_df, "shot",       int,   0)
        hit_arr     = _get_optional_col(player_df, "hit",        int,   0)
        hs_arr      = _get_optional_col(player_df, "headshot",   int,   0)
        r_yaw_arr   = _get_optional_col(player_df, "recoil_yaw", float, 0.0)
        r_pitch_arr = _get_optional_col(player_df, "recoil_pitch", float, 0.0)
        vis_arr     = _get_optional_col(player_df, "visibility_ts",   float, 0.0)
        fire_arr    = _get_optional_col(player_df, "fire_ts",         float, 0.0)
        aln_arr     = _get_optional_col(player_df, "crosshair_align_ts", float, 0.0)

        n_ticks = len(player_df)
        for start in range(0, n_ticks - window_ticks + 1, step_ticks):
            end = start + window_ticks

            w_time = g_time[start:end]
            dt = np.diff(w_time, prepend=w_time[0])

            # 1. Aim kinematics
            aim = extract_aim_features(
                yaw[start:end],
                pitch[start:end],
                dt,
            )

            # 2. Movement behaviour (pass shot / hit arrays for accuracy-while-moving)
            move = extract_movement_features(
                x[start:end],
                y[start:end],
                z[start:end],
                dt,
                shot_flags=shot_arr[start:end],
                hit_flags=hit_arr[start:end],
            )

            # 3. Weapon-specific behaviour
            weapon = extract_weapon_features(
                weapon_ids=np.array([]),        # weapon_id not in current schema
                shot_flags=shot_arr[start:end],
                hit_flags=hit_arr[start:end],
                headshot_flags=hs_arr[start:end],
                recoil_yaw=r_yaw_arr[start:end],
                recoil_pitch=r_pitch_arr[start:end],
                dt=dt,
            )

            # 4. Reaction behaviour (zeros until visibility timestamps available)
            has_vis = vis_arr[start:end].any()
            reaction = extract_reaction_features(
                visibility_ts=vis_arr[start:end]   if has_vis else np.array([]),
                fire_ts=fire_arr[start:end]        if has_vis else np.array([]),
                crosshair_align_ts=aln_arr[start:end] if has_vis else np.array([]),
            )

            records.append({
                "match_id":    match_id,
                "steamid":     steamid,
                "start_tick":  int(ticks[start]),
                "end_tick":    int(ticks[end - 1]),
                "is_cheater":  is_cheater,
                **aim,
                **move,
                **weapon,
                **reaction,
            })

    return pd.DataFrame(records)


# ──────────────────────────────────────────────────────────────────────────── #
# Single-match processor (download → extract → cache → cleanup)
# ──────────────────────────────────────────────────────────────────────────── #

def process_single_match(
    category: str,
    idx: int,
    window_ticks: int = 256,
    step_ticks: int = 128,
    interim_dir: "Path | None" = None,
    token: "str | None" = None,
) -> "pd.DataFrame | None":
    """
    Download one match, extract feature windows, cache the compact result,
    and immediately delete the raw telemetry to conserve disk space.
    """
    match_id = f"{category}/{idx}"
    slug     = f"{category}_{idx}"

    if interim_dir:
        cached = interim_dir / f"{slug}.parquet"
        if cached.exists():
            return pd.read_parquet(cached)

    tdir = tempfile.mkdtemp(prefix=f"cs2cd_{slug}_")
    try:
        active_token = token or os.environ.get("HF_TOKEN") or get_token()

        p_parq = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=f"{category}/{idx}.parquet",
            local_dir=tdir,
            repo_type="dataset",
            token=active_token,
        )
        p_json = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=f"{category}/{idx}.json",
            local_dir=tdir,
            repo_type="dataset",
            token=active_token,
        )

        with open(p_json, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        cheaters = {c["steamid"] for c in metadata.get("cheaters", [])}

        # Read only columns we know are present; extras loaded opportunistically
        base_cols = ["steamid", "tick", "is_alive", "X", "Y", "Z",
                     "pitch", "yaw", "game_time"]
        optional_cols = [
            "shot", "hit", "headshot",
            "recoil_yaw", "recoil_pitch",
            "visibility_ts", "fire_ts", "crosshair_align_ts",
        ]
        parquet_file = pq.ParquetFile(p_parq)
        available = set(parquet_file.schema_arrow.names)
        load_cols = base_cols + [c for c in optional_cols if c in available]

        tick_df = pq.read_table(p_parq, columns=load_cols).to_pandas()

        windows_df = extract_match_windows(
            tick_df,
            cheaters=cheaters,
            match_id=match_id,
            window_ticks=window_ticks,
            step_ticks=step_ticks,
        )

        if interim_dir and not windows_df.empty:
            windows_df.to_parquet(interim_dir / f"{slug}.parquet", index=False)

        return windows_df

    except Exception as exc:
        print(f"[ERROR] {match_id}: {exc}")
        return None
    finally:
        shutil.rmtree(tdir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────── #
# Top-level dataset preparation
# ──────────────────────────────────────────────────────────────────────────── #

def prepare_dataset(
    total_matches: int = 100,
    window_ticks: int = 256,
    step_ticks: int = 128,
    output_dir: "Path | str" = "data/processed",
    test_size: float = 0.2,
    max_workers: int = 3,
    token: "str | None" = None,
) -> "tuple[pd.DataFrame, pd.DataFrame]":
    """
    Download and process N matches (50 % cheater, 50 % clean).
    Raw telemetry is deleted immediately after feature extraction.
    Saves `train_features.parquet` and `test_features.parquet`.
    """
    out_dir     = Path(output_dir)
    interim_dir = out_dir / "interim"
    interim_dir.mkdir(parents=True, exist_ok=True)

    half  = total_matches // 2
    tasks = (
        [("with_cheater_present",  i) for i in range(half)] +
        [("no_cheater_present",    i) for i in range(half)]
    )

    print(f"Processing {len(tasks)} matches ({half} cheater + {half} clean) "
          f"with {max_workers} workers …")

    all_dfs   = []
    completed = 0

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(
                process_single_match, cat, idx,
                window_ticks, step_ticks, interim_dir, token,
            ): (cat, idx)
            for cat, idx in tasks
        }

        for future in as_completed(futures):
            cat, idx = futures[future]
            completed += 1
            res = future.result()
            if res is not None and not res.empty:
                n_cheat = res["is_cheater"].sum()
                print(f"[{completed:3d}/{len(tasks)}] {cat}/{idx}: "
                      f"{len(res)} windows ({n_cheat} cheater)")
                all_dfs.append(res)
            else:
                print(f"[{completed:3d}/{len(tasks)}] {cat}/{idx}: skipped / empty")

    if not all_dfs:
        raise RuntimeError("No window data was extracted from any match.")

    full_df = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal windows: {len(full_df):,} across {full_df['match_id'].nunique()} matches")
    print(f"Class breakdown:\n{full_df['is_cheater'].value_counts()}")

    train_df, test_df = split_by_match(full_df, match_col="match_id", test_size=test_size)
    print(f"Train: {len(train_df):,}  |  Test: {len(test_df):,}")

    train_path = out_dir / "train_features.parquet"
    test_path  = out_dir / "test_features.parquet"
    train_df.to_parquet(train_path, index=False)
    test_df.to_parquet(test_path,  index=False)

    print(f"Saved → {train_path}  ({os.path.getsize(train_path) / 1024**2:.2f} MB)")
    print(f"Saved → {test_path}   ({os.path.getsize(test_path)  / 1024**2:.2f} MB)")

    return train_df, test_df


# ──────────────────────────────────────────────────────────────────────────── #
# CLI entry-point
# ──────────────────────────────────────────────────────────────────────────── #

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Prepare CS2CD feature dataset with memory-efficient streaming."
    )
    parser.add_argument("--matches",  type=int, default=100)
    parser.add_argument("--workers",  type=int, default=3)
    parser.add_argument("--window",   type=int, default=256)
    parser.add_argument("--step",     type=int, default=128)
    parser.add_argument("--output",   type=str, default="data/processed")
    args = parser.parse_args()

    prepare_dataset(
        total_matches=args.matches,
        max_workers=args.workers,
        window_ticks=args.window,
        step_ticks=args.step,
        output_dir=args.output,
    )
