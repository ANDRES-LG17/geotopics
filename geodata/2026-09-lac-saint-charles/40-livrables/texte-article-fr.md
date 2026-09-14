---
title: "Qui décide de l'eau que boit Québec"
description: "Le bassin versant du lac Saint-Charles alimente 300 000 personnes. La ville qui en boit l'eau contrôle moins de 15 % du territoire qui la produit."
date: "2026-09-14"
category: "lab"
tools: ["QGIS", "Python", "MapLibre GL JS", "GeoJSON"]
storyMapUrl: null
lab: "lac-saint-charles"
cover: null
---

Le lac Saint-Charles alimente en eau potable plus de 300 000 personnes — Québec, Saint-Augustin-de-Desmaures, L'Ancienne-Lorette et Wendake. La prise d'eau se trouve onze kilomètres en aval du lac, sur la rivière Saint-Charles.

Son bassin versant couvre environ 170 km². **Québec en contrôle 14,9 %.**

Le reste appartient à quatre municipalités qui ne boivent pas cette eau. L'une d'elles, Stoneham-et-Tewkesbury, en contrôle à elle seule **79,3 %**.

## Le territoire qui décide n'est pas celui qui boit

| Municipalité | Part du bassin | MRC | Boit cette eau |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | 79,3 % | La Jacques-Cartier | non |
| Québec | 14,9 % | Québec | **oui** |
| Lac-Beauport | 2,9 % | La Jacques-Cartier | non |
| Saint-Gabriel-de-Valcartier | 1,7 % | La Jacques-Cartier | non |
| Lac-Delage | 1,2 % | La Jacques-Cartier | non |

Un détail administratif double la fracture : **85,1 % du bassin relève d'une autre MRC** que celle qui consomme l'eau. La frontière entre qui décide et qui boit est aussi une frontière de palier supérieur.

Ce qui se construit sur ces 85 % — lotissements, routes, installations septiques — se décide dans des conseils municipaux où les buveurs d'eau ne siègent pas.

## Trois municipalités boivent sans rien décider

Quatre municipalités sont alimentées par la prise d'eau. **Trois d'entre elles se trouvent entièrement hors du bassin versant** : Saint-Augustin-de-Desmaures, L'Ancienne-Lorette et Wendake boivent une eau dont elles n'administrent pas un mètre carré.

Seule Québec figure dans les deux listes — celle de ceux qui décident et celle de ceux qui boivent. Les quatre autres municipalités du bassin, elles, décident sans boire.

| Rôle | Municipalités |
| --- | --- |
| Boit et décide | Québec |
| Boit sans décider | Saint-Augustin-de-Desmaures, L'Ancienne-Lorette, Wendake |
| Décide sans boire | Stoneham-et-Tewkesbury, Lac-Beauport, Saint-Gabriel-de-Valcartier, Lac-Delage |

## Dix-huit lacs, une seule prise d'eau

Le bassin compte dix-huit lacs cartographiés, du lac Saint-Charles (351 ha) à l'étang Bellevue (0,55 ha). Le lac principal représente 65 % de la surface lacustre ; les dix-sept autres se partagent le tiers restant.

Un seul alimente la prise d'eau potable. C'est aussi le seul dont le suivi soit documenté en continu.

## La pression augmente là où le contrôle échappe

Entre 2001 et 2025, les municipalités du bassin n'ont pas grandi au même rythme.

| Municipalité | 2001 | 2025 | Croissance |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | 5 346 | 10 147 | **+89,8 %** |
| Lac-Delage | 454 | 810 | +78,4 % |
| Lac-Beauport | 5 655 | 8 524 | +50,7 % |
| Saint-Gabriel-de-Valcartier | 2 318 | 3 400 | +46,7 % |
| Québec | 486 439 | 592 658 | +21,8 % |

La municipalité qui contrôle 79,3 % du bassin a presque doublé de population en vingt-quatre ans — quatre fois plus vite que la ville qui boit l'eau.

Une réserve, et elle est importante : **ces taux sont municipaux, pas « dans le bassin »**. Une municipalité n'est pas entièrement comprise dans le bassin versant, et sa croissance peut se produire ailleurs sur son territoire. L'indicateur reste indirect.

## Ce que la carte ne dit pas

Les travaux de Nathalie Gravel (Université Laval) portent précisément sur ce lac. Elle y documente l'échec des tentatives antérieures de gouvernance participative, un déficit démocratique, et des tensions entre personnel municipal et résidents riverains autour de la réduction des eaux usées et du coût de leur traitement.

Sa question n'est pas de savoir si le territoire est mal découpé — c'est de comprendre **pourquoi la configuration du pouvoir ne bouge pas**.

Cette carte montre pourquoi une gouvernance partagée est structurellement difficile. Elle ne dit pas pourquoi elle ne s'installe pas. C'est une autre enquête, et c'est la sienne.

> Nathalie Gravel, *Developing Favorable Grounds for Participatory Water Governance and the Rise of Eco-Citizenship, the Case of Lake St. Charles, Quebec*. Communication au congrès annuel 2025 de l'Association canadienne des géographes, session CS112, 21 mai 2025.

## Méthode

Toutes les données viennent de portails ouverts, sous licence CC-BY 4.0.

**Le bassin versant** — le lac Saint-Charles n'apparaît pas dans la couche des bassins versants de lacs du MELCCFP : deux entités y portent ce nom, toutes deux ailleurs au Québec, dont une de 3,64 km² qui correspond à la superficie publiée pour notre lac. Le piège était complet. Le bon contour est une aire de drainage de station : `05090041`, 170,01 km². Deux aires candidates contenaient le lac, séparées par 1,18 ha sur 17 000 — indiscernables à cette échelle.

**Les écarts de mesure** — le bassin fait 169 km² selon Agiro, 170,01 km² au calcul, 165,76 km² selon la base LCE. Le lac fait 351 ha (GRHQ), 360 ha (Agiro) ou 365 ha (hydrographie municipale). Trois producteurs publics, le même objet, jusqu'à 4 % d'écart. Ce n'est pas une anomalie : le contour dépend du point de fermeture retenu et de l'échelle de levé.

**La chaîne** — exploration et vérification dans QGIS, calcul des intersections et export en Python, GeoJSON allégé à quatre décimales (≈ 11 m), affichage MapLibre. Le fond de carte vient d'OpenStreetMap via CARTO, sans jeton : la carte perdrait son décor si le service disparaissait, jamais ses données.

**Sources** — MELCCFP (aires de drainage), MRNF (découpages administratifs SDA 1/20 000, géobase du réseau hydrographique), ISQ (estimations de population 2001-2025), Ville de Québec (hydrographie).

**Les couleurs** — la palette a été vérifiée pour les déficiences de vision des couleurs. Le couple vert/rouge envisagé d'abord échouait au contrôle : en deutéranopie, les deux teintes se confondaient — or c'est le couple qui porte l'argument.
