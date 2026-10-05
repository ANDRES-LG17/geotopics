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

#: Vitesse de marche retenue, en km/h.
#:
#: 4,2 PLUTÔT QUE 4,8. La valeur usuelle des études de transport est 4,8 km/h,
#: et c'est celle qu'emploie tramquebec.00h11.ca. Elle décrit un adulte valide
#: marchant d'un bon pas sur un trottoir plat et sec.
#:
#: Ce n'est pas Québec. La ville monte — le tracé franchit une falaise — et la
#: neige couvre les trottoirs quatre mois par an, quand elle n'en fait pas des
#: corridors d'un mètre. Une aire de marche calculée à 4,8 km/h décrit donc une
#: ville qui existe de mai à octobre.
#:
#: 4,2 km/h ramène la portée de 1 200 à 1 050 m, soit environ 15 % de surface
#: en moins. Le prix est réel : les chiffres ne se comparent plus directement à
#: ceux des études qui retiennent 4,8. À dire dans la note, avec le facteur de
#: conversion — une surface varie comme le carré de la portée.
VITESSE_KMH = 4.2

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

#: Le curseur du lab descend jusqu'à 0, où il n'y a rien à montrer : aucune
#: forme n'est donc calculée pour ce palier. C'est le lab qui gère ce cas, en
#: n'affichant aucune aire et des valeurs en tirets.

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

#: Tolérance de simplification du polygone, en mètres.
#:
#: 3 m, et non 8 comme dans la première version. La simplification n'est plus
#: là pour donner la forme — c'est le lissage qui s'en charge — mais seulement
#: pour retirer les sommets que le tampon pose en double. Une tolérance trop
#: large coupait les extrémités fines, c'est-à-dire les rues qui s'enfoncent le
#: plus loin : l'information même.
SIMPLIFICATION_M = 3

#: Itérations de lissage de Chaikin appliquées au contour.
#:
#: Deux suffisent à faire disparaître les angles du tampon. Une troisième
#: quadruplerait encore les sommets pour une différence qu'on ne voit pas à
#: l'écran.
LISSAGE_ITERATIONS = 2

#: Aire minimale d'un trou conservé, en mètres carrés.
#:
#: Mesuré sur l'aire de quinze minutes de Saint-Roch : vingt trous, dont seize
#: de moins de 0,3 ha. Ces seize occupaient 0,2 % de la surface et coûtaient
#: 41 % de sommets en plus — des interstices entre îlots, pas une information.
#: Les plus grands restent : une cour fermée ou un faisceau ferroviaire dit
#: quelque chose.
TROU_MIN_M2 = 3000

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

        # `resolution=16` plutôt que 8 : le tampon arrondit les bouts de rue en
        # seize facettes au lieu de huit. C'est là que la douceur commence —
        # lisser un contour déjà facetté revient à polir une pièce mal coulée.
        forme = unary_union(segments).buffer(COULOIR_M, resolution=16)

        # Les interstices entre îlots partent avant le lissage : les lisser
        # serait du travail perdu, et ils hachent le contour.
        forme = nettoyer_trous(forme, TROU_MIN_M2)

        # Simplification légère — 3 m au lieu de 8. Elle n'est plus là pour
        # donner la forme mais pour retirer les sommets que le tampon a posés
        # en double ; c'est le lissage qui décide du dessin.
        forme = forme.simplify(SIMPLIFICATION_M, preserve_topology=True)

        forme = lisser_contour(forme, LISSAGE_ITERATIONS)
        resultats.append((minutes, forme, metres_de_rue))

    return resultats


def lisser_contour(forme, iterations=2):
    """Adoucit les angles d'un polygone par la méthode de Chaikin.

    POURQUOI — l'aire de marche sort d'un `buffer` autour de segments de rue,
    puis d'un `simplify`. Le premier produit des facettes, le second **retire**
    des sommets et laisse des angles droits : la forme obtenue a des bords
    hachés que rien ne justifie. Une aire de marche n'a pas de contour réel —
    c'est une frontière de calcul, et la dessiner anguleuse lui prête une
    précision qu'elle n'a pas.

    Chaikin remplace chaque sommet par deux points au quart et aux trois quarts
    du segment. La courbe obtenue **frôle** les sommets au lieu de les
    traverser, ce qui arrondit sans déplacer la frontière de plus de quelques
    mètres — bien moins que l'incertitude de la méthode elle-même.

    Les anneaux intérieurs sont lissés aussi : un trou anguleux au milieu d'une
    forme douce se remarque immédiatement.
    """
    from shapely.geometry import Polygon, MultiPolygon

    def lisser_anneau(coords):
        points = list(coords)
        # Un anneau est fermé : on retire la répétition avant de lisser, et on
        # referme à la fin.
        if points[0] == points[-1]:
            points = points[:-1]
        if len(points) < 4:
            return coords

        for _ in range(iterations):
            suivant = []
            for i in range(len(points)):
                a = points[i]
                b = points[(i + 1) % len(points)]
                suivant.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25))
                suivant.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
            points = suivant

        return points + [points[0]]

    def lisser_polygone(poly):
        exterieur = lisser_anneau(list(poly.exterior.coords))
        trous = [lisser_anneau(list(t.coords)) for t in poly.interiors]
        lisse = Polygon(exterieur, trous)
        return lisse if lisse.is_valid else lisse.buffer(0)

    if isinstance(forme, MultiPolygon):
        return MultiPolygon([lisser_polygone(p) for p in forme.geoms])
    return lisser_polygone(forme)


def nettoyer_trous(forme, aire_min_m2=3000):
    """Retire les trous minuscules d'un polygone.

    MESURÉ sur l'aire de quinze minutes de Saint-Roch : vingt trous, dont seize
    de moins de 0,3 ha. Ces seize occupaient **0,2 % de la surface** et
    coûtaient **41 % de sommets en plus**. Ce sont des interstices entre îlots,
    pas une information : ils hachent le contour sans rien apprendre.

    Les grands trous restent — une cour fermée, un parc qu'on contourne, un
    faisceau ferroviaire : ceux-là disent quelque chose.
    """
    from shapely.geometry import Polygon, MultiPolygon

    def nettoyer_polygone(poly):
        gardes = [t for t in poly.interiors if Polygon(t).area >= aire_min_m2]
        return Polygon(poly.exterior, gardes)

    if isinstance(forme, MultiPolygon):
        return MultiPolygon([nettoyer_polygone(p) for p in forme.geoms])
    return nettoyer_polygone(forme)


def rues_atteintes(graphe, depart, portee_max):
    """Les rues parcourues, chacune portant la distance à laquelle on l'atteint.

    POURQUOI LES EXPORTER — l'aire de marche est une enveloppe : elle dit
    jusqu'où l'on va, pas par où. Les rues, elles, montrent le calcul lui-même.
    On y voit la marche progresser le long de quelques axes avant de remplir les
    quartiers, et surtout on voit **pourquoi** la forme se coupe : les rues
    s'arrêtent devant la falaise, le fleuve et l'autoroute.

    UN SEUL JEU POUR TOUS LES PALIERS. Chaque segment porte `m`, la distance à
    laquelle la marche l'atteint. Le lab n'a donc pas besoin de six copies : il
    filtre sur ce champ, et une animation de seuil fait apparaître les rues dans
    l'ordre où on les parcourt — ce qui est la vérité du calcul, pas un effet.

    Les segments sont regroupés par tranches de distance avant d'être fusionnés :
    sans cela, chaque arête du graphe deviendrait une entité, et le fichier
    tripler ait pour la même image.
    """
    atteints = nx.single_source_dijkstra_path_length(
        graphe, depart, cutoff=portee_max, weight="poids"
    )

    # Tranches de 150 m.
    #
    # Un premier essai à 50 m donnait 2 600 tronçons dont 55 % n'avaient que
    # deux sommets : la tranche coupait les rues plus vite que `linemerge` ne
    # pouvait les recoller, et le fichier pesait 452 ko. Des tranches trois fois
    # plus larges laissent les rues entières se fondre en une seule ligne.
    #
    # Ce qu'on perd : la granularité de l'animation. À 4,2 km/h, 150 m valent
    # un peu plus de deux minutes de marche — soit un palier du curseur. C'est
    # exactement la finesse utile, puisque le lecteur ne demande jamais mieux.
    PAS = 150
    par_tranche = defaultdict(list)

    for a, b, donnees in graphe.edges(data=True):
        da, db = atteints.get(a), atteints.get(b)
        if da is None and db is None:
            continue

        if da is not None and db is not None:
            # La distance retenue est la plus GRANDE des deux : c'est le moment
            # où le segment est entièrement parcouru.
            distance = max(da, db)
            par_tranche[int(distance // PAS)].append(LineString([a, b]))
            continue

        proche = a if da is not None else b
        loin = b if da is not None else a
        reste = portee_max - atteints[proche]
        if reste <= 0:
            continue
        part = min(1.0, reste / donnees["poids"])
        bout = (
            proche[0] + (loin[0] - proche[0]) * part,
            proche[1] + (loin[1] - proche[1]) * part,
        )
        distance = atteints[proche] + donnees["poids"] * part
        par_tranche[int(distance // PAS)].append(LineString([proche, bout]))

    from shapely.ops import linemerge

    entites = []
    for tranche in sorted(par_tranche):
        # `linemerge` AVANT `unary_union` : l'union fusionne les géométries mais
        # laisse les segments distincts, et c'est le merge qui recolle une rue
        # droite en une seule ligne au lieu de quinze. Dans l'autre ordre, 78 %
        # des tronçons ressortaient à deux sommets.
        try:
            fusion = linemerge(par_tranche[tranche])
        except Exception:
            fusion = unary_union(par_tranche[tranche])

        geometries = (
            list(fusion.geoms) if hasattr(fusion, "geoms") else [fusion]
        )
        for geo in geometries:
            # Les segments très courts sont du bruit : des bouts de trottoir
            # entre deux intersections, invisibles à l'échelle où on regarde.
            if geo.is_empty or geo.length < 12:
                continue
            # Simplification à 4 m. Une rue vue d'avion n'a pas besoin de ses
            # courbures au mètre près, et c'est ici que le poids se joue : le
            # fichier porte des dizaines de milliers de sommets.
            geo = geo.simplify(4, preserve_topology=False)
            if geo.is_empty:
                continue
            entites.append({
                "type": "Feature",
                "properties": {
                    "couche": "rue",
                    # Distance en mètres à laquelle la marche atteint ce segment.
                    "m": (tranche + 1) * PAS,
                },
                "geometry": mapping(vers_wgs(geo)),
            })

    return entites


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

        # Les rues parcourues, dans un fichier par station : le lab les charge
        # au clic plutôt que de faire télécharger les vingt-neuf à qui n'en
        # regarde qu'une.
        rues = rues_atteintes(graphe, depart, portee_m(max(PALIERS_MIN)))
        cle = (
            station["nom"].lower()
            .replace("'", "").replace(" ", "-")
            .replace("é", "e").replace("è", "e").replace("ê", "e")
            .replace("à", "a").replace("ô", "o").replace("û", "u")
            .replace("ç", "c")
        )
        chemin_rues = os.path.join(
            RACINE, "public", "data", f"tramway-rues-{cle}-v1.geojson"
        )
        with open(chemin_rues, "w", encoding="utf-8") as f:
            json.dump({
                "type": "FeatureCollection",
                "metadata": {
                    "titre": f"Rues atteintes à pied depuis {station['nom']}",
                    "script": "scripts/analysis/tramway-isochrones.py",
                    "station": station["nom"],
                    "vitesse_kmh": VITESSE_KMH,
                    "methode": (
                        "Chaque segment porte `m`, la distance à laquelle la "
                        "marche l'atteint. Filtrer sur ce champ donne n'importe "
                        "quel palier de temps : m ≤ vitesse × minutes."
                    ),
                    "source": "OpenStreetMap (ODbL)",
                },
                "features": rues,
            }, f, ensure_ascii=False)
        poids_rues = os.path.getsize(chemin_rues) / 1024
        print(f"    rues : {len(rues)} tronçons · {poids_rues:.0f} ko → {os.path.basename(chemin_rues)}")

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
                "vitesse_kmh": VITESSE_KMH,
                "portee_15min_m": round(portee_m(15)),
                "limites": (
                    f"Vitesse retenue : {VITESSE_KMH} km/h, soit "
                    f"{round(portee_m(15))} m en 15 minutes. Les études de "
                    "transport retiennent souvent 4,8 km/h (1 200 m) ; cette "
                    "valeur décrit un trottoir plat et sec, ce que Québec n'est "
                    "ni l'hiver ni sur la falaise. Les chiffres ne se comparent "
                    "donc pas directement à ceux qui retiennent 4,8 — une "
                    "surface varie comme le carré de la portée. Les escaliers "
                    "sont franchis sans pénalité de pente, ce qui rend la "
                    "Haute-Ville encore un peu trop facile d'accès. La "
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
