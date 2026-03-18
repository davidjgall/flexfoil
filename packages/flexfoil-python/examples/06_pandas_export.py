"""
Export polar data to pandas / CSV for further analysis.

    python examples/06_pandas_export.py
"""

import flexfoil

foil = flexfoil.naca("2412")
polar = foil.polar(alpha=(-4, 14, 0.5), Re=1e6)

# PolarResult -> pandas DataFrame
df = polar.to_dataframe()
print(df.to_string(index=False))

# Save to CSV
df.to_csv("naca2412_polar.csv", index=False)
print("\nSaved naca2412_polar.csv")

# Query the full run database (every solve ever cached)
all_runs = flexfoil.runs()
print(f"\nTotal runs in database: {len(all_runs)}")
print(all_runs.head())
