---
title: "Reading a watershed"
description: "How topography drives water flow, and what that changes for land-use planning."
date: "2026-06-22"
category: "storymap"
tools: ["ArcGIS StoryMaps", "ArcGIS Pro", "DEM"]
storyMapUrl: null
---

> ⚠️ **Template entry.** It shows how a Story Map project looks in this
> notebook. Replace this text with your own and paste your story's public URL
> into the `storyMapUrl` field in the front matter — the map will then appear
> automatically below.

A watershed is not a line on a map: it is a consequence. Every drop that falls
inside its perimeter ends up at the same outlet, and topography alone decides
where that is.

## Why a Story Map rather than a map

A static map shows the result. It does not show the reasoning.

And here the reasoning is the point: the digital elevation model gives slopes,
slopes give flow direction, flow direction gives accumulation, and accumulation
gives the stream network. Each step follows from the one before it.

That is precisely what a Story Map can do and a printed map cannot: unroll an
argument one step at a time, with the map keeping pace.

## What building it taught me

**The DEM decides everything.** The resolution of the terrain model caps how
fine the analysis can be. On gentle relief, a 10 m DEM flattens slope breaks
that actually govern flow. Artificial sinks in the model have to be filled
before any calculation, or water "disappears" into hollows that do not exist on
the ground.

**The accumulation threshold is an editorial choice.** There is no correct
absolute value: depending on the threshold, the same territory has three streams
or three hundred. That choice belongs in the narrative, not buried in the
parameters.

**Administrative boundaries do not follow water.** This is the underlying
tension in every basin-scale planning project: municipal limits cut across
watersheds, and nobody governs the unit that matters hydrologically.
