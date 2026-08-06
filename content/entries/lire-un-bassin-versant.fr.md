---
title: "Lire un bassin versant"
description: "Comment la topographie commande l'écoulement de l'eau, et ce que cela change pour l'aménagement du territoire."
date: "2026-06-22"
category: "storymap"
tools: ["ArcGIS StoryMaps", "ArcGIS Pro", "MNT"]
storyMapUrl: null
---

> ⚠️ **Entrée modèle.** Elle montre comment se présente un projet Story Map dans
> ce carnet. Remplacez ce texte par le vôtre et collez l'URL publique de votre
> story dans le champ `storyMapUrl` de l'en-tête — la carte apparaîtra
> automatiquement ci-dessous.

Un bassin versant n'est pas une ligne sur une carte : c'est une conséquence. Toute
goutte qui tombe à l'intérieur de son périmètre finit par rejoindre le même
exutoire, et c'est la topographie seule qui en décide.

## Pourquoi une Story Map plutôt qu'une carte

Une carte statique montre le résultat. Elle ne montre pas le raisonnement.

Or ce qui compte ici, c'est justement l'enchaînement : le modèle numérique de
terrain donne les pentes, les pentes donnent les directions d'écoulement, les
directions d'écoulement donnent l'accumulation, et l'accumulation donne le
réseau hydrographique. Chaque étape découle de la précédente.

C'est exactement ce qu'une Story Map sait faire et qu'une carte imprimée ne peut
pas : dérouler un raisonnement, une étape à la fois, avec la carte qui suit.

## Ce que j'ai appris en la construisant

**Le MNT décide de tout.** La résolution du modèle de terrain plafonne la
finesse de l'analyse. Sur un relief doux, un MNT à 10 m écrase des ruptures de
pente qui commandent réellement l'écoulement. Les dépressions artificielles du
modèle doivent être comblées avant tout calcul, sinon l'eau « disparaît » dans
des cuvettes qui n'existent pas sur le terrain.

**Le seuil d'accumulation est un choix éditorial.** Il n'y a pas de bonne valeur
absolue : selon le seuil retenu, le même territoire compte trois cours d'eau ou
trois cents. Ce choix doit être explicité dans le récit, pas caché dans les
paramètres.

**Le découpage administratif ne suit pas l'eau.** C'est la tension de fond de
tout projet d'aménagement à l'échelle d'un bassin : les limites municipales
coupent les bassins versants en travers, et personne ne gère l'unité qui compte
hydrologiquement.
