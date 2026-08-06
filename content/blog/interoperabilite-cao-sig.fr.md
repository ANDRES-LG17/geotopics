---
title: "Du DWG à la géodatabase : cinq pièges d'interopérabilité CAO–SIG"
description: "Ce qui casse réellement quand on convertit des plans CAO en couches SIG, et comment le prévenir dès la conception du processus."
date: "2026-05-18"
tags: ["CAO", "SIG", "FME", "Interopérabilité"]
---

Faire dialoguer un plan AutoCAD et une géodatabase paraît simple : un DWG contient des géométries, un SIG stocke des géométries. En pratique, la conversion échoue presque toujours au même endroit — non pas sur la géométrie, mais sur tout ce qui l'entoure.

Voici les cinq pièges que je rencontre systématiquement sur des mandats d'infrastructure, et la manière de les désamorcer.

## 1. Le calque n'est pas un attribut

En CAO, l'information sémantique vit dans le nom du calque : `AQ-COND-150-PVC`. En SIG, elle doit vivre dans des champs distincts : diamètre, matériau, type de réseau.

La tentation est de créer une couche SIG par calque. C'est une erreur : on se retrouve avec quarante couches là où il en faut une, dotée de quatre attributs. Le bon réflexe est d'écrire une **table de correspondance** explicite, versionnée avec le projet :

```
AQ-COND-150-PVC  →  reseau=aqueduc, diametre=150, materiau=PVC
```

Cette table devient le contrat entre le dessinateur et le géomaticien. Sans elle, chaque nouveau lot de plans repart de zéro.

## 2. L'absence de système de référence

Un DWG n'embarque pas de système de coordonnées. Les unités sont des nombres flottants dans un espace abstrait. Le fichier peut être en MTM zone 8, en UTM 18N, ou dans un système local arbitraire dont l'origine est le coin d'un bâtiment.

Vérifiez toujours avant de convertir : prenez trois points connus du plan et comparez-les à une orthophoto de référence. Un décalage constant signale une translation ; un décalage qui croît avec la distance signale un problème de facteur d'échelle ou de projection.

## 3. Les polylignes qui ne se ferment pas

Un dessinateur trace un contour de bâtiment « à l'œil ». Visuellement, il est fermé. Numériquement, il manque 0,003 m entre le premier et le dernier sommet.

Le rendu CAO ne s'en soucie pas. La conversion en polygone, elle, échoue — ou pire, réussit en produisant une géométrie invalide qui contaminera toutes les analyses en aval.

**Solution :** appliquer une tolérance de fermeture explicite au moment de la conversion, puis valider systématiquement. Ne faites jamais confiance à l'apparence visuelle d'un plan.

## 4. Les blocs et les entités composées

Les blocs, hachures et cotations n'ont pas d'équivalent SIG direct. Un bloc « regard d'égout » inséré 400 fois est une référence répétée en CAO ; en SIG, il doit devenir 400 entités ponctuelles distinctes, chacune portant les attributs de son insertion.

Décidez explicitement, en amont, du sort de chaque type d'entité : converti, ignoré, ou traité à part. Ce qui n'est pas décidé sera perdu silencieusement.

## 5. L'absence de journal de rejets

C'est le piège le plus coûteux. Un processus de conversion qui traite 10 000 entités et en rejette 143 sans le dire produit un livrable qui *semble* correct.

Tout processus de conversion doit produire deux sorties : les données converties **et** un journal des rejets, avec pour chaque entité écartée son identifiant et le motif du rejet. Sur un mandat récent, ce journal a révélé que 8 % des conduites d'un secteur n'avaient aucun diamètre renseigné — une information invisible autrement, et déterminante pour le client.

## Ce qu'il faut retenir

L'interopérabilité CAO–SIG n'est pas un problème de format de fichier. C'est un problème de **modèle de données** : la CAO décrit un dessin, le SIG décrit un territoire. La conversion consiste à reconstruire l'information sémantique que le dessin n'a jamais explicitement portée.

Investissez le temps dans la table de correspondance et le journal de rejets. Le reste n'est que de la tuyauterie.
