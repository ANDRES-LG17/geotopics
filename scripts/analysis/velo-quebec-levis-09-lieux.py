"""
Les lieux de la « ville des 15 minutes » (Moreno et al., 2021), pour le lab :
quatre des six fonctions sociales, d'après OpenStreetMap.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-09-lieux.py

Fonctions retenues (choix de l'utilisateur, voir JOURNAL.md) — « travailler »
n'a pas de donnée ouverte fine, « habiter » est la population déjà calculée :

    soigner         amenity=hospital|clinic|doctors|pharmacy, healthcare=*
    apprendre       amenity=school|college|university|library
    approvisionner  shop=supermarket|greengrocer|bakery|butcher, amenity=marketplace
                    (sans les dépanneurs : pas de panier alimentaire complet)
    epanouir        leisure=park|sports_centre, amenity=community_centre|
                    theatre|cinema|arts_centre, tourism=museum

Chaque lieu est rattaché au nœud du graphe le plus proche, à 300 m au plus :
c'est par ce nœud que le navigateur lit son temps d'accès. Un lieu ÉTENDU
(parc, campus, parc linéaire) a plusieurs accès, un tous les 200 m le long de
son contour : il est atteint dès que la tache en touche un, et se dessine là.

Entrées :
    geodata/04-velo-quebec-levis/00-brut/osm/osm-lieux-quebec-levis-AAAA-MM-JJ.json
        (téléchargé par ce script s'il manque — requête dans overpass-requete-lieux.txt)
    geodata/04-velo-quebec-levis/10-travail/02-graphe-epsg2949.gpkg
Sortie :
    geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-lieux-v2.json
"""

import datetime
import importlib.util
import json
import os
import subprocess
import sys
import time

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import LineString, Point, Polygon

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
BRUT = os.path.join(PROJET, "00-brut", "osm")
SORTIE = os.path.join(PROJET, "30-export", "velo-quebec-levis-lieux-v2.json")
SCR = "EPSG:2949"
ACCROCHE_MAX = 300  # m
BORD = 25           # m : un nœud à cette distance d'un lieu étendu en est un accès
ESPACEMENT = 200    # m entre deux accès retenus d'un même lieu

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "maillons", os.path.join(ICI_SCRIPT, "velo-quebec-levis-04-maillons.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

REQUETE = """[out:json][timeout:300][bbox:46.58,-71.60,47.00,-70.90];
(
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy|school|college|university|library|marketplace|community_centre|theatre|cinema|arts_centre)$"];
  nwr["healthcare"];
  nwr["shop"~"^(supermarket|greengrocer|bakery|butcher)$"];
  nwr["leisure"~"^(park|sports_centre)$"];
  nwr["tourism"="museum"];
);
out geom;"""

FONCTIONS = ["soigner", "apprendre", "approvisionner", "epanouir"]

# Nom par défaut d'un lieu sans nom : ce qu'il est.
GENERIQUE = {
    "hospital": "Hôpital", "clinic": "Clinique", "doctors": "Cabinet médical",
    "pharmacy": "Pharmacie", "healthcare": "Centre de santé", "school": "École",
    "college": "Cégep / collège", "university": "Université", "library": "Bibliothèque",
    "supermarket": "Supermarché", "greengrocer": "Fruiterie", "bakery": "Boulangerie",
    "butcher": "Boucherie", "marketplace": "Marché public", "park": "Parc",
    "sports_centre": "Centre sportif", "community_centre": "Centre communautaire",
    "theatre": "Salle de spectacle", "cinema": "Cinéma", "arts_centre": "Centre d'art",
    "museum": "Musée",
}


def classer(t):
    """(fonction, type) d'après les tags, ou None."""
    a, s, l = t.get("amenity"), t.get("shop"), t.get("leisure")
    if a in ("hospital", "clinic", "doctors", "pharmacy"):
        return "soigner", a
    if "healthcare" in t and t["healthcare"] not in ("no",):
        return "soigner", "healthcare"
    if a in ("school", "college", "university", "library"):
        return "apprendre", a
    if s in ("supermarket", "greengrocer", "bakery", "butcher"):
        return "approvisionner", s
    if a == "marketplace":
        return "approvisionner", a
    if l in ("park", "sports_centre"):
        return "epanouir", l
    if a in ("community_centre", "theatre", "cinema", "arts_centre"):
        return "epanouir", a
    if t.get("tourism") == "museum":
        return "epanouir", "museum"
    return None


def telecharger():
    jour = datetime.date.today().isoformat()
    fichier = os.path.join(BRUT, f"osm-lieux-quebec-levis-{jour}.json")
    existants = sorted(f for f in os.listdir(BRUT)
                       if f.startswith("osm-lieux-quebec-levis-") and f.endswith(".json"))
    if existants:
        return os.path.join(BRUT, existants[-1])
    with open(os.path.join(BRUT, "overpass-requete-lieux.txt"), "w", encoding="utf-8") as f:
        f.write(REQUETE + "\n")
    # Le serveur public sature parfois (502, file pleine) et renvoie alors une
    # page d'erreur avec un code 200 ou 5xx. On ne garde une réponse que si
    # c'est du JSON Overpass ; sinon on attend, de plus en plus, et on change
    # de serveur.
    serveurs = ["https://overpass-api.de/api/interpreter",
                "https://overpass.kumi.systems/api/interpreter"]
    attente = 30
    for essai in range(6):
        url = serveurs[essai % len(serveurs)]
        tmp = fichier + ".part"
        subprocess.run(["curl", "-sS", "--max-time", "600", "-A", "geodata-portfolio/1.0",
                        "-H", "Accept: application/json", "-o", tmp,
                        "--data-urlencode", "data=" + REQUETE, url], check=False)
        try:
            with open(tmp, encoding="utf-8") as f:
                valide = "elements" in json.load(f)
        except (ValueError, OSError):
            valide = False
        if valide:
            # Renommé APRÈS fermeture : Windows refuse de déplacer un fichier
            # ouvert, et l'échec passait pour une réponse invalide.
            os.replace(tmp, fichier)
            print(f"Overpass : réponse valide de {url}", flush=True)
            return fichier
        print(f"Overpass : réponse invalide de {url}, nouvel essai dans {attente} s")
        time.sleep(attente)
        attente *= 2
    raise RuntimeError("Overpass indisponible : relancer plus tard")


def geometrie(e):
    """Point, ligne ou polygone d'un élément Overpass `out geom`."""
    if e["type"] == "node":
        return Point(e["lon"], e["lat"])
    if e["type"] == "way" and e.get("geometry"):
        pts = [(p["lon"], p["lat"]) for p in e["geometry"]]
        return Polygon(pts) if len(pts) >= 4 and pts[0] == pts[-1] else LineString(pts)
    if e["type"] == "relation":
        # Contour extérieur des multipolygones : les anneaux « outer ».
        anneaux = [[(p["lon"], p["lat"]) for p in mb.get("geometry", [])]
                   for mb in e.get("members", []) if mb.get("role") == "outer" and mb.get("geometry")]
        anneaux = [a for a in anneaux if len(a) >= 2]
        if not anneaux:
            return None
        from shapely.ops import polygonize, unary_union
        # L'union noue les morceaux d'anneaux ; polygonize referme ce qui ferme.
        # Un anneau déjà fermé, seul, passe aussi.
        lignes = unary_union([LineString(a) for a in anneaux])
        try:
            polys = list(polygonize(lignes))
        except ValueError:
            polys = []
        # Un contour qui ne ferme pas (relation incomplète, comme les 57
        # morceaux du parc linéaire de la rivière Saint-Charles) : on garde
        # TOUS ses morceaux, pas le premier — c'est le long d'eux qu'on cherche
        # les accès.
        return unary_union(polys + [lignes]) if polys else lignes
    return None


def main():
    brut = telecharger()
    with open(brut, encoding="utf-8") as f:
        elements = json.load(f)["elements"]

    lignes = []
    for e in elements:
        t = e.get("tags", {})
        c = classer(t)
        if not c:
            continue
        g = geometrie(e)
        if g is None or g.is_empty:
            continue
        fonction, genre = c
        lignes.append({"fonction": fonction, "genre": genre,
                       "nom": (t.get("name") or "").strip() or GENERIQUE[genre],
                       "a_nom": bool(t.get("name")), "geometry": g})
    lieux = gpd.GeoDataFrame(lignes, crs=4326).to_crs(SCR)
    print(f"OSM : {len(lieux)} lieux classés", lieux.groupby("fonction").size().to_dict())

    # Nœuds du graphe, dans l'ordre exact du graphe v4 (même construction que
    # l'export 08) : le navigateur lit le temps par l'indice du nœud.
    a = m.charger().reset_index(drop=True)
    noeuds = {}
    for n in list(a["u"]) + list(a["v"]):
        if n not in noeuds:
            noeuds[n] = len(noeuds)
    gn = gpd.GeoDataFrame({"noeud": list(noeuds.values())},
                          geometry=[Point(x, y) for x, y in noeuds], crs=SCR)

    # Le plus proche nœud de la GÉOMÉTRIE : pour un parc, son bord.
    proche = gpd.sjoin_nearest(lieux, gn, max_distance=ACCROCHE_MAX, distance_col="d")
    proche = proche[~proche.index.duplicated()]
    print(f"rattachés à ≤ {ACCROCHE_MAX} m : {len(proche)} / {len(lieux)}")

    # Doublons : le même lieu tracé en point ET en bâtiment, ou en plusieurs
    # morceaux. Même fonction, même nom, même nœud ou à moins de 100 m.
    proche["cle"] = proche["fonction"] + "|" + proche["nom"].str.lower()
    centres = proche.geometry.representative_point()
    proche["x"], proche["y"] = centres.x, centres.y
    # La forme la plus ÉTENDUE d'abord : Overpass rend les nœuds avant les
    # voies et les relations, et le point gardé en premier éliminait le
    # polygone du même parc — les Plaines et le parc linéaire de la rivière
    # Saint-Charles n'avaient plus qu'un accès.
    proche["etendue"] = proche.geometry.area + proche.geometry.length
    garde = []
    for _, groupe in proche.groupby("cle"):
        pris = []
        for i, r in groupe.sort_values("etendue", ascending=False).iterrows():
            if all(np.hypot(r.x - proche.at[j, "x"], r.y - proche.at[j, "y"]) > 100 for j in pris):
                pris.append(i)
        garde += pris
    proche = proche.loc[garde]
    print(f"après dédoublonnage : {len(proche)}", proche.groupby("fonction").size().to_dict())

    # ACCÈS. Un lieu ponctuel a un accès : le nœud le plus proche. Un lieu
    # étendu — parc, campus, parc LINÉAIRE de plusieurs kilomètres — en a
    # plusieurs : tous les nœuds du graphe à moins de 25 m de son contour ou
    # dedans, éclaircis à un tous les 200 m. Le lieu est atteint dès qu'un de
    # ses accès l'est, au temps du plus rapide, et il se dessine LÀ — là où la
    # tache le touche, pas en son centre.
    proche = proche.sort_values(["fonction", "nom"]).reset_index(drop=True)
    etendus = proche[proche.geometry.geom_type.isin(["Polygon", "MultiPolygon", "LineString", "MultiLineString"])]
    # `.values` des deux côtés : sans cela, pandas aligne la géométrie sur
    # l'index — et chaque lieu héritait du tampon d'un AUTRE lieu.
    tampon = gpd.GeoDataFrame({"lieu": etendus.index.values},
                              geometry=etendus.geometry.buffer(BORD).values, crs=SCR)
    dedans = gpd.sjoin(gn, tampon, predicate="within")
    acces = []  # (lieu, nœud, x, y)
    for lieu, groupe in dedans.groupby("lieu"):
        pris = []
        for _, r in groupe.sort_values("noeud").iterrows():
            x, y = r.geometry.x, r.geometry.y
            if all(np.hypot(x - px, y - py) >= ESPACEMENT for _, px, py in pris):
                pris.append((int(r.noeud), x, y))
        acces += [(lieu, n, x, y) for n, x, y in pris]
    avec = {a[0] for a in acces}
    # Les autres (points, ou étendus sans nœud à 25 m) : le nœud le plus
    # proche trouvé plus haut.
    for lieu, r in proche.iterrows():
        if lieu not in avec:
            p = gn.geometry.iloc[int(r.noeud)] if int(r.noeud) < len(gn) else None
            p = gn.loc[gn["noeud"] == int(r.noeud)].geometry.iloc[0] if p is None else p
            acces.append((lieu, int(r.noeud), p.x, p.y))
    acces.sort()
    ax = gpd.GeoSeries([Point(x, y) for _, _, x, y in acces], crs=SCR).to_crs(4326)
    print(f"accès : {len(acces)} pour {len(proche)} lieux"
          f" ({sum(1 for l in proche.index if sum(1 for a in acces if a[0] == l) > 1)} lieux à plusieurs accès)")

    noms = sorted(set(proche["nom"]))
    indice = {n: i for i, n in enumerate(noms)}
    donnees = {
        "version": 2,
        "graphe": "velo-quebec-levis-graphe-v4.json",
        "fonctions": FONCTIONS,
        "genres": sorted(GENERIQUE),
        "noms": noms,
        "f": proche["fonction"].map(FONCTIONS.index).tolist(),
        "g": proche["genre"].map(sorted(GENERIQUE).index).tolist(),
        "n": proche["nom"].map(indice).tolist(),
        # Accès, triés par lieu : indice du lieu, nœud du graphe, position.
        "a_lieu": [a[0] for a in acces],
        "a_noeud": [a[1] for a in acces],
        "a_lon": np.round(ax.x.values * 1e5).astype(int).tolist(),
        "a_lat": np.round(ax.y.values * 1e5).astype(int).tolist(),
        "metadata": {
            "script": "scripts/analysis/velo-quebec-levis-09-lieux.py",
            "source": "© les contributeurs d'OpenStreetMap (ODbL 1.0)",
            "brut": os.path.basename(brut),
            "cadre": "Moreno, Allam, Chabaud, Gall et Pratlong (2021), « Introducing the 15-Minute City », Smart Cities",
            "acces": f"lieux étendus : nœuds à ≤ {BORD} m du contour, un tous les {ESPACEMENT} m",
        },
    }
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write(texte)
    print(f"{SORTIE} : {len(proche)} lieux, {len(acces)} accès, {len(texte.encode('utf-8')) / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
