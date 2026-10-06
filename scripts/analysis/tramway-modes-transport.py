"""Mode de transport domicile–travail dans chaque aire de marche.

À exécuter APRÈS `tramway-isochrones.py` : enrichit les fichiers de station
publiés et en écrit la version suivante (cache immuable — voir
`VERSION_DONNEES`).

Pour chaque aire (station × palier), les effectifs du recensement de 2021 sont
répartis par pondération de surface — la même méthode, et la même hypothèse de
répartition uniforme, que pour la population. Les catégories retenues pour le
panneau :

- automobile (conducteur et passager) ;
- transport collectif ;
- transport actif : marche et vélo ;
- autre moyen (moins de 1 % sur le corridor, gardé pour que le total fasse 100).

LIMITES, à écrire dans la méthode du lab :

- recensement de **mai 2021, en pleine pandémie** — le transport collectif y
  est sous-représenté ;
- population active occupée de 15 ans et plus ayant un lieu habituel de
  travail, hors télétravail ; **données-échantillon (25 %)** ;
- 42 valeurs supprimées par Statistique Canada (petites aires), comptées à 0.

Source : Statistique Canada, profil du recensement de 2021 (98-401-X2021006),
caractéristiques 2603–2610 — extraites dans
`00-brut/statcan/navettage-ad-corridor.json`.

Exécution : python de QGIS.
"""

import importlib.util
import json
import os

from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("iso", os.path.join(ICI, "tramway-isochrones.py"))
iso = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iso)

V_AVANT, V_APRES = 2, 3
CLES = ("auto", "tc", "marche", "velo", "autre")


def charger_aires():
    statcan = os.path.join(iso.ATELIER, "00-brut", "statcan")
    with open(os.path.join(statcan, "aires-diffusion-corridor.geojson"), encoding="utf-8") as f:
        geo = json.load(f)
    with open(os.path.join(statcan, "navettage-ad-corridor.json"), encoding="utf-8") as f:
        nav = json.load(f)
    aires = []
    for e in geo["features"]:
        forme = transform(iso.VERS_PLAN.transform, shape(e["geometry"]))
        if not forme.is_valid:
            forme = forme.buffer(0)
        aires.append((forme, nav.get(e["properties"]["ADIDU"], {})))
    return STRtree([a for a, _ in aires]), aires


def repartir(forme, arbre, aires):
    """Effectifs par mode dans la forme, par pondération de surface."""
    somme = dict.fromkeys(CLES, 0.0)
    for i in arbre.query(forme):
        aire, modes = aires[i]
        if not modes or not forme.intersects(aire):
            continue
        part = forme.intersection(aire).area / aire.area
        for c in CLES:
            somme[c] += modes.get(c, 0) * part
    return somme


def pourcentages(valeurs):
    """Parts entières qui totalisent exactement 100 (plus forts restes)."""
    total = sum(valeurs.values())
    if total <= 0:
        return {k: 0 for k in valeurs}
    bruts = {k: v / total * 100 for k, v in valeurs.items()}
    parts = {k: int(v) for k, v in bruts.items()}
    for k in sorted(bruts, key=lambda k: bruts[k] - parts[k], reverse=True)[: 100 - sum(parts.values())]:
        parts[k] += 1
    return parts


def main():
    arbre, aires = charger_aires()
    dossier = os.path.join(iso.RACINE, "public", "data", "tramway-station")
    for nom in sorted(os.listdir(dossier)):
        if not nom.endswith(f"-v{V_AVANT}.geojson"):
            continue
        chemin = os.path.join(dossier, nom)
        with open(chemin, encoding="utf-8") as f:
            d = json.load(f)
        for e in d["features"]:
            p = e["properties"]
            if p["couche"] != "aire_marche":
                continue
            forme = transform(iso.VERS_PLAN.transform, shape(e["geometry"])).buffer(0)
            s = repartir(forme, arbre, aires)
            groupes = {"auto": s["auto"], "tc": s["tc"],
                       "actif": s["marche"] + s["velo"], "autre": s["autre"]}
            parts = pourcentages(groupes)
            p["navetteurs"] = round(sum(groupes.values()))
            for k, v in parts.items():
                p[f"mode_{k}_pct"] = v
        d["metadata"]["modes"] = (
            "Mode de transport domicile–travail, recensement 2021 (mai 2021, en "
            "pleine pandémie), données-échantillon 25 %, réparti par pondération "
            "de surface."
        )
        neuf = chemin.replace(f"-v{V_AVANT}.geojson", f"-v{V_APRES}.geojson")
        with open(neuf, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        os.remove(chemin)
        q = next(e["properties"] for e in d["features"]
                 if e["properties"]["couche"] == "aire_marche" and e["properties"]["minutes"] == 15)
        print(f"{nom.replace(f'-v{V_AVANT}.geojson', ''):34} 15 min : "
              f"auto {q['mode_auto_pct']:3d} % · collectif {q['mode_tc_pct']:3d} % · "
              f"actif {q['mode_actif_pct']:3d} % · autre {q['mode_autre_pct']:2d} % "
              f"· {q['navetteurs']:6d} navetteurs")


if __name__ == "__main__":
    main()
