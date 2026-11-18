import numpy as np
import pandas as pd

from backend.parser import validate_demo_file
from backend.pipeline import (
    aggregate_analysis,
    generate_windows,
    load_model_and_config,
    predict_windows,
    preprocess_telemetry,
)


def test_validate_demo_file_checks(tmp_path):
    # 1. Non-existent file
    valid, msg = validate_demo_file(tmp_path / "does_not_exist.dem")
    assert not valid
    assert "not exist" in msg.lower()

    # 2. Invalid extension
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("not a demo")
    valid, msg = validate_demo_file(txt_file)
    assert not valid
    assert "extension" in msg.lower()

    # 3. Empty file
    empty_dem = tmp_path / "empty.dem"
    empty_dem.touch()
    valid, msg = validate_demo_file(empty_dem)
    assert not valid
    assert "empty" in msg.lower()

    # 4. Valid demo format with magic bytes
    valid_dem = tmp_path / "valid.dem"
    valid_dem.write_bytes(b"HL2DEMO\x00" + b"\x00" * 50)
    valid, msg = validate_demo_file(valid_dem)
    assert valid
    assert msg == "Valid"


def test_model_loading_and_config():
    model, config = load_model_and_config()
    assert model is not None
    assert "feature_cols" in config
    assert len(config["feature_cols"]) == 31
    assert "threshold" in config
    # Best detector threshold calibrated at 0.61
    assert config["threshold"] == 0.61


def test_pipeline_preprocessing_and_windows():
    # Synthetic telemetry for 1 player over 300 ticks
    ticks = np.arange(1000, 1300)
    steamid = "76561198000000001"
    raw_df = pd.DataFrame({
        "tick": ticks,
        "seconds": ticks * 0.015,
        "steamid": steamid,
        "player_name": "TestPlayer",
        "is_alive": True,
        "X": np.linspace(0, 100, 300),
        "Y": np.linspace(0, 50, 300),
        "Z": np.zeros(300),
        "pitch": np.sin(ticks) * 10,
        "yaw": (ticks % 360) - 180,
    })

    # Test preprocessing
    clean_df = preprocess_telemetry(raw_df)
    assert not clean_df.empty
    assert "shot" in clean_df.columns
    assert "hit" in clean_df.columns
    assert "headshot" in clean_df.columns

    # Test 256-tick window generation
    meta_df, feat_df = generate_windows(clean_df, window_ticks=256, step_ticks=128)
    assert len(meta_df) == len(feat_df)
    assert len(meta_df) > 0

    # Test feature compatibility
    model, config = load_model_and_config()
    for col in config["feature_cols"]:
        assert col in feat_df.columns, f"Feature column missing: {col}"

    # Test prediction output
    probs, preds = predict_windows(model, config, feat_df)
    assert len(probs) == len(feat_df)
    assert len(preds) == len(feat_df)
    assert all(0.0 <= p <= 1.0 for p in probs)
    assert all(p in (0, 1) for p in preds)

    # Test aggregation
    summary = aggregate_analysis(
        metadata_df=meta_df,
        features_df=feat_df,
        probs=probs,
        preds=preds,
        threshold=config.get("threshold", 0.61),
    )
    assert summary["status"] == "completed"
    assert summary["total_windows"] == len(feat_df)
    assert steamid in summary["player_summaries"]
    p_sum = summary["player_summaries"][steamid]
    assert "suspicious_ratio" in p_sum
    assert p_sum["status"] in ("Clean", "Flagged")


def test_preprocessing_does_not_mutate_event_frames():
    telemetry = pd.DataFrame({
        "tick": [1],
        "steamid": ["123"],
        "is_alive": [True],
    })
    fire_events = pd.DataFrame({"tick": [1], "user_steamid": ["123"]})
    events = {"weapon_fire": fire_events}

    preprocess_telemetry(telemetry, events)

    assert list(fire_events.columns) == ["tick", "user_steamid"]


def test_empty_windows_handling():
    # If telemetry is shorter than window_ticks
    short_df = pd.DataFrame({
        "tick": [1, 2],
        "seconds": [0.01, 0.02],
        "steamid": ["123", "123"],
        "player_name": ["Short", "Short"],
        "is_alive": [True, True],
        "X": [0.0, 1.0],
        "Y": [0.0, 1.0],
        "Z": [0.0, 0.0],
        "pitch": [0.0, 0.0],
        "yaw": [0.0, 0.0],
    })
    meta_df, feat_df = generate_windows(short_df, window_ticks=256, step_ticks=128)
    assert meta_df.empty
    assert feat_df.empty

    model, config = load_model_and_config()
    probs, preds = predict_windows(model, config, feat_df)
    assert len(probs) == 0
    assert len(preds) == 0

    summary = aggregate_analysis(meta_df, feat_df, probs, preds, 0.61)
    assert summary["total_windows"] == 0
    assert summary["suspicious_players"] == []
