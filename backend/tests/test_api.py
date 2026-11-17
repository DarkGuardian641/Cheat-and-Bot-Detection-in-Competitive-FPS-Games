import io
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "storage" in data
    assert "demos" in data["storage"]


def test_upload_invalid_extension():
    fake_txt = io.BytesIO(b"Not a real demo file")
    res = client.post("/analyses/upload", files={"file": ("match.txt", fake_txt, "text/plain")})
    assert res.status_code == 400
    assert "Only Counter-Strike 2 (.dem) replay files are supported" in res.json()["detail"]


def test_upload_empty_file():
    empty_dem = io.BytesIO(b"")
    res = client.post("/analyses/upload", files={"file": ("empty.dem", empty_dem, "application/octet-stream")})
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_analysis_status_and_results_not_found():
    res = client.get("/analyses/nonexistent_id")
    assert res.status_code == 404

    res2 = client.get("/analyses/nonexistent_id/results")
    assert res2.status_code == 404


def test_matches_endpoint():
    res = client.get("/matches")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_player_endpoint_with_mock_report(tmp_path):
    mock_id = "test_match_123"
    report_file = settings.ANALYSIS_DIR / f"{mock_id}.json"
    
    mock_report = {
        "analysis_id": mock_id,
        "status": "completed",
        "match_info": {"demo_filename": "test.dem"},
        "player_summaries": {
            "76561198000000001": {
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

        # Test GET /analyses/{id}
        res_status = client.get(f"/analyses/{mock_id}")
        assert res_status.status_code == 200
        assert res_status.json()["status"] == "completed"

        # Test GET /analyses/{id}/results
        res_results = client.get(f"/analyses/{mock_id}/results")
        assert res_results.status_code == 200
        assert res_results.json()["analysis_id"] == mock_id

        # Test GET /matches
        res_matches = client.get("/matches")
        assert res_matches.status_code == 200
        match_ids = [m["match_id"] for m in res_matches.json()]
        assert mock_id in match_ids

        # Test GET /players/{id}
        res_player = client.get("/players/76561198000000001")
        assert res_player.status_code == 200
        pdata = res_player.json()
        assert pdata["player_name"] == "ProShooter"
        assert pdata["total_windows"] == 10
        assert pdata["overall_verdict"] == "Flagged"

        # Non-existent player
        res_not_found = client.get("/players/999999999999")
        assert res_not_found.status_code == 404

    finally:
        report_file.unlink(missing_ok=True)
