"""
Inviscid vs viscous comparison — shows the effect of boundary layers.

    python examples/07_inviscid_vs_viscous.py
"""

import matplotlib.pyplot as plt
import flexfoil

foil = flexfoil.naca("0012")

alpha_range = (-4, 14, 1.0)

inv = foil.polar(alpha=alpha_range, Re=1e6, viscous=False)
visc = foil.polar(alpha=alpha_range, Re=1e6, viscous=True)

fig, axes = plt.subplots(1, 2, figsize=(11, 5))
fig.suptitle(f"{foil.name} — Inviscid vs Viscous (Re = 1e6)", fontsize=13)

axes[0].plot(inv.alpha, inv.cl, "s--", color="C0", label="Inviscid", markersize=5)
axes[0].plot(visc.alpha, visc.cl, "o-", color="C1", label="Viscous", markersize=5)
axes[0].set_xlabel("α (°)")
axes[0].set_ylabel("CL")
axes[0].legend()
axes[0].grid(True, alpha=0.3)

axes[1].plot(visc.cd, visc.cl, "o-", color="C1", label="Viscous")
axes[1].axvline(x=0, color="C0", linestyle="--", alpha=0.4, label="Inviscid (CD=0)")
axes[1].set_xlabel("CD")
axes[1].set_ylabel("CL")
axes[1].legend()
axes[1].grid(True, alpha=0.3)

fig.tight_layout()
plt.savefig("inviscid_vs_viscous.png", dpi=150)
print("Saved inviscid_vs_viscous.png")
plt.show()
