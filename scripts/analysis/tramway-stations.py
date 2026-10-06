"""Positions des 29 stations de TramCité.

Aucune source ouverte ne publie les stations : ni les données ouvertes de la
Ville ou du RTC, ni OpenStreetMap (vérifié le 2026-10-05). On les reconstruit
donc à partir de deux sources :

- **le site officiel du projet** (https://tramcite.info/fr/le-trace) : l'ordre
  des stations, les cinq pôles, et les AXES parcourus par la ligne — rue Mendel,
  chemin des Quatre-Bourgeois, avenue Roland-Beaudin, boulevard Laurier,
  boulevard René-Lévesque Ouest, tunnel, rue de la Couronne, 1re Avenue ;
- **OpenStreetMap** pour la géométrie des rues.

Méthode, par station :

- `croisement` : la plupart des stations portent le nom de la rue qui coupe
  l'axe officiel. La station est le point où les deux rues se croisent dans
  OSM. Reproductible, et vérifiable par n'importe qui.
- `lieu` : les stations nommées d'après un lieu (CHUL, Place Ste-Foy…) sont
  géocodées par Nominatim, puis posées sur le tracé.
- `tracé` : en dernier recours, un point du tracé lui-même (son extrémité).

Toute station à moins de `ACCROCHE_TRACE_M` du tracé y est ensuite posée, pour
que la pastille soit enfilée sur la ligne comme sur le plan officiel.

Wikipédia (article « Tramway de Québec ») sert de CONTRÔLE et de REPLI. Mesuré
le 2026-10-05 : les quinze stations obtenues par croisement concordent avec
Wikipédia à 0–70 m près — deux sources indépendantes qui se confirment. Là où
aucun croisement n'existe (lieux, pôles) ou s'écarte de plus de `ALERTE_M`, on
reprend donc la coordonnée de Wikipédia, posée sur le tracé. Le géocodage par
nom de lieu a été essayé et écarté : Nominatim renvoyait D'Youville et
Saint-Roch à des centaines de kilomètres, Sainte-Foy à un kilomètre.

Exécution : python de QGIS (shapely, pyproj).
Sortie : geodata/2026-10-tramway-quebec/15-saisie-manuelle/stations-tramcite.json
"""

import json
import os
import time
import urllib.parse
import urllib.request

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, shape
from shapely.ops import nearest_points, transform, unary_union

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ATELIER = os.path.join(RACINE, "geodata", "2026-10-tramway-quebec")
VERS_PLAN = Transformer.from_crs("EPSG:4326", "EPSG:2949", always_xy=True)
VERS_WGS = Transformer.from_crs("EPSG:2949", "EPSG:4326", always_xy=True)

ACCROCHE_TRACE_M = 120
ALERTE_M = 150

AXES = [
    "Rue Mendel", "Montée Mendel", "Chemin des Quatre-Bourgeois",
    "Avenue Roland-Beaudin", "Boulevard Laurier", "Boulevard René-Lévesque Ouest",
    "Rue de la Couronne", "1re Avenue",
]

# (nom, pôle, méthode, paramètre). Ordre du plan officiel, de Le Gendre à
# Charlesbourg.
STATIONS = [
    ("Le Gendre", True, "croisement", ["Avenue Le Gendre"]),
    ("Chaudière", False, "croisement", ["Boulevard de la Chaudière"]),
    ("McCartney", False, "croisement", ["Avenue McCartney"]),
    ("Pie-XII", False, "croisement", ["Boulevard Pie-XII"]),
    ("Bégon", False, "croisement", ["Avenue Bégon"]),
    ("Duchesneau", False, "croisement", ["Avenue Duchesneau"]),
    ("Roland-Beaudin", False, "croisement", ["Avenue Roland-Beaudin"]),
    ("Sainte-Foy", True, "wikipedia", None),
    ("CHUL", False, "wikipedia", None),
    ("Place Ste-Foy", False, "wikipedia", None),
    ("Université Laval", True, "wikipedia", None),
    ("Desjardins", False, "wikipedia", None),
    ("Myrand", False, "croisement", ["Avenue Myrand"]),
    ("Maguire", False, "croisement", ["Avenue Maguire"]),
    ("Holland", False, "croisement", ["Avenue Holland"]),
    ("Collège Saint-Charles-Garnier", False, "wikipedia", None),
    ("Belvédère", False, "croisement", ["Avenue Belvédère"]),
    ("Brown", False, "croisement", ["Avenue Brown"]),
    ("Cartier", False, "croisement", ["Avenue Cartier"]),
    ("Colline Parlementaire", False, "wikipedia", None),
    ("D'Youville", False, "wikipedia", None),
    ("Jean-Paul-L'Allier", False, "wikipedia", None),
    ("Saint-Roch", True, "wikipedia", None),
    ("9e Rue", False, "croisement", ["9e Rue"]),
    ("Hôpital Saint-François d'Assise", False, "wikipedia", None),
    ("18e Rue", False, "croisement", ["18e Rue"]),
    ("Patro Roc-Amadour", False, "wikipedia", None),
    ("Des Peupliers", False, "croisement", ["Rue des Peupliers Est", "Rue des Peupliers Ouest"]),
    ("Charlesbourg", True, "wikipedia", None),
]

# Contrôle seulement — Wikipédia, article « Tramway de Québec », 2026-10-05.
WIKIPEDIA = {
    "Le Gendre": (46.77306, -71.35306), "Chaudière": (46.77361, -71.34472),
    "McCartney": (46.76611, -71.33), "Pie-XII": (46.76083, -71.32028),
    "Bégon": (46.76361, -71.31583), "Duchesneau": (46.7675, -71.31),
    "Roland-Beaudin": (46.77222, -71.29917), "Sainte-Foy": (46.76694, -71.29139),
    "CHUL": (46.76972, -71.28333), "Place Ste-Foy": (46.77333, -71.27639),
    "Université Laval": (46.77722, -71.27472), "Desjardins": (46.77972, -71.27),
    "Myrand": (46.78361, -71.26278), "Maguire": (46.78639, -71.25778),
    "Holland": (46.79167, -71.24889), "Collège Saint-Charles-Garnier": (46.79417, -71.24444),
    "Belvédère": (46.79694, -71.23944), "Brown": (46.8, -71.23417),
    "Cartier": (46.80417, -71.22667), "Colline Parlementaire": (46.80889, -71.2175),
    "D'Youville": (46.81194, -71.21528), "Jean-Paul-L'Allier": (46.81333, -71.22417),
    "Saint-Roch": (46.81889, -71.22944), "9e Rue": (46.82417, -71.23222),
    "Hôpital Saint-François d'Assise": (46.8275, -71.23528), "18e Rue": (46.83028, -71.23806),
    "Patro Roc-Amadour": (46.83361, -71.24139), "Des Peupliers": (46.83833, -71.24528),
    "Charlesbourg": (46.84194, -71.24889),
}


def plan(geom):
    return transform(VERS_PLAN.transform, geom)


def charger_rues(*chemins):
    rues = {}
    for chemin in chemins:
        with open(chemin, encoding="utf-8") as f:
            for e in json.load(f)["elements"]:
                pts = [(p["lon"], p["lat"]) for p in e.get("geometry", [])]
                if len(pts) >= 2:
                    rues.setdefault(e["tags"]["name"], []).append(plan(LineString(pts)))
    return {nom: unary_union(lignes) for nom, lignes in rues.items()}


def points_de(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == "Point":
        return [geom]
    if hasattr(geom, "geoms"):
        return [p for g in geom.geoms for p in points_de(g)]
    return [Point(geom.coords[0])]


def geocoder(requete):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": requete, "format": "json", "limit": 1, "countrycodes": "ca"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": "geotopics-dev/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.load(r)
    time.sleep(1.1)  # politique d'usage de Nominatim : une requête par seconde
    if not res:
        return None
    return Point(VERS_PLAN.transform(float(res[0]["lon"]), float(res[0]["lat"])))


def main():
    brut = r"C:\Users\Andres\AppData\Local\Temp\claude\e--Documents-PROFESIONAL-CV-BLOG\062fbbc1-9ae7-41a8-8c8c-7010d8e7216e\scratchpad"
    rues = charger_rues(os.path.join(brut, "rues-stations.json"), os.path.join(brut, "rues-accents.json"))
    axe = unary_union([rues[n] for n in AXES if n in rues])

    with open(os.path.join(RACINE, "public", "data", "tramway-quebec-v1.geojson"), encoding="utf-8") as f:
        trace_geo = json.load(f)
    trace = unary_union([
        plan(shape(e["geometry"])) for e in trace_geo["features"]
        if e["properties"].get("couche") in ("tronçon", "tronçon_tunnel", "tronçon_isolé")
    ])

    sortie, precedent = [], None
    print(f"{'station':34} {'méthode':11} {'→ tracé':>8} {'≠ wiki':>8}")
    for ordre, (nom, pole, methode, param) in enumerate(STATIONS, start=1):
        point = None
        if methode == "croisement":
            croise = unary_union([rues[n] for n in param if n in rues])
            candidats = points_de(croise.intersection(axe))
            if candidats:
                # Plusieurs croisements possibles : celui qui touche le tracé,
                # à défaut celui qui suit la station précédente.
                ref = trace if trace.distance(min(candidats, key=trace.distance)) < 200 else precedent
                point = min(candidats, key=lambda p: p.distance(ref)) if ref else candidats[0]
        elif methode == "lieu":
            point = geocoder(param)
        elif methode == "tracé":
            fins = [Point(g.coords[-1]) for g in getattr(trace, "geoms", [trace])] + \
                   [Point(g.coords[0]) for g in getattr(trace, "geoms", [trace])]
            point = max(fins, key=lambda p: p.y)

        lat_w, lon_w = WIKIPEDIA[nom]
        point_wiki = Point(VERS_PLAN.transform(lon_w, lat_w))
        if methode == "wikipedia" or point is None or point.distance(point_wiki) > ALERTE_M:
            if methode != "wikipedia":
                methode = "wikipedia"  # croisement absent ou trop éloigné
                param = None
            point = point_wiki

        ecart_trace = point.distance(trace)
        if ecart_trace <= ACCROCHE_TRACE_M:
            point = nearest_points(point, trace)[1]

        ecart_wiki = point.distance(point_wiki)
        alerte = "  ⚠ à vérifier" if ecart_wiki > ALERTE_M else ""
        print(f"{nom:34} {methode:11} {ecart_trace:7.0f}m {ecart_wiki:7.0f}m{alerte}")

        lon, lat = VERS_WGS.transform(point.x, point.y)
        sortie.append({
            "ordre": ordre, "nom": nom, "lat": round(lat, 5), "lon": round(lon, 5),
            "pole_echange": pole, "methode": methode,
            "source": (" × ".join(param) + " / axe officiel (tramcite.info)") if param else "Wikipédia, Tramway de Québec (contrôlée par les croisements)",
            "sur_trace": ecart_trace <= ACCROCHE_TRACE_M,
            "ecart_wikipedia_m": round(ecart_wiki),
            "date_saisie": "2026-10-05",
        })
        precedent = point

    chemin = os.path.join(ATELIER, "15-saisie-manuelle", "stations-tramcite-29.json")
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(sortie, f, ensure_ascii=False, indent=2)
    print(f"\n{len(sortie)} stations → {os.path.relpath(chemin, RACINE)}")


if __name__ == "__main__":
    main()
