"""
Rattache aux arêtes du graphe deux informations de la Ville de Québec :
l'ENTRETIEN D'HIVER (déneigé, damé, rien) et les CORRIDORS VIVACITÉ réalisés.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-11-joindre-hiver-cvc.py

Méthode : chaque arête est échantillonnée tous les 10 m (aux extrémités
près) ; un point « touche » une couche s'il en est à moins de 12 m. L'arête
prend l'attribut si au moins 60 % de ses points touchent — un carrefour
traversé par une piste déneigée ne déneige pas la rue qui la croise.
Déneigé l'emporte sur damé quand les deux touchent.

Le réseau 4 saisons comprend des bandes et des chaussées désignées : ce sont
des RUES dans le graphe, elles prennent l'attribut comme les pistes.

Entrées :
    geodata/04-velo-quebec-levis/10-travail/02-graphe-epsg2949.gpkg
    geodata/04-velo-quebec-levis/00-brut/vdq/vdq-reseau-4-saisons-AAAA-MM-JJ.geojson
    geodata/04-velo-quebec-levis/00-brut/vdq/vdq-reseau-cyclable-service-AAAA-MM-JJ.geojson
Sortie :
    geodata/04-velo-quebec-levis/10-travail/11-hiver-cvc.csv
        arete (ordre du graphe exporté), hiver (0 rien, 1 damé, 2 déneigé),
        cvc (0 non, 1 réalisé)
"""

import glob
import importlib.util
import os
import sys

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
BRUT = os.path.join(PROJET, "00-brut", "vdq")
SORTIE = os.path.join(PROJET, "10-travail", "11-hiver-cvc.csv")
PAS = 10       # m entre deux échantillons
TOLERANCE = 12  # m
PART = 0.6

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def dernier(motif):
    fichiers = sorted(glob.glob(os.path.join(BRUT, motif)))
    if not fichiers:
        sys.exit(f"introuvable : {motif} — lancer le script 10")
    return fichiers[-1]


def part_touchee(aretes, couche):
    """Pour chaque arête, la part de ses points à moins de TOLERANCE de la couche."""
    arbre = shapely.STRtree(couche.geometry.values)
    parts = np.zeros(len(aretes))
    for i, g in enumerate(aretes.geometry.values):
        n = max(3, int(np.ceil(g.length / PAS)) + 1)
        pts = shapely.line_interpolate_point(g, np.linspace(0, g.length, n))
        # Les extrémités sont des carrefours : elles touchent tout ce qui s'y croise.
        if n > 3:
            pts = pts[1:-1]
        idx, _ = arbre.query_nearest(pts, max_distance=TOLERANCE, return_distance=True)
        parts[i] = len(np.unique(idx[0])) / len(pts)
    return parts


def main():
    t = m.charger().reset_index(drop=True)
    print(f"{len(t)} arêtes")

    hiver = gpd.read_file(dernier("vdq-reseau-4-saisons-*.geojson")).to_crs(t.crs)
    service = gpd.read_file(dernier("vdq-reseau-cyclable-service-*.geojson")).to_crs(t.crs)
    cvc = service[service["SOUS_TYPE_RC"] == 3]

    # Seules les arêtes proches d'une couche sont testées (gain de temps).
    def candidates(couche):
        zone = couche.geometry.buffer(TOLERANCE).union_all()
        return t.index[t.geometry.intersects(zone)]

    h = np.zeros(len(t), dtype=int)
    for valeur, code in (("Damé", 1), ("Déneigé", 2)):
        couche = hiver[hiver["SERVICE_DENEIGEMENT"] == valeur]
        idx = candidates(couche)
        parts = part_touchee(t.loc[idx], couche)
        h[idx[parts >= PART]] = code  # déneigé passe en second : il l'emporte
    c = np.zeros(len(t), dtype=int)
    idx = candidates(cvc)
    c[idx[part_touchee(t.loc[idx], cvc) >= PART]] = 1

    km = t["longueur_m"].to_numpy() / 1000
    print(f"hiver : déneigé {km[h == 2].sum():.1f} km, damé {km[h == 1].sum():.1f} km "
          f"(couche Ville : {hiver.length[hiver.SERVICE_DENEIGEMENT == 'Déneigé'].sum() / 1000:.1f} / "
          f"{hiver.length[hiver.SERVICE_DENEIGEMENT == 'Damé'].sum() / 1000:.1f} km)")
    print(f"CVC réalisés : {km[c == 1].sum():.1f} km (couche Ville : {cvc.length.sum() / 1000:.1f} km)")
    for code, nom in ((2, "déneigé"), (1, "damé")):
        print(f"  {nom} par classe :", t.loc[h == code].groupby("classe")["longueur_m"].sum().div(1000).round(1).to_dict())
    pd.DataFrame({"arete": np.arange(len(t)), "hiver": h, "cvc": c}).to_csv(SORTIE, index=False)
    print(SORTIE)


if __name__ == "__main__":
    main()
