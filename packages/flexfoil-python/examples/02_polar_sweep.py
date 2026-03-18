"""
Polar sweep — CL, CD, CM vs alpha for a NACA 2412.

Generates a 4-panel matplotlib figure and prints the results as a table.

    python examples/02_polar_sweep.py
"""

import flexfoil

foil = flexfoil.naca("2412")

polar = foil.polar(alpha=(-5, 15, 0.5), Re=1e6)
print(polar)

# Print a quick summary table
print(f"\n{'alpha':>6}  {'CL':>8}  {'CD':>8}  {'L/D':>8}  {'CM':>8}")
print("-" * 48)
for r in polar.converged:
    ld = f"{r.ld:.1f}" if r.ld else "N/A"
    print(f"{r.alpha:6.1f}  {r.cl:8.4f}  {r.cd:8.5f}  {ld:>8}  {r.cm:8.4f}")

# Show the 4-panel plot (CL-alpha, CD-alpha, CL-CD, CM-alpha)
polar.plot()
