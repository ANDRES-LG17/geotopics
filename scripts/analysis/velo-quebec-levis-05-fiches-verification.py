"""
Fiches de vérification des meilleurs maillons : une vignette par candidat et
un tableau avec liens Street View et OSM, à contrôler sur le terrain.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-05-fiches-verification.py

Sortie :
    05-verification/NN-nom.png      vignette 600 m × 600 m
    05-verification/VERIFICATION.md tableau à remplir
"""

import os
import re
import unicodedata

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
GRAPHE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
MAILLONS = os.path.join(ICI, "04-maillons-epsg2949.gpkg")
DOSSIER = os.path.join(ICI, "05-verification")
DEMI = 300  # m : demi-côté de la vignette
TOP = 15

COULEURS = {"piste": "#1f6fb4", "rue_calme": "#6baed6", "sentier": "#2a9d5c",
            "a_pied": "#9e9e9e", "expose": "#d9534f"}


def slug(s):
    s = unicodedata.normalize("NFKD", s or "sans-nom").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40]


def selection():
    a = gpd.read_file(MAILLONS, layer="maillons_a").head(TOP).assign(scenario="A")
    d = gpd.read_file(MAILLONS, layer="maillons_d")
    d = d[(d["ville"] == "Lévis") & (d["rang"] <= TOP)].assign(scenario="D")
    return pd.concat([a, d], ignore_index=True)


def main():
    os.makedirs(DOSSIER, exist_ok=True)
    aretes = gpd.read_file(GRAPHE, layer="aretes")
    sel = selection()
    centres = sel.geometry.interpolate(0.5, normalized=True)
    wgs = gpd.GeoSeries(centres, crs=sel.crs).to_crs(4326)

    lignes = []
    for k, (r, c, w) in enumerate(zip(sel.itertuples(), centres, wgs), start=1):
        nom = r.noms or "sans nom"
        fichier = f"{k:02d}-{r.scenario.lower()}{r.rang:02d}-{slug(r.noms)}.png"
        fig, ax = plt.subplots(figsize=(5, 5), dpi=110)
        boite = (c.x - DEMI, c.y - DEMI, c.x + DEMI, c.y + DEMI)
        voisins = aretes.cx[boite[0]:boite[2], boite[1]:boite[3]]
        for classe, coul in COULEURS.items():
            v = voisins[voisins["classe"] == classe]
            if len(v):
                v.plot(ax=ax, color=coul, linewidth=1.2 if classe != "expose" else 1.6)
        gpd.GeoSeries([r.geometry], crs=sel.crs).plot(ax=ax, color="black", linewidth=4,
                                                       alpha=0.6)
        ax.set_xlim(boite[0], boite[2])
        ax.set_ylim(boite[1], boite[3])
        ax.set_axis_off()
        ax.set_title(f"{r.scenario} n° {r.rang} — {nom[:45]}\n{r.longueur_m} m exposés, "
                     f"auto ≤ {int(r.v_auto_max)} km/h", fontsize=9)
        fig.tight_layout()
        fig.savefig(os.path.join(DOSSIER, fichier))
        plt.close(fig)

        lat, lon = round(w.y, 6), round(w.x, 6)
        lignes.append(
            f"| {r.scenario} {r.rang} | {nom} | {r.ville} | {r.longueur_m} m |"
            f" {r.gain_paires:,} | [vignette]({fichier}) |"
            f" [Street View](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lon})"
            f" · [OSM](https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=18/{lat}/{lon}) |"
            f"  |  |".replace(",", " "))

    entete = [
        "# Vérification des maillons",
        "",
        "Généré par `velo-quebec-levis-05-fiches-verification.py` — à relancer après chaque calcul.",
        "",
        "Vignettes : bleu foncé piste, bleu clair rue calme, vert sentier, gris à "
        "pied, rouge exposé ; le trait noir est le maillon.",
        "",
        "Verdict : **réel** (le trou existe), **artefact** (erreur de données ou "
        "de graphe), **déjà fait** (aménagé depuis la donnée).",
        "",
        "| Rang | Lien | Ville | Longueur | Gain (paires) | Vignette | Terrain | Verdict | Note |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    with open(os.path.join(DOSSIER, "VERIFICATION.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(entete + lignes) + "\n")
    print(f"{len(lignes)} fiches dans {DOSSIER}")


if __name__ == "__main__":
    main()
