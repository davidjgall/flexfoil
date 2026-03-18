"""
Reynolds number study — how does the drag polar change with Re?

    python examples/04_reynolds_sweep.py
"""

import matplotlib.pyplot as plt
import flexfoil

foil = flexfoil.naca("2412")

reynolds_numbers = [5e4, 2e5, 5e5, 1e6, 3e6]

fig, axes = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle(f"{foil.name} — Reynolds Number Effect", fontsize=13)

for Re in reynolds_numbers:
    polar = foil.polar(alpha=(-2, 12, 1.0), Re=Re)
    label = f"Re = {Re:.0e}"

    axes[0].plot(polar.alpha, polar.cl, ".-", label=label)
    axes[1].plot(polar.cd, polar.cl, ".-", label=label)

axes[0].set_xlabel("α (°)")
axes[0].set_ylabel("CL")
axes[0].legend(fontsize=9)
axes[0].grid(True, alpha=0.3)

axes[1].set_xlabel("CD")
axes[1].set_ylabel("CL")
axes[1].legend(fontsize=9)
axes[1].grid(True, alpha=0.3)

fig.tight_layout()
plt.savefig("reynolds_sweep.png", dpi=150)
print("Saved reynolds_sweep.png")
plt.show()
