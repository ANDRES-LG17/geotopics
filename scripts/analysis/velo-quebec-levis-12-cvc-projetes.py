"""
Trace INDICATIF des 14 corridors VivaCité projetés, sur les voies du graphe.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-12-cvc-projetes.py

La Ville ne publie pas les tracés : seule une carte schématique (2024),
« présentés à titre indicatif ». Les sommets de chaque corridor y ont été
saisis en pixels (`15-saisie-manuelle/cvc-projetes-carte-ville.json`).

1. Pixels → EPSG:2949 par triangles : la carte est un SCHÉMA (une affine
   unique y laisse 650 m d'écart médian, 1,8 km au pire). Chaque pastille
   nommée est un point de contrôle géocodé ; à l'intérieur de leur
   enveloppe, interpolation linéaire par triangles (Delaunay) — chaque
   pastille tombe exactement sur son lieu ; au-dehors, l'affine.
2. Chaque tracé est densifié (un point tous les 1 000 m), chaque point
   rattaché au nœud du graphe le plus proche, et les points reliés par le
   chemin le plus court — en préférant les aménagements existants (piste
   × 0,5, sentier × 0,6, rue calme × 0,85, rue exposée × 1, à pied × 1,5) :
   un corridor emprunte d'abord ce qui existe, comme le dit la Ville
   (« lien mis à niveau, nouveau lien ou combinaison des deux »).

Sorties :
    geodata/04-velo-quebec-levis/10-travail/12-cvc-projetes.gpkg   (tracés, pour QGIS)
    geodata/04-velo-quebec-levis/10-travail/12-cvc-projetes.csv    (arete, corridor)
    geodata/04-velo-quebec-levis/10-travail/12-cvc-projetes.png    (aperçu de contrôle)
"""

import importlib.util
import json
import os
import sys

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from pyproj import Transformer
from scipy.spatial import cKDTree
from shapely.geometry import LineString

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
SAISIE = os.path.join(PROJET, "15-saisie-manuelle", "cvc-projetes-carte-ville.json")
TRAVAIL = os.path.join(PROJET, "10-travail")
# Premier essai : un point tous les 1 000 m et une forte préférence pour les
# pistes (0,5) → 209 km pour 150 annoncés, des zigzags dans les rues locales
# (la carte est un schéma : forcer un point par km impose ses erreurs). Les
# CVC suivent des AXES directs (chemin Sainte-Foy, 4e Avenue, Canardière) :
# on ne passe plus que par les sommets saisis, avec une préférence légère.
PAS_M = None
POIDS = {"piste": 0.8, "sentier": 0.85, "rue_calme": 1.0, "expose": 1.0, "a_pied": 2.0}

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def main():
    with open(SAISIE, encoding="utf-8") as f:
        saisie = json.load(f)
    vers_l = Transformer.from_crs("EPSG:4326", "EPSG:2949", always_xy=True)

    # 1. Affine pixels → mètres.
    px = np.array([c["px"] for c in saisie["controle"]], float)
    ll = np.array([c["lonlat"] for c in saisie["controle"]], float)
    xy = np.column_stack(vers_l.transform(ll[:, 0], ll[:, 1]))
    A = np.column_stack([px, np.ones(len(px))])
    coef, *_ = np.linalg.lstsq(A, xy, rcond=None)
    res = np.hypot(*(A @ coef - xy).T)
    print("résidus des points de contrôle (m) :")
    for c, r in zip(saisie["controle"], res):
        print(f"  {c['nom']:<36} {r:6.0f}")
    print(f"  affine seule : médiane {np.median(res):.0f} m, max {res.max():.0f} m → interpolation par triangles")
    from scipy.interpolate import LinearNDInterpolator
    tri = LinearNDInterpolator(px, xy)

    def vers_m(p):
        p = np.asarray(p, float)
        sortie = tri(p)
        hors = np.isnan(sortie).any(axis=1)
        sortie[hors] = np.column_stack([p[hors], np.ones(hors.sum())]) @ coef
        return sortie

    # 2. Graphe pondéré (non orienté : un corridor se parcourt dans les deux sens).
    t = m.charger().reset_index(drop=True)
    g = nx.Graph()
    for i, r in enumerate(t.itertuples()):
        w = r.longueur_m * POIDS.get(r.classe, 1.0)
        if g.has_edge(r.u, r.v) and g[r.u][r.v]["weight"] <= w:
            continue
        g.add_edge(r.u, r.v, weight=w, arete=i)
    # Les points ne s'accrochent qu'à la composante principale : un îlot
    # isolé (une allée privée) n'a pas de chemin vers le reste.
    g = g.subgraph(max(nx.connected_components(g), key=len)).copy()
    noeuds = list(g.nodes)
    arbre = cKDTree(np.array(noeuds))

    lignes, lignes_csv = [], []
    for c in saisie["corridors"]:
        pts = vers_m(c["px"])
        if PAS_M:
            trace = LineString(pts)
            n = max(2, int(np.ceil(trace.length / PAS_M)) + 1)
            pts = [(p.x, p.y) for p in (trace.interpolate(d) for d in np.linspace(0, trace.length, n))]
        cibles = [noeuds[arbre.query(list(p))[1]] for p in pts]
        aretes = []
        for a, b in zip(cibles[:-1], cibles[1:]):
            if a == b:
                continue
            chemin = nx.shortest_path(g, a, b, weight="weight")
            aretes += [g[x][y]["arete"] for x, y in zip(chemin[:-1], chemin[1:])]
        aretes = list(dict.fromkeys(aretes))
        km = t.loc[aretes, "longueur_m"].sum() / 1000
        parts = t.loc[aretes].groupby("classe")["longueur_m"].sum() / 1000
        print(f"{c['id']:<3} {c['nom']:<58} {km:5.1f} km  " +
              " ".join(f"{k} {v:.1f}" for k, v in parts.items()))
        lignes.append({"corridor": c["id"], "nom": c["nom"], "km": round(km, 2),
                       "geometry": t.loc[aretes].geometry.union_all()})
        lignes_csv += [{"arete": a, "corridor": c["id"]} for a in aretes]

    tr = gpd.GeoDataFrame(lignes, crs=t.crs)
    tr.to_file(os.path.join(TRAVAIL, "12-cvc-projetes.gpkg"), layer="corridors", driver="GPKG")
    csv = pd.DataFrame(lignes_csv).drop_duplicates("arete")
    csv.to_csv(os.path.join(TRAVAIL, "12-cvc-projetes.csv"), index=False)
    total = t.loc[csv.arete, "longueur_m"].sum() / 1000
    print(f"total (sans doublons) : {total:.1f} km — annoncé : 150 km")

    # 3. Aperçu de contrôle.
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(13, 10), dpi=110)
    fond = t[t.classe.isin(["piste", "rue_calme", "expose"])]
    fond.plot(ax=ax, color="#d9d9d9", linewidth=0.3)
    cvc = pd.read_csv(os.path.join(TRAVAIL, "11-hiver-cvc.csv"))
    t.loc[cvc.cvc == 1].plot(ax=ax, color="black", linewidth=2.2)
    couleurs = plt.cm.tab20(np.linspace(0, 1, len(tr)))
    for (r, col) in zip(tr.itertuples(), couleurs):
        gpd.GeoSeries([r.geometry], crs=t.crs).plot(ax=ax, color=col, linewidth=1.8)
        p = r.geometry.representative_point()
        ax.text(p.x, p.y, r.corridor, fontsize=11, weight="bold", color=col,
                bbox=dict(facecolor="white", edgecolor="none", pad=0.5, alpha=0.8))
    ax.scatter(xy[:, 0], xy[:, 1], s=18, c="red", zorder=5)
    xmin, ymin = xy.min(0) - 2500
    xmax, ymax = xy.max(0) + 2500
    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_axis_off()
    ax.set_title("Corridors VivaCité projetés — tracé indicatif sur le graphe (noir : CVC réalisés)")
    fig.savefig(os.path.join(TRAVAIL, "12-cvc-projetes.png"), bbox_inches="tight")
    print(os.path.join(TRAVAIL, "12-cvc-projetes.png"))


if __name__ == "__main__":
    main()
