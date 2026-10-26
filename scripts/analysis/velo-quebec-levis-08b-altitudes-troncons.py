"""
Ajoute l'altitude de chaque nœud au fichier des tronçons : le panneau
d'itinéraire en tire le profil en long du trajet.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-08b-altitudes-troncons.py

Le fichier v1 garde, par arête, le dénivelé cumulé dans chaque sens ; il dit
combien on monte, pas à quelle hauteur on est. Le v2 y ajoute `z` : altitude
de chaque nœud, en décimètres, en écarts au nœud précédent (comme les
coordonnées), dans l'ordre exact des nœuds du v1 — vérifié ici.

Altitude : MNT 8 m (HRDEM comblé par MRDEM-30, préparé par le script 02),
moyenne des 3 × 3 cellules autour du nœud (≈ 24 m), comme le lissage sur
30 m du calcul des pentes. Sur les ponts, le MNT donne le fond de la vallée :
un nœud dont TOUTES les arêtes sont des ponts reçoit l'altitude interpolée
depuis ses voisins (moyenne pondérée par l'inverse de la longueur, itérée),
comme le script 02 interpole le long d'une arête de pont. Limite : un
tunnel garde l'altitude du sol au-dessus.

Entrées : geodata/04-velo-quebec-levis/10-travail/02-graphe-epsg2949.gpkg
          geodata/04-velo-quebec-levis/10-travail/02-mnt-8m-epsg3979.tif
          geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-troncons-v1.json
Sortie  : geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-troncons-v2.json
"""

import importlib.util
import json
import os
import sys

import numpy as np
from osgeo import gdal
from pyproj import Transformer

gdal.UseExceptions()

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
MNT = os.path.join(PROJET, "10-travail", "02-mnt-8m-epsg3979.tif")
V1 = os.path.join(PROJET, "30-export", "velo-quebec-levis-troncons-v1.json")
V2 = os.path.join(PROJET, "30-export", "velo-quebec-levis-troncons-v2.json")

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def main():
    # Mêmes arêtes, même ordre de nœuds que le script 08.
    t = m.charger().reset_index(drop=True)
    noeuds = {}
    for n in list(t["u"]) + list(t["v"]):
        if n not in noeuds:
            noeuds[n] = len(noeuds)
    xy = np.array(list(noeuds.keys()))

    with open(V1, encoding="utf-8") as f:
        v1 = json.load(f)
    lon, lat = Transformer.from_crs("EPSG:2949", "EPSG:4326", always_xy=True).transform(xy[:, 0], xy[:, 1])
    ilon = np.cumsum(v1["dlon"])
    if len(ilon) != len(xy) or np.abs(ilon - np.round(lon * 1e5)).max() > 0:
        sys.exit("ordre des nœuds différent du v1 : relancer le script 08 d'abord")
    if np.abs(np.cumsum(v1["dlat"]) - np.round(lat * 1e5)).max() > 0:
        sys.exit("ordre des nœuds différent du v1 (latitudes)")
    print(f"{len(xy)} nœuds, ordre identique au v1")

    # Altitude : moyenne 3 × 3 autour du nœud.
    ds = gdal.Open(MNT)
    gt = ds.GetGeoTransform()
    z = ds.ReadAsArray().astype("float64")
    x, y = Transformer.from_crs("EPSG:2949", "EPSG:3979", always_xy=True).transform(xy[:, 0], xy[:, 1])
    col = ((np.array(x) - gt[0]) / gt[1]).astype(int)
    lig = ((np.array(y) - gt[3]) / gt[5]).astype(int)
    fen = []
    for dl in (-1, 0, 1):
        for dc in (-1, 0, 1):
            fen.append(z[(lig + dl).clip(0, z.shape[0] - 1), (col + dc).clip(0, z.shape[1] - 1)])
    alt = np.nanmean(np.array(fen), axis=0)

    # Nœuds de pont : toutes leurs arêtes sont des ponts.
    u = t["u"].map(noeuds).to_numpy()
    v = t["v"].map(noeuds).to_numpy()
    pont = t["pont"].notna().to_numpy()
    hors_pont = np.zeros(len(xy), bool)
    hors_pont[u[~pont]] = True
    hors_pont[v[~pont]] = True
    libres = ~hors_pont | np.isnan(alt)
    print(f"{libres.sum()} nœuds interpolés (ponts ou MNT vide)")
    w = 1 / np.maximum(t["longueur_m"].to_numpy(), 1)
    alt[libres] = np.nanmean(alt[~libres])
    for _ in range(2000):
        somme = np.zeros(len(xy))
        poids = np.zeros(len(xy))
        np.add.at(somme, u, w * alt[v])
        np.add.at(poids, u, w)
        np.add.at(somme, v, w * alt[u])
        np.add.at(poids, v, w)
        nouv = np.where(poids > 0, somme / np.maximum(poids, 1e-12), alt)
        ecart = np.abs(nouv[libres] - alt[libres]).max() if libres.any() else 0
        alt[libres] = nouv[libres]
        if ecart < 0.01:
            break

    dm = np.round(alt * 10).astype(np.int64)
    v2 = dict(v1)
    v2["version"] = 2
    v2["z"] = np.diff(dm, prepend=0).tolist()
    v2["metadata"] = dict(v1["metadata"])
    v2["metadata"]["script"] = "scripts/analysis/velo-quebec-levis-08b-altitudes-troncons.py (sur le v1 du script 08)"
    v2["metadata"]["z"] = ("altitude des nœuds en décimètres, en écarts ; MNT HRDEM 8 m comblé par "
                           "MRDEM-30 (RNCan), moyenne 3 × 3 ; ponts interpolés depuis leurs extrémités")
    texte = json.dumps(v2, ensure_ascii=False, separators=(",", ":"))
    with open(V2, "w", encoding="utf-8") as f:
        f.write(texte)
    print(f"{V2} : {len(texte.encode('utf-8')) / 1024:.0f} Ko ; altitudes {alt.min():.0f}–{alt.max():.0f} m")


if __name__ == "__main__":
    main()
