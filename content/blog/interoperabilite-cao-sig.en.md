---
title: "From DWG to geodatabase: five CAD–GIS interoperability traps"
description: "What actually breaks when converting CAD drawings into GIS layers, and how to prevent it when designing the pipeline."
date: "2026-05-18"
tags: ["CAD", "GIS", "FME", "Interoperability"]
---

Getting an AutoCAD drawing to talk to a geodatabase sounds simple: a DWG holds geometry, a GIS stores geometry. In practice, the conversion almost always fails in the same place — not on the geometry itself, but on everything surrounding it.

Here are the five traps I hit consistently on infrastructure mandates, and how to defuse them.

## 1. A layer is not an attribute

In CAD, semantic information lives in the layer name: `WM-PIPE-150-PVC`. In GIS, it has to live in separate fields: diameter, material, network type.

The temptation is to create one GIS layer per CAD layer. That is a mistake: you end up with forty layers where one layer with four attributes would do. The right move is to write an explicit **mapping table**, versioned alongside the project:

```
WM-PIPE-150-PVC  →  network=water, diameter=150, material=PVC
```

That table becomes the contract between the drafter and the GIS analyst. Without it, every new batch of drawings starts from scratch.

## 2. The missing coordinate system

A DWG carries no coordinate reference system. Units are floating-point numbers in an abstract space. The file might be in MTM zone 8, UTM 18N, or an arbitrary local system whose origin is the corner of a building.

Always verify before converting: take three known points from the drawing and compare them against a reference orthophoto. A constant offset points to a translation; an offset that grows with distance points to a scale factor or projection problem.

## 3. Polylines that do not close

A drafter traces a building footprint by eye. Visually, it is closed. Numerically, 0.003 m separates the first vertex from the last.

CAD rendering does not care. Polygon conversion does — or worse, it succeeds and produces an invalid geometry that will contaminate every downstream analysis.

**Fix:** apply an explicit closing tolerance at conversion time, then validate systematically. Never trust the visual appearance of a drawing.

## 4. Blocks and compound entities

Blocks, hatches and dimensions have no direct GIS equivalent. A "manhole" block inserted 400 times is a repeated reference in CAD; in GIS it must become 400 distinct point features, each carrying the attributes of its insertion.

Decide explicitly, up front, what happens to every entity type: converted, ignored, or handled separately. Whatever is not decided will be lost silently.

## 5. No rejection log

This is the most expensive trap. A conversion pipeline that processes 10,000 features and silently drops 143 of them produces a deliverable that *looks* correct.

Every conversion pipeline must produce two outputs: the converted data **and** a rejection log listing each discarded feature with its identifier and the reason it was dropped. On a recent mandate, that log revealed that 8% of the pipes in one sector had no diameter recorded at all — invisible otherwise, and decisive for the client.

## The takeaway

CAD–GIS interoperability is not a file format problem. It is a **data model** problem: CAD describes a drawing, GIS describes a territory. Conversion means rebuilding the semantic information the drawing never explicitly carried.

Spend the time on the mapping table and the rejection log. The rest is plumbing.
