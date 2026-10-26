"""
Construit le graphe cyclable de Québec–Lévis à partir du réseau classé, et
découpe le réseau tranquille en îlots (composantes connexes).

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/velo-quebec-levis-02-construire-graphe.py

Entrée :
    01-reseau-classe-epsg2949.gpkg   couche reseau (velo-quebec-levis-01-classer-reseau.py)

Sortie :
    02-graphe-epsg2949.gpkg          couches aretes, ilots

Une arête relie deux nœuds OSM partagés : une voie est coupée à chaque
sommet qu'elle a en commun avec une autre. Deux voies qui se croisent sans
nœud commun (pont, tunnel) ne sont pas reliées — c'est voulu.

Vitesses du vélo à plat, reprises de portée-vélo (voir JOURNAL.md) :
    revêtu 20 km/h ; non revêtu 15 km/h ; à pied 5 km/h.
    Sens interdit sur une rue à sens unique : à pied, 5 km/h.

Relief (MNT HRDEM 8 m, comblé par MRDEM-30) : chaque arête est échantillonnée
tous les 10 m, et la vitesse varie avec la pente, d'après Parkin et Rotheram
(2010, Transport Policy 17(5), tableau 2) : −1,44 km/h par % de montée,
+0,86 km/h par % de descente, entre 5 et 30 km/h. Leur modèle a été estimé
entre −8 % et +9 % ; au-delà, c'est une extrapolation. Sur un pont, le MNT donne le fond de la vallée et non le
tablier : l'altitude y est interpolée entre les deux extrémités.
"""

import os
from collections import Counter

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from osgeo import gdal
from pyproj import Transformer
from shapely.geometry import LineString

gdal.UseExceptions()

# Le script vit dans scripts/analysis/ (versionné) ; les données, dans
# geodata/04-velo-quebec-levis/ (hors git). ICI = le dossier de travail.
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICI = os.path.join(RACINE, "geodata", "04-velo-quebec-levis", "10-travail")
ENTREE = os.path.join(ICI, "01-reseau-classe-epsg2949.gpkg")
SORTIE = os.path.join(ICI, "02-graphe-epsg2949.gpkg")
NRCAN = os.path.join(ICI, "..", "00-brut", "nrcan")
HRDEM = os.path.join(NRCAN, "hrdem-mosaic-1m-dtm-8m-quebec-levis.tif")
MRDEM = os.path.join(NRCAN, "mrdem-30-dtm-quebec-levis.tif")
MNT = os.path.join(ICI, "02-mnt-8m-epsg3979.tif")
SCR = "EPSG:2949"

PAS = 10                     # m entre deux échantillons d'altitude
LISSAGE = 3                  # échantillons : moyenne glissante sur ~30 m
MONTEE, DESCENTE = 1.44, 0.86  # km/h par % de pente (Parkin et Rotheram, 2010, tab. 2)
V_MIN, V_MAX = 5, 30
PENTE_MAX = 25               # % : au-delà, c'est du bruit du MNT

V_REVETU, V_NON_REVETU, V_PIED = 20, 15, 5
NON_REVETU = {"unpaved", "gravel", "dirt", "ground", "grass", "earth", "mud",
              "sand", "pebblestone", "rock", "woodchips"}
# Le pont de Québec : voie OSM 39456261, trottoir de 1,3 m, vélo à la main.
PONT_QUEBEC = 39456261


def cle(xy):
    """Clé de nœud : coordonnées au centimètre."""
    return (round(xy[0], 2), round(xy[1], 2))


def vitesse_velo(r):
    if r["classe"] == "a_pied":
        return V_PIED
    if r["classe"] == "sentier" or r["surface"] in NON_REVETU:
        return V_NON_REVETU
    return V_REVETU


def sens(r):
    """+1 sens de la géométrie seulement, -1 sens inverse seulement, 0 les deux."""
    if r["classe"] not in ("rue_calme", "expose") or r["oneway_velo"] == "no":
        return 0
    return {"yes": 1, "1": 1, "true": 1, "-1": -1}.get(r["oneway"], 0)


def decouper(reseau):
    """Coupe chaque voie à ses sommets partagés ; renvoie la liste des arêtes."""
    compte = Counter()
    for g in reseau.geometry:
        coords = list(g.coords)
        compte.update({cle(c) for c in coords})
        compte.update([cle(coords[0]), cle(coords[-1])])  # extrémités : toujours nœuds

    aretes = []
    garder = ["osm_id", "highway", "nom", "classe", "ville", "v_auto",
              "tranquille", "tranquille_50", "tranquille_d", "pont"]
    for _, r in reseau.iterrows():
        coords = list(r.geometry.coords)
        v, s = vitesse_velo(r), sens(r)
        debut = 0
        for i in range(1, len(coords)):
            if i == len(coords) - 1 or compte[cle(coords[i])] > 1:
                morceau = LineString(coords[debut:i + 1])
                base = {k: r[k] for k in garder}
                base.update(u=cle(coords[debut]), v=cle(coords[i]), geometry=morceau,
                            longueur_m=morceau.length, v_velo=v, sens=s)
                aretes.append(base)
                debut = i
    a = gpd.GeoDataFrame(aretes, crs=SCR)
    for champ in ("tranquille", "tranquille_50", "tranquille_d"):
        a[champ] = a[champ].fillna(False).astype(bool)
    return a


def preparer_mnt():
    """HRDEM 8 m, ses trous comblés par MRDEM-30 rééchantillonné sur sa grille."""
    h = gdal.Open(HRDEM)
    gt, nx_, ny_ = h.GetGeoTransform(), h.RasterXSize, h.RasterYSize
    m = gdal.Warp("", MRDEM, format="MEM", width=nx_, height=ny_,
                  outputBounds=(gt[0], gt[3] + ny_ * gt[5], gt[0] + nx_ * gt[1], gt[3]),
                  resampleAlg="bilinear", srcNodata=-32767, dstNodata=np.nan)
    z = h.ReadAsArray().astype("float32")
    z[z <= -32767] = np.nan
    trous = np.isnan(z)
    z[trous] = m.ReadAsArray()[trous]
    out = gdal.GetDriverByName("GTiff").Create(MNT, nx_, ny_, 1, gdal.GDT_Float32,
                                               ["COMPRESS=DEFLATE", "PREDICTOR=3", "TILED=YES"])
    out.SetGeoTransform(gt)
    out.SetProjection(h.GetProjection())
    out.GetRasterBand(1).WriteArray(z)
    out.GetRasterBand(1).SetNoDataValue(np.nan)
    out = None
    print(f"MNT : {nx_} x {ny_}, {100 * trous.mean():.1f} % comblé par MRDEM-30,"
          f" {100 * np.isnan(z).mean():.1f} % encore vide")
    return z, gt


def vitesse_pente(v0, pente):
    """km/h selon la pente en % (positive = montée)."""
    v = np.where(pente > 0, v0 - MONTEE * pente, v0 + DESCENTE * -pente)
    return np.clip(v, V_MIN, V_MAX)


def temps_avec_relief(a, z, gt):
    """Minutes dans chaque sens, dénivelés et pente maximale, arête par arête."""
    vers_mnt = Transformer.from_crs(SCR, "EPSG:3979", always_xy=True)
    avant, arriere, d_plus, d_moins, p_max = [], [], [], [], []
    for geom, v0, classe, pont in zip(a.geometry, a["v_velo"], a["classe"], a["pont"]):
        l = geom.length
        n = max(2, int(np.ceil(l / PAS)) + 1)
        d = np.linspace(0, l, n)
        pts = [geom.interpolate(x) for x in d]
        x, y = vers_mnt.transform([p.x for p in pts], [p.y for p in pts])
        col = ((np.array(x) - gt[0]) / gt[1]).astype(int).clip(0, z.shape[1] - 1)
        lig = ((np.array(y) - gt[3]) / gt[5]).astype(int).clip(0, z.shape[0] - 1)
        h = z[lig, col]
        if pont is not None and pont == pont:  # pont : le MNT ne voit pas le tablier
            h = np.interp(d, [0, l], [h[0], h[-1]])
        elif n > LISSAGE:
            h = np.convolve(np.pad(h, LISSAGE // 2, mode="edge"),
                            np.ones(LISSAGE) / LISSAGE, mode="valid")
        dl = np.diff(d)
        dh = np.diff(h)
        pente = np.clip(100 * dh / np.maximum(dl, 0.1), -PENTE_MAX, PENTE_MAX)
        pente = np.nan_to_num(pente)
        if classe == "a_pied" or l < 1:
            t_av = t_ar = l / (V_PIED * 1000 / 60)
        else:
            t_av = float((dl / (vitesse_pente(v0, pente) * 1000 / 60)).sum())
            t_ar = float((dl / (vitesse_pente(v0, -pente) * 1000 / 60)).sum())
        avant.append(t_av)
        arriere.append(t_ar)
        d_plus.append(float(np.nansum(np.clip(dh, 0, None))))
        d_moins.append(float(np.nansum(np.clip(-dh, 0, None))))
        p_max.append(float(np.abs(pente).max()) if len(pente) else 0.0)
    a["min_avant"], a["min_arriere"] = avant, arriere
    a["d_plus_m"], a["d_moins_m"], a["pente_max"] = d_plus, d_moins, p_max
    # Les mêmes temps, à plat : pour mesurer ce que le relief change.
    a["min_plat"] = a["longueur_m"] / (a["v_velo"] * 1000 / 60)
    # À contresens d'un sens unique, à pied.
    pied = a["longueur_m"] / (V_PIED * 1000 / 60)
    a.loc[a["sens"] == 1, "min_arriere"] = pied
    a.loc[a["sens"] == -1, "min_avant"] = pied
    return a


def ilots(aretes, champ):
    """Numérote les composantes connexes du réseau tranquille (non orienté)."""
    g = nx.Graph()
    t = aretes[aretes[champ]]
    g.add_edges_from(zip(t["u"], t["v"]))
    numero = {}
    for i, comp in enumerate(sorted(nx.connected_components(g), key=len, reverse=True)):
        for n in comp:
            numero[n] = i
    return aretes["u"].map(numero).where(aretes[champ]).astype("Int64")


def main():
    reseau = gpd.read_file(ENTREE, layer="reseau")
    reseau = reseau[reseau["classe"] != "exclu"].reset_index(drop=True)

    aretes = decouper(reseau)
    z, gt = preparer_mnt()
    aretes = temps_avec_relief(aretes, z, gt)
    for champ, nom in (("tranquille", "ilot_a"), ("tranquille_d", "ilot_d")):
        aretes[nom] = ilots(aretes, champ)

    aretes_ecrites = aretes.copy()
    aretes_ecrites["u"] = aretes_ecrites["u"].astype(str)
    aretes_ecrites["v"] = aretes_ecrites["v"].astype(str)
    aretes_ecrites.to_file(SORTIE, layer="aretes", driver="GPKG")

    rapport(aretes)


def rapport(a):
    noeuds = set(a["u"]) | set(a["v"])
    print(f"graphe : {len(noeuds)} nœuds, {len(a)} arêtes, {a.longueur_m.sum()/1000:.0f} km\n")
    pont = a[a["osm_id"] == PONT_QUEBEC]
    print(f"pont de Québec : {len(pont)} arête(s), {pont.longueur_m.sum():.0f} m,"
          f" {pont.min_avant.sum():.1f} min à pied\n")
    velo = a[a["classe"] != "a_pied"]
    print(f"relief : temps total {velo.min_avant.sum() + velo.min_arriere.sum():.0f} min"
          f" contre {2 * velo.min_plat.sum():.0f} à plat ;"
          f" arêtes à plus de 8 % : {(velo.pente_max > 8).sum()}")
    print(velo.nlargest(8, "d_plus_m")[["nom", "longueur_m", "d_plus_m", "d_moins_m",
                                         "pente_max", "min_avant", "min_arriere"]]
          .round(1).to_string(), "\n")

    for champ, ilot in (("tranquille", "ilot_a"), ("tranquille_d", "ilot_d")):
        t = a[a[champ]]
        par_ilot = t.groupby(ilot).agg(km=("longueur_m", lambda s: s.sum() / 1000))
        villes = t.pivot_table(index=ilot, columns="ville", values="longueur_m",
                               aggfunc="sum").fillna(0).div(1000)
        par_ilot = par_ilot.join(villes).sort_values("km", ascending=False)
        total = par_ilot["km"].sum()
        print(f"== {champ} : {len(par_ilot)} îlots, {total:.0f} km")
        print(f"   le plus grand porte {100 * par_ilot.km.iloc[0] / total:.0f} %"
              f" du réseau tranquille ; îlots de moins de 1 km :"
              f" {(par_ilot.km < 1).sum()}")
        print(par_ilot.head(8).round(1).to_string())
        print(f"   îlot du pont : {pont[ilot].dropna().unique().tolist()}\n")


if __name__ == "__main__":
    main()
