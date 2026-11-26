import io
import json

from fastapi.testclient import TestClient

from backend.config import settings
from backend.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "storage" in data
    assert "demos" in data["storage"]


def test_upload_valid_demo():
    # Synthetic demo with proper header magic bytes
    valid_header_bytes = b"PBDEMS\x00\x00" + b"\x00" * 100
    demo_file = io.BytesIO(valid_header_bytes)
    res = client.post("/analyses/upload", files={"file": ("test_match.dem", demo_file, "application/octet-stream")})
    assert res.status_code == 202
    data = res.json()
    assert "analysis_id" in data
    assert data["status"] == "pending"
    assert data["filename"] == "test_match.dem"

    # Verify initial analysis record was written locally
    analysis_id = data["analysis_id"]
    record_file = settings.ANALYSIS_DIR / f"{analysis_id}.json"
    assert record_file.exists()
    
    # Clean up test artifact
    record_file.unlink(missing_ok=True)
    saved_demo = settings.DEMOS_DIR / f"{analysis_id}_test_match.dem"
    saved_demo.unlink(missing_ok=True)


def test_upload_invalid_extension():
    fake_txt = io.BytesIO(b"Not a real demo file")
    res = client.post("/analyses/upload", files={"file": ("match.txt", fake_txt, "text/plain")})
    assert res.status_code == 400
    assert "Only Counter-Strike 2 (.dem) replay files or (.parquet) dataset files are supported" in res.json()["detail"]


def test_upload_parquet_valid():
    import pandas as pd
    p_df = pd.read_parquet("crazy_demos/c_match_01.parquet")
    bio = io.BytesIO()
    p_df.to_parquet(bio, index=False)
    bio.seek(0)
    res = client.post("/analyses/upload", files={"file": ("test_match.parquet", bio, "application/octet-stream")})
    assert res.status_code == 202
    data = res.json()
    assert "analysis_id" in data
    assert data["status"] == "pending"


def test_upload_empty_file():
    empty_dem = io.BytesIO(b"")
    res = client.post("/analyses/upload", files={"file": ("empty.dem", empty_dem, "application/octet-stream")})
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_upload_oversized_file(monkeypatch):
    # Temporarily set max demo size to 0.001 MB (1 KB)
    monkeypatch.setattr(settings, "MAX_DEMO_SIZE_MB", 0.001)
    large_bytes = b"HL2DEMO\x00" + b"X" * 2048  # 2 KB
    oversized = io.BytesIO(large_bytes)
    res = client.post("/analyses/upload", files={"file": ("large.dem", oversized, "application/octet-stream")})
    assert res.status_code == 400
    assert "exceeds maximum allowed size" in res.json()["detail"]


def test_analysis_status_and_results_not_found():
    res = client.get("/analyses/nonexistent_id")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    res2 = client.get("/analyses/nonexistent_id/results")
    assert res2.status_code == 404
    assert "not found" in res2.json()["detail"].lower()

    traversal = client.get("/analyses/../nonexistent_id")
    assert traversal.status_code == 404


def test_list_analyses_endpoint():
    res = client.get("/analyses")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_matches_endpoint():
    res = client.get("/matches")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_player_endpoint_with_mock_report():
    mock_id = "test_match_123"
    report_file = settings.ANALYSIS_DIR / f"{mock_id}.json"

    mock_report = {
        "analysis_id": mock_id,
        "match_id": mock_id,
        "status": "completed",
        "match_info": {"demo_filename": "test.dem"},
        "player_summaries": {
            "76561198000000001": {
                "steamid": "76561198000000001",
                "player_name": "ProShooter",
                "total_windows": 10,
                "suspicious_windows": 2,
                "suspicious_ratio": 0.20,
                "mean_suspicion_score": 0.45,
                "max_suspicion_score": 0.88,
                "status": "Flagged",
            }
        },
        "suspicious_players": [{"player_name": "ProShooter", "steamid": "76561198000000001"}],
        "evidence_windows": [],
    }

    try:
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(mock_report, f)

        # 1. GET /analyses/{analysis_id}
        res_status = client.get(f"/analyses/{mock_id}")
        assert res_status.status_code == 200
        assert res_status.json()["status"] == "completed"

        # 2. GET /analyses/{analysis_id}/results
        res_results = client.get(f"/analyses/{mock_id}/results")
        assert res_results.status_code == 200
        assert res_results.json()["analysis_id"] == mock_id

        # 3. GET /matches
        res_matches = client.get("/matches")
        assert res_matches.status_code == 200
        match_ids = [m["match_id"] for m in res_matches.json()]
        assert mock_id in match_ids

        # 4. GET /analyses
        res_analyses = client.get("/analyses")
        assert res_analyses.status_code == 200
        analysis_ids = [a["analysis_id"] for a in res_analyses.json()]
        assert mock_id in analysis_ids

        # 5. GET /players/{id}
        res_player = client.get("/players/76561198000000001")
        assert res_player.status_code == 200
        pdata = res_player.json()
        assert pdata["player_name"] == "ProShooter"
        assert pdata["total_windows"] == 10
        assert pdata["overall_verdict"] == "Flagged"

        # 6. GET /players list endpoint
        res_players = client.get("/players")
        assert res_players.status_code == 200
        players_list = res_players.json()
        assert len(players_list) >= 1
        tracked_ids = [p["player_id"] for p in players_list]
        assert "76561198000000001" in tracked_ids

        # 7. Non-existent player
        res_not_found = client.get("/players/999999999999")
        assert res_not_found.status_code == 404

    finally:
        report_file.unlink(missing_ok=True)
