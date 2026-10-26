"""
Répartit la population 2021 des aires de diffusion (AD) sur les cellules de
1 ha du graphe, pour compter des résidents plutôt que des hectares.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-02b-population-cellules.py

Entrées :
    02-graphe-epsg2949.gpkg
    ../00-brut/isq/geo_recensement_2021_qc_harmonise_isq_format_gdb.zip
Sortie :
    02b-population-cellules.csv    cx, cy (indices de cellule), pop

Méthode dasymétrique simple : la population d'une AD est partagée à parts
égales entre ses cellules qui contiennent une rue résidentielle. Si une AD
n'en a aucune, entre toutes ses cellules qui contiennent un nœud du graphe.
Une AD sans aucun nœud perd sa population (comptée et affichée).
"""

import os

import geopandas as gpd
import pandas as pd

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
GRAPHE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
ISQ = os.path.abspath(os.path.join(ICI, "..", "00-brut", "isq",
                                   "geo_recensement_2021_qc_harmonise_isq_format_gdb.zip"))
GDB = "/vsizip/" + ISQ.replace("\\", "/") + "/geo_rec_2021_QC_hamro_ISQ.gdb"
SORTIE = os.path.join(ICI, "02b-population-cellules.csv")
SCR = "EPSG:2949"
CELLULE = 100
RESIDENTIEL = {"residential", "living_street", "unclassified"}


def main():
    ad = gpd.read_file(GDB, layer="AD_2021_QC_LimCarto_harmo",
                       columns=["ADIDU", "CO_MUN", "NOM_MUN", "Population_2021"],
                       where="CO_MUN IN ('23027', '25213')").to_crs(SCR)
    a = gpd.read_file(GRAPHE, layer="aretes", columns=["highway", "u"])
    pts = a.geometry.interpolate(0.5, normalized=True)
    noeuds = gpd.GeoDataFrame({"resid": a["highway"].isin(RESIDENTIEL).values},
                              geometry=pts.values, crs=SCR)
    noeuds["cx"] = (noeuds.geometry.x // CELLULE).astype(int)
    noeuds["cy"] = (noeuds.geometry.y // CELLULE).astype(int)

    j = gpd.sjoin(noeuds, ad[["ADIDU", "geometry"]], predicate="within")
    cel = j.groupby(["ADIDU", "cx", "cy"])["resid"].any().reset_index()
    # Cellules résidentielles si l'AD en a, sinon toutes ses cellules.
    a_resid = cel.groupby("ADIDU")["resid"].transform("any")
    cel = cel[cel["resid"] | ~a_resid]
    cel["part"] = 1 / cel.groupby("ADIDU")["cx"].transform("size")
    cel = cel.merge(ad[["ADIDU", "Population_2021", "NOM_MUN"]], on="ADIDU")
    cel["pop"] = cel["part"] * cel["Population_2021"]

    pop = cel.groupby(["cx", "cy"])["pop"].sum().reset_index()
    pop.to_csv(SORTIE, index=False)

    total = ad.groupby("NOM_MUN")["Population_2021"].sum()
    reparti = cel.groupby("NOM_MUN")["pop"].sum()
    print("population 2021 des AD :", total.to_dict())
    print("répartie sur les cellules :", reparti.round().to_dict())
    print(f"{len(pop)} cellules habitées")


if __name__ == "__main__":
    main()
