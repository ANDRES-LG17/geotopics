"""Comble les trous des aires de marche déjà calculées — sans refaire le calcul.

POURQUOI — le couloir de 40 m autour des rues laisse un vide au cœur des très
grands îlots : centres commerciaux et leurs stationnements, échangeurs, campus.
Ce ne sont pas des zones inaccessibles, mais des intérieurs d'îlot. Le seuil
d'un hectare n'en retenait que les plus grands, et ce sont justement eux qu'on
voyait : à 15 minutes, 17 stations sur 29 en portaient de 1 à 6 ha, lus comme
des taches de voile au milieu de l'aire. Ils brouillaient la lecture sans rien
apprendre.

Le script principal les comble désormais (`TROU_MIN_M2` infini). Celui-ci
applique la même règle aux résultats existants — 80 minutes de calcul
épargnées : il remplit les trous, refait le voile de chaque palier, recalcule
superficie, part du disque et population. La longueur de rue parcourue ne
change pas : elle mesure le réseau, pas la forme.

Mis à jour : les fichiers publiés (version suivante) ET les stations calculées
de `10-travail`, pour qu'une reprise ultérieure n'y ramène pas les trous.

Exécution : python de QGIS.
"""

import importlib.util
import json
import os

from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform, unary_union

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("iso", os.path.join(ICI, "tramway-isochrones.py"))
iso = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iso)

V_AVANT, V_APRES = 1, 2


def sans_trou(forme):
    """La même forme, intérieurs d'îlots remplis.

    Réparée d'abord : relue depuis le fichier publié, arrondie à 4 décimales,
    une aire peut avoir un contour qui se touche lui-même en un point — et
    l'intersection avec le recensement échouait alors (« side location
    conflict »). `make_valid` puis `buffer(0)` la rendent exploitable sans en
    changer la forme visible.
    """
    from shapely import make_valid

    forme = make_valid(forme)
    morceaux = [g for g in getattr(forme, "geoms", [forme]) if g.geom_type == "Polygon"]
    for g in getattr(forme, "geoms", []):
        if g.geom_type == "MultiPolygon":
            morceaux.extend(g.geoms)
    return unary_union([Polygon(p.exterior) for p in morceaux]).buffer(0)


def traiter(entites, aires):
    """Comble les trous des aires, refait les voiles. Rend (entités, nb trous)."""
    sortie, trous = [], 0
    for e in entites:
        p = e["properties"]
        if p["couche"] == "voile":
            continue  # refaits ci-dessous, depuis l'aire comblée
        if p["couche"] != "aire_marche":
            sortie.append(e)
            continue
        forme = transform(iso.VERS_PLAN.transform, shape(e["geometry"]))
        morceaux = list(forme.geoms) if forme.geom_type == "MultiPolygon" else [forme]
        trous += sum(len(m.interiors) for m in morceaux)
        pleine = sans_trou(forme)

        superficie = pleine.area / 10_000
        p = {**p,
             "superficie_ha": round(superficie, 1),
             "part_disque_pct": round(superficie / p["disque_ha"] * 100)}
        if aires is not None:
            p["population"] = round(iso.population_dans(pleine, aires))
        sortie.append({"type": "Feature", "properties": p,
                       "geometry": mapping(iso.vers_wgs(pleine))})
        sortie.append({
            "type": "Feature",
            "properties": {"couche": "voile", "station": p["station"], "minutes": p["minutes"]},
            "geometry": mapping(iso.vers_wgs(iso.voile_troue(pleine))),
        })
    return sortie, trous


def main():
    from shapely.strtree import STRtree

    statcan = os.path.join(iso.ATELIER, "00-brut", "statcan")
    liste = iso.charger_population(
        os.path.join(statcan, "aires-diffusion-corridor.geojson"),
        os.path.join(statcan, "population-ad-corridor.json"),
    )
    aires = (STRtree([a for a, _ in liste]), liste)

    dossier = os.path.join(iso.RACINE, "public", "data", "tramway-station")
    total = 0
    for nom in sorted(os.listdir(dossier)):
        if not nom.endswith(f"-v{V_AVANT}.geojson"):
            continue
        chemin = os.path.join(dossier, nom)
        with open(chemin, encoding="utf-8") as f:
            d = json.load(f)
        d["features"], trous = traiter(d["features"], aires)
        d["metadata"]["trous"] = "comblés — intérieurs de grands îlots, pas des zones inaccessibles"
        neuf = chemin.replace(f"-v{V_AVANT}.geojson", f"-v{V_APRES}.geojson")
        with open(neuf, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        os.remove(chemin)
        total += trous
        quinze = next(e["properties"] for e in d["features"]
                      if e["properties"]["couche"] == "aire_marche" and e["properties"]["minutes"] == 15)
        print(f"{nom.replace(f'-v{V_AVANT}.geojson', ''):34} {trous:3d} trous comblés · "
              f"15 min : {quinze['superficie_ha']:6.1f} ha · {quinze['population']:6d} hab")

    # Les stations calculées, pour qu'une reprise ne ramène pas les trous.
    reprise = os.path.join(iso.ATELIER, "10-travail", "stations-calculees")
    for nom in sorted(os.listdir(reprise)):
        chemin = os.path.join(reprise, nom)
        with open(chemin, encoding="utf-8") as f:
            d = json.load(f)
        tout, _ = traiter(d["entites"] + d["voiles"], aires)
        d = {"entites": [e for e in tout if e["properties"]["couche"] != "voile"],
             "voiles": [e for e in tout if e["properties"]["couche"] == "voile"]}
        with open(chemin, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)

    print(f"\n{total} trous comblés au total · fichiers en v{V_APRES} · reprise mise à jour")


if __name__ == "__main__":
    main()
