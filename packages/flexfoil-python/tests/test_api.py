"""Tests for the high-level Python API (Airfoil, solve, polar)."""

import tempfile
import os

import pytest


@pytest.fixture(autouse=True)
def _use_tmp_db(tmp_path, monkeypatch):
    """Direct the database to a temporary directory for test isolation."""
    monkeypatch.setenv("FLEXFOIL_DATA_DIR", str(tmp_path))
    import flexfoil.database
    flexfoil.database._default_db = None


class TestAirfoil:
    def test_from_naca(self):
        import flexfoil

        foil = flexfoil.naca("2412")
        assert foil.name == "NACA 2412"
        assert foil.n_panels == 160
        assert len(foil.panel_coords) == 160

    def test_from_naca_short(self):
        import flexfoil

        foil = flexfoil.naca("12")
        assert foil.name == "NACA 0012"
        assert foil.n_panels == 160

    def test_hash_deterministic(self):
        import flexfoil

        f1 = flexfoil.naca("2412")
        f2 = flexfoil.naca("2412")
        assert f1.hash == f2.hash

    def test_hash_differs_across_foils(self):
        import flexfoil

        f1 = flexfoil.naca("2412")
        f2 = flexfoil.naca("0012")
        assert f1.hash != f2.hash


class TestSolve:
    def test_viscous_solve(self):
        import flexfoil

        foil = flexfoil.naca("2412")
        result = foil.solve(alpha=5.0, Re=1e6)
        assert result.success
        assert result.converged
        assert result.cl > 0.5
        assert result.cd > 0
        assert result.cd < 0.1

    def test_inviscid_solve(self):
        import flexfoil

        foil = flexfoil.naca("2412")
        result = foil.solve(alpha=5.0, viscous=False)
        assert result.success
        assert result.cl > 0.5
        assert result.cd == 0.0

    def test_run_stored_in_db(self):
        import flexfoil

        foil = flexfoil.naca("0012")
        foil.solve(alpha=0.0, Re=1e6)
        runs = flexfoil.runs()
        assert len(runs) >= 1


class TestPolar:
    def test_polar_sweep(self):
        import flexfoil

        foil = flexfoil.naca("2412")
        polar = foil.polar(alpha=(0, 5, 2.5), Re=1e6)
        assert len(polar.results) == 3
        assert len(polar.converged) >= 2
        assert len(polar.alpha) >= 2
        assert len(polar.cl) >= 2
