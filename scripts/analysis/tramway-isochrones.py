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
#: Le lab laisse le lecteur faire varier la durée, et voir l'aire grandir dit
#: quelque chose qu'une seule forme ne dit pas — on découvre que la marche
#: s'étend le long de quelques axes avant de remplir les quartiers.
#:
#: UN PAR MINUTE, et non six paliers espacés comme dans la première version.
#: Avec six, le curseur sautait d'une forme à l'autre et le mouvement se voyait
#: par à-coups. Quatorze paliers réduisent le saut de moitié, et le fondu entre
#: deux formes fait le reste : l'expansion paraît continue.
#:
#: Le coût est faible : le graphe n'est parcouru qu'UNE fois par station,
#: jusqu'au plus grand palier, et chaque forme est ensuite découpée dans ce même
#: parcours. Un palier de plus ne coûte que son polygone — quelques kilooctets —
#: pas un calcul supplémentaire.
PALIERS_MIN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

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
#: 35 m, et c'est volontairement généreux.
#:
#: La simplification vient AVANT le lissage et lui prépare la matière : elle
#: réduit l'aire à son squelette, que Chaikin arrondit ensuite. Une tolérance
#: faible (3 ou 8 m) laissait 1 400 sommets au lissage, qui les quadruplait pour
#: un détail invisible — 28,5 ko par aire, 2,5 Mo projetés pour vingt-neuf
#: stations.
#:
#: À 35 m, la forme tombe à 66 sommets avant lissage et 437 après, pour 9,8 ko
#: et un écart de surface de 1,7 %.
SIMPLIFICATION_M = 35

#: Itérations de lissage de Chaikin appliquées au contour.
#:
#: Trois, puisque la simplification a laissé peu de sommets : c'est elle qui
#: décide du poids, et le lissage peut donc être généreux. Trois itérations sur
#: un squelette coûtent moins que deux sur une forme détaillée.
LISSAGE_ITERATIONS = 3

#: Aire minimale d'un trou conservé, en mètres carrés.
#:
#: Un trou naît quand les couloirs de 40 m autour de deux rues parallèles ne se
#: rejoignent pas : il reste un vide au cœur de l'îlot. Les îlots de Saint-Roch
#: font 60 à 100 m, donc ceux de plus de 80 m en produisent un.
#:
#: Ce sont des CŒURS D'ÎLOTS, pas des zones inaccessibles — et c'est l'erreur
#: de méthode : un piéton ne traverse pas un îlot bâti, mais il n'a pas besoin
#: d'y entrer pour que l'immeuble soit desservi. Le trou n'apprend rien.
#:
#: Mesuré sur l'aire de quinze minutes : vingt trous totalisant 0,8 % de la
#: surface. Un seuil à 3 000 m² en laissait encore trois, tous du même genre.
#: À 1 ha, aucun cœur d'îlot ne survit — seul un vrai vide (parc clos, faisceau
#: ferroviaire) resterait visible.
#:
#: INFINI depuis le passage aux 29 stations : TOUS les trous sont comblés.
#: Le seuil d'un hectare laissait les cœurs des très grands îlots — centres
#: commerciaux, échangeurs, campus — et à 15 minutes, 17 stations sur 29 en
#: portaient de 1 à 6 ha. Ils se lisaient comme des taches de voile au milieu de
#: l'aire, sans rien apprendre : ce ne sont pas des zones hors d'atteinte. Voir
#: `tramway-combler-trous.py`, qui a appliqué la règle aux résultats existants.
TROU_MIN_M2 = float("inf")

#: Débordement du voile autour de l'aire, en mètres.
#:
#: Le voile est un polygone TROUÉ : son contour extérieur couvre la ville, son
#: anneau intérieur est l'aire de marche. C'est ce trou qui révèle les rues du
#: fond en laissant passer leur contraste, là où tout le reste est atténué.
#:
#: Pourquoi si large — le voile doit dépasser ce que l'écran peut montrer, sinon
#: on aperçoit son bord en s'éloignant ou en faisant glisser la carte, et le
#: dispositif se démonte à l'œil. 12 km autour d'une aire qui fait au plus 1 km
#: de rayon : à ce stade le polygone ne coûte rien de plus (quatre sommets de
#: plus que l'anneau), et il couvre tout l'agglomération de Québec.
VOILE_DEBORD_M = 12000

#: Aire minimale d'un morceau de voile conservé, en mètres carrés.
#:
#: Sépare un vrai morceau de voile d'une écharde de calcul. Généreux à dessein :
#: un morceau légitime — le voile de part et d'autre d'une aire coupée en deux —
#: se compte en kilomètres carrés, soit mille fois plus. Il n'y a donc pas de
#: zone grise où le seuil pourrait écarter quelque chose d'utile.
ECLAT_MIN_M2 = 10000

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

    aretes_atteintes = list(graphe.edges(list(atteints), data=True))

    resultats = []
    for minutes in sorted(paliers):
        portee = portee_m(minutes)
        segments = []
        metres_de_rue = 0.0

        # Seules les arêtes qui touchent un nœud atteint peuvent compter : les
        # parcourir toutes, sur le réseau du corridor entier, coûtait vingt
        # fois plus pour un résultat identique.
        for a, b, donnees in aretes_atteintes:
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

        # Les cœurs d'îlots partent avant le lissage : les lisser serait du
        # travail perdu, et ils hachent le contour.
        forme = nettoyer_trous(forme, TROU_MIN_M2)

        # SIMPLIFIER FORT, PUIS LISSER — et dans cet ordre.
        #
        # Lisser une forme de 1 400 sommets dépense le travail en détail que
        # personne ne regarde, et le fichier triplait : 28,5 ko par aire, soit
        # 2,5 Mo projetés pour vingt-neuf stations. Simplifier d'abord réduit la
        # forme à son squelette — 66 sommets — et le lissage l'arrondit ensuite.
        #
        # Mesuré : 437 sommets et 9,8 ko au lieu de 1 404 et 28,5 ko, pour un
        # écart de surface de 1,7 %. Dans un lab schématique, cet écart est
        # inférieur à l'incertitude de la méthode elle-même — positions de
        # stations à 50 m près, trottoirs incomplets dans OSM, vitesse estimée.
        forme = forme.simplify(SIMPLIFICATION_M, preserve_topology=True)

        forme = lisser_contour(forme, LISSAGE_ITERATIONS)
        resultats.append((minutes, forme, metres_de_rue))

    return resultats


def voile_troue(forme, debord=VOILE_DEBORD_M):
    """L'inverse d'une aire : tout sauf elle.

    MapLibre ne sait pas découper une couche de lignes avec un polygone — il
    n'existe pas de « clip » par géométrie. Pour ne montrer les rues que dans
    l'aire, on prend donc le problème à l'envers : au lieu de découper les rues,
    on ATTÉNUE TOUT LE RESTE. Les rues du fond de carte se peignent en contraste
    fort sur toute la ville, et ce voile les éteint partout sauf dans son trou.

    Le filtre `within` aurait fait le découpage directement, mais MapLibre
    marque ce filtre comme exigeant la géométrie complète (`geometryNeeded`) :
    chaque rue de chaque tuile serait décodée et testée sommet par sommet contre
    l'anneau, à chaque cran du curseur. Mesuré sur la tuile de Saint-Roch au
    zoom 14 : 382 rues et 4 192 sommets, contre un anneau de 433 — environ un
    million d'opérations par tuile, six tuiles à l'écran, quatorze paliers. Le
    voile, lui, est UN SEUL polygone de remplissage : la carte n'a plus rien à
    tester.

    Le trou est l'aire telle quelle, déjà simplifiée et lissée : le bord du
    voile est donc exactement le bord de l'aire, et les deux ne peuvent pas se
    désaccorder.
    """
    from shapely.geometry import MultiPolygon, Polygon

    minx, miny, maxx, maxy = forme.bounds
    cadre = Polygon([
        (minx - debord, miny - debord),
        (maxx + debord, miny - debord),
        (maxx + debord, maxy + debord),
        (minx - debord, maxy + debord),
    ])

    # `difference` plutôt qu'un Polygon à trous construit à la main : l'aire
    # peut être un multipolygone (un îlot détaché de l'autre côté d'une voie
    # ferrée), et la soustraction gère ce cas sans qu'on ait à le distinguer.
    voile = cadre.difference(forme)

    # Les éclats de la soustraction partent.
    #
    # Là où le contour de l'aire se replie presque sur lui-même, `difference`
    # laisse une écharde de quelques dizaines de mètres carrés — un résidu de
    # calcul, pas une zone. Mesuré : une seule sur les 28 aires du jeu d'essai,
    # 42 m² au palier de onze minutes à Saint-Roch.
    #
    # Minuscule, mais le voile est OPAQUE : l'écharde se peindrait comme une
    # tache en plein milieu de la zone révélée, et ce défaut-là se voit. Le
    # seuil vaut pour un morceau détaché, jamais pour le cadre lui-même, qui
    # fait 24 km de côté.
    if voile.geom_type == "MultiPolygon":
        garde = [p for p in voile.geoms if p.area >= ECLAT_MIN_M2]
        if garde:
            voile = garde[0] if len(garde) == 1 else MultiPolygon(garde)

    return voile


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


    for _ in range(iterations):
        suivant = [points[0]]
        for i in range(len(points) - 1):
            a, b = points[i], points[i + 1]
            suivant.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25))
            suivant.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
        suivant.append(points[-1])
        points = suivant
    return points


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
    # Index spatial : seules les aires dont l'emprise touche la forme sont
    # examinées. Parcourir les milliers d'aires de la région pour chacune des
    # 406 formes (29 stations × 14 paliers) rendait le calcul interminable.
    arbre, liste = aires
    total = 0.0
    for i in arbre.query(forme):
        aire, habitants = liste[i]
        if habitants == 0 or not forme.intersects(aire):
            continue
        part = forme.intersection(aire).area / aire.area
        total += habitants * part
    return total


_LIGNE = None


def sur_la_ligne(lon, lat):
    """Le point du tracé du tramway le plus proche, en (lon, lat) arrondis.

    Le tracé est lu une seule fois, depuis le fichier publié du lab : c'est
    exactement la ligne que le lecteur voit, donc celle sur laquelle la
    pastille doit tomber.
    """
    global _LIGNE
    from shapely.geometry import Point, shape
    from shapely.ops import nearest_points, transform

    if _LIGNE is None:
        chemin = os.path.join(RACINE, "public", "data", "tramway-quebec-v2.geojson")
        with open(chemin, encoding="utf-8") as f:
            trace = json.load(f)
        _LIGNE = unary_union([
            transform(VERS_PLAN.transform, shape(e["geometry"]))
            for e in trace["features"]
            # Les tronçons isolés aussi : le bout ouest (Le Gendre → Chaudière)
            # n'est pas raccordé dans OSM. Sans lui, ces deux stations
            # tombaient ensemble sur l'extrémité du tracé principal, à 1,3 km
            # de Le Gendre.
            if e["properties"].get("couche") in ("tronçon", "tronçon_tunnel", "tronçon_isolé")
        ])

    point = Point(VERS_PLAN.transform(lon, lat))
    proche = nearest_points(point, _LIGNE)[1]
    x, y = VERS_WGS.transform(proche.x, proche.y)
    # Cinq décimales (~1 m) et non quatre : à 11 m près, la pastille
    # retomberait à côté du trait. Pour une poignée de points, cela ne pèse rien.
    return round(x, 5), round(y, 5)


def vers_wgs(geometrie):
    """Reprojette une géométrie en WGS 84, coordonnées arrondies à 4 décimales."""
    from shapely.ops import transform

    def _t(x, y, z=None):
        lon, lat = VERS_WGS.transform(x, y)
        return round(lon, DECIMALES), round(lat, DECIMALES)

    return transform(_t, geometrie)


def main():
    # Chaque ligne s'affiche dès qu'elle est écrite, même redirigée vers un
    # fichier : sans cela on ne voit rien jusqu'à la fin, et un calcul de
    # plusieurs dizaines de minutes tourne à l'aveugle.
    sys.stdout.reconfigure(line_buffering=True)

    # Le corridor entier et les 29 stations. Le premier réseau ne couvrait que
    # Saint-Roch et la colline : l'essai sur une station.
    reseau = os.path.join(ATELIER, "00-brut", "osm", "reseau-pieton-corridor.json")
    stations = os.path.join(ATELIER, "15-saisie-manuelle", "stations-tramcite-29.json")

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
    # Le corridor entier : 988 aires de diffusion. Le premier extrait (433)
    # s'arrêtait à -71,327 de longitude, et les aires de marche de Le Gendre,
    # Chaudière et McCartney en débordaient — leur population sortait
    # sous-estimée sans que rien ne le signale.
    geo_ad = os.path.join(ATELIER, "00-brut", "statcan", "aires-diffusion-corridor.geojson")
    pop_ad = os.path.join(ATELIER, "00-brut", "statcan", "population-ad-corridor.json")
    aires = None
    if os.path.exists(geo_ad) and os.path.exists(pop_ad):
        print("Lecture du recensement…")
        from shapely.strtree import STRtree

        liste_aires = charger_population(geo_ad, pop_ad)
        habitants = sum(h for _, h in liste_aires)
        print(f"  {len(liste_aires)} aires de diffusion · {habitants:,} habitants".replace(",", " "))
        aires = (STRtree([a for a, _ in liste_aires]), liste_aires)
    else:
        print("Recensement absent — les populations ne seront pas calculées.")

    entites = []
    # Les voiles vivent dans leur propre fichier : leur contour extérieur fait
    # 24 km de côté, et le mêler aux aires alourdirait le fichier que le panneau
    # lit pour ses chiffres.
    voiles = []

    # REPRISE — chaque station terminée est écrite dans son propre fichier de
    # travail. Un calcul interrompu reprend à la première station manquante au
    # lieu de tout recommencer. Supprimer ce dossier force un recalcul complet
    # (nécessaire si le réseau, les paliers ou la méthode changent).
    reprise = os.path.join(ATELIER, "10-travail", "stations-calculees")
    os.makedirs(reprise, exist_ok=True)

    import time
    debut_total = time.time()
    for rang, station in enumerate(liste, start=1):
        fichier = os.path.join(reprise, f"{station.get('ordre', rang):02d}.json")
        if os.path.exists(fichier):
            with open(fichier, encoding="utf-8") as f:
                deja = json.load(f)
            entites.extend(deja["entites"])
            voiles.extend(deja["voiles"])
            print(f"[{rang:2d}/{len(liste)}] {station['nom']} — déjà calculée")
            continue
        debut = time.time()
        n_entites, n_voiles = len(entites), len(voiles)

        point = VERS_PLAN.transform(station["lon"], station["lat"])
        depart, ecart = noeud_le_plus_proche(graphe, point)
        if depart is None:
            print(f"  ⚠ {station['nom']} : aucun nœud à moins de {ACCROCHE_M} m")
            continue

        print(f"\n[{rang:2d}/{len(liste)}] {station['nom']}  (accroche {ecart:.0f} m)")

        # Plus de fichier de rues par station.
        #
        # Le lab prend désormais les rues dans le FOND DE CARTE — la couche
        # `transportation` des tuiles OpenMapTiles, déjà téléchargée — et c'est
        # le voile qui décide d'où on les voit. Les 146 ko par station que ce
        # bloc écrivait ne servaient plus, et les régénérer aurait fait
        # réapparaître des fichiers que rien ne lit : la divergence silencieuse
        # qui nous a déjà coûté une génération entière.
        #
        # `rue_km` ne vient pas d'eux mais du parcours lui-même, dans
        # `isochrones` : la mesure survit à la suppression des fichiers.

        # Le point de la station, qui est ce sur quoi on clique.
        #
        # Il voyage dans le même fichier que ses aires : une station sans son
        # aire ne servirait à rien, et l'inverse non plus. Écrit AVANT les
        # aires, mais l'ordre du fichier ne décide pas de l'ordre de dessin —
        # c'est la couche qui le fait, et les stations y sont au-dessus.
        entites.append({
            "type": "Feature",
            "properties": {
                "couche": "station",
                "station": station["nom"],
                "nom": station["nom"],
                "ordre": station.get("ordre"),
                # Pôle d'échange : dessiné en cible noire, comme sur le plan
                # officiel du réseau, plutôt qu'en simple pastille.
                "pole": bool(station.get("pole_echange")),
            },
            # Posé SUR la ligne : le point le plus proche du tracé. La saisie
            # manuelle tombait à 16–41 m du trait, et la pastille flottait à
            # côté de la ligne au lieu d'y être enfilée comme sur le plan
            # officiel. Les aires restent calculées depuis le point saisi :
            # l'écart est sous la précision de la saisie (50–100 m).
            "geometry": {
                "type": "Point",
                "coordinates": list(sur_la_ligne(station["lon"], station["lat"])),
            },
        })

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

            # Le voile du même palier : tout sauf l'aire. C'est lui qui révèle
            # les rues du fond de carte, en les atténuant partout ailleurs.
            voiles.append({
                "type": "Feature",
                "properties": {
                    "couche": "voile",
                    "station": station["nom"],
                    "minutes": minutes,
                },
                "geometry": mapping(vers_wgs(voile_troue(forme))),
            })

        with open(fichier, "w", encoding="utf-8") as f:
            json.dump({"entites": entites[n_entites:], "voiles": voiles[n_voiles:]}, f, ensure_ascii=False)
        ecoule = time.time() - debut
        total = time.time() - debut_total
        print(f"    ✓ terminée en {ecoule:.0f} s · {total / 60:.1f} min au total")

    ecrire_par_station(entites, voiles)


#: Version des fichiers publiés. Ils sont servis en cache immuable d'un an :
#: toute régénération dont le contenu change DOIT incrémenter ce numéro, et
#: le lab avec — sinon les navigateurs gardent l'ancienne version sans le dire.
VERSION_DONNEES = 2  # v2 : trous comblés
#: Version du fichier des stations, indépendante : il change pour d'autres
#: raisons (v2 : séries de population et obstacles, pour le panneau ; v3 : Le
#: Gendre et Chaudière posées sur le tronçon isolé de l'ouest).
VERSION_STATIONS = 3

#: Obstacle principal, nommé dans la phrase de synthèse du panneau. Seulement
#: les cas VÉRIFIÉS sur la carte ; les autres stations reçoivent une phrase sans
#: obstacle nommé plutôt qu'une hypothèse présentée comme un constat.
OBSTACLES = {
    "Saint-Roch": ("La rivière Saint-Charles limite", "The Saint-Charles River limits"),
    "Sainte-Foy": ("Les échangeurs des autoroutes 73 et 540 limitent",
                   "The Highway 73 and 540 interchanges limit"),
    "Le Gendre": ("L'autoroute 40 et les grands terrains industriels limitent",
                  "Highway 40 and large industrial lots limit"),
}


def cle_fichier(nom):
    """Nom de station → identifiant de fichier.

    Règle IDENTIQUE à celle de `LabMap`, qui construit l'URL au clic :
    minuscules, accents retirés, apostrophes supprimées, espaces en tirets.
    Une divergence ne lève aucune erreur — elle donne un 404 silencieux.
    """
    import unicodedata

    sans_accent = "".join(
        c for c in unicodedata.normalize("NFD", nom.lower())
        if unicodedata.category(c) != "Mn"
    )
    return "-".join(sans_accent.replace("'", "").replace("\u2019", "").split())


def ecrire_par_station(entites, voiles):
    """Un petit fichier des stations, et un fichier par station.

    POURQUOI DÉCOUPER — les 29 stations pèsent 5,2 Mo (0,62 Mo compressés) en
    aires et en voiles. Tout servir à l'ouverture ferait attendre, surtout sur
    un téléphone, un lecteur venu de LinkedIn qui ne regardera qu'une ou deux
    stations. À l'ouverture, on ne sert donc que les points ; l'aire et le voile
    d'une station n'arrivent qu'au clic, et le navigateur les garde ensuite.
    """
    import datetime

    base = os.path.join(RACINE, "public", "data")
    dossier = os.path.join(base, "tramway-station")
    os.makedirs(dossier, exist_ok=True)
    v = VERSION_DONNEES
    commun = {
        "script": "scripts/analysis/tramway-isochrones.py",
        "genere_le": datetime.date.today().isoformat(),
        "source": "OpenStreetMap (ODbL) ; Statistique Canada, Recensement 2021",
        "attribution": "© les contributeurs d'OpenStreetMap",
    }

    points = [e for e in entites if e["properties"]["couche"] == "station"]
    # Population par palier, sur chaque station : le panneau en tire le rang et
    # la moyenne de la ligne sans télécharger les 29 fichiers de station.
    for point in points:
        nom = point["properties"]["station"]
        aires = sorted(
            (e["properties"] for e in entites
             if e["properties"]["couche"] == "aire_marche" and e["properties"]["station"] == nom),
            key=lambda q: q["minutes"],
        )
        point["properties"]["pop"] = [q.get("population", 0) for q in aires]
        if nom in OBSTACLES:
            point["properties"]["obstacle_fr"], point["properties"]["obstacle_en"] = OBSTACLES[nom]
    chemin = os.path.join(base, f"tramway-stations-v{VERSION_STATIONS}.geojson")
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump({
            "type": "FeatureCollection",
            "metadata": {**commun, "titre": "Stations de TramCité (29, dont 5 pôles)"},
            "features": points,
        }, f, ensure_ascii=False)
    print(f"\n  {len(points)} stations · {os.path.getsize(chemin) / 1024:.1f} ko → {os.path.basename(chemin)}")

    poids = []
    for point in points:
        nom = point["properties"]["station"]
        contenu = [e for e in entites if e["properties"]["couche"] == "aire_marche"
                   and e["properties"]["station"] == nom]
        contenu += [e for e in voiles if e["properties"]["station"] == nom]
        chemin = os.path.join(dossier, f"{cle_fichier(nom)}-v{v}.geojson")
        with open(chemin, "w", encoding="utf-8") as f:
            json.dump({
                "type": "FeatureCollection",
                "metadata": {
                    **commun,
                    "titre": f"Aires de marche et voiles — {nom}",
                    "paliers_min": sorted(PALIERS_MIN),
                    "vitesse_kmh": VITESSE_KMH,
                    "methode": (
                        f"Dijkstra sur le réseau marchable d'OpenStreetMap à "
                        f"{VITESSE_KMH} km/h ; couloir de {COULOIR_M} m autour des "
                        f"rues atteintes. Chaque voile est le complément de l'aire "
                        f"du même palier. Population par pondération de surface "
                        f"des aires de diffusion."
                    ),
                },
                "features": contenu,
            }, f, ensure_ascii=False)
        poids.append(os.path.getsize(chemin) / 1024)
    print(
        f"  {len(poids)} fichiers de station → tramway-station/ · "
        f"{min(poids):.0f}–{max(poids):.0f} ko chacun, {sum(poids) / 1024:.1f} Mo en tout"
    )

if __name__ == "__main__":
    main()
