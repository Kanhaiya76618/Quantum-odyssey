from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_bell_state():
    r = client.post("/circuit/simulate", json={
        "num_qubits": 2,
        "gates": [
            {"name": "h", "targets": [0]},
            {"name": "cx", "targets": [1], "controls": [0]},
        ],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["probabilities"] == {"00": 0.5, "11": 0.5}
    assert body["gate_count"] == 2
    for b in body["bloch"]:
        assert abs(b["x"]) < 1e-6
        assert abs(b["y"]) < 1e-6
        assert abs(b["z"]) < 1e-6


def test_single_h():
    r = client.post("/circuit/simulate", json={
        "num_qubits": 1,
        "gates": [{"name": "h", "targets": [0]}],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["probabilities"] == {"0": 0.5, "1": 0.5}
    b = body["bloch"][0]
    assert abs(b["x"] - 1.0) < 1e-6
    assert abs(b["z"]) < 1e-6


def test_invalid_gate_name():
    r = client.post("/circuit/simulate", json={
        "num_qubits": 1,
        "gates": [{"name": "foo", "targets": [0]}],
    })
    assert r.status_code == 422
    assert "foo" in r.json()["detail"]
