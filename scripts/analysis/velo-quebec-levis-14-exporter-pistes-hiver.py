"""
Exporte les PISTES ENTRETENUES l'hiver avec leur tracé COMPLET (géométrie
OpenStreetMap des arêtes), pour les dessiner sur la colmena du lab.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-14-exporter-pistes-hiver.py

Le fichier des tronçons ne garde que les deux bouts de chaque arête : tracées
de nœud à nœud, les pistes coupaient les courbes et ne se superposaient pas
aux voies du fond de carte (OpenFreeMap, tiré lui aussi d'OpenStreetMap). Ici,
chaque arête garde sa géométrie, simplifiée à 0,5 m (invisible à l'écran),
coordonnées arrondies à 1e-6° (≈ 0,1 m).

Arêtes retenues : pistes et sentiers (classes piste, sentier) dont
l'entretien d'hiver est connu (script 11 : 1 damé, 2 déneigé). Les rues et
trottoirs parallèles qui ont pris l'attribut au rattachement sont écartés.
Les arêtes consécutives de même entretien sont fusionnées en lignes.

Nettoyage pour le dessin (v2) — le v1 montrait des « restes » aux
carrefours et des angles vifs :
- ÉLAGAGE des bouts pendants : une ligne de moins de 25 m dont un bout ne
  touche aucune autre ligne (raccord OSM vers un trottoir, une traverse) est
  retirée, et on recommence tant qu'il en reste (v1 : 169 sur 548 lignes) ;
- les morceaux ISOLÉS (aucun bout raccordé) de moins de 60 m partent aussi ;
- CROCHETS de bout : un bout libre dont les 15 derniers mètres tournent de
  plus de 60° par rapport aux 30 m précédents est coupé (bateau de trottoir) ;
- LISSAGE de Chaikin, 3 passes, EXTRÉMITÉS FIXES : les jonctions entre
  lignes restent exactes (v1 : 215 virages de plus de 30°).

Entrées :
    geodata/04-velo-quebec-levis/10-travail/02-graphe-epsg2949.gpkg
    geodata/04-velo-quebec-levis/10-travail/11-hiver-cvc.csv
Sortie :
    geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-pistes-hiver-v1.geojson
"""

import importlib.util
import json
import os
import sys

from collections import Counter

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from pyproj import Transformer
from shapely.geometry import LineString
from shapely.ops import linemerge, substring

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
SORTIE = os.path.join(PROJET, "30-export", "velo-quebec-levis-pistes-hiver-v2.geojson")
# Même traitement pour les corridors VivaCité réalisés (dessinés l'été).
SORTIE_CVC = os.path.join(PROJET, "30-export", "velo-quebec-levis-corridors-v1.geojson")
PENDANT_M = 25
ISOLE_M = 60
CROCHET_M = 15
CROCHET_DEG = 60
PASSES_CHAIKIN = 3

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def arrondir(coords):
    return [[round(x, 6), round(y, 6)] for x, y in coords]


def chaikin(coords, passes):
    """Coupe chaque angle au quart et aux trois quarts ; les deux bouts restent."""
    pts = np.asarray(coords, float)
    for _ in range(passes):
        if len(pts) < 3:
            break
        a, b = pts[:-1], pts[1:]
        q = 0.75 * a + 0.25 * b
        r = 0.25 * a + 0.75 * b
        milieu = np.empty((2 * len(a), 2))
        milieu[0::2] = q
        milieu[1::2] = r
        pts = np.vstack([pts[:1], milieu[1:-1], pts[-1:]])
    return pts


def elaguer(lignes):
    """Retire les bouts pendants courts, jusqu'à ce qu'il n'y en ait plus.
    `lignes` : liste de (h, LineString) ; un bout « pendant » ne touche aucun
    autre bout (à 0,5 m près). Un morceau ISOLÉ (ses deux bouts pendants) de
    moins de ISOLE_M part aussi."""
    cle = lambda p: (round(p[0] * 2), round(p[1] * 2))
    while True:
        degre = Counter()
        for _, l in lignes:
            degre[cle(l.coords[0])] += 1
            degre[cle(l.coords[-1])] += 1
        def a_retirer(l):
            d0, d1 = degre[cle(l.coords[0])], degre[cle(l.coords[-1])]
            if l.length < PENDANT_M and min(d0, d1) == 1:
                return True
            return l.length < ISOLE_M and d0 == 1 and d1 == 1
        gardees = [(h, l) for h, l in lignes if not a_retirer(l)]
        if len(gardees) == len(lignes):
            return gardees, degre, cle
        lignes = gardees


def couper_crochet(ligne, libre_debut, libre_fin):
    """Un bout LIBRE qui tourne court (les CROCHET_M derniers mètres à plus de
    CROCHET_DEG du cap des 30 m précédents : bateau de trottoir, traverse) est
    coupé. Les bouts raccordés à une autre ligne ne bougent jamais."""
    def cap(a, b):
        return np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0]))

    def ecart(c1, c2):
        return abs((c1 - c2 + 180) % 360 - 180)

    l = ligne
    if l.length < 3 * CROCHET_M:
        return l
    if libre_fin:
        fin = l.interpolate(l.length).coords[0]
        p1 = l.interpolate(l.length - CROCHET_M).coords[0]
        p0 = l.interpolate(l.length - CROCHET_M - 30).coords[0]
        if ecart(cap(p1, fin), cap(p0, p1)) > CROCHET_DEG:
            l = substring(l, 0, l.length - CROCHET_M)
    if libre_debut and l.length >= 3 * CROCHET_M:
        debut = l.coords[0]
        p1 = l.interpolate(CROCHET_M).coords[0]
        p0 = l.interpolate(CROCHET_M + 30).coords[0]
        if ecart(cap(p1, debut), cap(p0, p1)) > CROCHET_DEG:
            l = substring(l, CROCHET_M, l.length)
    return l


def main():
    t = m.charger().reset_index(drop=True)
    hc = pd.read_csv(os.path.join(PROJET, "10-travail", "11-hiver-cvc.csv")).sort_values("arete")
    if len(hc) != len(t):
        raise SystemExit("11-hiver-cvc.csv ne correspond plus au graphe : relancer le script 11")
    t["h"] = hc["hiver"].to_numpy()
    t["cvc"] = hc["cvc"].to_numpy()

    # 1. Pistes entretenues l'hiver (propriété h : 1 damé, 2 déneigé).
    p = t[t["classe"].isin(["piste", "sentier"]) & (t["h"] > 0)].copy()
    exporter(p, "h", SORTIE, t.crs, {
        "h": "1 damé, 2 déneigé — réseau cyclable 4 saisons 2025-26 (Ville de Québec), "
             "rattaché aux pistes d'OpenStreetMap (script 11)",
        "licence": "ODbL 1.0 (géométrie OpenStreetMap) ; entretien : Ville de Québec",
    })
    # 2. Corridors VivaCité RÉALISÉS (propriété cvc = 1), même traitement :
    #    l'été, ils se dessinent comme les pistes déneigées l'hiver. Toutes
    #    classes (un corridor peut être une bande sur rue) SAUF les trottoirs :
    #    parallèles au corridor, ils ont pris l'attribut au rattachement et
    #    doubleraient le trait.
    c = t[(t["cvc"] == 1) & (t["classe"] != "a_pied")].copy()
    print("corridors réalisés par classe (km) :",
          (t[t["cvc"] == 1].groupby("classe")["longueur_m"].sum() / 1000).round(1).to_dict())
    # Une piste de corridor longe souvent la chaussée : la RUE voisine a pris
    # l'attribut elle aussi. On garde la rue seulement si aucune piste de
    # corridor ne passe à moins de 15 m de son milieu (corridor en bande).
    pistes = c[c["classe"].isin(["piste", "sentier"])]
    if len(pistes):
        arbre = shapely.STRtree(pistes.geometry.values)
        rues = c.index[~c["classe"].isin(["piste", "sentier"])]
        milieux = shapely.line_interpolate_point(c.loc[rues].geometry.values, 0.5, normalized=True)
        idx, _ = arbre.query_nearest(milieux, max_distance=15, return_distance=True)
        doublons = rues[np.unique(idx[0])]
        print(f"rues doublant une piste de corridor : {len(doublons)} "
              f"({c.loc[doublons, 'longueur_m'].sum() / 1000:.1f} km) retirées")
        c = c.drop(index=doublons)
    exporter(c, "cvc", SORTIE_CVC, t.crs, {
        "cvc": "1 corridor VivaCité réalisé — Ville de Québec, réseau cyclable, SOUS_TYPE_RC = Corridor "
               "(script 11), rattaché aux voies d'OpenStreetMap",
        "licence": "ODbL 1.0 (géométrie OpenStreetMap) ; corridors : Ville de Québec",
    })


def exporter(p, champ, sortie, crs, meta):
    """Lignes fusionnées par valeur de `champ`, élaguées, crochets coupés,
    lissées ; écrites en GeoJSON WGS84 avec la propriété `champ`."""
    p = p.copy()
    p["geometry"] = p.geometry.simplify(0.5)
    lignes = []
    for h, groupe in p.groupby(champ):
        fusion = linemerge(groupe.geometry.union_all())
        lignes += [(int(h), l) for l in (fusion.geoms if fusion.geom_type == "MultiLineString" else [fusion])]
    avant = len(lignes)
    lignes, degre, cle = elaguer(lignes)
    print(f"élagage : {avant - len(lignes)} bouts pendants (< {PENDANT_M} m) ou isolés (< {ISOLE_M} m) retirés")
    coupes = 0
    nettes = []
    for h, l in lignes:
        l2 = couper_crochet(l, degre[cle(l.coords[0])] == 1, degre[cle(l.coords[-1])] == 1)
        coupes += l2.length < l.length - 1
        nettes.append((h, l2))
    lignes = nettes
    print(f"crochets de bout coupés : {coupes}")

    entites = []
    vers_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    for h, ligne in lignes:
        # Lissage, puis on retire les sommets alignés (0,3 m) : Chaikin
        # multiplie les points par 8, utiles seulement dans les courbes.
        lisse = np.asarray(LineString(chaikin(ligne.coords, PASSES_CHAIKIN)).simplify(0.3).coords)
        lon, lat = vers_wgs.transform(lisse[:, 0], lisse[:, 1])
        entites.append({
            "type": "Feature",
            "properties": {champ: h},
            "geometry": {"type": "LineString", "coordinates": arrondir(zip(lon, lat))},
        })
    donnees = {
        "type": "FeatureCollection",
        "features": entites,
        "metadata": {"script": "scripts/analysis/velo-quebec-levis-14-exporter-pistes-hiver.py", **meta},
    }
    texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    with open(sortie, "w", encoding="utf-8") as f:
        f.write(texte)
    km = p.groupby(champ)["longueur_m"].sum() / 1000
    print(f"{sortie} : {len(entites)} lignes, {len(texte.encode('utf-8')) / 1024:.0f} Ko ; "
          + ", ".join(f"{champ}={k} {v:.1f} km" for k, v in km.items()))


if __name__ == "__main__":
    main()
