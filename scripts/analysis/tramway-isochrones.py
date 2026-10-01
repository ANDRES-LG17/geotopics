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

#: Paliers de temps calculés, en minutes.
#:
#: Six plutôt qu'un seul : le lab laisse le lecteur faire varier la durée, et
#: voir l'aire grandir dit quelque chose qu'une seule forme ne dit pas — on
#: découvre que la marche s'étend le long de quelques axes avant de remplir les
#: quartiers.
#:
#: Six paliers suffisent à ce que le mouvement paraisse continu. Le graphe n'est
#: parcouru qu'UNE fois par station, jusqu'au plus grand palier ; les six formes
#: sont ensuite découpées dans ce même parcours. Ajouter un palier ne coûte donc
#: que son polygone, pas un calcul de plus.
PALIERS_MIN = [3, 5, 7, 10, 12, 15]

#: Distance franchie pour une durée, en mètres. 4,8 km/h × 15 min = 1 200 m.
def portee_m(minutes):
    return VITESSE_KMH * 1000 / 60 * minutes

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

#: Nombre de décimales des coordonnées exportées. 4 ≈ 11 m à cette latitude.
#: C'est la règle de `public/data/README.md` : au-delà on transporte une
#: précision que la donnée ne garantit pas, et le fichier grossit pour rien.
DECIMALES = 4

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


def isochrones(graphe, depart, paliers=PALIERS_MIN):
    """Un polygone par palier de temps, depuis un seul parcours du graphe.

    Le graphe n'est parcouru qu'une fois, jusqu'au plus grand palier : les
    distances obtenues servent ensuite à découper chaque forme. Six paliers ne
    coûtent donc pas six calculs.

    Renvoie, pour chaque palier, le polygone et la longueur de rue parcourue.
    Cette longueur n'est pas un doublon de la superficie : une aire étendue le
    long d'un boulevard ne dessert pas comme une aire compacte sur une trame
    dense, et le rapport entre les deux le dit.
    """
    portee_max = portee_m(max(paliers))
    atteints = nx.single_source_dijkstra_path_length(
        graphe, depart, cutoff=portee_max, weight="poids"
    )

    resultats = []
    for minutes in sorted(paliers):
        portee = portee_m(minutes)
        segments = []
        metres_de_rue = 0.0

        for a, b, donnees in graphe.edges(data=True):
            da, db = atteints.get(a), atteints.get(b)
            # Une arête dont aucune extrémité n'est atteinte DANS CE PALIER est
            # hors sujet : `atteints` porte les distances jusqu'au palier
            # maximal, il faut donc comparer, pas seulement tester l'absence.
            da = da if da is not None and da <= portee else None
            db = db if db is not None and db <= portee else None

            if da is None and db is None:
                continue
            if da is not None and db is not None:
                segments.append(LineString([a, b]))
                metres_de_rue += donnees["poids"]
                continue

            # Une seule extrémité atteinte : la marche s'arrête au milieu de
            # l'arête. On tronque au prorata au lieu de la prendre ou de la
            # jeter en entier — sinon l'isochrone déborde ou se coupe net à
            # chaque intersection.
            proche = a if da is not None else b
            loin = b if da is not None else a
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
            resultats.append((minutes, None, 0.0))
            continue

        forme = unary_union(segments).buffer(COULOIR_M, resolution=8)
        forme = forme.simplify(SIMPLIFICATION_M, preserve_topology=True)
        resultats.append((minutes, forme, metres_de_rue))

    return resultats


def charger_population(chemin_geo, chemin_pop):
    """Aires de diffusion du recensement, projetées, avec leur population.

    Renvoie une liste de (polygone, habitants). Les aires sans population
    déclarée — un parc, une zone industrielle — sont gardées à zéro plutôt
    qu'écartées : elles comptent dans la surface, pas dans les habitants.
    """
    from shapely.geometry import shape
    from shapely.ops import transform

    with open(chemin_geo, encoding="utf-8") as f:
        geo = json.load(f)
    with open(chemin_pop, encoding="utf-8") as f:
        pop = json.load(f)

    def _t(x, y, z=None):
        return VERS_PLAN.transform(x, y)

    aires = []
    for entite in geo["features"]:
        adidu = entite["properties"].get("ADIDU")
        forme = transform(_t, shape(entite["geometry"]))
        if not forme.is_valid:
            forme = forme.buffer(0)
        aires.append((forme, pop.get(adidu, 0)))
    return aires


def population_dans(forme, aires):
    """Habitants d'un polygone, par pondération de surface.

    MÉTHODE ET SA LIMITE — une aire de diffusion tombe rarement entière dans
    une isochrone. On compte donc la part de ses habitants proportionnelle à la
    part de sa surface recouverte, ce qui suppose la population **uniformément
    répartie** dans l'aire. C'est faux dans le détail : un secteur qui mêle un
    parc et une tour concentre ses habitants d'un côté. À l'échelle d'une aire
    de diffusion — quelques centaines de personnes sur quelques pâtés — l'écart
    reste acceptable, et c'est la convention des études de desserte.

    À dire dans la note du lab : le chiffre est une estimation, pas un
    décompte.
    """
    total = 0.0
    for aire, habitants in aires:
        if habitants == 0 or not forme.intersects(aire):
            continue
        part = forme.intersection(aire).area / aire.area
        total += habitants * part
    return total


def vers_wgs(geometrie):
    """Reprojette une géométrie en WGS 84, coordonnées arrondies à 4 décimales."""
    from shapely.ops import transform

    def _t(x, y, z=None):
        lon, lat = VERS_WGS.transform(x, y)
        return round(lon, DECIMALES), round(lat, DECIMALES)

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

    # La population est facultative : sans elle, le lab montre les surfaces et
    # tait les habitants plutôt que de refuser de tourner.
    geo_ad = os.path.join(ATELIER, "00-brut", "statcan", "aires-diffusion.geojson")
    pop_ad = os.path.join(ATELIER, "00-brut", "statcan", "population-ad.json")
    aires = None
    if os.path.exists(geo_ad) and os.path.exists(pop_ad):
        print("Lecture du recensement…")
        aires = charger_population(geo_ad, pop_ad)
        habitants = sum(h for _, h in aires)
        print(f"  {len(aires)} aires de diffusion · {habitants:,} habitants".replace(",", " "))
    else:
        print("Recensement absent — les populations ne seront pas calculées.")

    entites = []
    for station in liste:
        point = VERS_PLAN.transform(station["lon"], station["lat"])
        depart, ecart = noeud_le_plus_proche(graphe, point)
        if depart is None:
            print(f"  ⚠ {station['nom']} : aucun nœud à moins de {ACCROCHE_M} m")
            continue

        print(f"\n  {station['nom']}  (accroche {ecart:.0f} m)")
        for minutes, forme, metres in isochrones(graphe, depart):
            if forme is None or forme.is_empty:
                print(f"    {minutes:2d} min : vide")
                continue

            superficie_ha = forme.area / 10_000
            # Ce qu'un cercle du même rayon aurait prétendu couvrir. C'est le
            # propos du lab : l'écart entre les deux est ce que le terrain
            # retranche, et il n'est pas le même partout.
            disque_ha = 3.141592653589793 * (portee_m(minutes) ** 2) / 10_000
            part = superficie_ha / disque_ha * 100

            habitants = population_dans(forme, aires) if aires else None
            pop_txt = f" · {habitants:7.0f} hab" if habitants is not None else ""
            print(
                f"    {minutes:2d} min : {superficie_ha:6.1f} ha "
                f"({part:4.0f} % du disque) · {metres / 1000:5.1f} km de rue{pop_txt}"
            )

            proprietes = {
                "couche": "aire_marche",
                "station": station["nom"],
                "ordre": station.get("ordre"),
                "minutes": minutes,
                "superficie_ha": round(superficie_ha, 1),
                "rue_km": round(metres / 1000, 2),
                # Pour le panneau : « à pied 309 ha, à vol d'oiseau 452 ».
                "disque_ha": round(disque_ha, 1),
                "part_disque_pct": round(part),
                "accroche_m": round(ecart),
            }
            if habitants is not None:
                proprietes["population"] = round(habitants)

            entites.append({
                "type": "Feature",
                "properties": proprietes,
                "geometry": mapping(vers_wgs(forme)),
            })

    sortie = os.path.join(ATELIER, "30-export", "aires-marche-v1.geojson")
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    with open(sortie, "w", encoding="utf-8") as f:
        json.dump({
            "type": "FeatureCollection",
            "metadata": {
                "titre": "Aires de marche autour des stations du tramway",
                "script": "scripts/analysis/tramway-isochrones.py",
                "genere_le": __import__("datetime").date.today().isoformat(),
                "paliers_min": sorted(PALIERS_MIN),
                "methode": (
                    f"Parcours de graphe (Dijkstra) sur le réseau marchable "
                    f"d'OpenStreetMap, à {VITESSE_KMH} km/h. Un polygone par "
                    f"palier de temps, découpé dans un parcours unique. "
                    f"Couloir de {COULOIR_M} m autour des rues atteintes, car "
                    f"une rue dessert les bâtiments qui la bordent et pas son "
                    f"seul axe. Pas d'enveloppe convexe : elle comblerait les "
                    f"découpes, qui sont l'information."
                ),
                "limites": (
                    "La vitesse ne tient compte ni de la pente ni de l'hiver "
                    "québécois. Les escaliers sont franchis sans pénalité, ce "
                    "qui rend la Haute-Ville un peu trop facile d'accès. La "
                    "complétude des trottoirs dans OpenStreetMap varie selon "
                    "les secteurs. Les positions des stations sont saisies à "
                    "la main — voir le champ precision_m."
                ),
                "source": "OpenStreetMap (ODbL)",
                "attribution": "© les contributeurs d'OpenStreetMap",
            },
            "features": entites,
        }, f, ensure_ascii=False)

    poids = os.path.getsize(sortie) / 1024
    stations_faites = len({e["properties"]["station"] for e in entites})
    print(f"\n  {os.path.relpath(sortie, RACINE)}")
    print(
        f"  {len(entites)} polygones · {stations_faites} stations × "
        f"{len(PALIERS_MIN)} paliers · {poids:.1f} ko"
    )
    # Projection pour les 29 stations : c'est la contrainte qui décide s'il
    # faudra simplifier davantage ou passer aux tuiles vectorielles.
    if stations_faites:
        projete = poids / stations_faites * 29
        verdict = "✓" if projete < 500 else ("acceptable" if projete < 2048 else "✗ HORS BUDGET")
        print(f"  projection 29 stations : {projete:.0f} ko  {verdict}")


if __name__ == "__main__":
    main()
