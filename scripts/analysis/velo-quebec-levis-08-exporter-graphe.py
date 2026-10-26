"""
Exporte le graphe tranquille pour le calcul de portée DANS LE NAVIGATEUR.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-08-exporter-graphe.py

Le lab montre, sous le curseur, tout ce qu'on atteint à vélo par un trajet
tranquille en 60 minutes. Une tache par position du curseur ne se précalcule
pas : il en faudrait des milliers. Le navigateur refait donc le parcours de
graphe (Dijkstra) à chaque mouvement — quelques dizaines de millisecondes —
sur le graphe que ce script exporte.

Format (JSON compact, entiers seulement) :
    grille   cellules carrées en Web Mercator, ≈ 100 m au sol à 46,8° N :
             ouest, dlon (degrés par colonne), y_nord et dy (unités Mercator,
             en radians), colonnes, lignes, et les quatre coins pour la source
             canvas de MapLibre
    px       pour chaque nœud, l'indice de sa cellule (ligne × colonnes + colonne)
    e        arêtes à plat : u, v, dixièmes de minute u→v, v→u, drapeaux
             drapeaux : 1 tranquille en A, 2 tranquille en D, 4 pont de Québec,
             8 permise au vélo (toute voie retenue : seules les autoroutes et
             les voies interdites au vélo sont exclues, dès le classement)
    scenarios  masque des arêtes retenues et temps remplacés (pont élargi)
    terre    cellules de terre ferme, en plages [début, longueur, …] : la
             surface atteinte ne compte pas le fleuve ni les lacs

Troisième fichier, chargé seulement à la demande — vue « rues exposées » et
itinéraire — parce qu'il ne sert pas à la tache :
    troncons coordonnées exactes des nœuds (lon/lat × 1e5, en écarts au nœud
             précédent : les nœuds voisins se suivent, les écarts sont courts)
             et, pour chaque arête dans l'ordre de `e` : longueur (m), classe
             (0 piste, 1 rue calme, 2 exposée, 3 sentier, 4 à pied), vitesse
             automobile (km/h, 0 hors rue), dénivelé positif dans le sens
             u→v et v→u (m), pente maximale (%)

Second fichier, chargé après le graphe (le graphe passerait sinon les 2 Mo) :
    noms     dictionnaire des noms de voies, et l'indice du nom de chaque arête
             dans le même ordre que `e` — pour dire au lecteur sur quelle rue
             est son curseur

Entrée : geodata/04-velo-quebec-levis/10-travail/02-graphe-epsg2949.gpkg
Sorties : geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-graphe-v4.json
          geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-noms-v1.json
          geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-troncons-v1.json
"""

import importlib.util
import json
import math
import os
import sys

import geopandas as gpd
import numpy as np
from osgeo import gdal, ogr, osr
from pyproj import Transformer
from shapely.geometry import box

gdal.UseExceptions()

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
SORTIE = os.path.join(PROJET, "30-export", "velo-quebec-levis-graphe-v4.json")
SORTIE_NOMS = os.path.join(PROJET, "30-export", "velo-quebec-levis-noms-v1.json")
SORTIE_TRONCONS = os.path.join(PROJET, "30-export", "velo-quebec-levis-troncons-v1.json")
CLASSES = {"piste": 0, "rue_calme": 1, "expose": 2, "sentier": 3, "a_pied": 4}
ISQ = os.path.join(PROJET, "00-brut", "isq", "geo_recensement_2021_qc_harmonise_isq_format_gdb.zip")
GDB = "/vsizip/" + ISQ.replace(os.sep, "/") + "/geo_rec_2021_QC_hamro_ISQ.gdb"
RAYON_TERRE = 6378137  # sphère de Web Mercator

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

PONT_QUEBEC = 39456261
V_PONT_C = 20          # km/h sur le tablier élargi (scénario C)
CELLULE_M = 100        # côté d'une cellule au sol
LAT_REF = 46.8


def mercator_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def masque_terre(ouest, y_nord, dlon, dy, colonnes, lignes, emprise_wgs):
    """Cellules de terre ferme, d'après les aires de diffusion en limites
    CARTOGRAPHIQUES de l'ISQ : celles-ci suivent le trait de côte, le fleuve et
    les grands lacs en sont exclus. Toutes les AD de l'emprise sont prises,
    pas seulement celles de Québec et de Lévis — enclaves et voisines aussi.

    La grille est exactement une grille Web Mercator (EPSG:3857) : x linéaire
    en longitude, y linéaire en y de Mercator. On y rastérise directement.
    """
    cadre = gpd.GeoSeries([emprise_wgs], crs=4326).to_crs(6623).total_bounds.tolist()
    ad = gpd.read_file(GDB, layer="AD_2021_QC_LimCarto_harmo", columns=["ADIDU"],
                       bbox=tuple(cadre)).to_crs(3857)
    ras = gdal.GetDriverByName("MEM").Create("", colonnes, lignes, 1, gdal.GDT_Byte)
    ras.SetGeoTransform((RAYON_TERRE * math.radians(ouest), RAYON_TERRE * math.radians(dlon), 0,
                         RAYON_TERRE * y_nord, 0, -RAYON_TERRE * dy))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(3857)
    ras.SetProjection(srs.ExportToWkt())
    vec = ogr.GetDriverByName("Memory").CreateDataSource("")
    couche = vec.CreateLayer("terre", srs, ogr.wkbMultiPolygon)
    for geom in ad.geometry:
        f = ogr.Feature(couche.GetLayerDefn())
        f.SetGeometry(ogr.CreateGeometryFromWkb(geom.wkb))
        couche.CreateFeature(f)
    gdal.RasterizeLayer(ras, [1], couche, burn_values=[1])
    terre = ras.ReadAsArray().ravel().astype(np.int8)
    # Plages de cellules de terre : [début, longueur, début, longueur, …]
    bords = np.flatnonzero(np.diff(np.concatenate([[0], terre, [0]])))
    plages = np.column_stack([bords[0::2], bords[1::2] - bords[0::2]]).ravel().tolist()
    print(f"terre : {terre.mean() * 100:.1f} % des cellules, {len(plages) // 2} plages")
    return plages


def nom_de(r):
    """Le nom affiché pour une arête : son nom OSM, sinon ce qu'elle est."""
    if isinstance(r.nom, str) and r.nom.strip():
        return r.nom.strip()
    return {
        "piste": "Piste cyclable", "sentier": "Sentier", "a_pied": "Trottoir ou passage piéton",
    }.get(r.classe, "Rue sans nom")


def main():
    a = m.charger()
    # Les traversées de ≤ 30 m sont fusionnées, comme pour les maillons : le
    # lab montre le même réseau que celui sur lequel les chiffres sont calculés.
    a_a, _ = m.fusionner_traversees(a, "tranquille", "ilot_a")
    a_d, _ = m.fusionner_traversees(a, "tranquille_d", "ilot_d")
    a["ok_a"] = a_a["tranquille"].values
    a["ok_d"] = a_d["tranquille_d"].values
    # Toutes les arêtes du graphe sont permises au vélo : le classement
    # (01-classer-reseau) a déjà retiré autoroutes, `bicycle=no`, voies
    # privées et la chaussée du pont de Québec (vélo renvoyé au trottoir).
    t = a.reset_index(drop=True)

    noeuds = {}
    for n in list(t["u"]) + list(t["v"]):
        if n not in noeuds:
            noeuds[n] = len(noeuds)
    xy = np.array(list(noeuds.keys()))
    vers_wgs = Transformer.from_crs("EPSG:2949", "EPSG:4326", always_xy=True)
    lon, lat = vers_wgs.transform(xy[:, 0], xy[:, 1])

    dlon = CELLULE_M / (111320 * math.cos(math.radians(LAT_REF)))
    dy = math.radians(dlon)                      # cellule carrée en Mercator
    ouest = float(lon.min()) - dlon
    y_nord = mercator_y(float(lat.max())) + dy
    colonnes = int(math.ceil((float(lon.max()) - ouest) / dlon)) + 2
    y = np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
    lignes = int(math.ceil((y_nord - float(y.min())) / dy)) + 2
    col = ((lon - ouest) / dlon).astype(int)
    lig = ((y_nord - y) / dy).astype(int)
    px = (lig * colonnes + col).tolist()

    est = ouest + colonnes * dlon
    sud = math.degrees(2 * math.atan(math.exp(y_nord - lignes * dy)) - math.pi / 2)
    nord = math.degrees(2 * math.atan(math.exp(y_nord)) - math.pi / 2)

    plat = []
    pont = None
    for i, r in enumerate(t.itertuples()):
        drap = (1 if r.ok_a else 0) | (2 if r.ok_d else 0) | 8
        if r.osm_id == PONT_QUEBEC:
            drap |= 4
            pont = i
        plat += [noeuds[r.u], noeuds[r.v],
                 max(1, round(r.min_avant * 10)), max(1, round(r.min_arriere * 10)), drap]

    t_pont_c = max(1, round(t.loc[pont, "longueur_m"] / (V_PONT_C * 1000 / 60) * 10))

    terre = masque_terre(ouest, y_nord, dlon, dy, colonnes, lignes, box(ouest, sud, est, nord))

    dico, indices = {}, []
    for r in t.itertuples():
        n = nom_de(r)
        if n not in dico:
            dico[n] = len(dico)
        indices.append(dico[n])
    noms = {"version": 1, "graphe": "velo-quebec-levis-graphe-v4.json",
            "noms": list(dico), "arete": indices}
    donnees = {
        "version": 4,
        "unite": "dixièmes de minute",
        "grille": {
            "ouest": round(ouest, 6), "dlon": dlon, "y_nord": y_nord, "dy": dy,
            "colonnes": colonnes, "lignes": lignes,
            "coins": [[round(ouest, 6), round(nord, 6)], [round(est, 6), round(nord, 6)],
                      [round(est, 6), round(sud, 6)], [round(ouest, 6), round(sud, 6)]],
        },
        "px": px,
        "e": plat,
        "terre": terre,
        "scenarios": {
            "A": {"masque": 1},
            "C": {"masque": 1, "remplace": [[pont, t_pont_c, t_pont_c]]},
            "D": {"masque": 2},
            "CD": {"masque": 2, "remplace": [[pont, t_pont_c, t_pont_c]]},
            # Toutes les voies permises au vélo, rues exposées comprises.
            "tout": {"masque": 8},
            "tout_C": {"masque": 8, "remplace": [[pont, t_pont_c, t_pont_c]]},
        },
        "metadata": {
            "script": "scripts/analysis/velo-quebec-levis-08-exporter-graphe.py",
            "methode": "geodata/04-velo-quebec-levis/JOURNAL.md",
            "licence": "ODbL 1.0 (dérivé d'OpenStreetMap)",
            "vitesses": "20 km/h à plat, pente selon Parkin et Rotheram (2010), à pied 5 km/h",
        },
    }
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write(texte)
    # Tronçons : coordonnées en écarts (entiers × 1e5), attributs par arête.
    ilon = np.round(lon * 1e5).astype(np.int64)
    ilat = np.round(lat * 1e5).astype(np.int64)
    troncons = {
        "version": 1,
        "graphe": "velo-quebec-levis-graphe-v4.json",
        "dlon": np.diff(ilon, prepend=0).tolist(),
        "dlat": np.diff(ilat, prepend=0).tolist(),
        "l": t["longueur_m"].round().astype(int).tolist(),
        "c": t["classe"].map(CLASSES).fillna(1).astype(int).tolist(),
        "va": t["v_auto"].fillna(0).astype(int).tolist(),
        "dpa": t["d_plus_m"].round().astype(int).tolist(),
        "dpr": t["d_moins_m"].round().astype(int).tolist(),
        "pm": t["pente_max"].round().astype(int).tolist(),
        "metadata": {
            "script": "scripts/analysis/velo-quebec-levis-08-exporter-graphe.py",
            "licence": "ODbL 1.0 (dérivé d'OpenStreetMap)",
            "classes": list(CLASSES),
        },
    }
    texte_tr = json.dumps(troncons, ensure_ascii=False, separators=(",", ":"))
    with open(SORTIE_TRONCONS, "w", encoding="utf-8") as f:
        f.write(texte_tr)
    print(f"{SORTIE_TRONCONS} : {len(texte_tr.encode('utf-8')) / 1024:.0f} Ko")

    texte_noms = json.dumps(noms, ensure_ascii=False, separators=(",", ":"))
    with open(SORTIE_NOMS, "w", encoding="utf-8") as f:
        f.write(texte_noms)
    print(f"{SORTIE_NOMS} : {len(dico)} noms, {len(texte_noms.encode('utf-8')) / 1024:.0f} Ko")
    print(f"{SORTIE}\n{len(noeuds)} nœuds, {len(t)} arêtes, grille {colonnes} × {lignes},"
          f" pont = arête {pont} ({t.loc[pont, 'min_avant']:.1f} min → {t_pont_c / 10} min en C)"
          f"\n{len(texte.encode('utf-8')) / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
