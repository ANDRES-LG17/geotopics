"""
Tramway de Québec — aires de marche de 15 minutes autour des stations.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" \\
        scripts/analysis/tramway-isochrones.py

Calcule, pour chaque station, **ce qu'on atteint réellement à pied** — pas un
disque. Le résultat suit les rues : il s'étend dans une trame dense, et s'arrête
net devant une autoroute, une rivière ou une falaise.

POURQUOI PAS UN CERCLE — un rayon de 1,2 km à vol d'oiseau autour d'une station
de la Basse-Ville englobe la Haute-Ville, où l'on ne monte pas en marchant. Le
cercle mentirait précisément là où ce lab veut dire la vérité : la desserte
dépend du terrain, pas de la distance.

LA MÉTHODE — un parcours de graphe (Dijkstra) sur le réseau marchable
d'OpenStreetMap, borné à la distance franchie en 15 minutes. Les arêtes
atteintes sont ensuite épaissies et fusionnées : la forme obtenue est le
voisinage des rues parcourues, et non leur enveloppe convexe, qui comblerait
justement les trous que l'on cherche à montrer.

LES ESCALIERS SONT INCLUS (`highway=steps`). C'est par eux qu'on monte la
falaise, et les écarter rendrait la Haute-Ville artificiellement inaccessible.
Leur pente n'est pas pénalisée — une limite à dire dans la note.

Dépendances : networkx, geopandas, shapely, pyproj — toutes fournies par le
Python de QGIS. `osmnx` n'est pas nécessaire : les données viennent déjà
d'Overpass, et le parcours de graphe est fait ici.
"""

import json
import os
import sys
from collections import defaultdict

import networkx as nx
from pyproj import Transformer
from shapely.geometry import LineString, mapping
from shapely.ops import unary_union

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ATELIER = os.path.join(RACINE, "geodata", "2026-10-tramway-quebec")

# --- paramètres de méthode -------------------------------------------------

#: Vitesse de marche, en km/h. 4,8 est la valeur usuelle des études de
#: transport, et celle qu'emploie tramquebec.00h11.ca — la garder rend les
#: résultats comparables. Elle ne tient compte ni de la neige, ni de la pente :
#: à dire dans la note du lab.
VITESSE_KMH = 4.8

#: Durée de marche retenue, en minutes.
MINUTES = 15

#: Distance franchie, en mètres. 4,8 km/h × 15 min = 1 200 m.
PORTEE_M = VITESSE_KMH * 1000 / 60 * MINUTES

#: Demi-largeur du couloir dessiné autour des rues atteintes, en mètres.
#:
#: Ce n'est pas une marge arbitraire : une rue parcourue dessert les bâtiments
#: qui la bordent, pas seulement son axe. 40 m correspond à la profondeur d'un
#: îlot urbain de Québec. Trop peu donne un squelette filiforme ; trop donne une
#: tache qui recolle les trous qu'on veut montrer.
COULOIR_M = 40

#: Tolérance de simplification du polygone final, en mètres.
#:
#: Prudente à dessein : simplifier une isochrone coupe d'abord ses extrémités
#: fines — les rues qui s'enfoncent le plus loin — c'est-à-dire l'information.
SIMPLIFICATION_M = 8

#: Rayon de recherche du nœud de départ autour d'une station, en mètres.
ACCROCHE_M = 120

# EPSG:2949 (MTM fuseau 7) — projeté, pour que les longueurs soient des mètres.
VERS_PLAN = Transformer.from_crs("EPSG:4326", "EPSG:2949", always_xy=True)
VERS_WGS = Transformer.from_crs("EPSG:2949", "EPSG:4326", always_xy=True)


def charger_reseau(chemin):
    """Construit le graphe marchable depuis un export Overpass.

    Les nœuds sont les coordonnées projetées arrondies au mètre : c'est ce qui
    recolle deux voies qui partagent un sommet sans partager son identifiant
    OSM. Sans cet arrondi, le graphe se fragmente en milliers de composantes et
    l'isochrone se réduit à la rue de départ.
    """
    with open(chemin, encoding="utf-8") as f:
        brut = json.load(f)

    graphe = nx.Graph()
    voies = [e for e in brut["elements"] if e.get("type") == "way" and e.get("geometry")]

    for voie in voies:
        points = [VERS_PLAN.transform(p["lon"], p["lat"]) for p in voie["geometry"]]
        cles = [(round(x), round(y)) for x, y in points]
        for i in range(1, len(cles)):
            a, b = cles[i - 1], cles[i]
            if a == b:
                continue
            longueur = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
            # Si deux voies se superposent, on garde la plus courte liaison.
            if graphe.has_edge(a, b) and graphe[a][b]["poids"] <= longueur:
                continue
            graphe.add_edge(a, b, poids=longueur)

    return graphe, voies


def noeud_le_plus_proche(graphe, point_plan, rayon=ACCROCHE_M):
    """Nœud du graphe le plus proche d'une station, ou None hors de portée.

    Une station qui n'accroche à rien signale une erreur de saisie ou un trou
    dans le réseau — mieux vaut le dire que produire une isochrone vide.
    """
    x0, y0 = point_plan
    meilleur, distance = None, rayon**2
    for noeud in graphe.nodes:
        d = (noeud[0] - x0) ** 2 + (noeud[1] - y0) ** 2
        if d < distance:
            meilleur, distance = noeud, d
    return meilleur, (distance**0.5 if meilleur else None)


def isochrone(graphe, depart, portee=PORTEE_M):
    """Polygone de ce qu'on atteint à pied depuis `depart`.

    Renvoie aussi la longueur de rue parcourue : une isochrone étendue sur peu
    de rues (un boulevard) ne dessert pas comme une isochrone compacte sur un
    réseau dense (une trame de quartier).
    """
    atteints = nx.single_source_dijkstra_path_length(
        graphe, depart, cutoff=portee, weight="poids"
    )

    segments = []
    metres_de_rue = 0.0
    for a, b, donnees in graphe.edges(data=True):
        da, db = atteints.get(a), atteints.get(b)
        if da is None and db is None:
            continue
        if da is not None and db is not None:
            segments.append(LineString([a, b]))
            metres_de_rue += donnees["poids"]
            continue
        # Une seule extrémité atteinte : la marche s'arrête au milieu de
        # l'arête. On tronque au lieu de la prendre ou de la jeter en entier —
        # sinon l'isochrone déborde ou se coupe net à chaque intersection.
        proche, loin = (a, b) if da is not None else (b, a)
        reste = portee - atteints[proche]
        if reste <= 0:
            continue
        part = min(1.0, reste / donnees["poids"])
        bout = (
            proche[0] + (loin[0] - proche[0]) * part,
            proche[1] + (loin[1] - proche[1]) * part,
        )
        segments.append(LineString([proche, bout]))
        metres_de_rue += donnees["poids"] * part

    if not segments:
        return None, 0.0, 0

    forme = unary_union(segments).buffer(COULOIR_M, resolution=8)
    forme = forme.simplify(SIMPLIFICATION_M, preserve_topology=True)
    return forme, metres_de_rue, len(atteints)


def vers_wgs(geometrie):
    """Reprojette une géométrie en WGS 84, coordonnées arrondies à 4 décimales."""
    from shapely.ops import transform

    def _t(x, y, z=None):
        lon, lat = VERS_WGS.transform(x, y)
        return round(lon, 4), round(lat, 4)

    return transform(_t, geometrie)


def main():
    reseau = os.path.join(ATELIER, "00-brut", "osm", "reseau-pieton.json")
    stations = os.path.join(ATELIER, "15-saisie-manuelle", "stations-tramcite.json")

    for chemin in (reseau, stations):
        if not os.path.exists(chemin):
            sys.exit(f"Fichier absent : {chemin}")

    print("Lecture du réseau…")
    graphe, voies = charger_reseau(reseau)
    composantes = nx.number_connected_components(graphe)
    print(f"  {graphe.number_of_nodes()} nœuds · {graphe.number_of_edges()} arêtes")
    print(f"  {composantes} composantes connexes")
    if composantes > 1:
        tailles = sorted((len(c) for c in nx.connected_components(graphe)), reverse=True)
        print(f"  la plus grande en contient {tailles[0]} ({tailles[0] / graphe.number_of_nodes():.0%})")

    with open(stations, encoding="utf-8") as f:
        liste = json.load(f)

    entites = []
    for station in liste:
        point = VERS_PLAN.transform(station["lon"], station["lat"])
        depart, ecart = noeud_le_plus_proche(graphe, point)
        if depart is None:
            print(f"  ⚠ {station['nom']} : aucun nœud à moins de {ACCROCHE_M} m")
            continue

        forme, metres, noeuds = isochrone(graphe, depart)
        if forme is None or forme.is_empty:
            print(f"  ⚠ {station['nom']} : isochrone vide")
            continue

        superficie_ha = forme.area / 10_000
        print(
            f"  {station['nom']:<28} {superficie_ha:6.1f} ha · "
            f"{metres / 1000:5.1f} km de rue · accroche {ecart:.0f} m"
        )

        entites.append({
            "type": "Feature",
            "properties": {
                "couche": "aire_marche",
                "station": station["nom"],
                "ordre": station.get("ordre"),
                "superficie_ha": round(superficie_ha, 1),
                "rue_km": round(metres / 1000, 2),
                "minutes": MINUTES,
                "accroche_m": round(ecart),
            },
            "geometry": mapping(vers_wgs(forme)),
        })

    sortie = os.path.join(ATELIER, "30-export", "aires-marche-v1.geojson")
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    with open(sortie, "w", encoding="utf-8") as f:
        json.dump({
            "type": "FeatureCollection",
            "metadata": {
                "titre": f"Aires de marche de {MINUTES} minutes — stations du tramway",
                "script": "scripts/analysis/tramway-isochrones.py",
                "methode": (
                    f"Parcours de graphe (Dijkstra) sur le réseau marchable "
                    f"d'OpenStreetMap, borné à {PORTEE_M:.0f} m "
                    f"({VITESSE_KMH} km/h pendant {MINUTES} min). Couloir de "
                    f"{COULOIR_M} m autour des rues atteintes."
                ),
                "limites": (
                    "La vitesse ne tient compte ni de la pente ni de l'hiver. "
                    "Les escaliers sont franchis sans pénalité. La complétude "
                    "des trottoirs dans OSM varie selon les secteurs."
                ),
                "source": "OpenStreetMap (ODbL)",
            },
            "features": entites,
        }, f, ensure_ascii=False)

    poids = os.path.getsize(sortie) / 1024
    print(f"\n  {os.path.relpath(sortie, RACINE)}")
    print(f"  {len(entites)} aires · {poids:.1f} ko")


if __name__ == "__main__":
    main()
