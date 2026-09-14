"""
Lac Saint-Charles — precálculo del lab.

Lee las capas de trabajo del taller (`geodata/.../99-travail.gpkg`) y escribe
UN solo GeoJSON en `public/data/`, en EPSG:4326, aligerado para la web.

    python scripts/analysis/lac-saint-charles.py

Requiere GDAL/OGR. En Windows, el que trae QGIS sirve:

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/lac-saint-charles.py

Por qué un solo archivo y no tres: cada petición cuesta un viaje de red, y el
lab necesita las tres capas a la vez. Un `FeatureCollection` con una propiedad
`couche` se filtra en MapLibre con un `filter`, sin coste.

Contrato con el sitio: el nombre lleva la versión, y un archivo publicado NUNCA
cambia de contenido (ver `public/data/README.md`). Para corregir un dato se
escribe `-v2` y se cambia la ruta en `src/labs/lac-saint-charles.ts`.
"""

import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TALLER = os.path.join(RAIZ, "geodata", "2026-09-lac-saint-charles")
GPKG = os.path.join(TALLER, "10-travail", "99-travail.gpkg")
POBLACION = os.path.join(TALLER, "30-export", "lac-st-charles-population-v1.csv")
SALIDA = os.path.join(RAIZ, "public", "data", "lac-st-charles-v5.geojson")

# 4 decimales ≈ 11 m. Suficiente a zoom 13, que es el máximo del lab.
DECIMALES = 4

# Municipios del bassin: color según su relación con el agua, no su identidad.
# Es lo que hace el mapa legible sin leyenda — quien bebe en verde, quien
# decide sin beber en rojo.
BEBE = {"Québec"}

# Las cuatro municipalidades servidas por la toma de agua, segun la Ville de
# Quebec. Tres de ellas estan enteramente fuera de la cuenca: beben un agua
# cuyo territorio no administran.
DESSERVIES = {"Québec", "Saint-Augustin-de-Desmaures", "L'Ancienne-Lorette",
              "Wendake"}


def ogr(*args):
    """Llama a ogr2ogr/ogrinfo, prefiriendo el de QGIS si está instalado."""
    exe = args[0]
    for base in (
        r"C:\Program Files\QGIS 3.44.14\bin",
        r"C:\Program Files\QGIS 3.14\bin",
    ):
        cand = os.path.join(base, exe + ".exe")
        if os.path.exists(cand):
            args = (cand,) + args[1:]
            break
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8",
                       errors="replace")
    if r.returncode != 0:
        raise SystemExit("%s falló:\n%s" % (exe, r.stderr[:800]))
    return r.stdout


def exportar(capa, sql):
    """Extrae una capa del GPKG a GeoJSON en memoria, reproyectada a 4326."""
    tmp = os.path.join(TALLER, "10-travail", "_tmp-export.geojson")
    if os.path.exists(tmp):
        os.remove(tmp)
    ogr("ogr2ogr", "-f", "GeoJSON", tmp, GPKG,
        "-t_srs", "EPSG:4326",
        "-lco", "COORDINATE_PRECISION=%d" % DECIMALES,
        "-dialect", "SQLITE", "-sql", sql)
    with open(tmp, encoding="utf-8") as f:
        datos = json.load(f)
    os.remove(tmp)
    return datos["features"]


def punto_interior(geom):
    """
    Un point posé DANS la plus grande partie d'une géométrie.

    Pourquoi ce n'est pas un détail : une municipalité est ici un MultiPolygon —
    Saint-Gabriel-de-Valcartier en compte quatre morceaux. MapLibre étiquette
    chaque morceau, donc son nom s'écrirait quatre fois. On produit donc un
    point par entité, et les étiquettes se posent dessus.

    Le centroïde d'un polygone concave peut tomber hors de lui ; on prend le
    milieu de la plus grande partie, ce qui suffit à cette échelle et évite une
    dépendance à Shapely.
    """
    partes = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]

    def aire(anillo):
        s = 0.0
        for i in range(len(anillo) - 1):
            s += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1]
        return abs(s) / 2

    mayor = max(partes, key=lambda p: aire(p[0]))[0]
    xs = [c[0] for c in mayor]
    ys = [c[1] for c in mayor]
    return [round((min(xs) + max(xs)) / 2, DECIMALES),
            round((min(ys) + max(ys)) / 2, DECIMALES)]


def leer_poblacion():
    """CSV → {municipio: {año: habitantes}}, y tasa de crecimiento."""
    import csv
    series = {}
    with open(POBLACION, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            series.setdefault(r["municipalite"], {})[r["annee"]] = int(r["population"])
    return series


def main():
    if not os.path.exists(GPKG):
        raise SystemExit("falta %s — correr primero el trabajo en QGIS" % GPKG)

    series = leer_poblacion()
    rasgos = []

    # --- 1. Las partes del bassin por municipio -----------------------------
    # La capa que porta el argumento central. `part_km2` da la altura de la
    # extrusión; `pct` es lo que se lee en el tooltip.
    total = None
    partes = exportar("bassin_x_munic", """
        SELECT geom, MUS_CO_GEO, MUS_NM_MUN, MUS_NM_MRC, part_km2
        FROM bassin_x_munic ORDER BY part_km2 DESC
    """)
    total = sum(f["properties"]["part_km2"] for f in partes)

    for f in partes:
        p = f["properties"]
        nombre = p["MUS_NM_MUN"]
        serie = series.get(nombre, {})
        annos = sorted(serie)
        pob_ini = serie.get(annos[0]) if annos else None
        pob_fin = serie.get(annos[-1]) if annos else None

        f["properties"] = {
            "couche": "bassin_municipalite",
            "code": p["MUS_CO_GEO"],
            "nom": nombre,
            "mrc": p["MUS_NM_MRC"],
            "part_km2": round(p["part_km2"], 2),
            "pct": round(100 * p["part_km2"] / total, 1),
            "boit": nombre in BEBE,
            # Serie completa: el acto 3 la anima año por año.
            "population": {a: serie[a] for a in annos} if annos else None,
            "pop_debut": pob_ini,
            "pop_fin": pob_fin,
            "croissance_pct": (round(100 * (pob_fin - pob_ini) / pob_ini, 1)
                               if pob_ini else None),
        }
        rasgos.append(f)

        # Un point d'étiquette par municipalité — voir `punto_interior`.
        rasgos.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": punto_interior(f["geometry"])},
            "properties": {
                "couche": "etiquette_municipalite",
                "nom": nombre,
                "pct": f["properties"]["pct"],
                "boit": f["properties"]["boit"],
                "croissance_pct": f["properties"]["croissance_pct"],
            },
        })

    # --- 1 bis. Las municipalidades COMPLETAS -------------------------------
    #
    # No solo su trozo dentro de la cuenca. Dibujadas en trazo punteado, sin
    # relleno, muestran algo que el recorte oculta: Stoneham controla el 79 %
    # del bassin, pero el bassin no es más que una parte de Stoneham. Y las
    # municipalidades servidas — L'Ancienne-Lorette, Wendake,
    # Saint-Augustin-de-Desmaures — están enteramente FUERA: beben un agua
    # cuyo territorio no tocan.
    #
    # Es la ilustración más directa de la tesis.
    completas = exportar("municipalites", """
        SELECT geom, MUS_CO_GEO, MUS_NM_MUN, MUS_NM_MRC,
               ROUND(ST_Area(geom)/1000000.0, 1) AS superficie_km2
        FROM municipalites
    """)
    dans_bassin = {f["properties"]["code"] for f in rasgos
                   if f["properties"]["couche"] == "bassin_municipalite"}

    for f in completas:
        p = f["properties"]
        nombre = p["MUS_NM_MUN"]
        serie = series.get(nombre, {})
        annos = sorted(serie)

        f["properties"] = {
            "couche": "municipalite_entiere",
            "code": p["MUS_CO_GEO"],
            "nom": nombre,
            "mrc": p["MUS_NM_MRC"],
            "superficie_km2": p["superficie_km2"],
            "dans_bassin": p["MUS_CO_GEO"] in dans_bassin,
            "boit": nombre in DESSERVIES,
            # La población de las municipalidades servidas es el otro lado del
            # argumento: son consumidores de un agua cuyo territorio, para tres
            # de ellas, no administran en absoluto.
            "population": {a: serie[a] for a in annos} if annos else None,
            "pop_fin": serie.get(annos[-1]) if annos else None,
            "croissance_pct": (
                round(100 * (serie[annos[-1]] - serie[annos[0]]) / serie[annos[0]], 1)
                if annos and serie[annos[0]] else None
            ),
            # Ce qui résume le paradoxe en un mot, lisible dans l'infobulle.
            "role": (
                "boit et décide" if nombre in DESSERVIES
                and p["MUS_CO_GEO"] in dans_bassin
                else "boit sans décider" if nombre in DESSERVIES
                else "décide sans boire"
            ),
        }
        rasgos.append(f)

    # --- 2. Los 18 lagos ----------------------------------------------------
    # `principal` marca el único que alimenta la toma de agua: es la asimetría
    # que el acto 2 pone en escena.
    lagos = exportar("lacs_polygones", """
        SELECT geom, NO_LAC, TOPONYME, sup_ha
        FROM lacs_polygones ORDER BY sup_ha DESC
    """)
    # Sur quelle(s) municipalité(s) chaque lac repose — c'est-à-dire qui décide
    # de ses rives. Le lac Saint-Charles lui-même est partagé entre Québec et
    # Stoneham-et-Tewkesbury : le plan d'eau de la prise d'eau est déjà, à lui
    # seul, une frontière administrative.
    rives = {}
    for ligne in ogr(
        "ogrinfo", "-dialect", "SQLITE", "-sql",
        "SELECT l.NO_LAC AS n, m.MUS_NM_MUN AS m FROM lacs_polygones l "
        "JOIN municipalites m ON ST_Intersects(l.geom, m.geom)",
        GPKG,
    ).splitlines():
        if "n (String) = " in ligne:
            cle = ligne.split("= ", 1)[1].strip()
        elif "m (String) = " in ligne:
            rives.setdefault(cle, []).append(ligne.split("= ", 1)[1].strip())

    total_lacs = sum(f["properties"]["sup_ha"] for f in lagos)
    orden = sorted(lagos, key=lambda f: -f["properties"]["sup_ha"])
    rang = {f["properties"]["NO_LAC"]: i + 1 for i, f in enumerate(orden)}

    for f in lagos:
        p = f["properties"]
        principal = p["NO_LAC"] == "01067"
        f["properties"] = {
            "couche": "lac",
            "no_lac": p["NO_LAC"],
            "nom": p["TOPONYME"] or None,
            "superficie_ha": round(p["sup_ha"], 2),
            "principal": principal,
            # Ce qui manquait à l'infobulle : un lac isolé ne dit rien, sa
            # place dans l'ensemble dit tout. Le lac principal occupe 65 % de
            # la surface lacustre du bassin ; les dix-sept autres se partagent
            # le tiers restant — l'asymétrie est le propos.
            "rang": rang[p["NO_LAC"]],
            "part_lacs_pct": round(100 * p["sup_ha"] / total_lacs, 1),
            # La municipalité où il se trouve : elle dit qui décide de ses
            # rives. Renseignée par recoupement plus bas.
            "suivi": "oui" if principal else "non documenté",
            "rives": ", ".join(sorted(rives.get(p["NO_LAC"], []))) or None,
            "partage": len(rives.get(p["NO_LAC"], [])) > 1,
        }
        rasgos.append(f)

        if f["properties"]["principal"]:
            rasgos.append({
                "type": "Feature",
                "geometry": {"type": "Point",
                             "coordinates": punto_interior(f["geometry"])},
                "properties": {
                    "couche": "etiquette_lac",
                    "nom": f["properties"]["nom"],
                    "superficie_ha": f["properties"]["superficie_ha"],
                },
            })

    # --- 3. El contorno del bassin ------------------------------------------
    contorno = exportar("bassin_retenu", """
        SELECT geom, NO_BQMA, superficie_km2 FROM bassin_retenu
    """)
    for f in contorno:
        p = f["properties"]
        f["properties"] = {
            "couche": "bassin",
            "code": p["NO_BQMA"],
            "superficie_km2": round(p["superficie_km2"], 2),
        }
        rasgos.append(f)

    coleccion = {
        "type": "FeatureCollection",
        # Bloque de trazabilidad: qué script, cuándo, con qué fuentes. Sin él,
        # un GeoJSON suelto en seis meses no se sabe de dónde salió.
        "metadata": {
            "titre": "Lac Saint-Charles — bassin versant, parts municipales et lacs",
            "genere_par": "scripts/analysis/lac-saint-charles.py",
            "atelier": "geodata/2026-09-lac-saint-charles/",
            "srs": "EPSG:4326",
            "precision_coordonnees": "%d décimales (~11 m)" % DECIMALES,
            "bassin_retenu": "05090041",
            "sources": [
                "MELCCFP — Aires de drainage et bassins versants (CC-BY 4.0)",
                "MRNF — Découpages administratifs SDA 1/20 000 (CC-BY 4.0)",
                "MRNF — Géobase du réseau hydrographique du Québec (CC-BY 4.0)",
                "ISQ — Estimations de la population des municipalités 2001-2025",
            ],
            "avertissement": (
                "Les taux de croissance sont municipaux, pas « dans le bassin » : "
                "une municipalité n'est pas entièrement comprise dans le bassin "
                "versant."
            ),
        },
        "features": rasgos,
    }

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(coleccion, f, ensure_ascii=False, separators=(",", ":"))

    peso = os.path.getsize(SALIDA) / 1024
    print("escrito : %s" % SALIDA)
    print("  %d entidades — %.0f Ko" % (len(rasgos), peso))
    print("  %d municipios, %d lagos, %d bassin" %
          (len(partes), len(lagos), len(contorno)))
    if peso > 500:
        print("  ⚠ supera 500 Ko — ver la tabla de public/data/README.md")


if __name__ == "__main__":
    sys.exit(main())
