---
title: "Who decides about the water Québec drinks"
description: "The Lac Saint-Charles watershed supplies 300,000 people. The city that drinks its water controls less than 15% of the territory that produces it."
date: "2026-09-14"
category: "lab"
tools: ["QGIS", "Python", "MapLibre GL JS", "GeoJSON"]
storyMapUrl: null
lab: "lac-saint-charles"
cover: null
---

Lac Saint-Charles supplies drinking water to more than 300,000 people — Québec, Saint-Augustin-de-Desmaures, L'Ancienne-Lorette and Wendake. The intake sits eleven kilometres downstream of the lake, on the Saint-Charles river.

Its watershed covers about 170 km². **Québec controls 14.9% of it.**

The rest belongs to four municipalities that do not drink this water. One of them, Stoneham-et-Tewkesbury, controls **79.3%** on its own.

## The territory that decides is not the one that drinks

| Municipality | Share of watershed | RCM | Drinks this water |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | 79.3% | La Jacques-Cartier | no |
| Québec | 14.9% | Québec | **yes** |
| Lac-Beauport | 2.9% | La Jacques-Cartier | no |
| Saint-Gabriel-de-Valcartier | 1.7% | La Jacques-Cartier | no |
| Lac-Delage | 1.2% | La Jacques-Cartier | no |

An administrative detail deepens the split: **85.1% of the watershed falls under a different RCM** than the one consuming the water. The line between who decides and who drinks is also an upper-tier boundary.

What gets built on that 85% — subdivisions, roads, septic systems — is decided in municipal councils where the water drinkers hold no seat.

## Three municipalities drink without deciding

Four municipalities are served by the intake. **Three of them lie entirely outside the watershed**: Saint-Augustin-de-Desmaures, L'Ancienne-Lorette and Wendake drink water whose territory they do not govern at all.

Only Québec appears in both lists — those who decide and those who drink. The watershed's four other municipalities decide without drinking.

| Role | Municipalities |
| --- | --- |
| Drinks and decides | Québec |
| Drinks without deciding | Saint-Augustin-de-Desmaures, L'Ancienne-Lorette, Wendake |
| Decides without drinking | Stoneham-et-Tewkesbury, Lac-Beauport, Saint-Gabriel-de-Valcartier, Lac-Delage |

## Eighteen lakes, one intake

The watershed holds eighteen mapped lakes, from Lac Saint-Charles (351 ha) down to Étang Bellevue (0.55 ha). The main lake accounts for 65% of the lake surface; the other seventeen share the remaining third.

Only one feeds the drinking water intake. It is also the only one whose monitoring is continuously documented.

## Pressure is rising where control lies elsewhere

Between 2001 and 2025, the watershed municipalities did not grow at the same pace.

| Municipality | 2001 | 2025 | Growth |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | 5,346 | 10,147 | **+89.8%** |
| Lac-Delage | 454 | 810 | +78.4% |
| Lac-Beauport | 5,655 | 8,524 | +50.7% |
| Saint-Gabriel-de-Valcartier | 2,318 | 3,400 | +46.7% |
| Québec | 486,439 | 592,658 | +21.8% |

The municipality controlling 79.3% of the watershed nearly doubled its population in twenty-four years — four times faster than the city that drinks the water.

One caveat, and it matters: **these rates are municipal, not "within the watershed"**. A municipality is not entirely contained in the watershed, and its growth may occur elsewhere on its territory. The indicator stays indirect.

## What the map does not say

Nathalie Gravel's research (Université Laval) is about this very lake. She documents the failure of earlier attempts at participatory governance, a democratic deficit, and tensions between municipal staff and lakeside residents over wastewater reduction and treatment costs.

Her question is not whether the territory is badly divided — it is why **the power configuration does not shift**.

This map shows why shared governance is structurally difficult. It does not say why it fails to take hold. That is a different inquiry, and it is hers.

> Nathalie Gravel, *Developing Favorable Grounds for Participatory Water Governance and the Rise of Eco-Citizenship, the Case of Lake St. Charles, Quebec*. Paper presented at the 2025 Annual Conference of the Canadian Association of Geographers, session CS112, 21 May 2025.

## Method

All data comes from open portals, under CC-BY 4.0.

**The watershed** — Lac Saint-Charles does not appear in the MELCCFP lake watershed layer: two entities carry that name, both elsewhere in Québec, one of them 3.64 km² — matching the published area of our lake exactly. The trap was complete. The correct outline is a station drainage area: `05090041`, 170.01 km². Two candidate areas contained the lake, 1.18 ha apart out of 17,000 — indistinguishable at this scale.

**Measurement discrepancies** — the watershed is 169 km² according to Agiro, 170.01 km² by calculation, 165.76 km² in the LCE database. The lake is 351 ha (GRHQ), 360 ha (Agiro) or 365 ha (municipal hydrography). Three public producers, the same object, up to 4% apart. This is not an anomaly: the outline depends on the closing point chosen and on survey scale.

**The chain** — exploration and verification in QGIS, intersections and export in Python, GeoJSON trimmed to four decimals (≈ 11 m), rendering in MapLibre. The basemap comes from OpenStreetMap via CARTO, token-free: the map would lose its backdrop if the service vanished, never its data.

**Sources** — MELCCFP (drainage areas), MRNF (SDA administrative boundaries 1/20,000, Québec hydrographic network geobase), ISQ (population estimates 2001-2025), Ville de Québec (hydrography).

**Colours** — the palette was verified for colour-vision deficiency. The green/red pair considered first failed the check: under deuteranopia the two hues merged — and that is the pair carrying the argument.
