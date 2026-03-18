"""
Custom coordinates — build an airfoil from raw x, y arrays.

This shows how to create an airfoil from arbitrary coordinate data
(e.g. from an optimization loop or a custom generator).

    python examples/09_custom_coordinates.py
"""

import flexfoil

# Start from NACA 0012 coordinates and add a custom camber modification
base = flexfoil.naca("0012")
x_base = [pt[0] for pt in base.raw_coords]
y_base = [pt[1] for pt in base.raw_coords]

# Add a 3% camber line peaking at 35% chord
import math
y_modified = []
for x, y in zip(x_base, y_base):
    camber = 0.03 * (2 * 0.35 * x - x * x) / (0.35 * 0.35) if x < 0.35 else \
             0.03 * ((1 - 2 * 0.35) + 2 * 0.35 * x - x * x) / ((1 - 0.35) ** 2)
    y_modified.append(y + camber)

foil = flexfoil.from_coordinates(x_base, y_modified, name="Custom cambered 0012")
print(foil)

result = foil.solve(alpha=4.0, Re=5e5)
print(result)
