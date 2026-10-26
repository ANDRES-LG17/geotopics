"""
Desiertos de acceso — medición del territorio agrícola (BDPPAD).

    "C:\\Program Files\\QGIS 3.44.14\\bin\\python-qgis-ltr.bat" scripts/analysis/deserts-acces.py medir

Primera etapa del proyecto: antes de dibujar nada, saber qué contiene la
BDPPAD 2025 — cuántas parcelas tienen un cultivo declarado, cuánta superficie
es hortícola, y cómo se reparte entre regiones. El resultado se escribe en
`10-travail/01-medicion-bdppad.json` y se resume en consola.

Lee el shapefile directamente dentro del zip de `00-brut/`: el original no se
toca, ni se descomprime.

LAS PARCELAS `MUL` — una parcela puede llevar hasta quince cultivos, cada uno
con su porcentaje, pero sin posición dentro de la parcela (guía FADQ, § 1.4.3).
Su grupo es entonces `MUL`, que no dice nada. Para repartirlas se reconstruye
la tabla código → grupo a partir de las parcelas de cultivo único, donde
`GROPRO` sí es el grupo del cultivo; luego cada fracción de una parcela `MUL`
cuenta en su grupo, en proporción de su porcentaje.

Dependencias: geopandas, shapely, pyproj — las trae el Python de QGIS.
"""

import json
import os
import sys
import zipfile
from collections import defaultdict

import geopandas as gpd
import pandas as pd

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TALLER = os.path.join(RAIZ, "geodata", "03-deserts-acces")
BDPPAD = os.path.join(TALLER, "00-brut", "fadq", "BDPPAD_V03_2025.zip")
SDA = os.path.join(TALLER, "00-brut", "mrnf", "SDA.gpkg.zip")
TRABAJO = os.path.join(TALLER, "10-travail")

#: SCR de trabajo: Québec Lambert. La extensión es provincial, un huso MTM no
#: basta, y las superficies deben medirse en un sistema proyectado.
SCR = "EPSG:32198"

#: Grupos de producción hortícolas (guía FADQ, tabla 3). Es donde se concentra
#: la mano de obra temporal: cosecha a mano, temporadas cortas, mucha gente.
#: Las grandes culturas (maíz, soya, cereales, forraje) están mecanizadas.
HORTICOLAS = {
    "CMA",  # CMA-Multiples
    "DIV",  # CMA-Légumes divers
    "FEU",  # CMA-Feuillus
    "RAC",  # CMA-Racines
    "VIV",  # CMA-Vivaces
    "FRU",  # CMA-Fruits
    "LDT",  # Légumes de transformation
    "PDT",  # Pommes de terre
    "POM",  # Pommes
    "PTF",  # Petits fruits
}

#: Grupos que no son un cultivo: se cuentan aparte, no como superficie
#: cultivada de un tipo conocido.
NO_CULTIVO = {"INC", "AUT"}

N_CODIGOS = 15


def leer_bdppad():
    """Las parcelas 2025, con solo los campos que la medición necesita."""
    columnas = ["SUPHEC", "GROPRO", "NBPRO"]
    for i in range(1, N_CODIGOS + 1):
        columnas += [f"CODPRO{i}", f"PRCSUPPR{i}"]
    gdf = gpd.read_file(f"zip://{BDPPAD}", columns=columnas, engine="pyogrio")
    return gdf


def tabla_codigo_grupo(df):
    """Código de cultivo → grupo, deducido de las parcelas de cultivo único."""
    unico = df[(df["NBPRO"] == 1) & df["CODPRO1"].notna() & (df["GROPRO"] != "MUL")]
    conteo = unico.groupby(["CODPRO1", "GROPRO"]).size().reset_index(name="n")
    # Un código debería caer siempre en el mismo grupo; si no, gana el mayoritario.
    conteo = conteo.sort_values("n", ascending=False).drop_duplicates("CODPRO1")
    return dict(zip(conteo["CODPRO1"], conteo["GROPRO"]))


def superficie_por_grupo(df, codigo_grupo):
    """Hectáreas por grupo, repartiendo las parcelas MUL según sus porcentajes."""
    ha = defaultdict(float)
    simple = df[df["GROPRO"] != "MUL"]
    for grupo, sup in simple.groupby("GROPRO")["SUPHEC"].sum().items():
        ha[grupo] += sup

    mul = df[df["GROPRO"] == "MUL"]
    sin_grupo = 0.0
    for i in range(1, N_CODIGOS + 1):
        cod, prc = mul[f"CODPRO{i}"], mul[f"PRCSUPPR{i}"].fillna(0)
        fraccion = mul["SUPHEC"] * prc / 100
        grupos = cod.map(codigo_grupo)
        for grupo, sup in fraccion.groupby(grupos).sum().items():
            ha[grupo] += sup
        sin_grupo += fraccion[cod.notna() & grupos.isna()].sum()
    if sin_grupo:
        ha["(código MUL sin grupo)"] += sin_grupo
    return dict(ha)


def medir():
    print("Leyendo la BDPPAD 2025…", flush=True)
    gdf = leer_bdppad()
    print(f"  {len(gdf):,} parcelas · SCR {gdf.crs}", flush=True)

    con_cultivo = gdf["CODPRO1"].notna() | gdf["GROPRO"].notna()
    declaradas = gdf[con_cultivo]
    codigo_grupo = tabla_codigo_grupo(declaradas)
    ha_grupo = superficie_por_grupo(declaradas, codigo_grupo)

    ha_horti = sum(v for k, v in ha_grupo.items() if k in HORTICOLAS)
    ha_no_cultivo = sum(v for k, v in ha_grupo.items() if k in NO_CULTIVO)
    ha_declarada = declaradas["SUPHEC"].sum()

    resultado = {
        "fuente": "BDPPAD v03, año 2025 (FADQ), extracción 2026-10-12",
        "parcelas": {
            "total": int(len(gdf)),
            "con_cultivo_declarado": int(con_cultivo.sum()),
            "sin_cultivo": int((~con_cultivo).sum()),
        },
        "hectareas": {
            "total": round(float(gdf["SUPHEC"].sum())),
            "con_cultivo_declarado": round(float(ha_declarada)),
            "horticola": round(float(ha_horti)),
            "inc_aut": round(float(ha_no_cultivo)),
        },
        "hectareas_por_grupo": {k: round(float(v)) for k, v in
                                sorted(ha_grupo.items(), key=lambda kv: -kv[1])},
        "codigos_sin_grupo": sorted(
            set(pd.concat([declaradas[f"CODPRO{i}"] for i in range(1, N_CODIGOS + 1)])
                .dropna()) - set(codigo_grupo)),
    }

    if zipfile.is_zipfile(SDA):
        resultado["por_region"] = medir_por_region(gdf[con_cultivo], codigo_grupo)
    else:
        print("  (SDA ausente o incompleto: se omite el reparto por región)")

    os.makedirs(TRABAJO, exist_ok=True)
    salida = os.path.join(TRABAJO, "01-medicion-bdppad.json")
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    print(f"\n→ {os.path.relpath(salida, RAIZ)}")


def medir_por_region(gdf, codigo_grupo):
    """Hectáreas cultivadas y hortícolas por región administrativa."""
    regiones = gpd.read_file(f"zip://{SDA}", layer="regio_s", engine="pyogrio")
    regiones = regiones.to_crs(SCR)[["RES_NM_REG", "geometry"]]
    puntos = gdf.to_crs(SCR)
    puntos["geometry"] = puntos.geometry.representative_point()
    unido = gpd.sjoin(puntos, regiones, how="left", predicate="within")
    unido["RES_NM_REG"] = unido["RES_NM_REG"].fillna("(fuera de Quebec)")

    filas = {}
    for region, sub in unido.groupby("RES_NM_REG"):
        ha = superficie_por_grupo(sub, codigo_grupo)
        filas[region] = {
            "parcelas": int(len(sub)),
            "ha_cultivo": round(float(sub["SUPHEC"].sum())),
            "ha_horticola": round(float(sum(v for k, v in ha.items() if k in HORTICOLAS))),
        }
    return dict(sorted(filas.items(), key=lambda kv: -kv[1]["ha_horticola"]))


if __name__ == "__main__":
    etapa = sys.argv[1] if len(sys.argv) > 1 else "medir"
    {"medir": medir}[etapa]()
