---
title: "By bike, the river still cuts Québec off from Lévis"
description: "Which links are missing from the low-stress cycling network of Québec and Lévis, and how much does the Québec Bridge weigh in? Within 15 minutes, 231 residents reach the other shore today. With a widened deck, 10,747."
date: "2026-10-21"
category: "lab"
tools: ["Python", "NetworkX", "GeoPandas", "GDAL", "QGIS", "MapLibre GL JS", "OpenStreetMap"]
storyMapUrl: null
lab: "velo-quebec-levis"
cover: null
---

Québec City and Lévis have added many cycling facilities. But a network is only as good as its connections: a bike path that stops at the edge of a 50 km/h boulevard sends the cyclist back into traffic, or back home.

This lab asks one question: **which missing links, once built, would open the most of the Québec–Lévis area to a 15-minute low-stress bike trip?**

And since the two cities are treated as one, a second question follows: what is the only fixed cycling link between them worth? That link is the Québec Bridge, whose deck must be replaced, with no solution chosen yet.

## What "low-stress" means

The criterion is NACTO's **"All Ages & Abilities"** standard: a trip a 12-year-old or an older adult would make without stress. In practice:

| Facility | Low-stress? |
| --- | --- |
| Separated bike path, multi-use trail | yes |
| Street at 40 km/h or less | yes |
| Painted bike lane on a street above 40 km/h | **no** |
| Shared lane, shoulder, arterial | no |

The threshold is about **car** speed, not bike speed. A painted lane protects from nothing: the speed difference is what makes a street usable or not.

## Two shores, two speed bylaws

Speeds come from official sources. The City of Québec publishes the limit of each of its streets: the typical residential street is at **30 km/h**. Lévis publishes none and has not adopted a lower limit, so the Highway Safety Code default applies: **50 km/h**.

Under the same standard, the results diverge:

| | Québec | Lévis |
| --- | --- | --- |
| Low-stress network, today | **81%** of its length | **42%** |
| If Lévis's local streets went to 40 km/h | — | **72%** |

The gap between the shores is not first about bike paths. It is a bylaw. Lévis council said in July 2026 that it was reviewing the issue: this scenario, called D, puts a number on it.

## The missing links

The low-stress network is not a whole: it breaks into **islands**, pieces connected to one another without using a high-stress street. A missing link is the shortest high-stress connection, 30 to 300 m long, between two islands. Under 30 m, it is a street crossing, not a gap.

Each candidate is assessed on its own: if it were built, how many residents could reach new neighbours within 15 minutes on an entirely low-stress route? The ranking counts **pairs of residents**, who leaves and who is reached, so that a link to an empty corner counts for nothing.

| Rank | Link | Length | Residents who gain | Neighbours gained, on average |
| --- | --- | --- | --- | --- |
| 1 | Avenue De Gaulle | 81 m | 38,541 | 1,694 |
| 2 | Boulevard Sainte-Anne | 122 m | 36,136 | 1,385 |
| 3 | 41e Rue Ouest | 74 m | 69,278 | 667 |

Today, **no link in Lévis makes the top fifteen**. Its low-stress islands are too small for a short link to pay off: the south shore's problem is the speed of its streets, not a missing link. In scenario D, **Avenue Taniata** (62 m) and **Boulevard Guillaume-Couture** (92 m) enter the list: they then connect whole neighbourhoods to the main island.

## The Québec Bridge

The bridge sidewalk is **1.3 m** wide. Cyclists are normally expected to get off their bikes, *Le Journal de Québec* reported (12 August 2026): the 987 m are crossed on foot, in nearly **12 minutes**. Quebec's transport ministry plans to replace the deck, sidewalk included, without having chosen a solution. Widening the lane to 2.5 m is among the options; so is rebuilding it as it is.

Three states of the bridge, crossed with the speed of Lévis's streets. The figure is the number of residents of both cities who reach the other shore on a low-stress route:

| Bridge | Within 15 min | Within 30 min | Within 30 min, Lévis at 40 km/h |
| --- | --- | --- | --- |
| **Current**: 1.3 m, on foot | 231 | 26,546 | 32,959 |
| **Construction**: closed, ferry only | 0 | 990 | 990 |
| **Widened**: 2.5 m, riding | 10,747 | 66,296 | 74,459 |

Three findings:

- **within 15 minutes, a low-stress crossing does not exist today.** The twelve minutes on foot on the bridge use up the budget. A widened deck makes it possible for 10,747 people;
- **construction with no maintained crossing would cut off 96% of residents** from the other shore within 30 minutes, leaving only the areas around the ferry docks;
- **the two levers reinforce each other.** The widened deck raises the residents connected within 30 minutes from 26,546 to 66,296 (×2.5); with Lévis at 40 km/h as well, to 74,459 (×2.8). Counted as possible trips rather than residents, the effect is stronger still: ×4.3 for the deck, ×2.2 for Lévis at 40, nearly ×10 for both. A bridge is worth more when it leads onto streets where you can keep riding.

## What the model assumes

Every accessibility map rests on assumptions. Here they are, with what they cost if they are wrong.

- **Slope counts.** Unlike the tool that inspired this lab, terrain is included: 20 km/h on the flat, reduced by 1.44 km/h per % of climb and increased by 0.86 km/h per % of descent (Parkin and Rotheram, 2010), on Natural Resources Canada's HRDEM lidar terrain model. These coefficients come from experienced cyclists in Leeds: a beginner climbs more slowly.
- **Crossing an arterial costs nothing.** The graph does not penalise crossing a boulevard at an intersection. The real network is therefore less continuous than the model.
- **Population is estimated.** The 2021 census population of each dissemination area is spread over its residential streets. The totals are exact, the fine distribution is not.
- **The ferry is an assumption**: 12 minutes crossing and a 15-minute average wait. To be confirmed against the Société des traversiers du Québec timetable.
- **Each link is assessed on its own.** Building the first two does not yield the sum of their gains.
- **OpenStreetMap is not perfect.** It covers 77 to 95% of the City of Québec's cycling network depending on facility type, but only 65% of Lévis's painted lanes, and less than half of its shared lanes and shoulders. The top fifteen links need checking on the ground.

## Sources and method

Network: OpenStreetMap (ODbL). Speeds and cycling networks: City of Québec and City of Lévis, via Données Québec. Terrain: HRDEM and MRDEM-30, Natural Resources Canada. Population: 2021 Census, harmonised geography from the Institut de la statistique du Québec. Municipal boundaries: MRNF.

The approach draws on [*À portée de vélo*](https://github.com/sit-pmo/portee-velo), by the GIS team of the Pôle Marennes-Oléron, adapted to a hilly metro area split by a river.

The figures are computed once, in Python, by the `scripts/analysis/velo-quebec-levis-*.py` scripts. The patch under the cursor, however, is computed on the fly: the browser receives the low-stress graph, times and slopes included, and reruns the search in a few milliseconds at each move. The GeoJSON can be downloaded below the map.
