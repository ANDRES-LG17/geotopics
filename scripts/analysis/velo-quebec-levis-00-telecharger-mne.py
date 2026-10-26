"""
Télécharge le relief de Québec–Lévis par lecture partielle (streaming) des
COG de Ressources naturelles Canada. Seuls les blocs de la zone sont lus.

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-00-telecharger-mne.py

Écrit dans 00-brut/nrcan/ — c'est un téléchargement, pas un traitement : SCR
d'origine conservé (EPSG:3979), aucune modification des valeurs.

    hrdem-mosaic-1m-dtm-8m-quebec-levis.tif   HRDEM (lidar), aperçu à 8 m
    mrdem-30-dtm-quebec-levis.tif             MRDEM-30, pour combler les trous
"""

import os

import geopandas as gpd
from osgeo import gdal

gdal.UseExceptions()
gdal.SetConfigOption("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
SORTIE = os.path.join(ICI, "..", "00-brut", "nrcan")
ZONE = os.path.join(ICI, "01-reseau-classe-epsg2949.gpkg")

S3 = "/vsicurl/https://canelevation-dem.s3.ca-central-1.amazonaws.com/"
SOURCES = {
    "hrdem-mosaic-1m-dtm-8m-quebec-levis.tif": (S3 + "hrdem-mosaic-1m/9_3-mosaic-1m-dtm.tif", 8),
    "mrdem-30-dtm-quebec-levis.tif": (S3 + "mrdem-30/mrdem-30-dtm.tif", 30),
}
MARGE = 1500  # m autour de la zone d'étude


def main():
    os.makedirs(SORTIE, exist_ok=True)
    zone = gpd.read_file(ZONE, layer="zone").to_crs("EPSG:3979")
    xmin, ymin, xmax, ymax = zone.total_bounds
    fenetre = [xmin - MARGE, ymax + MARGE, xmax + MARGE, ymin - MARGE]
    for nom, (url, res) in SOURCES.items():
        cible = os.path.join(SORTIE, nom)
        gdal.Translate(cible, url, projWin=fenetre, xRes=res, yRes=res,
                       resampleAlg="average",
                       creationOptions=["COMPRESS=DEFLATE", "PREDICTOR=3", "TILED=YES"])
        ds = gdal.Open(cible)
        print(nom, ds.RasterXSize, "x", ds.RasterYSize,
              f"{os.path.getsize(cible) / 1e6:.0f} Mo")


if __name__ == "__main__":
    main()
