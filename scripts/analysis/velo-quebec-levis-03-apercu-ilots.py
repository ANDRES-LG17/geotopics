"""
Aperçu rapide des îlots tranquilles, état actuel (A) et Lévis à 40 (D).
Image de travail, pas un livrable.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-03-apercu-ilots.py
"""

import os

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
GRAPHE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
CLASSE = os.path.join(ICI, "01-reseau-classe-epsg2949.gpkg")
SORTIE = os.path.join(ICI, "03-apercu-ilots.png")

COULEURS = ["#1f6fb4", "#e08a1e", "#2a9d5c", "#9b4dca", "#c23b5a"]  # 5 plus grands îlots
PONT_QUEBEC = 39456261


def panneau(ax, a, zone, champ, ilot, titre):
    zone.boundary.plot(ax=ax, color="#999999", linewidth=0.6, linestyle="--")
    a[~a[champ]].plot(ax=ax, color="#d9534f", linewidth=0.35, alpha=0.6)
    t = a[a[champ]]
    km = t.groupby(ilot)["longueur_m"].sum().sort_values(ascending=False)
    grands = list(km.index[:len(COULEURS)])
    t[~t[ilot].isin(grands)].plot(ax=ax, color="#bbbbbb", linewidth=0.35)
    for coul, n in zip(COULEURS, grands):
        t[t[ilot] == n].plot(ax=ax, color=coul, linewidth=0.5)
    a[a["osm_id"] == PONT_QUEBEC].plot(ax=ax, color="black", linewidth=3)
    legende = [f"{k / 1000:.0f} km" for k in km.iloc[:len(COULEURS)]]
    ax.set_title(titre + "\nîlots : " + " · ".join(legende), fontsize=10)
    ax.set_axis_off()


def main():
    a = gpd.read_file(GRAPHE, layer="aretes")
    zone = gpd.read_file(CLASSE, layer="zone")
    fig, axes = plt.subplots(1, 2, figsize=(16, 9), dpi=130)
    panneau(axes[0], a, zone, "tranquille", "ilot_a", "A — état actuel")
    panneau(axes[1], a, zone, "tranquille_d", "ilot_d", "D — Lévis à 40 km/h")
    for ax in axes:
        ax.set_xlim(zone.total_bounds[[0, 2]])
        ax.set_ylim(zone.total_bounds[[1, 3]])
    fig.suptitle("Réseau tranquille de Québec–Lévis : les 5 plus grands îlots en couleur, "
                 "autres îlots en gris, voies exposées en rouge, pont de Québec en noir",
                 fontsize=11, y=0.995)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(SORTIE)
    print(SORTIE)


if __name__ == "__main__":
    main()
