"""
Graphes À PIED et EN AUTO de Québec–Lévis, pour comparer trois modes en
15 minutes (lab « modes-quebec-levis »). Le vélo reprend TEL QUEL le graphe du
lab vélo (velo-quebec-levis-graphe-v4.json) : même réseau, mêmes vitesses.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/modes-quebec-levis-01-graphes.py

Entrées (atelier du lab vélo, lues sans être modifiées) :
    00-brut/osm/osm-highway-quebec-levis-2026-10-21.json   réseau viaire OSM
    00-brut/vdq/vdq-voiepublique.zip                       VITESSEMAX de Québec
    10-travail/02-mnt-8m-epsg3979.tif                      MNT HRDEM comblé
    30-export/velo-quebec-levis-graphe-v4.json             grille et terre ferme

Sorties (geodata/07-modes-quebec-levis/30-export/) :
    modes-quebec-levis-pied-v1.json    même format que le graphe vélo
    modes-quebec-levis-auto-v1.json    idem, + scénario « hiver »

LA MÊME GRILLE que le vélo (cellules de 100 m, masque de terre) : les trois
taches se superposent cellule pour cellule, et les surfaces se comparent. Une
arête dont un bout tombe hors de la grille est retirée : la tache d'auto
s'arrête à l'emprise de Québec et Lévis (+ 500 m), comme celle du vélo.

À PIED — toute voie où le piéton est admis : trottoirs, sentiers, escaliers,
rues ; pas les autoroutes, ni ce qui porte foot=no ou un accès privé.
Vitesse selon la pente, fonction de Tobler (1993) : 6 · exp(−3,5 · |s + 0,05|)
km/h, soit 5,0 km/h à plat. Les deux sens toujours.

EN AUTO — toute voie carrossable, autoroutes comprises ; sens uniques et
giratoires respectés ; ni allées de stationnement ni entrées privées (comme
pour le vélo). Vitesse : la limite affichée (VITESSEMAX de Québec, sinon
maxspeed d'OSM, sinon le défaut du Code de la sécurité routière) multipliée
par un facteur — HYPOTHÈSE à confirmer, écrite dans le JOURNAL :
    rues                       × 0,70  (feux, arrêts, virages, circulation)
    autoroutes, voies rapides  × 0,85
L'HIVER (scénario « hiver ») : FHWA, Road Weather Management Program — sur
chaussée enneigée ou fondante, −30 à −40 % sur les artères (on prend −35 %),
−3 à −13 % sur autoroute en neige légère (on prend −8 %).

L'hiver à pied est un facteur uniforme appliqué dans le navigateur (× 0,92,
NTNU 2021 : +1 min/km sur trottoir d'hiver entretenu), comme le × 0,79 du vélo.
"""

import importlib.util
import json
import math
import os
import re
import sys
from collections import Counter

import geopandas as gpd
import numpy as np
import pandas as pd
from osgeo import gdal
from pyproj import Transformer
from shapely.geometry import LineString

gdal.UseExceptions()
sys.dont_write_bytecode = True

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
VELO = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
OSM = os.path.join(VELO, "00-brut", "osm", "osm-highway-quebec-levis-2026-10-21.json")
MNT = os.path.join(VELO, "10-travail", "02-mnt-8m-epsg3979.tif")
GRAPHE_VELO = os.path.join(VELO, "30-export", "velo-quebec-levis-graphe-v4.json")
SORTIE = os.path.join(RACINE, "geodata", "07-modes-quebec-levis", "30-export")
SCR = "EPSG:2949"

# Le classement du lab vélo : emprise, vitesses officielles (VITESSEMAX).
spec = importlib.util.spec_from_file_location(
    "classer", os.path.join(ICI_SCRIPT, "velo-quebec-levis-01-classer-reseau.py"))
m01 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m01)

PAS = 10            # m entre deux échantillons d'altitude
LISSAGE = 3
PENTE_MAX = 25      # % : au-delà, du bruit du MNT

NON_VOIES = {"construction", "proposed", "raceway", "rest_area", "services",
             "bus_guideway", "platform", "elevator", "corridor", "abandoned",
             "disused", "razed"}
RAPIDES = {"motorway", "motorway_link", "trunk", "trunk_link"}
PIETONS = {"footway", "path", "pedestrian", "steps", "track", "bridleway", "cycleway"}
CARROSSABLES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary",
                "primary_link", "secondary", "secondary_link", "tertiary",
                "tertiary_link", "unclassified", "residential", "living_street", "service"}
NON = {"no", "private"}

F_RUE, F_RAPIDE = 0.70, 0.85            # facteurs de l'été (hypothèse)
H_RUE, H_RAPIDE = 0.65, 0.92            # hiver, relatif à l'été (FHWA)
VITESSE_DEFAUT_AUTO = {**m01.VITESSE_DEFAUT, "motorway": 100, "motorway_link": 60}


def lire():
    with open(OSM, encoding="utf-8") as f:
        elements = json.load(f)["elements"]
    lignes = []
    for e in elements:
        geom = e.get("geometry") or []
        if len(geom) < 2:
            continue
        t = e.get("tags", {})
        h = t.get("highway")
        if h is None or h in NON_VOIES:
            continue
        acces = t.get("access")
        pied = (h not in ("motorway", "motorway_link")
                and t.get("foot") not in NON
                and not (acces in NON and t.get("foot") not in ("yes", "designated", "permissive")))
        auto = (h in CARROSSABLES
                and not (h == "service" and t.get("service") in m01.SERVICE_EXCLUS)
                and acces not in NON
                and t.get("motor_vehicle") not in NON
                and t.get("motorcar") not in NON)
        if not (pied or auto):
            continue
        sens = 0
        if auto:
            ow = t.get("oneway")
            if ow in ("yes", "1", "true") or t.get("junction") in ("roundabout", "circular") \
                    or h in ("motorway",) and ow != "no":
                sens = 1
            elif ow == "-1":
                sens = -1
        lignes.append({
            "osm_id": e["id"], "highway": h, "pied": pied, "auto": auto, "sens": sens,
            "v_osm": m01.vitesse(t), "pont": t.get("bridge"),
            "geometry": LineString([(p["lon"], p["lat"]) for p in geom]),
        })
    return gpd.GeoDataFrame(lignes, crs="EPSG:4326").to_crs(SCR)


def vitesses_auto(reseau):
    """`v_auto` des voies carrossables : Ville, puis OSM, puis le défaut."""
    milieux = gpd.GeoDataFrame(geometry=reseau.interpolate(0.5, normalized=True),
                               index=reseau.index, crs=SCR)
    voies = gpd.read_file(m01.VDQ_VOIES, columns=["TYPE", "VITESSEMAX"]).to_crs(SCR)
    voies = voies[voies["TYPE"].isin(["Tronçon", "Autre (rue privée)"])
                  & (voies["VITESSEMAX"].fillna(0) > 0)][["VITESSEMAX", "geometry"]]
    rues = reseau.index[reseau["auto"]]
    pres = gpd.sjoin_nearest(milieux.loc[rues], voies, max_distance=12)
    v_ville = pres[~pres.index.duplicated()]["VITESSEMAX"]
    v = pd.Series(np.nan, index=reseau.index)
    for valeurs in (v_ville, reseau.loc[rues, "v_osm"].dropna(),
                    reseau.loc[rues, "highway"].map(VITESSE_DEFAUT_AUTO).dropna()):
        libre = v.isna() & v.index.isin(valeurs.index)
        v[libre] = valeurs.reindex(v.index[libre]).astype(float)
    # Une autoroute appariée par erreur à une rue de la Ville (échangeur) :
    # on garde au moins le défaut de sa classe.
    rapide = reseau["highway"].isin(RAPIDES)
    v[rapide] = np.fmax(v[rapide], reseau.loc[rapide, "highway"].map(VITESSE_DEFAUT_AUTO))
    reseau["v_auto"] = v.fillna(50)


def cle(xy):
    return (round(xy[0], 2), round(xy[1], 2))


def decouper(reseau):
    """Coupe chaque voie à ses sommets partagés (au sein du réseau du mode)."""
    compte = Counter()
    for g in reseau.geometry:
        coords = list(g.coords)
        compte.update({cle(c) for c in coords})
        compte.update([cle(coords[0]), cle(coords[-1])])
    aretes = []
    for r in reseau.itertuples():
        coords = list(r.geometry.coords)
        debut = 0
        for i in range(1, len(coords)):
            if i == len(coords) - 1 or compte[cle(coords[i])] > 1:
                aretes.append({"u": cle(coords[debut]), "v": cle(coords[i]),
                               "geometry": LineString(coords[debut:i + 1]),
                               "highway": r.highway, "sens": r.sens,
                               "v_auto": getattr(r, "v_auto", np.nan), "pont": r.pont})
                debut = i
    a = gpd.GeoDataFrame(aretes, crs=SCR)
    a["longueur_m"] = a.length
    return a


def pentes(a, z, gt):
    """Pentes (%) échantillonnées tous les 10 m, arête par arête, et les pas."""
    vers_mnt = Transformer.from_crs(SCR, "EPSG:3979", always_xy=True)
    sortie = []
    for geom, pont in zip(a.geometry, a["pont"]):
        l = geom.length
        n = max(2, int(np.ceil(l / PAS)) + 1)
        d = np.linspace(0, l, n)
        pts = [geom.interpolate(x) for x in d]
        x, y = vers_mnt.transform([p.x for p in pts], [p.y for p in pts])
        col = ((np.array(x) - gt[0]) / gt[1]).astype(int).clip(0, z.shape[1] - 1)
        lig = ((np.array(y) - gt[3]) / gt[5]).astype(int).clip(0, z.shape[0] - 1)
        h = z[lig, col]
        if pont is not None and pont == pont:
            h = np.interp(d, [0, l], [h[0], h[-1]])
        elif n > LISSAGE:
            h = np.convolve(np.pad(h, LISSAGE // 2, mode="edge"), np.ones(LISSAGE) / LISSAGE, mode="valid")
        dl = np.diff(d)
        p = np.nan_to_num(np.clip(100 * np.diff(h) / np.maximum(dl, 0.1), -PENTE_MAX, PENTE_MAX))
        sortie.append((dl, p))
    return sortie


def tobler(pente_pct):
    return 6 * np.exp(-3.5 * np.abs(pente_pct / 100 + 0.05))


def exporter(a, av, ar, grille, terre, nom, scenarios, meta):
    """Nœuds placés dans la grille du vélo ; arêtes hors grille retirées."""
    g = grille
    noeuds = {}
    for n in list(a["u"]) + list(a["v"]):
        noeuds.setdefault(n, len(noeuds))
    xy = np.array(list(noeuds.keys()))
    lon, lat = Transformer.from_crs(SCR, "EPSG:4326", always_xy=True).transform(xy[:, 0], xy[:, 1])
    col = np.floor((lon - g["ouest"]) / g["dlon"]).astype(int)
    y = np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
    lig = np.floor((g["y_nord"] - y) / g["dy"]).astype(int)
    dedans = (col >= 0) & (lig >= 0) & (col < g["colonnes"]) & (lig < g["lignes"])

    garde = [i for i, (u, v) in enumerate(zip(a["u"], a["v"])) if dedans[noeuds[u]] and dedans[noeuds[v]]]
    # Renumérotation compacte des nœuds retenus.
    nouveaux = {}
    px = []
    plat = []
    for i in garde:
        ids = []
        for n in (a["u"].iat[i], a["v"].iat[i]):
            k = noeuds[n]
            if k not in nouveaux:
                nouveaux[k] = len(nouveaux)
                px.append(int(lig[k] * g["colonnes"] + col[k]))
            ids.append(nouveaux[k])
        plat += [ids[0], ids[1], int(av[i]), int(ar[i]), 1]
    sc = {k: (s(garde) if callable(s) else s) for k, s in scenarios.items()}
    donnees = {"version": 1, "unite": "dixièmes de minute", "grille": g, "px": px, "e": plat,
               "terre": terre, "scenarios": sc, "metadata": meta}
    os.makedirs(SORTIE, exist_ok=True)
    chemin = os.path.join(SORTIE, nom)
    texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(texte)
    print(f"{nom} : {len(px)} nœuds, {len(garde)} arêtes"
          f" ({len(a) - len(garde)} hors grille), {len(texte.encode('utf-8')) / 1024:.0f} Ko")
    return garde


def dixiemes(minutes):
    return np.maximum(1, np.round(np.asarray(minutes) * 10)).astype(int)


def main():
    with open(GRAPHE_VELO, encoding="utf-8") as f:
        velo = json.load(f)
    grille, terre = velo["grille"], velo["terre"]

    h = gdal.Open(MNT)
    z, gt = h.ReadAsArray().astype("float32"), h.GetGeoTransform()

    reseau = lire()
    vitesses_auto(reseau)
    print(f"voies : {len(reseau)} ; à pied {reseau.pied.sum()}, en auto {reseau.auto.sum()}")
    meta = {"script": "scripts/analysis/modes-quebec-levis-01-graphes.py",
            "methode": "geodata/07-modes-quebec-levis/JOURNAL.md",
            "licence": "ODbL 1.0 (dérivé d'OpenStreetMap)"}

    # ── À pied ───────────────────────────────────────────────────────────
    p = decouper(reseau[reseau["pied"]].drop(columns="sens").assign(sens=0))
    tps_av, tps_ar = [], []
    for dl, pc in pentes(p, z, gt):
        tps_av.append(float((dl / (tobler(pc) * 1000 / 60)).sum()))
        tps_ar.append(float((dl / (tobler(-pc) * 1000 / 60)).sum()))
    exporter(p, dixiemes(tps_av), dixiemes(tps_ar), grille, terre, "modes-quebec-levis-pied-v1.json",
             {"tout": {"masque": 1}},
             {**meta, "vitesses": "Tobler (1993) : 6·exp(−3,5·|s+0,05|) km/h, 5,0 km/h à plat"})

    # ── En auto ──────────────────────────────────────────────────────────
    a = decouper(reseau[reseau["auto"]])
    rapide = a["highway"].isin(RAPIDES).to_numpy()
    v = a["v_auto"].to_numpy(dtype=float) * np.where(rapide, F_RAPIDE, F_RUE)
    t = a["longueur_m"].to_numpy() / (v * 1000 / 60)
    INTERDIT = 0x3fffffff  # sens interdit : un temps hors de tout budget
    sens = a["sens"].to_numpy()
    av = np.where(sens == -1, INTERDIT, dixiemes(t))
    ar = np.where(sens == 1, INTERDIT, dixiemes(t))
    th = t / np.where(rapide, H_RAPIDE, H_RUE)
    hav = np.where(sens == -1, INTERDIT, dixiemes(th))
    har = np.where(sens == 1, INTERDIT, dixiemes(th))

    def hiver(garde):
        return {"masque": 1, "remplace": [[k, int(hav[i]), int(har[i])] for k, i in enumerate(garde)]}

    exporter(a, av, ar, grille, terre, "modes-quebec-levis-auto-v1.json",
             {"tout": {"masque": 1}, "hiver": hiver},
             {**meta, "vitesses": f"limite × {F_RUE} (rues) / × {F_RAPIDE} (voies rapides) ;"
                                  f" hiver × {H_RUE} / × {H_RAPIDE} (FHWA)"})
    km_rapide = a.loc[rapide, "longueur_m"].sum() / 1000
    print(f"auto : {a.longueur_m.sum() / 1000:.0f} km dont {km_rapide:.0f} km de voies rapides ;"
          f" vitesse affichée médiane {np.median(a['v_auto']):.0f} km/h")
    print(a.groupby("highway")["v_auto"].describe()[["count", "mean", "min", "max"]].round(0).to_string())


if __name__ == "__main__":
    main()
