import numpy as np
import pandas as pd

def circular_angle_diff(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Calculate circular angle difference handling -180 to +180 wrap-around."""
    return (a - b + 180) % 360 - 180

def extract_aim_features(yaw: np.ndarray, pitch: np.ndarray, dt: np.ndarray) -> dict:
    """
    Extract aim kinematics: angular velocity, acceleration, and jerk.
    Used to detect sudden snap-to-target aimbot patterns.
    """
    dt_safe = np.maximum(dt, 1e-5)
    dyaw = circular_angle_diff(yaw[1:], yaw[:-1])
    dpitch = np.diff(pitch)
    angular_dist = np.sqrt(dyaw**2 + dpitch**2)
    angular_velocity = angular_dist / dt_safe[1:]

    return {
        "mean_angular_velocity": float(np.mean(angular_velocity)) if len(angular_velocity) else 0.0,
        "max_angular_velocity": float(np.max(angular_velocity)) if len(angular_velocity) else 0.0,
        "std_angular_velocity": float(np.std(angular_velocity)) if len(angular_velocity) else 0.0,
    }

def extract_movement_features(x: np.ndarray, y: np.ndarray, z: np.ndarray, dt: np.ndarray) -> dict:
    """
    Extract movement kinematics: speed, acceleration, and path entropy.
    Used to detect scripted bot pathing or erratic spinbotting.
    """
    dt_safe = np.maximum(dt, 1e-5)
    dx = np.diff(x)
    dy = np.diff(y)
    dz = np.diff(z)
    distance = np.sqrt(dx**2 + dy**2 + dz**2)
    velocity = distance / dt_safe[1:]

    return {
        "mean_speed": float(np.mean(velocity)) if len(velocity) else 0.0,
        "max_speed": float(np.max(velocity)) if len(velocity) else 0.0,
        "std_speed": float(np.std(velocity)) if len(velocity) else 0.0,
    }
