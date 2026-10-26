"""
Exporte le GeoJSON du lab : ce que la carte doit montrer, et rien d'autre.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-07-exporter.py

Entrées (geodata/04-velo-quebec-levis/10-travail/) :
    02-graphe-epsg2949.gpkg, 04-maillons-epsg2949.gpkg, 06-scenarios-pont.csv
Sortie :
    geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-v1.geojson
    → à copier dans public/data/ après contrôle du poids.

Couches (propriété `couche`) :
    expose     voies exposées (> 40 km/h), les barrières
    piste      pistes et sentiers polyvalents revêtus
    levis_d    rues locales de Lévis à 50 km/h, tranquilles dans le scénario D
    maillon    tronçons manquants, rangs A et D, résidents
    pont       le pont de Québec et le traversier, chiffres des scénarios en propriétés

Les rues calmes ne sont pas exportées : le fond de carte les montre déjà, et
elles pèseraient plus que tout le reste réuni.
"""

import datetime
import json
import os

import geopandas as gpd
import pandas as pd
from shapely.geometry import LineString, mapping
from shapely.ops import linemerge, unary_union

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
ICI = os.path.join(PROJET, "10-travail")
GRAPHE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
MAILLONS = os.path.join(ICI, "04-maillons-epsg2949.gpkg")
PONT_CSV = os.path.join(ICI, "06-scenarios-pont.csv")
FERRY = os.path.join(PROJET, "00-brut", "osm", "osm-ferry-quebec-levis-2026-10-21.json")
SORTIE = os.path.join(PROJET, "30-export", "velo-quebec-levis-v1.geojson")

SIMPLIFIER = 8      # m : invisible au zoom 15
DECIMALES = 4       # ≈ 11 m, règle de public/data/README.md
PONT_QUEBEC = 39456261
RUES_LOCALES = {"residential", "living_street", "service"}


def arrondir(geom):
    def r(coords):
        return [[round(x, DECIMALES), round(y, DECIMALES)] for x, y in coords]
    g = mapping(geom)
    if g["type"] == "LineString":
        g["coordinates"] = r(g["coordinates"])
    elif g["type"] == "MultiLineString":
        g["coordinates"] = [r(c) for c in g["coordinates"]]
    return g


def fusionner(gdf):
    """Une seule géométrie par couche : lignes fusionnées, simplifiées, en WGS 84."""
    if gdf.empty:
        return None
    g = linemerge(unary_union(list(gdf.geometry)))
    g = gpd.GeoSeries([g], crs=gdf.crs).simplify(SIMPLIFIER).to_crs(4326).iloc[0]
    return g


def main():
    a = gpd.read_file(GRAPHE, layer="aretes")
    entites = []

    def ajouter(couche, geom, **props):
        if geom is not None and not geom.is_empty:
            entites.append({"type": "Feature", "properties": {"couche": couche, **props},
                            "geometry": arrondir(geom)})

    for ville in ("Québec", "Lévis"):
        v = a[a["ville"] == ville]
        ajouter("expose", fusionner(v[(v["classe"] == "expose") & ~v["tranquille_d"]]),
                ville=ville)
        ajouter("piste", fusionner(v[v["classe"] == "piste"]), ville=ville)
    d = a[(a["ville"] == "Lévis") & a["tranquille_d"] & ~a["tranquille"]
          & a["highway"].isin(RUES_LOCALES)]
    ajouter("levis_d", fusionner(d), ville="Lévis")

    ma = gpd.read_file(MAILLONS, layer="maillons_a")
    md = gpd.read_file(MAILLONS, layer="maillons_d")
    cle = lambda df: df.geometry.apply(lambda g: g.wkb_hex)
    ma["cle"], md["cle"] = cle(ma), cle(md)
    tous = pd.concat([ma.assign(scen="A"), md.assign(scen="D")])
    for k, groupe in tous.groupby("cle", sort=False):
        r = groupe.iloc[0]
        rang = dict(zip(groupe["scen"], groupe["rang"]))
        geom = gpd.GeoSeries([r.geometry], crs=ma.crs).to_crs(4326).iloc[0]
        ajouter("maillon", geom, nom=r["noms"] or None, ville=r["ville"],
                longueur_m=int(r["longueur_m"]),
                rang_a=int(rang["A"]) if "A" in rang else None,
                rang_d=int(rang["D"]) if "D" in rang else None,
                habitants=int(r["habitants"]), voisins_moy=int(r["voisins_moy"]),
                paires_hab_millions=round(r["paires_hab"] / 1e6, 1))

    scen = pd.read_csv(PONT_CSV)
    reel = scen[scen["traversier"] == "realiste"]
    chiffres = {f"{r.regime}|{r.pont}": {"habitants_15min": int(r.habitants_15min),
                                         "habitants_30min": int(r.habitants_30min)}
                for r in reel.itertuples()}
    pont = a[a["osm_id"] == PONT_QUEBEC]
    ajouter("pont", pont.to_crs(4326).geometry.iloc[0], nom="Pont de Québec",
            largeur_m=1.3, longueur_m=round(float(pont["longueur_m"].sum())),
            minutes_a_pied=round(float(pont["min_avant"].sum()), 1))
    with open(FERRY, encoding="utf-8") as f:
        w = next(x for x in json.load(f)["elements"] if x["type"] == "way")
    ajouter("pont", LineString([(p["lon"], p["lat"]) for p in w["geometry"]]),
            nom="Traversier Québec–Lévis", minutes_hypothese=27)

    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "titre": "Portée vélo Québec–Lévis : tronçons manquants et pont de Québec",
            "script": "scripts/analysis/velo-quebec-levis-07-exporter.py",
            "genere_le": datetime.date.today().isoformat(),
            "methode": "geodata/04-velo-quebec-levis/JOURNAL.md",
            "tranquille": "norme « tous âges et capacités » : site propre, ou rue à ≤ 40 km/h",
            "budget_minutes": 15,
            "scenarios": {
                "A": "actuel : pont à 1,3 m, vélo à la main ; Lévis à 50 km/h",
                "B": "chantier : pont fermé, traversier seul",
                "C": "tablier élargi à 2,5 m, à vélo",
                "D": "rues locales de Lévis à 40 km/h",
            },
            "pont_habitants_autre_rive": chiffres,
            "traversier_hypothese": "12 min de traversée + 15 min d'attente moyenne, à confirmer (STQ)",
            "sources": [
                "© les contributeurs d'OpenStreetMap (ODbL 1.0), base du 2026-10-21",
                "Ville de Québec, Données Québec (CC-BY 4.0) : réseau cyclable, voies publiques",
                "Ville de Lévis, Données Québec (CC-BY 4.0) : piste cyclable, réseau routier",
                "Ressources naturelles Canada, HRDEM et MRDEM-30 (Licence du gouvernement ouvert – Canada)",
                "Institut de la statistique du Québec, d'après Statistique Canada, Recensement 2021 (CC-BY 4.0)",
                "MRNF, Découpages administratifs (CC-BY 4.0)",
            ],
            "licence": "ODbL 1.0 (dérivé d'OpenStreetMap)",
            "vitesses_pente": "Parkin et Rotheram (2010), Transport Policy 17(5) : −1,44 km/h par % de montée, +0,86 par % de descente",
        },
        "features": entites,
    }
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    texte = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write(texte)

    print(f"{SORTIE}\n{len(texte.encode('utf-8')) / 1024:.0f} Ko")
    for c in ("expose", "piste", "levis_d", "maillon", "pont"):
        e = [x for x in entites if x["properties"]["couche"] == c]
        n = len(json.dumps([x["geometry"] for x in e]))
        print(f"  {c:8s} {len(e):4d} entités  {n / 1024:6.0f} Ko")


if __name__ == "__main__":
    main()
