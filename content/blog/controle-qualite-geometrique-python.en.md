---
title: "Validating geometric quality with Python"
description: "A minimal validation script that catches invalid geometries, duplicates and micro-segments before they pollute an analysis."
date: "2026-03-09"
tags: ["Python", "Quality control", "Shapely", "GIS"]
---

A spatial analysis is only as good as its input data. Yet quality control is still often a quick visual inspection in the GIS software — the equivalent of proofreading a spreadsheet by scrolling past it.

Here is the systematic, scripted approach I run before any serious analysis.

## The four defects that cost the most

1. **Invalid geometries** — self-intersections, badly oriented rings. They make overlay operations fail, sometimes silently.
2. **Geometric duplicates** — the same feature digitized twice. It doubles areas in every zonal statistics calculation.
3. **Micro-segments** — millimetre-long segments left over from sloppy digitizing. They inflate perimeters and slow processing down.
4. **Empty or null geometries** — usually the residue of a failed upstream conversion.

## The base script

```python
import geopandas as gpd
from shapely.validation import explain_validity

def validate(path, tolerance=0.01):
    """Return a quality report for a vector layer."""
    gdf = gpd.read_file(path)
    report = {}

    # 1. Null or empty geometries
    empties = gdf[gdf.geometry.isna() | gdf.geometry.is_empty]
    report["empty"] = list(empties.index)

    # 2. Invalid geometries, with the exact reason
    invalid = gdf[~gdf.geometry.is_valid & gdf.geometry.notna()]
    report["invalid"] = {
        i: explain_validity(g) for i, g in invalid.geometry.items()
    }

    # 3. Duplicates: compare the normalized WKT representation
    keys = gdf.geometry.apply(lambda g: g.wkt if g else None)
    report["duplicates"] = list(gdf[keys.duplicated(keep=False)].index)

    # 4. Micro-segments below survey tolerance
    def has_micro_segments(geom):
        if geom is None or geom.is_empty:
            return False
        coords = list(geom.exterior.coords) if geom.geom_type == "Polygon" \
            else list(geom.coords)
        return any(
            ((coords[i][0] - coords[i + 1][0]) ** 2
             + (coords[i][1] - coords[i + 1][1]) ** 2) ** 0.5 < tolerance
            for i in range(len(coords) - 1)
        )

    report["micro_segments"] = [
        i for i, g in gdf.geometry.items() if has_micro_segments(g)
    ]

    return report
```

## Choosing the right tolerance

This is where people go wrong most often. Tolerance is not an arbitrary number: it must match the **actual precision of the survey**.

- Differential GNSS survey: 0.02 m
- Total station survey: 0.005 m
- Digitizing on 20 cm orthophoto: 0.20 m

Setting a tolerance finer than survey precision flags measurement noise as defects. Setting it coarser collapses vertices that describe real geometry.

## Wiring validation into the workflow

A report nobody reads is worthless. Two rules:

- The script runs **automatically** on every data import, not on request.
- It produces actionable output: a GeoJSON of the offending features, openable directly in QGIS for correction.

```python
report = validate("network.gpkg", tolerance=0.02)
indices = {i for values in report.values()
           for i in (values if isinstance(values, list) else values.keys())}

if indices:
    gpd.read_file("network.gpkg").loc[sorted(indices)].to_file(
        "to_fix.geojson", driver="GeoJSON"
    )
```

The analyst opens `to_fix.geojson`, corrects, re-runs. The loop is short, and that is what makes it sustainable.

## The takeaway

Quality control is not an end-of-project step: it is a **gate**. Data that has not passed validation should never reach the analysis phase.

The script costs half a day to write. Re-running an analysis because a layer contained duplicates costs weeks.
