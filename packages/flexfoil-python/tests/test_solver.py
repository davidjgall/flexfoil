"""Tests for the Rust solver bindings and Python API."""

import pytest
from flexfoil._rustfoil import (
    analyze_faithful,
    analyze_inviscid,
    generate_naca4,
    repanel_xfoil,
)


class TestNacaGeneration:
    def test_generates_points(self):
        pts = generate_naca4(2412)
        assert len(pts) > 100
        assert all(isinstance(p, tuple) and len(p) == 2 for p in pts)

    def test_symmetric_naca0012(self):
        pts = generate_naca4(12)
        xs, ys = zip(*pts)
        max_y = max(abs(y) for y in ys)
        assert max_y > 0.04
        assert max_y < 0.08


class TestRepanel:
    def test_repanel_160(self):
        raw = generate_naca4(2412)
        flat = []
        for x, y in raw:
            flat.extend([x, y])
        paneled = repanel_xfoil(flat, 160)
        assert len(paneled) == 160  # XFOIL open-TE: n_panels nodes

    def test_repanel_custom_params(self):
        raw = generate_naca4(12)
        flat = [v for x, y in raw for v in (x, y)]
        paneled = repanel_xfoil(flat, 80, 1.0, 0.15, 0.667)
        assert len(paneled) == 80


class TestInviscidSolver:
    def test_naca0012_zero_alpha(self):
        raw = generate_naca4(12)
        flat = [v for x, y in raw for v in (x, y)]
        paneled = repanel_xfoil(flat, 160)
        coords = [v for x, y in paneled for v in (x, y)]
        result = analyze_inviscid(coords, 0.0)
        assert result["success"] is True
        assert abs(result["cl"]) < 0.01  # symmetric at alpha=0

    def test_naca2412_positive_lift(self):
        raw = generate_naca4(2412)
        flat = [v for x, y in raw for v in (x, y)]
        paneled = repanel_xfoil(flat, 160)
        coords = [v for x, y in paneled for v in (x, y)]
        result = analyze_inviscid(coords, 5.0)
        assert result["success"] is True
        assert result["cl"] > 0.5


class TestFaithfulSolver:
    def test_naca2412_viscous(self):
        raw = generate_naca4(2412)
        flat = [v for x, y in raw for v in (x, y)]
        paneled = repanel_xfoil(flat, 160)
        coords = [v for x, y in paneled for v in (x, y)]
        result = analyze_faithful(coords, 5.0, 1e6, 0.0, 9.0, 100)
        assert result["success"] is True
        assert result["converged"] is True
        assert result["cl"] > 0.5
        assert result["cd"] > 0.0
        assert result["cd"] < 0.1
        assert result["iterations"] > 0

    def test_invalid_coords(self):
        result = analyze_faithful([1.0, 0.0], 0.0, 1e6, 0.0, 9.0, 100)
        assert result["success"] is False
        assert "error" in result
