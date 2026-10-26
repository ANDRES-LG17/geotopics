"""
Repère et classe les tronçons manquants : les liens exposés courts qui, une
fois aménagés, relieraient deux îlots tranquilles.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-04-maillons.py

Entrée :
    02-graphe-epsg2949.gpkg     couche aretes (velo-quebec-levis-02-construire-graphe.py)
Sortie :
    04-maillons-epsg2949.gpkg   une couche par scénario : maillons_a, maillons_d

Méthode
-------
1. Candidats. Chaque nœud d'un îlot tranquille d'au moins 1 km est une source.
   Une recherche multi-sources sur les seules voies exposées attribue à chaque
   nœud exposé l'îlot le plus proche (diagramme de Voronoï sur le réseau). Là
   où deux territoires se touchent, le chemin exposé qui les relie est un
   candidat ; on garde le plus court par paire d'îlots, s'il fait ≤ 300 m.
   Un lien de ≤ 30 m est une traversée de rue (une piste qui coupe une
   artère, raccrochée à la chaussée par deux nœuds voisins) : il est rendu
   tranquille, les deux îlots fusionnent, et la recherche recommence.

2. Gain. Le territoire est une grille de cellules de 100 m (1 ha). Une cellule
   est atteinte si un nœud tranquille qu'elle contient l'est. Pour un
   candidat entre l'îlot i (bout p) et l'îlot j (bout q), parcouru en L min :
       gain = Σ sur les cellules o de i : nb de cellules de j atteintes
              depuis q en 15 − L − t(o → p) min,  plus le symétrique.
   Avant l'aménagement, aucune cellule de j n'est atteignable tranquillement
   depuis i : tout ce qui est compté est du gain net. Unité : paires
   (départ, arrivée) de 1 ha. Chaque maillon est évalué seul, sans cumul.

3. Résidents. Avec la population 2021 par cellule (velo-quebec-levis-02b-population-cellules.py) :
   `paires_hab` = Σ sur les départs o : pop(o) × population nouvellement
   joignable depuis o. Ce sont des paires de résidents (qui part, qui est
   rejoint) : relier le grand îlot à un recoin vide ne rapporte presque rien,
   relier deux quartiers habités rapporte beaucoup. C'est l'ordre du
   classement. `habitants` compte les résidents qui gagnent au moins un
   voisin joignable ; `voisins_moy` est la population moyenne qu'ils gagnent.
"""

import os

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from shapely.geometry import MultiLineString
from shapely.ops import linemerge

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
GRAPHE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
POPULATION = os.path.join(ICI, "02b-population-cellules.csv")
SORTIE = os.path.join(ICI, "04-maillons-epsg2949.gpkg")

BUDGET = 15          # minutes
LONGUEUR_MAX = 300   # m de voie exposée à aménager, au plus
TRAVERSEE = 30       # m : en deçà, c'est la traversée d'une rue, pas un maillon
ILOT_MIN_KM = 1
V_AMENAGE = 20       # km/h sur le maillon aménagé
CELLULE = 100        # m


def cle(s):
    x, y = s.strip("()").split(",")
    return (float(x), float(y))


def charger():
    a = gpd.read_file(GRAPHE, layer="aretes")
    a["u"] = a["u"].map(cle)
    a["v"] = a["v"].map(cle)
    return a


def graphe_tranquille(a, champ):
    g = nx.DiGraph()
    t = a[a[champ]]
    g.add_weighted_edges_from(zip(t["u"], t["v"], t["min_avant"]))
    g.add_weighted_edges_from(zip(t["v"], t["u"], t["min_arriere"]))
    return g


def cellule(n):
    return (int(n[0] // CELLULE), int(n[1] // CELLULE))


def candidats(a, champ, ilot):
    t = a[a[champ]]
    noeud_ilot = pd.concat([pd.Series(t[ilot].values, index=t["u"]),
                            pd.Series(t[ilot].values, index=t["v"])])
    noeud_ilot = noeud_ilot[~noeud_ilot.index.duplicated()]
    km = t.groupby(ilot)["longueur_m"].sum() / 1000
    grands = set(km.index[km >= ILOT_MIN_KM])
    sources = {n for n, i in noeud_ilot.items() if i in grands}

    # Voies exposées (et non tranquilles), non orientées : on les aménage
    # dans les deux sens.
    e = a[~a[champ]]
    gx = nx.Graph()
    for u, v, l, idx in zip(e["u"], e["v"], e["longueur_m"], e.index):
        if not gx.has_edge(u, v) or gx[u][v]["weight"] > l:
            gx.add_edge(u, v, weight=l, idx=idx)
    gx.add_nodes_from(sources)
    dist, chemins = nx.multi_source_dijkstra(gx, sources & set(gx.nodes),
                                             cutoff=LONGUEUR_MAX)
    proprio = {n: noeud_ilot[c[0]] for n, c in chemins.items()}

    meilleurs = {}
    for u, v, d in gx.edges(data=True):
        if u not in proprio or v not in proprio or proprio[u] == proprio[v]:
            continue
        total = dist[u] + d["weight"] + dist[v]
        if total > LONGUEUR_MAX:
            continue
        paire = tuple(sorted((proprio[u], proprio[v])))
        if paire not in meilleurs or meilleurs[paire][0] > total:
            noeuds = chemins[u] + chemins[v][::-1]   # p … u v … q
            meilleurs[paire] = (total, noeuds)

    lignes = []
    for (i, j), (total, noeuds) in meilleurs.items():
        idx = [gx[x][y]["idx"] for x, y in zip(noeuds, noeuds[1:])]
        morceaux = a.loc[idx]
        if total <= TRAVERSEE:
            lignes.append({"traversee": True, "idx": idx, "geometry": None})
            continue
        p, q = noeuds[0], noeuds[-1]
        if noeud_ilot[p] != i:
            p, q = q, p
        lignes.append({
            "traversee": False, "idx": None,
            "ilot_1": int(i), "ilot_2": int(j), "km_ilot_1": round(km[i], 1),
            "km_ilot_2": round(km[j], 1), "longueur_m": round(total),
            "p": p, "q": q,
            "noms": " / ".join(sorted({n for n in morceaux["nom"].dropna()}))[:200],
            "ville": morceaux["ville"].mode().iat[0] if len(morceaux) else None,
            "v_auto_max": morceaux["v_auto"].max(),
            "geometry": linemerge(MultiLineString(list(morceaux.geometry))),
        })
    return gpd.GeoDataFrame(lignes, crs=a.crs)


def temps_par_cellule(longueurs):
    """{nœud: minutes} → {cellule: minutes}, le plus court par cellule."""
    s = pd.Series(longueurs)
    s.index = [cellule(n) for n in s.index]
    return s.groupby(level=0).min()


def population():
    p = pd.read_csv(POPULATION)
    return pd.Series(p["pop"].values, index=list(zip(p["cx"], p["cy"])))


def gain(g, grev, p, q, l_min, pop):
    reste = BUDGET - l_min
    if reste <= 0:
        return 0, 0, 0, 0, 0
    total, departs, habitants, paires_hab, voisins = 0, 0, 0.0, 0.0, 0.0
    for a_bout, b_bout in ((p, q), (q, p)):
        vers = temps_par_cellule(nx.single_source_dijkstra_path_length(
            grev, a_bout, cutoff=reste))
        depuis = temps_par_cellule(nx.single_source_dijkstra_path_length(
            g, b_bout, cutoff=reste)).sort_values()
        n = np.searchsorted(depuis.values, reste - vers.values, side="right")
        # Population joignable : cumul de la population des arrivées, par ordre de temps.
        cumul = np.concatenate([[0], pop.reindex(depuis.index).fillna(0).cumsum().values])
        joignable = cumul[n]
        pop_dep = pop.reindex(vers.index).fillna(0).values
        gagne = joignable > 0
        total += int(n.sum())
        departs += int((n > 0).sum())
        habitants += pop_dep[gagne].sum()
        paires_hab += (pop_dep * joignable).sum()
        voisins += (pop_dep * joignable)[gagne].sum()
    voisins_moy = voisins / habitants if habitants else 0
    return total, departs, round(habitants), round(paires_hab), round(voisins_moy)


def renumeroter(a, champ, ilot):
    """Recalcule les îlots (composantes connexes du réseau tranquille)."""
    g = nx.Graph()
    t = a[a[champ]]
    g.add_edges_from(zip(t["u"], t["v"]))
    numero = {n: i for i, comp in enumerate(nx.connected_components(g)) for n in comp}
    a[ilot] = a["u"].map(numero).where(a[champ])


def fusionner_traversees(a, champ, ilot):
    """Rend tranquilles les liens de ≤ 30 m jusqu'à ce qu'il n'en reste plus.

    Renvoie (réseau modifié, candidats restants)."""
    a = a.copy()
    nb_traversees = 0
    while True:
        cand = candidats(a, champ, ilot)
        trav = cand[cand["traversee"]]
        if trav.empty:
            break
        for idx in trav["idx"]:
            a.loc[idx, champ] = True
        nb_traversees += len(trav)
        renumeroter(a, champ, ilot)
    print(f"{champ} : {nb_traversees} traversées de ≤ {TRAVERSEE} m fusionnées")
    return a, cand.drop(columns=["traversee", "idx"])


def evaluer(a, champ, ilot):
    a, cand = fusionner_traversees(a, champ, ilot)
    g = graphe_tranquille(a, champ)
    grev = g.reverse(copy=False)
    pop = population()
    resultats = []
    for r in cand.itertuples():
        l_min = r.longueur_m / (V_AMENAGE * 1000 / 60)
        resultats.append(gain(g, grev, r.p, r.q, l_min, pop))
    cand["gain_paires"] = [x[0] for x in resultats]
    cand["departs_ha"] = [x[1] for x in resultats]
    cand["habitants"] = [x[2] for x in resultats]
    cand["paires_hab"] = [x[3] for x in resultats]
    cand["voisins_moy"] = [x[4] for x in resultats]
    cand = cand.drop(columns=["p", "q"]).sort_values("paires_hab", ascending=False)
    cand["rang"] = range(1, len(cand) + 1)
    return cand


def main():
    a = charger()
    for champ, ilot, couche in (("tranquille", "ilot_a", "maillons_a"),
                                ("tranquille_d", "ilot_d", "maillons_d")):
        m = evaluer(a, champ, ilot)
        m.to_file(SORTIE, layer=couche, driver="GPKG")
        print(f"== {couche} : {len(m)} candidats ≤ {LONGUEUR_MAX} m")
        print(m.head(15)[["rang", "ville", "longueur_m", "km_ilot_1", "km_ilot_2",
                          "paires_hab", "habitants", "voisins_moy", "gain_paires", "noms"]]
              .to_string(index=False, max_colwidth=60))
        print()


if __name__ == "__main__":
    main()
