"""Tests for the local API server."""

import pytest


@pytest.fixture(autouse=True)
def _use_tmp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("FLEXFOIL_DATA_DIR", str(tmp_path))
    import flexfoil.database
    flexfoil.database._default_db = None


def _make_client(tmp_path):
    """Create a Starlette test client."""
    from starlette.testclient import TestClient
    from flexfoil.server import create_app
    app = create_app(db_path=str(tmp_path / "test.db"))
    return TestClient(app)


class TestHealthEndpoint:
    def test_health(self, tmp_path):
        client = _make_client(tmp_path)
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["run_count"] == 0


class TestRunsAPI:
    def test_create_and_list(self, tmp_path):
        client = _make_client(tmp_path)

        run = {
            "airfoil_name": "NACA 2412",
            "airfoil_hash": "testhash",
            "alpha": 5.0,
            "reynolds": 1e6,
            "mach": 0.0,
            "ncrit": 9.0,
            "n_panels": 160,
            "max_iter": 100,
            "cl": 0.92,
            "cd": 0.008,
            "cm": -0.05,
            "converged": True,
            "iterations": 15,
            "residual": 1e-6,
            "x_tr_upper": 0.12,
            "x_tr_lower": 0.45,
            "solver_mode": "viscous",
            "success": True,
            "error": None,
            "coordinates_json": None,
            "panels_json": None,
        }

        resp = client.post("/api/runs", json=run)
        assert resp.status_code == 201
        assert resp.json()["id"] > 0

        resp = client.get("/api/runs")
        assert resp.status_code == 200
        rows = resp.json()
        assert len(rows) == 1
        assert rows[0]["airfoil_name"] == "NACA 2412"

    def test_delete_all(self, tmp_path):
        client = _make_client(tmp_path)
        client.post("/api/runs", json={
            "airfoil_name": "test",
            "airfoil_hash": "h1",
            "alpha": 0.0,
            "reynolds": 1e6,
            "mach": 0.0,
            "ncrit": 9.0,
            "n_panels": 160,
            "max_iter": 100,
            "success": True,
        })
        resp = client.delete("/api/runs")
        assert resp.status_code == 200

        resp = client.get("/api/runs/count")
        assert resp.json()["count"] == 0

    def test_cache_lookup(self, tmp_path):
        client = _make_client(tmp_path)
        client.post("/api/runs", json={
            "airfoil_name": "NACA 0012",
            "airfoil_hash": "h0012",
            "alpha": 0.0,
            "reynolds": 1e6,
            "mach": 0.0,
            "ncrit": 9.0,
            "n_panels": 160,
            "max_iter": 100,
            "cl": 0.0,
            "cd": 0.005,
            "cm": 0.0,
            "converged": True,
            "success": True,
        })

        resp = client.post("/api/runs/lookup", json={
            "airfoil_hash": "h0012",
            "alpha": 0.0,
            "reynolds": 1e6,
            "mach": 0.0,
            "ncrit": 9.0,
            "n_panels": 160,
            "max_iter": 100,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data is not None
        assert data["cl"] == 0.0


class TestAirfoilsAPI:
    def test_save_and_list(self, tmp_path):
        client = _make_client(tmp_path)
        resp = client.post("/api/airfoils", json={
            "name": "NACA 2412",
            "coordinates_json": '[{"x":1,"y":0}]',
            "n_panels": 160,
        })
        assert resp.status_code == 201

        resp = client.get("/api/airfoils")
        assert resp.status_code == 200
        foils = resp.json()
        assert len(foils) == 1


class TestDbExportImport:
    def test_export(self, tmp_path):
        client = _make_client(tmp_path)
        client.post("/api/runs", json={
            "airfoil_name": "test",
            "airfoil_hash": "h1",
            "alpha": 0.0,
            "reynolds": 1e6,
            "mach": 0.0,
            "ncrit": 9.0,
            "n_panels": 160,
            "max_iter": 100,
            "success": True,
        })

        resp = client.get("/api/db/export")
        assert resp.status_code == 200
        assert len(resp.content) > 0
