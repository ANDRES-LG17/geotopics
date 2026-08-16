---
title: "Gabarit — entrée avec carte interactive"
description: "Brouillon de démonstration : montre comment une entrée du carnet embarque une carte MapLibre alimentée par des données précalculées."
date: "2026-08-07"
category: "lab"
tools: ["MapLibre GL JS", "Node.js", "GeoJSON"]
storyMapUrl: null
lab: "demo-isochrones"
cover: null
draft: true
---

**Cette entrée est un brouillon** (`draft: true`) : elle n'existe qu'en développement et ne paraît jamais sur le site publié. Elle sert de gabarit — la copier est la façon la plus rapide de démarrer un vrai projet.

Les données affichées ci-dessus sont **synthétiques**. Les temps de parcours sont inventés ; seule la mécanique est réelle.

## Ce que la carte démontre

La chaîne complète, de bout en bout, sans base de données ni service tiers :

1. `scripts/build-demo-isochrones.mjs` calcule les zones et écrit un GeoJSON dans `public/data/` ;
2. `src/labs/demo-isochrones.ts` décrit ce qu'il faut en faire — couches, couleurs, cadrage, légende, source ;
3. le front matter de cette entrée appelle le lab par son identifiant : `lab: "demo-isochrones"`.

Rien d'autre à brancher. Aucune requête ne sort du site : pas de fond de carte, donc pas de jeton d'API, donc rien qui puisse expirer.

## Ce qu'il reste à faire pour un vrai projet

Remplacer la section « données d'entrée » du script par de vraies données — un export GTFS, une couche QGIS, une requête PostGIS — et écrire l'article autour. La carte ne raconte rien toute seule : ce qui fait la valeur d'une entrée, c'est le texte qui dit d'où viennent les données, ce qu'on a supposé et ce que la représentation approxime.

Le mode d'emploi complet est dans le `README.md` du dépôt, section « Cartes interactives ».
