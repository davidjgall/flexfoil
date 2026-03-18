"""Tests for the local SQLite database."""

import os
import tempfile

import pytest
from flexfoil.database import RunDatabase


@pytest.fixture
def db(tmp_path):
    return RunDatabase(tmp_path / "test.db")


class TestRunDatabase:
    def test_insert_and_query(self, db):
        rid = db.insert_run(
            airfoil_name="NACA 2412",
            airfoil_hash="abc123",
            alpha=5.0,
            reynolds=1e6,
            mach=0.0,
            ncrit=9.0,
            n_panels=160,
            max_iter=100,
            cl=0.92,
            cd=0.008,
            cm=-0.05,
            converged=True,
            iterations=15,
            residual=1e-6,
            x_tr_upper=0.12,
            x_tr_lower=0.45,
            solver_mode="viscous",
            success=True,
        )
        assert rid > 0

        rows = db.query_all_runs()
        assert len(rows) == 1
        assert rows[0]["airfoil_name"] == "NACA 2412"
        assert rows[0]["cl"] == 0.92

    def test_cache_lookup(self, db):
        db.insert_run(
            airfoil_name="NACA 0012",
            airfoil_hash="hash0012",
            alpha=0.0,
            reynolds=1e6,
            mach=0.0,
            ncrit=9.0,
            n_panels=160,
            max_iter=100,
            cl=0.0,
            cd=0.005,
            cm=0.0,
            converged=True,
            success=True,
        )

        hit = db.lookup_cache("hash0012", 0.0, 1e6, 0.0, 9.0, 160, 100)
        assert hit is not None
        assert hit["cl"] == 0.0

        miss = db.lookup_cache("hash0012", 5.0, 1e6, 0.0, 9.0, 160, 100)
        assert miss is None

    def test_row_count(self, db):
        assert db.row_count() == 0
        db.insert_run(
            airfoil_name="test",
            airfoil_hash="h1",
            alpha=0.0,
            reynolds=1e6,
            mach=0.0,
            ncrit=9.0,
            n_panels=160,
            max_iter=100,
            success=True,
        )
        assert db.row_count() == 1

    def test_delete_all(self, db):
        db.insert_run(
            airfoil_name="test",
            airfoil_hash="h1",
            alpha=0.0,
            reynolds=1e6,
            mach=0.0,
            ncrit=9.0,
            n_panels=160,
            max_iter=100,
            success=True,
        )
        db.delete_all_runs()
        assert db.row_count() == 0

    def test_export_import(self, db, tmp_path):
        db.insert_run(
            airfoil_name="exported",
            airfoil_hash="hexp",
            alpha=3.0,
            reynolds=5e5,
            mach=0.0,
            ncrit=9.0,
            n_panels=80,
            max_iter=50,
            cl=0.6,
            success=True,
        )
        data = db.export_bytes()
        assert len(data) > 0

        db2 = RunDatabase(tmp_path / "imported.db")
        db2.import_bytes(data)
        rows = db2.query_all_runs()
        assert len(rows) == 1
        assert rows[0]["airfoil_name"] == "exported"

    def test_airfoil_save_and_list(self, db):
        db.save_airfoil("NACA 2412", '[{"x":1,"y":0},{"x":0,"y":0}]', 160)
        foils = db.list_airfoils()
        assert len(foils) == 1
        assert foils[0]["name"] == "NACA 2412"

        got = db.get_airfoil("NACA 2412")
        assert got is not None
        assert got["n_panels"] == 160
