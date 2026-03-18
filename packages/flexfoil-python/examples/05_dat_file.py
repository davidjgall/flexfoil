"""
Load an airfoil from a .dat file and analyze it.

    python examples/05_dat_file.py path/to/e387.dat
"""

import sys
import flexfoil

if len(sys.argv) < 2:
    print("Usage: python examples/05_dat_file.py <airfoil.dat>")
    print("\n.dat files are Selig or Lednicer format, available from:")
    print("  https://m-selig.ae.illinois.edu/ads/coord_database.html")
    sys.exit(1)

path = sys.argv[1]
foil = flexfoil.load(path)
print(f"Loaded: {foil}")

result = foil.solve(alpha=5.0, Re=5e5)
print(result)

polar = foil.polar(alpha=(-4, 12, 1.0), Re=5e5)
print(polar)
polar.plot()
