---
title: "Template — entry with an interactive map"
description: "Demonstration draft: shows how a notebook entry embeds a MapLibre map fed by precomputed data."
date: "2026-08-07"
category: "lab"
tools: ["MapLibre GL JS", "Node.js", "GeoJSON"]
storyMapUrl: null
lab: "demo-isochrones"
draft: true
---

**This entry is a draft** (`draft: true`): it only exists in development and never appears on the published site. It is a template — copying it is the fastest way to start a real project.

The data shown above is **synthetic**. The travel times are made up; only the machinery is real.

## What the map demonstrates

The whole chain, end to end, with no database and no third-party service:

1. `scripts/build-demo-isochrones.mjs` computes the zones and writes a GeoJSON file into `public/data/`;
2. `src/labs/demo-isochrones.ts` describes what to do with it — layers, colours, framing, legend, source;
3. this entry's front matter calls the lab by its id: `lab: "demo-isochrones"`.

Nothing else to wire up. No request leaves the site: no basemap, therefore no API token, therefore nothing that can expire.

## What a real project still needs

Replace the "input data" section of the script with real data — a GTFS export, a QGIS layer, a PostGIS query — and write the article around it. A map says nothing on its own: what gives an entry its value is the text stating where the data came from, what was assumed, and what the representation approximates.

The full instructions are in the repository's `README.md`, under "Interactive maps".
