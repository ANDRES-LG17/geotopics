"""
Télécharge deux couches du service de mobilité de la Ville de Québec : le
réseau cyclable QUATRE SAISONS (ce qui est déneigé ou damé l'hiver) et le
réseau cyclable complet (qui marque les corridors VivaCité réalisés).

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-10-telecharger-vdq-mobilite.py

Source : le service qu'interroge la carte « Vélo quatre saisons » de la Ville
(ville.quebec.qc.ca → arcg.is/1XXSab3 → carte web 57827099…), publié sans
authentification :
    https://services1.arcgis.com/4GCvRJNX6LNyFVQ0/arcgis/rest/services/CI_TRANSPORT_MOBILITE/FeatureServer
        couche 12  Réseau cyclable 4 saisons   SERVICE_DENEIGEMENT (Déneigé / Damé)
        couche 0   Réseau cyclable             SOUS_TYPE_RC (3 = Corridor VivaCité)

Les entités sont lues par pages (le service plafonne chaque réponse), en
WGS84, et écrites telles quelles en GeoJSON, datées du jour : la Ville met
ces couches à jour en continu, la date fait foi.

Sorties : geodata/04-velo-quebec-levis/00-brut/vdq/
    vdq-reseau-4-saisons-AAAA-MM-JJ.geojson
    vdq-reseau-cyclable-service-AAAA-MM-JJ.geojson
"""

import datetime
import json
import os
import time
import urllib.parse
import urllib.request

ICI_SCRIPT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI_SCRIPT))
BRUT = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "00-brut", "vdq")
SERVICE = ("https://services1.arcgis.com/4GCvRJNX6LNyFVQ0/arcgis/rest/services/"
           "CI_TRANSPORT_MOBILITE/FeatureServer")
COUCHES = {12: "vdq-reseau-4-saisons", 0: "vdq-reseau-cyclable-service"}
UA = "GeoTopics-portfolio/1.0 (analyse velo Quebec-Levis)"
PAGE = 1000


def lire(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def telecharger(couche):
    entites = []
    debut = 0
    while True:
        params = urllib.parse.urlencode({
            "where": "1=1", "outFields": "*", "outSR": 4326, "f": "geojson",
            "resultOffset": debut, "resultRecordCount": PAGE, "orderByFields": "OBJECTID",
        })
        page = lire(f"{SERVICE}/{couche}/query?{params}")
        lot = page.get("features", [])
        entites += lot
        print(f"  couche {couche} : {len(entites)} entités")
        if len(lot) < PAGE:
            break
        debut += PAGE
        time.sleep(0.5)
    return entites


def main():
    os.makedirs(BRUT, exist_ok=True)
    jour = datetime.date.today().isoformat()
    for couche, nom in COUCHES.items():
        sortie = os.path.join(BRUT, f"{nom}-{jour}.geojson")
        if os.path.exists(sortie):
            print(f"{sortie} existe déjà")
            continue
        entites = telecharger(couche)
        info = lire(f"{SERVICE}/{couche}?f=json")
        donnees = {
            "type": "FeatureCollection",
            "features": entites,
            "metadata": {
                "source": f"{SERVICE}/{couche}",
                "nom": info.get("name"),
                "telecharge_le": jour,
                "derniere_modif_service": info.get("editingInfo", {}).get("lastEditDate"),
                "producteur": "Ville de Québec",
            },
        }
        with open(sortie + ".part", "w", encoding="utf-8") as f:
            json.dump(donnees, f, ensure_ascii=False)
        os.replace(sortie + ".part", sortie)
        print(f"{sortie} : {len(entites)} entités, {os.path.getsize(sortie) / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
