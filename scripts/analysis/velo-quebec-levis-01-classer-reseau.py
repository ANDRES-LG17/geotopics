"""
Classe chaque voie OSM de Québec–Lévis : tranquille ou exposée, selon la norme
« tous âges et capacités » retenue dans JOURNAL.md.

Lancer avec le Python de QGIS (geopandas, shapely et pyogrio y sont) :

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-01-classer-reseau.py

Entrées (00-brut/, lues sans être modifiées) :
    osm/osm-highway-quebec-levis-2026-10-21.json   réseau viaire
    mrnf/SDA.gpkg.zip                              limites municipales
    vdq/vdq-voiepublique.zip                       vitesses officielles de Québec
    vdq/vdq-reseaucyclable.zip                     réseau cyclable de Québec
    levis/piste-cyclable.zip                       réseau cyclable de Lévis

Vitesse automobile retenue, par ordre de priorité :
    1. `VITESSEMAX` de la Ville de Québec (voie à moins de 12 m) ;
    2. `maxspeed` d'OSM ;
    3. 50 km/h, la limite du Code de la sécurité routière en ville. C'est le
       cas de Lévis, qui n'a pas de règlement d'abaissement ; les allées et
       rues partagées gardent leur défaut propre (20 km/h).

Sortie :
    01-reseau-classe-epsg2949.gpkg   couches zone, reseau, vdq, levis
"""

import json
import os
import re

import geopandas as gpd
import pandas as pd
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
BRUT = os.path.join(ICI, "..", "00-brut")
OSM = os.path.join(BRUT, "osm", "osm-highway-quebec-levis-2026-10-21.json")
SDA = "/vsizip/" + os.path.abspath(os.path.join(BRUT, "mrnf", "SDA.gpkg.zip")).replace("\\", "/") + "/SDA.gpkg"
VDQ = os.path.join(BRUT, "vdq", "vdq-reseaucyclable.zip")
VDQ_VOIES = os.path.join(BRUT, "vdq", "vdq-voiepublique.zip")
LEVIS = os.path.join(BRUT, "levis", "piste-cyclable.zip")
SORTIE = os.path.join(ICI, "01-reseau-classe-epsg2949.gpkg")

SCR = "EPSG:2949"  # MTM fuseau 7 : Québec et Lévis y tombent tous les deux
SEUIL = 40         # km/h automobile : au-delà, une bande peinte ne suffit plus (NACTO)
SEUIL_VARIANTE = 50
VITESSE_LEVIS_D = 40  # scénario D : rues locales de Lévis abaissées à 40 km/h
RUES_LOCALES = {"residential", "living_street", "service"}

# Ce que le vélo n'a pas le droit d'emprunter, ou qui n'est pas une voie.
EXCLUS = {"motorway", "motorway_link", "construction", "proposed", "raceway",
          "rest_area", "services", "bus_guideway", "platform", "elevator",
          "corridor", "abandoned", "disused", "razed"}

# Vitesse automobile quand ni la Ville ni OSM n'en donnent : la limite légale
# en ville (50), sauf allées et rues partagées, et routes à chaussées séparées.
VITESSE_DEFAUT = {
    "living_street": 20, "service": 20, "residential": 50,
    "unclassified": 50, "tertiary": 50, "tertiary_link": 50,
    "secondary": 50, "secondary_link": 50, "primary": 50, "primary_link": 50,
    "trunk": 70, "trunk_link": 70,
}

# Allées de stationnement, entrées privées, service au volant : ni des rues ni
# des liens. Laissées, elles comptaient 394 km de « rues calmes » à Lévis.
SERVICE_EXCLUS = {"parking_aisle", "driveway", "drive-through"}

REVETU = {"asphalt", "concrete", "paved", "paving_stones", "concrete:plates",
          "compacted", "fine_gravel", "metal", "wood"}


def vitesse(t):
    m = re.match(r"\s*(\d+)", t.get("maxspeed", ""))
    return int(m.group(1)) if m else None


def amenagement_sur_rue(t):
    """Ce que les tags `cycleway*` disent de la chaussée : track, lane, ou rien."""
    valeurs = {t.get(k) for k in ("cycleway", "cycleway:both",
                                  "cycleway:right", "cycleway:left")}
    if valeurs & {"track", "opposite_track"}:
        return "track"
    if valeurs & {"lane", "opposite_lane"}:
        return "lane"
    if valeurs & {"shared_lane", "shoulder", "shared", "share_busway"}:
        return "partage"
    return None


def classer(t):
    """Classe provisoire d'après les seuls tags OSM.

    Les rues reçoivent la classe « rue » : rue calme ou exposée se décide
    plus loin, une fois la vitesse officielle connue.
    """
    h = t["highway"]
    velo = t.get("bicycle")
    if h in EXCLUS or velo in ("no", "private") or t.get("access") in ("no", "private"):
        return "exclu"
    if h == "service" and t.get("service") in SERVICE_EXCLUS:
        return "exclu"

    if h == "cycleway" or (h in ("path", "footway", "bridleway", "pedestrian", "track")
                           and velo == "designated"):
        return "piste"
    if h in ("path", "track", "bridleway"):
        if t.get("surface") in REVETU or velo in ("yes", "permissive"):
            return "piste"
        return "sentier"
    if h in ("footway", "pedestrian", "steps"):
        # Le Code de la sécurité routière interdit le trottoir au vélo sauf
        # signalisation : on le franchit à pied, comme le pont de Québec.
        if velo in ("yes", "permissive") and h != "steps":
            return "piste"
        return "a_pied"

    if h not in VITESSE_DEFAUT or velo == "use_sidepath":
        # use_sidepath : le vélo est renvoyé sur une voie parallèle tracée à
        # part, la chaussée n'est pas une option.
        return "exclu"
    if amenagement_sur_rue(t) == "track":
        return "piste"
    return "rue"


def lire_osm():
    with open(OSM, encoding="utf-8") as f:
        elements = json.load(f)["elements"]
    lignes = []
    for e in elements:
        geom = e.get("geometry") or []
        if len(geom) < 2:
            continue
        t = e.get("tags", {})
        lignes.append({
            "osm_id": e["id"],
            "highway": t.get("highway"),
            "nom": t.get("name"),
            "classe": classer(t),
            "v_osm": vitesse(t),
            "amenag": amenagement_sur_rue(t),
            "bicycle": t.get("bicycle"),
            "surface": t.get("surface"),
            "largeur": t.get("width"),
            "oneway": t.get("oneway"),
            "oneway_velo": t.get("oneway:bicycle"),
            "service": t.get("service"),
            "pont": t.get("bridge"),
            "geometry": LineString([(p["lon"], p["lat"]) for p in geom]),
        })
    return gpd.GeoDataFrame(lignes, crs="EPSG:4326").to_crs(SCR)


def fixer_vitesses(reseau, milieux):
    """Remplit `v_auto` et `source_v` pour les rues, dans l'ordre de priorité.

    Appariement Ville ↔ OSM par le milieu de la voie OSM : loin des
    intersections, il tombe sur la bonne rue. Une longue voie OSM dont la
    vitesse change en cours de route prend celle de son milieu.
    """
    # Deux champs seulement : le .dbf est en UTF-8 sans .cpg, et certains noms
    # de rue sont tronqués au milieu d'un caractère accentué.
    voies = gpd.read_file(VDQ_VOIES, columns=["TYPE", "VITESSEMAX"]).to_crs(SCR)
    # Seulement les chaussées : les bandes et pistes de la couche portent
    # leur propre géométrie, qui ne doit pas capter l'appariement.
    voies = voies[voies["TYPE"].isin(["Tronçon", "Autre (rue privée)"])
                  & (voies["VITESSEMAX"].fillna(0) > 0)][["VITESSEMAX", "geometry"]]

    rues = reseau.index[reseau["classe"] == "rue"]
    pres = gpd.sjoin_nearest(milieux.loc[rues], voies, max_distance=12)
    v_ville = pres[~pres.index.duplicated()]["VITESSEMAX"]

    reseau["v_auto"] = pd.NA
    reseau["source_v"] = pd.NA
    for source, valeurs in (
        ("ville", v_ville),
        ("osm", reseau.loc[rues, "v_osm"].dropna()),
        ("defaut", reseau.loc[rues, "highway"].map(VITESSE_DEFAUT)),
    ):
        libre = reseau["v_auto"].isna() & reseau.index.isin(valeurs.index)
        cible = reseau.index[libre]
        reseau.loc[cible, "v_auto"] = valeurs.loc[cible].astype(int)
        reseau.loc[cible, "source_v"] = source
    reseau["v_auto"] = reseau["v_auto"].astype("Int64")


def main():
    zone = gpd.read_file(SDA, layer="munic_s",
                         where="MUS_CO_GEO IN ('23027', '25213')").to_crs(SCR)
    zone = zone[["MUS_CO_GEO", "MUS_NM_MUN", "geometry"]]
    # 500 m de marge : une voie qui longe la limite reste dans le graphe.
    #
    # Les ENCLAVES sont comblées : L'Ancienne-Lorette, Wendake et les autres
    # trous du polygone de Québec sont des municipalités distinctes, mais on
    # les traverse à vélo comme le reste de la ville. Sans elles, le graphe
    # avait un trou au milieu de l'agglomération, et la tache de portée aussi.
    union = zone.union_all()
    parties = getattr(union, "geoms", [union])
    emprise = unary_union([Polygon(p.exterior) for p in parties]).buffer(500)

    reseau = lire_osm()
    reseau = reseau[reseau.intersects(emprise)].copy()
    reseau["longueur_m"] = reseau.length.round(1)

    # Ville de chaque voie, d'après son milieu ; la plus proche pour les voies
    # de la marge de 500 m.
    milieux = gpd.GeoDataFrame(geometry=reseau.interpolate(0.5, normalized=True),
                               index=reseau.index, crs=SCR)
    ville = gpd.sjoin_nearest(milieux, zone[["MUS_NM_MUN", "geometry"]])
    reseau["ville"] = ville[~ville.index.duplicated()]["MUS_NM_MUN"]

    fixer_vitesses(reseau, milieux)

    rue = reseau["classe"] == "rue"
    reseau.loc[rue, "classe"] = reseau.loc[rue, "v_auto"].le(SEUIL).map(
        {True: "rue_calme", False: "expose"})

    tranquille = {"piste", "rue_calme", "a_pied", "sentier"}
    reseau["tranquille"] = reseau["classe"].isin(tranquille)
    # Variante de sensibilité : la bande peinte compte jusqu'à 50 km/h.
    reseau["tranquille_50"] = reseau["tranquille"] | (
        (reseau["amenag"] == "lane") & (reseau["v_auto"] <= SEUIL_VARIANTE))
    # Scénario D : les rues locales de Lévis à 50 km/h passent à 40.
    abaissees = ((reseau["ville"] == "Lévis") & reseau["highway"].isin(RUES_LOCALES)
                 & (reseau["v_auto"] == 50))
    reseau["tranquille_d"] = reseau["tranquille"] | (
        abaissees & (VITESSE_LEVIS_D <= SEUIL))

    vdq = gpd.read_file(VDQ).to_crs(SCR)
    levis = gpd.read_file(LEVIS).to_crs(SCR)

    zone.to_file(SORTIE, layer="zone", driver="GPKG")
    reseau.to_file(SORTIE, layer="reseau", driver="GPKG")
    vdq.to_file(SORTIE, layer="vdq", driver="GPKG")
    levis.to_file(SORTIE, layer="levis", driver="GPKG")

    rapport(reseau, vdq, levis)


def km(s):
    return round(s.sum() / 1000)


def rapport(reseau, vdq, levis):
    utile = reseau[reseau["classe"] != "exclu"]
    print(f"voies retenues : {len(utile)} — {km(utile.longueur_m)} km\n")

    print("km par classe et par ville")
    print(utile.pivot_table(index="classe", columns="ville", values="longueur_m",
                            aggfunc="sum").div(1000).round().to_string(), "\n")

    rues = utile[utile["v_auto"].notna()]
    print("rues : origine de la vitesse automobile (km)")
    print(rues.pivot_table(index="source_v", columns="ville", values="longueur_m",
                           aggfunc="sum").div(1000).round().to_string(), "\n")
    print("rues locales : vitesse retenue (km)")
    locales = rues[rues["highway"].isin(RUES_LOCALES)]
    print(locales.pivot_table(index="v_auto", columns="ville", values="longueur_m",
                              aggfunc="sum").div(1000).round().to_string(), "\n")

    for v in ("Québec", "Lévis"):
        u = utile[utile["ville"] == v]
        print(f"{v} — tranquille : {km(u[u.tranquille].longueur_m)} km sur"
              f" {km(u.longueur_m)} ; variante ≤ {SEUIL_VARIANTE} :"
              f" {km(u[u.tranquille_50].longueur_m)} ; scénario D :"
              f" {km(u[u.tranquille_d].longueur_m)}")
    print()
    bandes = utile[utile["amenag"] == "lane"]
    print(f"bandes cyclables OSM : {km(bandes.longueur_m)} km, dont"
          f" {km(bandes[bandes.v_auto <= SEUIL].longueur_m)} km sur rue ≤ {SEUIL} km/h\n")

    # Recoupement : quelle part des réseaux municipaux OSM couvre-t-il ?
    # Un segment municipal est « vu » s'il tombe à moins de 15 m d'une voie
    # OSM portant un aménagement cyclable.
    cyclable = utile[(utile["classe"] == "piste") | utile["amenag"].notna()]
    tampon = cyclable.buffer(15).union_all()
    for nom, couche, champ in (("Québec", vdq, "TYPE"), ("Lévis", levis, "TypeVoieCy")):
        c = couche.copy()
        c["l"] = c.length
        c["l_vu"] = c.intersection(tampon).length
        t = c.groupby(champ)[["l", "l_vu"]].sum()
        t["km"] = (t["l"] / 1000).round(1)
        t["part_vue_osm"] = (100 * t["l_vu"] / t["l"]).round()
        print(f"{nom} : réseau municipal retrouvé dans OSM (%)")
        print(t[["km", "part_vue_osm"]].to_string(), "\n")


if __name__ == "__main__":
    main()
