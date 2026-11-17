import io
import json
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.parser import validate_demo_file, CS2DemoParser
from backend.pipeline import (
    preprocess_telemetry,
    generate_windows,
    predict_windows,
    aggregate_analysis,
    load_model_and_config,
)

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_upload_invalid_extension():
    fake_txt = io.BytesIO(b"Hello world not a demo")
    res = client.post(
        "/api/upload",
        files={"file": ("test.txt", fake_txt, "text/plain")},
    )
    assert res.status_code == 400
    assert "Only Counter-Strike 2 (.dem) replay files are supported" in res.json()["detail"]


def test_upload_empty_demo():
    empty_dem = io.BytesIO(b"")
    res = client.post(
        "/api/upload",
        files={"file": ("empty.dem", empty_dem, "application/octet-stream")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


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

    # Test 256-tick window generation
    meta_df, feat_df = generate_windows(clean_df, window_ticks=256, step_ticks=128)
    assert len(meta_df) == len(feat_df)
    assert len(meta_df) > 0
    assert "mean_angular_velocity" in feat_df.columns
    assert "snap_score" in feat_df.columns
    assert "mean_speed" in feat_df.columns
    assert "direction_entropy" in feat_df.columns

    # Test prediction
    model, config = load_model_and_config()
    probs, preds = predict_windows(model, config, feat_df)
    assert len(probs) == len(feat_df)
    assert len(preds) == len(feat_df)
    assert all(0.0 <= p <= 1.0 for p in probs)

    # Test aggregation
    summary = aggregate_analysis(
        metadata_df=meta_df,
        features_df=feat_df,
        probs=probs,
        preds=preds,
        threshold=config.get("threshold", 0.5),
    )
    assert summary["status"] == "completed"
    assert summary["total_windows"] == len(feat_df)
    assert steamid in summary["player_summaries"]
    assert "suspicious_ratio" in summary["player_summaries"][steamid]
