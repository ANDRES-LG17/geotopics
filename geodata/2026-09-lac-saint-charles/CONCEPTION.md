# Lac Saint-Charles — gouvernance partagée

Lab interactif pour GeoTopics. Montre, sur un cas réel, l'argument central de la
Dre Nathalie Gravel (professeure, Université Laval) : protéger un plan d'eau
« par morceaux » ne suffit pas.

État : **planification**. Ce document a été écrit *avant* de toucher au code,
pour garder trace du pourquoi de chaque décision.

> Document de conception, figé. Ce qui change en cours de route se note dans
> `JOURNAL.md` ; ce qui concerne la provenance des données, dans `SOURCES.md`.

---

## 1. Sources de vérité

> **Révisé le 2026-09-14.** Une seconde source, découverte après la rédaction
> initiale, porte **directement sur le lac Saint-Charles**. La prudence
> méthodologique de la version précédente — « elle n'a jamais parlé de ce
> lac » — n'a plus lieu d'être pour ce qu'elle établit désormais. Voir
> `JOURNAL.md`, 2026-09-14.

Deux sources, de statut différent.

### A. La communication scientifique — sur ce lac (2025)

> **Developing Favorable Grounds for Participatory Water Governance and the Rise
> of Eco-Citizenship, the Case of Lake St. Charles, Quebec.**
> Nathalie Gravel, Université Laval. Communication orale, 21 mai 2025,
> session CS112 « Vers une gouvernance adaptative des sources d'eau potable face
> aux changements climatiques ». Abstract ID 133.

Verbatim et analyse dans
`00-brut/gravel/communication-gravel-2025-lac-saint-charles.md`.

**Le lac Saint-Charles est l'objet même de ses travaux.** Recherche collaborative
en cours, mobilisant la théorie de l'acteur-réseau pour étudier réseaux,
discours, alliances et marges de manœuvre entre parties prenantes — citoyens et
représentants autochtones compris.

C'est un **résumé de communication**, pas un article revu par les pairs ; les
résultats y sont annoncés comme *early results*. À citer comme tel.

### B. L'entretien — sur le fleuve (Québec Science)

> « Un statut juridique pour le fleuve Saint-Laurent », entretien avec Nathalie
> Gravel par Annie Labrecque, Québec Science.

Porte sur le Saint-Laurent, pas sur le lac. Reste utile comme cadre général, mais
ce qui en vient s'annonce comme transposition, non comme constat sur ce lac.

### La règle de méthode, révisée

| Ce qui vient de | Statut dans le lab |
| --- | --- |
| Communication 2025 (A) | attribuable à la chercheuse, **sur ce lac** |
| Entretien Québec Science (B) | cadre général, transposé — à signaler |
| Données ouvertes (§ 5) | **notre** mesure, notre responsabilité |

Ce que la communication **n'établit pas** : aucun chiffre de superficie, aucune
part municipale, aucun décompte de lacs, aucun inventaire réglementaire. La
recherche fournit le **cadre** ; la cartographie fournit la **mesure**. Les deux
restent distinctes dans la note de méthode.

---

## 2. Thèse

*Révisée le 2026-09-14 : chiffres mesurés, et couche politique ajoutée.*

Le lac Saint-Charles alimente en eau potable plus de 300 000 personnes de
**Québec, Saint-Augustin-de-Desmaures, L'Ancienne-Lorette et Wendake** — la prise
d'eau se trouve 11 km en aval, sur la rivière Saint-Charles.

Son bassin versant (**≈ 170 km²**) déborde largement la ville : **79,3 %**
relèvent de Stoneham-et-Tewkesbury, **14,9 %** seulement de Québec. Quatre des
cinq municipalités du bassin appartiennent à une autre MRC que celles qui boivent
l'eau. Le bassin compte **18 lacs** cartographiés ; un seul alimente la prise
d'eau.

**Le territoire qui décide n'est pas celui qui boit.**

Mais la découpe administrative n'est que le terrain. Les travaux de Gravel (2025)
montrent que les tentatives d'améliorer la gouvernance participative de ce lac
**ont échoué**, et posent la question des obstacles à la modification de la
*configuration du pouvoir* — dans un contexte de déficit démocratique et de
tensions entre personnel municipal et riverains.

La carte montre **pourquoi c'est difficile**. Elle ne prétend pas dire pourquoi
ça ne change pas.

---

## 3. Des sources au cas : ce qui tient

Révisé le 2026-09-14 à la lumière de la communication (A). La colonne « source »
dit d'où vient chaque argument : (A) porte sur ce lac, (B) est transposé.

| # | Argument | Src | Ce que nos données montrent | Force |
|---|---|---|---|---|
| 1 | La loi protège ponctuellement, pas l'ensemble | B | **18 lacs** cartographiés dans le bassin ; un seul alimente la prise d'eau. L'asymétrie de protection reste à étayer (§ 8) | **Fort** sur le décompte, **ouvert** sur le statut |
| 2 | Protéger tout le bassin, pas le seul plan d'eau principal | B | **79,3 %** du bassin relève de Stoneham-et-Tewkesbury, **14,9 %** de Québec | **Fort** — mesuré |
| 3 | La complexité juridictionnelle entrave la protection | B | Complexité **horizontale** (5 municipalités, 2 MRC), là où l'entretien décrit le vertical (3 paliers) | **Partiel** — analogie, non équivalence |
| 4 | Menaces : urbanisation, surverses, agriculture | B | ~~Surverses non étayées ici~~ → **(A) confirme les eaux usées comme objet de tension active** sur ce lac | **Révisé à la hausse** — voir ci-dessous |
| 5 | Vision holistique, communication entre acteurs | A+B | (A) : *deficiency in jointly defining a vision and modalities to reach shared goals* — constaté sur ce lac | **Fort** — plus une analogie |
| **6** | **Les tentatives antérieures de gouvernance participative ont échoué** | **A** | Nouveau. Établi par la chercheuse sur ce lac | **Fort** |
| **7** | **Déficit démocratique et injustices perçues** ; tensions personnel municipal ↔ riverains sur la réduction des eaux usées et le coût du traitement | **A** | Nouveau. Donne un **contenu concret** au conflit | **Fort** |
| **8** | **Question centrale : quels obstacles empêchent de modifier la configuration du pouvoir ?** | **A** | Nouveau. C'est **la** question de recherche | **Cadre du lab** |
| **9** | **Transition d'une gestion technocratique vers une gouvernance participative** | **A** | Nouveau. Cadre de lecture d'ensemble | **Cadre du lab** |
| **10** | **Parties prenantes : citoyens et représentants autochtones** | **A** | Nouveau. **Wendake** est déjà dans nos données (municipalité desservie) | **Fort** |

### Ce que la communication déplace

**L'argument 4 remonte.** La version précédente écartait les surverses faute de
preuve locale. (A) parle explicitement de tensions sur *wastewater reduction and
treatment costs* pour ce lac : ce n'est plus une menace transposée du fleuve,
c'est un objet de conflit documenté ici.

**L'argument 5 cesse d'être une analogie.** Le défaut de vision partagée n'est
plus supposé par ressemblance : il est constaté par la chercheuse sur ce
bassin.

**Cinq arguments nouveaux (6 à 10)**, tous attribuables et tous portant sur ce
lac. Le plus structurant est le **8** : la question n'est pas seulement *le
territoire est-il mal découpé*, mais *pourquoi la configuration du pouvoir ne
bouge-t-elle pas*. Nos chiffres ne répondent pas à cette question — ils en
montrent le terrain.

### Le déplacement de fond

La thèse initiale était **géographique** : la découpe du territoire ne suit pas
l'hydrologie.

La communication y ajoute une couche **politique** : le problème n'est pas
seulement que le territoire est mal découpé, c'est que *les tentatives de
changer cela ont échoué*, et que la recherche porte précisément sur les
obstacles à ce changement.

Le lab gagne à porter les deux. Les 79,3 % / 14,9 % ne sont pas la conclusion :
ils sont la **carte du terrain** sur lequel se joue une question de pouvoir que
la chercheuse documente par ailleurs. Formulation possible :

> *La carte montre pourquoi c'est difficile. Elle ne dit pas pourquoi ça ne
> change pas — c'est l'objet des travaux de Gravel (2025).*

---

## 4. Ce que la carte va montrer

*Les quatre indicateurs d'origine, affinés le 2026-09-14 à la lumière de la
communication Gravel 2025. Les chiffres en gras sont mesurés, pas cités.*

### 1. « Un lac suivi, dix-sept dans l'angle mort »

Le bassin compte **18 lacs** cartographiés (25 au répertoire du MELCCFP). Un seul
alimente la prise d'eau ; c'est aussi le seul dont la surveillance soit
documentée en continu.

Saint-Charles représente **65 %** de la surface lacustre du bassin — les 17
autres se partagent le tiers restant.

**Affiné** — la formulation « protégé / non protégé » reste suspendue au statut
réglementaire (§ 8). En attendant, l'asymétrie **d'attention** est déjà
démontrable : le RSVL suit 9 lacs de la zone, la bathymétrie n'en couvre qu'une
partie, et l'hydrographie municipale s'arrête aux limites de la ville.

### 2. « Le territoire qui décide n'est pas celui qui boit l'eau »

Le bassin coloré par municipalité, avec sa part de surface.

| Municipalité | Part du bassin | | MRC |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | **79,3 %** | ne boit pas | La Jacques-Cartier |
| Québec | **14,9 %** | **boit** | Québec |
| Lac-Beauport | 2,9 % | ne boit pas | La Jacques-Cartier |
| Saint-Gabriel-de-Valcartier | 1,7 % | ne boit pas | La Jacques-Cartier |
| Lac-Delage | 1,2 % | ne boit pas | La Jacques-Cartier |

*La ville qui boit l'eau contrôle moins de 15 % du territoire qui l'alimente.*

**Affiné** — 85,1 % du bassin relève d'une **autre MRC** que celle qui consomme
l'eau. La frontière entre « qui décide » et « qui boit » est aussi une frontière
administrative de palier supérieur. C'est la traduction cartographique directe de
la *configuration du pouvoir* que Gravel (2025) interroge.

### 3. « La pression augmente »

Croissance démographique des municipalités du bassin, comme indicateur indirect
de pression de développement.

**Affiné** — Gravel (2025) documente des tensions actives sur la **réduction des
eaux usées et le coût du traitement**. La croissance démographique n'est donc
plus un simple proxy d'urbanisation : elle est le moteur d'un conflit
identifié — plus de résidents, plus d'eaux usées, et un désaccord sur qui paie.

À dire tel quel : la population d'une municipalité peut croître **hors** bassin.
L'indicateur reste indirect.

### 4. « Qui essaie d'en prendre soin »

Schéma des acteurs : Ville de Québec, les quatre municipalités du bassin, Agiro
(ex-APEL), le Conseil de bassin.

**Affiné, et c'est le plus transformé.** La communication de Gravel donne à ce
schéma ce qui lui manquait — un contenu, et non plus une liste :

- les **représentants autochtones** sont parties prenantes ; **Wendake** figure
  déjà parmi les municipalités desservies dans nos données ;
- les **résidents riverains** forment un acteur distinct du personnel municipal,
  et en tension avec lui ;
- les tentatives antérieures de gouvernance participative ont **échoué** — le
  schéma ne montre pas un dispositif qui fonctionne, mais un dispositif dont la
  chercheuse étudie les blocages.

Le schéma cesse d'être un organigramme pour devenir une **carte des relations**,
ce qui correspond au cadre acteur-réseau qu'elle mobilise.

### Le cadre général, dans la note de méthode

> *La carte montre pourquoi c'est difficile. Elle ne dit pas pourquoi ça ne
> change pas — c'est l'objet des travaux de Gravel (2025).*

### Ce qui n'est pas un indicateur

L'argument n° 3 du tableau § 3 (juridictions) reste l'**explication** derrière
l'indicateur 2, pas une pièce visuelle propre.

---

## 5. Sources de données

Voir `SOURCES.md` pour la fiche complète de chaque jeu (URL, licence, millésime).
Résumé :

| Donnée | Source | Format | Notes |
|---|---|---|---|
| Bassin versant du lac Saint-Charles | Données Québec / MELCCFP — « Aires de drainage et bassins versants » | Vectoriel | Filtrer le bon lac parmi plusieurs « bassins versants de lac » |
| Limites municipales | Données Québec — « Découpages administratifs » | SHP / GPKG / FGDB | Échelle 1/20 000 pour ce niveau de détail |
| Lacs et plans d'eau | Données Québec (portail Ville de Québec) — « Hydrographie : cours d'eau surfaciques et linéaires » | GeoJSON | Couvre le territoire de Québec ; couverture à vérifier pour les municipalités voisines (BDTQ provinciale) |
| Statut réglementaire (réglementé / non réglementé) | Mémoire de l'APEL au BAPE (PDF) | **Manuel** | N'existe pas en données ouvertes — saisi à la main en CSV dans `15-saisie-manuelle/` |
| Population par municipalité (série temporelle) | ISQ ou Statistique Canada | CSV | Aucun géotraitement |
| Contexte narratif (diagnostics, chronologie) | Diagnostics APEL 2012 et 2022 ; Ville de Québec — « État de santé du lac Saint-Charles » | PDF | Rédaction seulement, pas de géométrie |

**À vérifier avant de figer les données** — Saint-Augustin-de-Desmaures dépend-il
ou non de cette même source d'eau ? Deux pages de la Ville de Québec se
contredisent.

---

## 6. Chaîne technique

```
QGIS                          →  exploration visuelle, vérification des couches,
                                  saisie manuelle du statut réglementaire
Python (geopandas, shapely,   →  overlay bassin × municipalités, calcul des aires,
pandas, pyogrio)                 jointure du CSV manuel, nettoyage des attributs
mapshaper / topojson          →  simplification des géométries pour le web
GeoJSON versionné             →  public/data/lac-st-charles-…-v1.geojson
MapLibre GL (src/labs/*.ts)   →  couches, couleurs, légende, interaction
```

Cela remplace le script `.mjs` Node des autres labs par un script Python. Le
contrat avec le site ne change pas : calcul unique, local, sortie en GeoJSON
statique et immuable.

---

## 7. Fichiers côté site

Ce qui sortira de l'atelier vers le dépôt versionné :

```
scripts/analysis/lac-saint-charles.py              calcule et écrit le GeoJSON
public/data/lac-st-charles-watershed-v1.geojson    bassin × municipalités + lacs
public/data/lac-st-charles-population-v1.csv       série démographique (ind. 3)
public/data/lac-st-charles-regulation-v1.csv       statut réglementaire (ind. 1)
src/labs/lac-saint-charles.ts                      couches, couleurs, légende
content/entries/lac-saint-charles.fr.md            entrée du carnet
content/entries/lac-saint-charles.en.md            la même, en anglais
```

Le GeoJSON porte les deux couches cartographiques : `bassin_x_munic` (5 entités
avec leur part de surface) et `lacs_polygones` (18). Les deux CSV alimentent les
indicateurs 1 et 3, qui ne sont pas des couches.

---

## 8. Prochaines étapes

*Mises à jour le 2026-09-14.*

**Acquis**

- [x] Confirmer le cas de Saint-Augustin-de-Desmaures — desservi
- [x] Télécharger et vérifier dans QGIS — bassin, municipalités, lacs
- [x] Choisir le bassin (`05090041`, 170,01 km²) et justifier le choix
- [x] Calculer l'overlay bassin × municipalités — indicateur 2
- [x] Extraire les 18 lacs du bassin (GRHQ) — indicateur 1
- [x] Intégrer la communication Gravel 2025

**À faire**

- [ ] Obtenir la série de population par municipalité (ISQ / StatCan) —
      indicateur 3
- [ ] Construire le schéma d'acteurs — indicateur 4
- [ ] Trancher le statut réglementaire, ou reformuler l'indicateur 1 sur
      l'asymétrie d'attention
- [ ] Écrire `scripts/analysis/lac-saint-charles.py` — export GeoJSON
- [ ] Concevoir `src/labs/lac-saint-charles.ts`
- [ ] Rédiger l'entrée (FR/EN)
- [ ] Compléter la référence Gravel 2025 (colloque, URL)

**Ordre conseillé** — l'indicateur 2 est complet et se suffit à lui-même :
publier une première version du lab avec lui, puis enrichir. Voir le mapping
fonctionner clarifie mieux les besoins réels que d'accumuler des données.
