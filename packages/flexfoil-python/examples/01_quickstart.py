"""
Quickstart — solve a NACA 2412 at a single operating point.

    python examples/01_quickstart.py
"""

import flexfoil

foil = flexfoil.naca("2412")
print(foil)

result = foil.solve(alpha=5.0, Re=1e6)
print(result)
print(f"  L/D = {result.ld:.1f}")
print(f"  Transition upper x/c = {result.x_tr_upper:.3f}")
print(f"  Transition lower x/c = {result.x_tr_lower:.3f}")
