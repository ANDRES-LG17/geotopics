---
title: "Contrôler la qualité géométrique d'une couche avec Python"
description: "Un script de validation minimal qui détecte les géométries invalides, les doublons et les micro-segments avant qu'ils ne polluent une analyse."
date: "2026-03-09"
tags: ["Python", "Contrôle qualité", "Shapely", "SIG"]
---

Une analyse spatiale ne vaut que ce que valent ses données d'entrée. Pourtant, le contrôle qualité reste souvent une inspection visuelle rapide dans le logiciel SIG — ce qui revient à relire un tableur en le survolant.

Voici une approche systématique, scriptée, que j'applique avant toute analyse sérieuse.

## Les quatre défauts qui coûtent le plus cher

1. **Géométries invalides** — auto-intersections, anneaux mal orientés. Elles font échouer les opérations d'overlay, parfois silencieusement.
2. **Doublons géométriques** — la même entité numérisée deux fois. Elle double les surfaces dans tout calcul de statistiques zonales.
3. **Micro-segments** — des segments de quelques millimètres issus d'une numérisation approximative. Ils gonflent les périmètres et ralentissent les traitements.
4. **Géométries vides ou nulles** — souvent le résidu d'une conversion ratée en amont.

## Le script de base

```python
import geopandas as gpd
from shapely.validation import explain_validity

def controler(chemin, tolerance=0.01):
    """Retourne un rapport de qualité pour une couche vectorielle."""
    gdf = gpd.read_file(chemin)
    rapport = {}

    # 1. Géométries nulles ou vides
    vides = gdf[gdf.geometry.isna() | gdf.geometry.is_empty]
    rapport["vides"] = list(vides.index)

    # 2. Géométries invalides, avec le motif exact
    invalides = gdf[~gdf.geometry.is_valid & gdf.geometry.notna()]
    rapport["invalides"] = {
        i: explain_validity(g) for i, g in invalides.geometry.items()
    }

    # 3. Doublons : on compare la représentation WKT normalisée
    cles = gdf.geometry.apply(lambda g: g.wkt if g else None)
    rapport["doublons"] = list(gdf[cles.duplicated(keep=False)].index)

    # 4. Micro-segments sous la tolérance de levé
    def a_micro_segments(geom):
        if geom is None or geom.is_empty:
            return False
        coords = list(geom.exterior.coords) if geom.geom_type == "Polygon" \
            else list(geom.coords)
        return any(
            ((coords[i][0] - coords[i + 1][0]) ** 2
             + (coords[i][1] - coords[i + 1][1]) ** 2) ** 0.5 < tolerance
            for i in range(len(coords) - 1)
        )

    rapport["micro_segments"] = [
        i for i, g in gdf.geometry.items() if a_micro_segments(g)
    ]

    return rapport
```

## Choisir la bonne tolérance

C'est le point où l'on se trompe le plus souvent. La tolérance n'est pas une valeur arbitraire : elle doit correspondre à la **précision réelle du levé**.

- Levé GNSS différentiel : 0,02 m
- Levé au total station : 0,005 m
- Numérisation sur orthophoto 20 cm : 0,20 m

Prendre une tolérance plus fine que la précision du levé revient à signaler comme défauts des variations qui ne sont que du bruit de mesure. Prendre une tolérance plus grossière revient à fusionner des sommets qui décrivent une vraie géométrie.

## Intégrer le contrôle au processus

Un rapport que personne ne lit ne sert à rien. Deux règles :

- Le script tourne **automatiquement** à chaque import de données, pas sur demande.
- Il produit une sortie exploitable : un GeoJSON des entités fautives, ouvrable directement dans QGIS pour correction.

```python
rapport = controler("reseau.gpkg", tolerance=0.02)
indices = {i for liste in rapport.values()
           for i in (liste if isinstance(liste, list) else liste.keys())}

if indices:
    gpd.read_file("reseau.gpkg").loc[sorted(indices)].to_file(
        "a_corriger.geojson", driver="GeoJSON"
    )
```

Le géomaticien ouvre `a_corriger.geojson`, corrige, relance. La boucle est courte, et c'est ce qui la rend tenable.

## Ce qu'il faut retenir

Le contrôle qualité n'est pas une étape de fin de projet : c'est une **porte d'entrée**. Une donnée qui n'a pas passé la validation ne devrait jamais atteindre la phase d'analyse.

Le coût du script est d'une demi-journée. Le coût d'une analyse refaite parce qu'une couche contenait des doublons se compte en semaines.
