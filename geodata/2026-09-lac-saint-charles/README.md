# Lac Saint-Charles — gouvernance partagée

Premier lab du carnet. Le bassin versant d'une source d'eau potable déborde
largement la municipalité qui en boit l'eau : Québec en contrôle 14,9 %,
Stoneham-et-Tewkesbury 79,3 %.

| | |
| --- | --- |
| **Identifiant** | `lac-saint-charles` |
| **Ouvert le** | 2026-09-11 |
| **État** | **publié** (v1) |

L'identifiant traverse toute la chaîne : ce dossier, `src/labs/lac-saint-charles.ts`,
`content/entries/lac-saint-charles.{fr,en}.md`.

## Les quatre documents

| Fichier | Rôle |
| --- | --- |
| `CONCEPTION.md` | la thèse, le lien aux travaux de Gravel, ce que la carte montre. Révisé 2026-09-14 |
| `JOURNAL.md` | ce qui change au contact des données, et pourquoi. **Vivant** |
| `SOURCES.md` | provenance, licence, millésime de chaque jeu |
| `README.md` | ce fichier — l'état d'avancement |

## Les étages

```
00-brut/              téléchargements intacts, par fournisseur
├── donnees-quebec/     bassin versant, limites municipales
├── ville-de-quebec/    hydrographie
├── apel/               mémoire au BAPE, diagnostics (PDF)
└── isq/                population
15-saisie-manuelle/   statut réglementaire — saisi à la main, IRREMPLAÇABLE
10-travail/           intermédiaires, reconstructibles
20-sig/qgis/          projet QGIS, chemins relatifs
30-export/            GeoJSON pour public/data/
40-livrables/         figures pour l'entrée
```

`15-saisie-manuelle/` est propre à ce projet : le statut réglementaire n'existe
dans aucun portail. C'est le seul fichier qu'aucun script ne peut régénérer — à
sauvegarder comme `00-brut/`.

## Chaîne technique

Python plutôt que Node pour ce lab (geopandas fait l'overlay en quelques lignes).
Le contrat avec le site ne change pas : calcul unique, local, sortie en GeoJSON
statique et immuable.

```
QGIS            exploration, vérification, saisie du statut réglementaire
  ↓
Python          overlay bassin × municipalités, aires, jointure du CSV
  ↓             → scripts/analysis/lac-saint-charles.py (versionné)
mapshaper       simplification pour le web
  ↓
30-export/      lac-st-charles-watershed-v1.geojson
  ↓             copie manuelle après contrôle du poids
public/data/    servi au navigateur
  ↑
src/labs/lac-saint-charles.ts          couches, couleurs, légende
content/entries/lac-saint-charles.*.md appelle le lab : lab: "lac-saint-charles"
```

## Les quatre indicateurs

| # | Indicateur | État |
| --- | --- | --- |
| 1 | **Un lac suivi, dix-sept dans l'angle mort** — 18 lacs, une prise d'eau | données prêtes ; formulation suspendue au statut réglementaire, repli identifié |
| 2 | **Le territoire qui décide n'est pas celui qui boit** — parts municipales | ✅ complet |
| 3 | **La pression augmente** — croissance démographique | ✅ complet (ISQ 2001-2025) |
| 4 | **Qui essaie d'en prendre soin** — schéma d'acteurs | matière fournie par Gravel 2025, à construire |

Le chiffre le plus parlant, mesuré :

| Québec | **14,9 %** du bassin | boit l'eau |
| --- | --- | --- |
| Stoneham-et-Tewkesbury | **79,3 %** | ne la boit pas |

85,1 % du bassin relève d'une **autre MRC** que celle qui consomme l'eau.

Et la pression augmente là où le contrôle échappe à l'usager :

| Stoneham-et-Tewkesbury | **+89,8 %** de population (2001-2025) | 79,3 % du bassin |
| --- | --- | --- |
| Québec | +21,8 % | 14,9 % du bassin |

## Avancement

- [x] Sources identifiées, vérifiées, téléchargées
- [x] Bassin choisi (`05090041`, 170,01 km²) et justifié
- [x] Overlay bassin × municipalités — indicateur 2
- [x] 18 lacs du bassin extraits (GRHQ) — indicateur 1
- [x] Projet QGIS monté et reconstructible
- [x] Communication Gravel 2025 intégrée
- [x] Série de population 2001-2025 (ISQ) — indicateur 3
- [ ] Schéma d'acteurs — indicateur 4
- [ ] Statut réglementaire, ou repli sur l'asymétrie d'attention
- [x] Export GeoJSON — 189 Ko, 24 entités
- [x] Lab — 5 couches, 3 scènes, extrusion 3D
- [x] Entrée FR/EN — publiée, build vérifié
- [x] Référence Gravel 2025 vérifiée — CAG/ACG 2025, session CS112

L'indicateur 2 se suffit à lui-même : une première version du lab peut être
publiée avec lui seul, puis enrichie.

## Ce qui reste à surveiller

**La référence Gravel 2025** — colloque et URL confirmés (CAG/ACG 2025,
session CS112). Restent ouverts : la ville hôte, et l'existence d'une publication
issue de ces travaux. Non bloquant.

**Les taux de croissance sont municipaux**, pas « dans le bassin » : une
municipalité n'est pas entièrement dans le bassin versant. À dire dans l'entrée.

**Les écarts de mesure** — le bassin fait 169 km² (Agiro), 170,01 (notre calcul)
ou 165,76 (LCE) ; le lac 351, 360 ou 365 ha selon la source. À dire dans
l'entrée : c'est un bon sujet, pas un problème.
