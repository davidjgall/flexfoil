"""
Compare multiple NACA airfoils — overlay CL-alpha and drag polars.

    python examples/03_compare_airfoils.py
"""

import matplotlib.pyplot as plt
import flexfoil

airfoils = {
    "NACA 0012": flexfoil.naca("0012"),
    "NACA 2412": flexfoil.naca("2412"),
    "NACA 4412": flexfoil.naca("4412"),
    "NACA 6412": flexfoil.naca("6412"),
}

Re = 1e6
alpha_range = (-4, 14, 1.0)

fig, axes = plt.subplots(1, 3, figsize=(14, 5))
fig.suptitle(f"NACA Camber Comparison — Re = {Re:.0e}", fontsize=13)

for name, foil in airfoils.items():
    polar = foil.polar(alpha=alpha_range, Re=Re)
    a, cl, cd, cm = polar.alpha, polar.cl, polar.cd, polar.cm

    axes[0].plot(a, cl, ".-", label=name)
    axes[1].plot(cd, cl, ".-", label=name)
    axes[2].plot(a, cm, ".-", label=name)

    print(f"{name}: CL_max = {max(cl):.3f}  at α = {a[cl.index(max(cl))]:.1f}°")

axes[0].set_xlabel("α (°)")
axes[0].set_ylabel("CL")
axes[0].legend()
axes[0].grid(True, alpha=0.3)

axes[1].set_xlabel("CD")
axes[1].set_ylabel("CL")
axes[1].legend()
axes[1].grid(True, alpha=0.3)

axes[2].set_xlabel("α (°)")
axes[2].set_ylabel("CM")
axes[2].legend()
axes[2].grid(True, alpha=0.3)

fig.tight_layout()
plt.savefig("naca_comparison.png", dpi=150)
print("\nSaved naca_comparison.png")
plt.show()
