"""
Scénarios du pont de Québec : combien de trajets tranquilles d'une rive à
l'autre tiennent en 15 ou 30 minutes ?

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-06-scenarios-pont.py

Entrées :
    02-graphe-epsg2949.gpkg                           graphe avec relief
    ../00-brut/osm/osm-ferry-quebec-levis-2026-10-21.json   traversier
Sortie :
    06-scenarios-pont.csv

Scénarios du pont (voir JOURNAL.md) :
    A  actuel / reconstruction à l'identique : 1,3 m, vélo à la main, 5 km/h
    B  chantier : pont fermé, reste le traversier
    C  tablier élargi : 2,5 m, on pédale à 20 km/h
croisés avec le régime de vitesse de Lévis : actuel (50 km/h) ou D (40 km/h).

Mesure : paires (départ, arrivée) de cellules de 1 ha, l'une à Québec,
l'autre à Lévis, reliées par un trajet tranquille dans le budget de temps,
dans un sens ou dans l'autre. Tout trajet d'une rive à l'autre passe par le
pont ou par le traversier : on calcule le temps de chaque cellule jusqu'à la
tête de pont (ou au quai), puis de l'autre tête jusqu'à chaque cellule, et on
garde le plus court des deux passages.

Traversier, deux hypothèses : optimiste 12 min (on arrive au départ du
bateau) ; réaliste 27 min (12 min de traversée + 15 min d'attente moyenne
pour un départ aux 30 min). À vérifier auprès de la STQ.
"""

import csv
import importlib.util
import json
import os
import sys

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from shapely.geometry import Point

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
SORTIE = os.path.join(ICI, "06-scenarios-pont.csv")
FERRY = os.path.join(ICI, "..", "00-brut", "osm", "osm-ferry-quebec-levis-2026-10-21.json")

sys.dont_write_bytecode = True  # pas de __pycache__ dans scripts/analysis/
spec = importlib.util.spec_from_file_location("maillons", os.path.join(os.path.dirname(os.path.abspath(__file__)), "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

PONT_QUEBEC = 39456261
V_PONT_C = 20            # km/h sur un tablier élargi
FERRY_MIN = {"optimiste": 12, "realiste": 27}
BUDGETS = (15, 30)
ACCROCHE_MAX = 200       # m entre un quai et le réseau tranquille


def quais(crs):
    with open(FERRY, encoding="utf-8") as f:
        e = next(x for x in json.load(f)["elements"] if x["type"] == "way")
    g = e["geometry"]
    pts = gpd.GeoSeries([Point(g[0]["lon"], g[0]["lat"]), Point(g[-1]["lon"], g[-1]["lat"])],
                        crs=4326).to_crs(crs)
    return pts.iloc[0], pts.iloc[1]  # Québec, Lévis (ouest → est)


def plus_proche(noeuds, xy, point):
    d = np.hypot(xy[:, 0] - point.x, xy[:, 1] - point.y)
    i = int(d.argmin())
    return (noeuds[i], d[i]) if d[i] <= ACCROCHE_MAX else (None, d[i])


def temps_cellules(g, source, cutoff, garder):
    """Minutes de `source` à chaque cellule de `garder` (la plus proche des nœuds)."""
    t = nx.single_source_dijkstra_path_length(g, source, cutoff=cutoff)
    s = pd.Series({n: v for n, v in t.items() if n in garder})
    if s.empty:
        return s
    s.index = [m.cellule(n) for n in s.index]
    return s.groupby(level=0).min()


def paires(depart, arrivee, budget, pop):
    """Nombre de paires (o, c) avec min sur les passages de t(o) + traversée + t(c) ≤ budget.

    `depart` et `arrivee` : listes (une entrée par passage) de Series indexées
    par cellule ; la traversée est déjà ajoutée à `depart`."""
    cel_o = sorted(set().union(*[s.index for s in depart]))
    cel_c = sorted(set().union(*[s.index for s in arrivee]))
    if not cel_o or not cel_c:
        return 0, 0, 0
    best = np.full((len(cel_o), len(cel_c)), np.inf, dtype="float32")
    for so, sc in zip(depart, arrivee):
        o = so.reindex(cel_o).fillna(np.inf).values.astype("float32")
        c = sc.reindex(cel_c).fillna(np.inf).values.astype("float32")
        np.minimum(best, o[:, None] + c[None, :], out=best)
    ok = best <= budget
    gagnants = ok.any(axis=1)
    habitants = pop.reindex([c for c, g_ in zip(cel_o, gagnants) if g_]).sum()
    return int(ok.sum()), int(gagnants.sum()), round(habitants)


def evaluer(a, champ, scenario, ferry):
    t = a[a[champ]].copy()
    pont = t["osm_id"] == PONT_QUEBEC
    if scenario == "B":
        t = t[~pont]
    elif scenario == "C":
        minutes = t.loc[pont, "longueur_m"] / (V_PONT_C * 1000 / 60)
        t.loc[pont, "min_avant"] = minutes
        t.loc[pont, "min_arriere"] = minutes
    g = m.graphe_tranquille(t, champ)
    grev = g.reverse(copy=False)

    ville = pd.concat([pd.Series(t["ville"].values, index=t["u"]),
                       pd.Series(t["ville"].values, index=t["v"])])
    ville = ville[~ville.index.duplicated()]
    quebec = set(ville.index[ville == "Québec"])
    levis = set(ville.index[ville == "Lévis"])

    noeuds = list(g.nodes)
    xy = np.array(noeuds)
    passages = []  # (nœud côté Québec, nœud côté Lévis, minutes Q→L, minutes L→Q)
    if scenario != "B":
        p = a[a["osm_id"] == PONT_QUEBEC].iloc[0]
        nord, sud = (p["u"], p["v"]) if p["u"][1] > p["v"][1] else (p["v"], p["u"])
        # Le pont est une arête du graphe : son temps est compté en passant
        # par lui, d'une tête à l'autre.
        passages.append(("pont", nord, sud, 0.0, 0.0))
    qq, ql = quais(a.crs)
    nq, dq = plus_proche(noeuds, xy, qq)
    nl, dl = plus_proche(noeuds, xy, ql)
    accroche = f"quai Québec à {dq:.0f} m, quai Lévis à {dl:.0f} m du réseau tranquille"
    if nq is not None and nl is not None:
        passages.append(("traversier", nq, nl, FERRY_MIN[ferry], FERRY_MIN[ferry]))

    pop = m.population()
    resultats = {}
    for budget in BUDGETS:
        total, departs, habitants = 0, 0, 0
        for sens in ("QL", "LQ"):
            dep, arr = [], []
            for nom, n_q, n_l, t_ql, t_lq in passages:
                if sens == "QL":
                    a_bout, b_bout, tr, orig, dest = n_q, n_l, t_ql, quebec, levis
                else:
                    a_bout, b_bout, tr, orig, dest = n_l, n_q, t_lq, levis, quebec
                if nom == "pont":
                    # départ → tête de départ, puis tête de départ → arrivée
                    # (le graphe fait traverser le pont lui-même).
                    dep.append(temps_cellules(grev, a_bout, budget, orig))
                    arr.append(temps_cellules(g, a_bout, budget, dest))
                else:
                    dep.append(temps_cellules(grev, a_bout, budget, orig) + tr)
                    arr.append(temps_cellules(g, b_bout, budget, dest))
            p_, d_, h_ = paires(dep, arr, budget, pop)
            total += p_
            departs += d_
            habitants += h_
        resultats[budget] = (total, departs, habitants)
    return resultats, accroche


def main():
    a = m.charger()
    lignes = []
    for regime, champ, ilot in (("Lévis 50", "tranquille", "ilot_a"),
                                ("Lévis 40 (D)", "tranquille_d", "ilot_d")):
        a_r, _ = m.fusionner_traversees(a, champ, ilot)
        for scenario in ("A", "B", "C"):
            for ferry in ("optimiste", "realiste"):
                res, accroche = evaluer(a_r, champ, scenario, ferry)
                ligne = {"regime": regime, "pont": scenario, "traversier": ferry}
                for b, (p_, d_, h_) in res.items():
                    ligne[f"habitants_{b}min"] = h_
                    ligne[f"paires_{b}min"] = p_
                    ligne[f"departs_ha_{b}min"] = d_
                lignes.append(ligne)
        print(regime, ":", accroche)
    df = pd.DataFrame(lignes)
    df.to_csv(SORTIE, index=False, quoting=csv.QUOTE_MINIMAL)
    print(df.to_string(index=False))


if __name__ == "__main__":
    main()
