"""
Batch parameter study — sweep airfoils x Reynolds numbers x angles.

Runs a large batch of solves. Every result is cached in the local SQLite
database. Open the web UI (`flexfoil serve`) to visualize them interactively.

    python examples/08_batch_matrix.py
"""

import time
import flexfoil

airfoils = ["0012", "2412", "4412", "23012"]
reynolds = [2e5, 5e5, 1e6]
alphas = (-2, 10, 2.0)

total = len(airfoils) * len(reynolds) * len(range(-2, 11, 2))
count = 0
t0 = time.time()

for naca in airfoils:
    foil = flexfoil.naca(naca)
    for Re in reynolds:
        polar = foil.polar(alpha=alphas, Re=Re)
        count += len(polar.results)
        n_conv = len(polar.converged)
        print(f"  {foil.name} Re={Re:.0e}:  {n_conv}/{len(polar.results)} converged")

elapsed = time.time() - t0
print(f"\n{count} solves in {elapsed:.1f}s ({count/elapsed:.0f} solves/sec)")

all_runs = flexfoil.runs()
print(f"Total runs in database: {len(all_runs)}")
print("\nOpen the web UI to explore these results:")
print("  flexfoil serve")
