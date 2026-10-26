"""
Ajoute au fichier des tronçons l'entretien d'HIVER et les CORRIDORS VivaCité,
pour la colmena « confort à vélo » du lab.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-13-troncons-hiver-cvc.py

Le v3 reprend le v2 (coordonnées, classes, altitudes…) et ajoute, pour chaque
arête, dans l'ordre du graphe :
    h    entretien d'hiver 2025-26 : 0 aucun connu, 1 damé, 2 déneigé
         (script 11 ; Ville de Québec seulement — rien pour Lévis)
    cvc  corridor VivaCité : 0 non, 1 réalisé (script 11), 2 projeté
         (tracé INDICATIF, script 12)

Entrées :
    geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-troncons-v2.json
    geodata/04-velo-quebec-levis/10-travail/11-hiver-cvc.csv
    geodata/04-velo-quebec-levis/10-travail/12-cvc-projetes.csv
Sortie :
    geodata/04-velo-quebec-levis/30-export/velo-quebec-levis-troncons-v3.json
"""

import json
import os

import numpy as np
import pandas as pd

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
PROJET = os.path.join(RACINE, "geodata", "04-velo-quebec-levis")
V2 = os.path.join(PROJET, "30-export", "velo-quebec-levis-troncons-v2.json")
V3 = os.path.join(PROJET, "30-export", "velo-quebec-levis-troncons-v3.json")


def main():
    with open(V2, encoding="utf-8") as f:
        v = json.load(f)
    n = len(v["l"])
    hc = pd.read_csv(os.path.join(PROJET, "10-travail", "11-hiver-cvc.csv"))
    pr = pd.read_csv(os.path.join(PROJET, "10-travail", "12-cvc-projetes.csv"))
    if len(hc) != n:
        raise SystemExit(f"{len(hc)} arêtes dans 11-hiver-cvc.csv, {n} dans le v2 : relancer 08 puis 11")
    h = hc.sort_values("arete")["hiver"].to_numpy()
    cvc = hc.sort_values("arete")["cvc"].to_numpy().copy()
    projete = np.zeros(n, dtype=bool)
    projete[pr["arete"].to_numpy()] = True
    cvc[(cvc == 0) & projete] = 2
    v["version"] = 3
    v["h"] = h.astype(int).tolist()
    v["cvc"] = cvc.astype(int).tolist()
    v["metadata"] = dict(v["metadata"])
    v["metadata"]["script"] = "scripts/analysis/velo-quebec-levis-13-troncons-hiver-cvc.py (sur le v2)"
    v["metadata"]["h"] = ("entretien d'hiver 2025-26 (Ville de Québec, réseau cyclable 4 saisons) : "
                          "0 aucun connu, 1 damé, 2 déneigé ; rien pour Lévis")
    v["metadata"]["cvc"] = ("corridors VivaCité : 1 réalisé (Ville de Québec, SOUS_TYPE_RC = Corridor), "
                            "2 projeté — tracé INDICATIF d'après la carte schématique de la Ville (2024)")
    texte = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
    with open(V3, "w", encoding="utf-8") as f:
        f.write(texte)
    l = np.array(v["l"]) / 1000
    print(f"{V3} : {len(texte.encode('utf-8')) / 1024:.0f} Ko")
    print(f"hiver : déneigé {l[h == 2].sum():.1f} km, damé {l[h == 1].sum():.1f} km")
    print(f"CVC : réalisés {l[cvc == 1].sum():.1f} km, projetés {l[cvc == 2].sum():.1f} km")


if __name__ == "__main__":
    main()
