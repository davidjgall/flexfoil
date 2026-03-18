use pyo3::prelude::*;
use pyo3::types::PyDict;
use rustfoil_core::{naca, point, Body, CubicSpline, PanelingParams, Point};
use rustfoil_xfoil::oper::{solve_body_oper_point, AlphaSpec};
use rustfoil_xfoil::XfoilOptions;

fn points_from_flat(coords: &[f64]) -> Vec<Point> {
    coords.chunks(2).map(|c| point(c[0], c[1])).collect()
}

fn flat_from_points(pts: &[Point]) -> Vec<(f64, f64)> {
    pts.iter().map(|p| (p.x, p.y)).collect()
}

/// Viscous (XFOIL-faithful) analysis at a single operating point.
///
/// Returns a dict with keys: cl, cd, cm, converged, iterations, residual,
/// x_tr_upper, x_tr_lower, cd_friction, cd_pressure, alpha_deg, success, error.
#[pyfunction]
#[pyo3(signature = (coords, alpha_deg, reynolds=1.0e6, mach=0.0, ncrit=9.0, max_iterations=100))]
fn analyze_faithful(
    py: Python<'_>,
    coords: Vec<f64>,
    alpha_deg: f64,
    reynolds: f64,
    mach: f64,
    ncrit: f64,
    max_iterations: usize,
) -> PyResult<Py<PyDict>> {
    if coords.len() < 6 || coords.len() % 2 != 0 {
        let d = PyDict::new(py);
        d.set_item("success", false)?;
        d.set_item("error", "Invalid coordinates: need at least 3 points (6 values)")?;
        return Ok(d.into());
    }

    let points = points_from_flat(&coords);
    let body = match Body::from_points("airfoil", &points) {
        Ok(b) => b,
        Err(e) => {
            let d = PyDict::new(py);
            d.set_item("success", false)?;
            d.set_item("error", format!("Geometry error: {e}"))?;
            return Ok(d.into());
        }
    };

    let options = XfoilOptions {
        reynolds,
        mach,
        ncrit,
        max_iterations,
        ..Default::default()
    };

    let d = PyDict::new(py);
    match solve_body_oper_point(&body, AlphaSpec::AlphaDeg(alpha_deg), &options) {
        Ok(r) => {
            d.set_item("cl", r.cl)?;
            d.set_item("cd", r.cd)?;
            d.set_item("cm", r.cm)?;
            d.set_item("converged", r.converged)?;
            d.set_item("iterations", r.iterations)?;
            d.set_item("residual", r.residual)?;
            d.set_item("x_tr_upper", r.x_tr_upper)?;
            d.set_item("x_tr_lower", r.x_tr_lower)?;
            d.set_item("cd_friction", r.cd_friction)?;
            d.set_item("cd_pressure", r.cd_pressure)?;
            d.set_item("alpha_deg", r.alpha_deg)?;
            d.set_item("success", true)?;
            d.set_item("error", py.None())?;
        }
        Err(e) => {
            d.set_item("success", false)?;
            d.set_item("error", format!("{e}"))?;
        }
    }
    Ok(d.into())
}

/// Inviscid panel-method analysis at a single angle of attack.
///
/// Returns a dict with keys: cl, cm, cp, cp_x, success, error.
#[pyfunction]
fn analyze_inviscid(py: Python<'_>, coords: Vec<f64>, alpha_deg: f64) -> PyResult<Py<PyDict>> {
    use rustfoil_solver::inviscid::{FlowConditions, InviscidSolver};

    if coords.len() < 6 || coords.len() % 2 != 0 {
        let d = PyDict::new(py);
        d.set_item("success", false)?;
        d.set_item("error", "Invalid coordinates")?;
        return Ok(d.into());
    }

    let points = points_from_flat(&coords);
    let body = match Body::from_points("airfoil", &points) {
        Ok(b) => b,
        Err(e) => {
            let d = PyDict::new(py);
            d.set_item("success", false)?;
            d.set_item("error", format!("Geometry error: {e}"))?;
            return Ok(d.into());
        }
    };

    let solver = InviscidSolver::new();
    let flow = FlowConditions::with_alpha_deg(alpha_deg);

    let d = PyDict::new(py);
    match solver.solve(&[body.clone()], &flow) {
        Ok(solution) => {
            let cp_x: Vec<f64> = body.panels().iter().map(|p| p.midpoint().x).collect();
            d.set_item("cl", solution.cl)?;
            d.set_item("cm", solution.cm)?;
            d.set_item("cp", solution.cp)?;
            d.set_item("cp_x", cp_x)?;
            d.set_item("success", true)?;
            d.set_item("error", py.None())?;
        }
        Err(e) => {
            d.set_item("success", false)?;
            d.set_item("error", format!("Solver error: {e}"))?;
        }
    }
    Ok(d.into())
}

/// Generate NACA 4-series airfoil using XFOIL's exact algorithm.
///
/// Returns a list of (x, y) tuples.
#[pyfunction]
#[pyo3(signature = (designation, n_points_per_side=None))]
fn generate_naca4(designation: u32, n_points_per_side: Option<usize>) -> Vec<(f64, f64)> {
    flat_from_points(&naca::naca4(designation, n_points_per_side))
}

/// Repanel airfoil using XFOIL's curvature-based algorithm.
///
/// Returns a list of (x, y) tuples.
#[pyfunction]
#[pyo3(signature = (coords, n_panels=160, curv_param=1.0, te_le_ratio=0.15, te_spacing_ratio=0.667))]
fn repanel_xfoil(
    coords: Vec<f64>,
    n_panels: usize,
    curv_param: f64,
    te_le_ratio: f64,
    te_spacing_ratio: f64,
) -> Vec<(f64, f64)> {
    if coords.len() < 6 || coords.len() % 2 != 0 {
        return vec![];
    }
    let points = points_from_flat(&coords);
    let spline = match CubicSpline::from_points(&points) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let params = PanelingParams {
        curv_param,
        te_le_ratio,
        te_spacing_ratio,
    };
    flat_from_points(&spline.resample_xfoil(n_panels, &params))
}

/// Parse a Selig/Lednicer .dat file and return coordinate tuples.
///
/// Returns a list of (x, y) tuples. Skips header lines automatically.
#[pyfunction]
fn parse_dat_file(path: &str) -> PyResult<Vec<(f64, f64)>> {
    let text = std::fs::read_to_string(path)
        .map_err(|e| pyo3::exceptions::PyIOError::new_err(format!("{e}")))?;
    let mut coords = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 2 {
            if let (Ok(x), Ok(y)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                coords.push((x, y));
            }
        }
    }
    Ok(coords)
}

#[pymodule]
fn _rustfoil(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(analyze_faithful, m)?)?;
    m.add_function(wrap_pyfunction!(analyze_inviscid, m)?)?;
    m.add_function(wrap_pyfunction!(generate_naca4, m)?)?;
    m.add_function(wrap_pyfunction!(repanel_xfoil, m)?)?;
    m.add_function(wrap_pyfunction!(parse_dat_file, m)?)?;
    Ok(())
}
