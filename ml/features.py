"""
ml/features.py
==============
Player-behaviour feature extraction for cheat / bot detection.

Design principles
-----------------
* Context-aware: features are always relative (std, entropy, ratios) so that
  weapon type, tick-rate differences, and game-situation variance don't alone
  flag a player as a cheater.
* Modular: one function per behavioural category so callers can mix and match.
* Safe defaults: every function handles empty / too-short arrays gracefully.
"""

import numpy as np

# ──────────────────────────────────────────────────────────────────────────── #
# Low-level derivative helpers
# ──────────────────────────────────────────────────────────────────────────── #

def _safe_dt(dt: np.ndarray) -> np.ndarray:
    """Replace near-zero time deltas to avoid division by zero."""
    return np.maximum(dt, 1e-5)


def _derivative(arr: np.ndarray, dt: np.ndarray) -> np.ndarray:
    """First-order finite-difference derivative."""
    if len(arr) < 2:
        return np.array([])
    d = np.diff(arr)
    # dt may be the original tick dt (len == len(arr)), so trim to match diff output
    dt_trimmed = _safe_dt(dt)[-len(d):]
    return d / dt_trimmed


def _second_derivative(arr: np.ndarray, dt: np.ndarray) -> np.ndarray:
    """Second-order derivative (acceleration)."""
    return _derivative(_derivative(arr, dt), dt)


def _third_derivative(arr: np.ndarray, dt: np.ndarray) -> np.ndarray:
    """Third-order derivative (jerk)."""
    return _derivative(_second_derivative(arr, dt), dt)


def _circular_diff(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Signed angular difference on the [-180, +180] circle."""
    return (a - b + 180.0) % 360.0 - 180.0


def _safe_stat(arr: np.ndarray, fn) -> float:
    """Return fn(arr) or 0.0 when arr is empty."""
    return float(fn(arr)) if len(arr) > 0 else 0.0


# ──────────────────────────────────────────────────────────────────────────── #
# 1. Aim kinematics
# ──────────────────────────────────────────────────────────────────────────── #

def _snap_score(angular_vel: np.ndarray, std_factor: float = 3.0) -> float:
    """
    Count velocity spikes that exceed `std_factor × std`.
    Normalised by window length to be tick-rate independent.
    """
    if len(angular_vel) < 2:
        return 0.0
    threshold = std_factor * np.std(angular_vel)
    return float(np.sum(angular_vel > threshold)) / len(angular_vel)


def extract_aim_features(yaw: np.ndarray, pitch: np.ndarray, dt: np.ndarray) -> dict:
    """
    Aim kinematics: angular velocity, acceleration, jerk, snap detection,
    and a steady-aim consistency score.

    Parameters
    ----------
    yaw, pitch : angles in degrees (one per tick in the window)
    dt         : time delta between consecutive ticks (len == len(yaw))
    """
    if len(yaw) < 4:
        return {
            "mean_angular_velocity": 0.0, "max_angular_velocity": 0.0,
            "std_angular_velocity": 0.0,
            "mean_aim_acceleration": 0.0, "max_aim_acceleration": 0.0,
            "std_aim_acceleration": 0.0,
            "mean_aim_jerk": 0.0, "max_aim_jerk": 0.0,
            "snap_score": 0.0,
            "steady_aim_score": 0.0,
        }

    dt_s = _safe_dt(dt)
    dyaw = _circular_diff(yaw[1:], yaw[:-1])
    dpitch = np.diff(pitch)
    angular_dist = np.sqrt(dyaw ** 2 + dpitch ** 2)
    angular_vel = angular_dist / dt_s[1:]

    accel = _derivative(angular_vel, dt)
    jerk = _derivative(accel, dt)

    std_vel = _safe_stat(angular_vel, np.std)
    # steady-aim: low relative std → score approaches 1; capped at [0, 1]
    mean_vel = _safe_stat(angular_vel, np.mean) + 1e-9
    steady_score = float(np.clip(1.0 - std_vel / (mean_vel + std_vel + 1e-9), 0.0, 1.0))

    return {
        "mean_angular_velocity":  _safe_stat(angular_vel, np.mean),
        "max_angular_velocity":   _safe_stat(angular_vel, np.max),
        "std_angular_velocity":   std_vel,
        "mean_aim_acceleration":  _safe_stat(accel, np.mean),
        "max_aim_acceleration":   _safe_stat(accel, np.max),
        "std_aim_acceleration":   _safe_stat(accel, np.std),
        "mean_aim_jerk":          _safe_stat(jerk, np.mean),
        "max_aim_jerk":           _safe_stat(jerk, np.max),
        "snap_score":             _snap_score(angular_vel),
        "steady_aim_score":       steady_score,
    }


# ──────────────────────────────────────────────────────────────────────────── #
# 2. Reaction behaviour
# ──────────────────────────────────────────────────────────────────────────── #

def extract_reaction_features(
    visibility_ts: np.ndarray,
    fire_ts: np.ndarray,
    crosshair_align_ts: np.ndarray,
) -> dict:
    """
    Reaction-time statistics.

    * Returns zeros when visibility timestamps are absent (the current dataset
      does not expose them). The fields remain in the schema so that future
      data with visibility info is a drop-in upgrade.
    * A fast reaction alone is NOT evidence of cheating; the feature is used
      in combination with other signals.
    """
    if len(visibility_ts) == 0 or len(fire_ts) == 0:
        return {
            "mean_reaction_time":    0.0,
            "min_reaction_time":     0.0,
            "std_reaction_time":     0.0,
            "mean_alignment_latency": 0.0,
            "fast_reaction_ratio":   0.0,
        }

    n = min(len(visibility_ts), len(fire_ts), len(crosshair_align_ts))
    vis = visibility_ts[:n]
    fir = fire_ts[:n]
    aln = crosshair_align_ts[:n]

    reaction = np.clip(fir - vis, 0, None)          # negative = impossible; clip
    alignment = np.clip(aln - vis, 0, None)

    # "fast" threshold: 80 ms is roughly human lower bound; below that is
    # suspicious in COMBINATION with other features, not alone
    fast_ratio = float(np.mean(reaction < 0.08)) if len(reaction) else 0.0

    return {
        "mean_reaction_time":    _safe_stat(reaction, np.mean),
        "min_reaction_time":     _safe_stat(reaction, np.min),
        "std_reaction_time":     _safe_stat(reaction, np.std),
        "mean_alignment_latency": _safe_stat(alignment, np.mean),
        "fast_reaction_ratio":   fast_ratio,
    }


# ──────────────────────────────────────────────────────────────────────────── #
# 3. Movement behaviour
# ──────────────────────────────────────────────────────────────────────────── #

def extract_movement_features(
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    dt: np.ndarray,
    shot_flags: np.ndarray | None = None,
    hit_flags: np.ndarray | None = None,
) -> dict:
    """
    Movement kinematics: speed, acceleration, strafing events, direction
    entropy (consistency), and accuracy-while-moving.

    Parameters
    ----------
    x, y, z     : player position per tick
    dt          : time delta per tick
    shot_flags  : 1 when a shot occurred (same length as x); may be None
    hit_flags   : 1 when shot hit a target; may be None
    """
    if len(x) < 3:
        return {
            "mean_speed": 0.0, "max_speed": 0.0, "std_speed": 0.0,
            "mean_move_acceleration": 0.0, "max_move_acceleration": 0.0,
            "strafing_events": 0,
            "direction_entropy": 0.0,
            "movement_consistency": 0.0,
            "accuracy_while_moving": 0.0,
        }

    dt_s = _safe_dt(dt)
    dx = np.diff(x)
    dy = np.diff(y)
    dz = np.diff(z)
    dist = np.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
    speed = dist / dt_s[1:]

    accel = _derivative(speed, dt)

    # Strafing – sign changes in lateral (x-axis) velocity
    sign_x = np.sign(dx)
    sign_x[sign_x == 0] = 1          # treat zero as forward
    strafing_events = int(np.sum(np.abs(np.diff(sign_x)) > 0))

    # Direction entropy – uniform distribution → high entropy → unpredictable
    dir_angles = np.arctan2(dy, dx)
    hist, _ = np.histogram(dir_angles, bins=16, range=(-np.pi, np.pi))
    hist_norm = hist / (hist.sum() + 1e-12)
    direction_entropy = float(-np.sum(hist_norm * np.log(hist_norm + 1e-12)))

    # Movement consistency – inverse of coefficient of variation of speed
    std_speed = _safe_stat(speed, np.std)
    mean_speed = _safe_stat(speed, np.mean) + 1e-9
    movement_consistency = float(np.clip(1.0 - std_speed / (mean_speed + std_speed + 1e-9), 0.0, 1.0))

    # Accuracy while moving: hit-rate restricted to ticks where speed > threshold
    accuracy_while_moving = 0.0
    if shot_flags is not None and hit_flags is not None:
        # align arrays – shot_flags has same length as x (not dx)
        sf = np.asarray(shot_flags, dtype=float)[:len(dx)]
        hf = np.asarray(hit_flags, dtype=float)[:len(dx)]
        moving_mask = speed > 10.0            # arbitrary unit threshold (tune per game)
        shots_while_moving = sf[moving_mask].sum()
        hits_while_moving = hf[moving_mask].sum()
        if shots_while_moving > 0:
            accuracy_while_moving = float(hits_while_moving / shots_while_moving)

    return {
        "mean_speed":             _safe_stat(speed, np.mean),
        "max_speed":              _safe_stat(speed, np.max),
        "std_speed":              std_speed,
        "mean_move_acceleration": _safe_stat(accel, np.mean),
        "max_move_acceleration":  _safe_stat(accel, np.max),
        "strafing_events":        strafing_events,
        "direction_entropy":      direction_entropy,
        "movement_consistency":   movement_consistency,
        "accuracy_while_moving":  accuracy_while_moving,
    }


# ──────────────────────────────────────────────────────────────────────────── #
# 4. Weapon-specific behaviour
# ──────────────────────────────────────────────────────────────────────────── #

def extract_weapon_features(
    weapon_ids: np.ndarray,
    shot_flags: np.ndarray,
    hit_flags: np.ndarray,
    headshot_flags: np.ndarray,
    recoil_yaw: np.ndarray,
    recoil_pitch: np.ndarray,
    dt: np.ndarray | None = None,
) -> dict:
    """
    Weapon-specific stats: accuracy, head-shot %, shots-per-second, recoil
    variability, and weapon-normalised accuracy (per unique weapon ID).

    Accuracy ratios are contextual: a 60 % HS rate on a pistol differs from
    an AWP. These features are intended for use alongside weapon_id as an
    additional input to the model, not as standalone triggers.
    """
    empty = {
        "weapon_accuracy":        0.0,
        "headshot_pct":           0.0,
        "shots_per_second":       0.0,
        "recoil_yaw_std":         0.0,
        "recoil_pitch_std":       0.0,
        "recoil_consistency":     0.0,
        "shots_vs_hits_ratio":    0.0,
    }

    if len(shot_flags) == 0:
        return empty

    total_shots = int(np.sum(shot_flags))
    total_hits = int(np.sum(hit_flags))
    total_hs = int(np.sum(headshot_flags))

    if total_shots == 0:
        return empty

    weapon_accuracy = total_hits / total_shots
    headshot_pct = total_hs / total_hits if total_hits > 0 else 0.0
    shots_vs_hits = total_shots / (total_hits + 1)      # ratio, never zero

    # Shots per second – use dt if available
    if dt is not None and len(dt) > 1:
        window_duration = float(np.sum(dt))
    else:
        window_duration = 1.0
    shots_per_second = total_shots / max(window_duration, 1e-3)

    # Recoil variability (yaw & pitch separately)
    ry_std = float(np.std(recoil_yaw)) if len(recoil_yaw) > 1 else 0.0
    rp_std = float(np.std(recoil_pitch)) if len(recoil_pitch) > 1 else 0.0

    # Recoil consistency: low combined variability → suspicious spray control
    recoil_consistency = float(np.clip(
        1.0 - (ry_std + rp_std) / (np.abs(np.mean(recoil_yaw) if len(recoil_yaw) else 1) + ry_std + rp_std + 1e-9),
        0.0, 1.0
    ))

    return {
        "weapon_accuracy":    float(weapon_accuracy),
        "headshot_pct":       float(headshot_pct),
        "shots_per_second":   float(shots_per_second),
        "recoil_yaw_std":     ry_std,
        "recoil_pitch_std":   rp_std,
        "recoil_consistency": recoil_consistency,
        "shots_vs_hits_ratio": float(shots_vs_hits),
    }
