from main import health_check

def test_health():
    res = health_check()
    assert res["status"] == "ok"
