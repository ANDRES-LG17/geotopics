# 10 — Travail : jetable par construction

Les intermédiaires : reprojections, découpes, jointures, sélections.

**Règle** — tout fichier d'ici doit pouvoir être reconstruit depuis `00-brut/`.
Si l'un d'eux est irremplaçable, c'est qu'une étape n'a été écrite nulle part :
notez-la dans `JOURNAL.md`, ou mieux, mettez-la dans un script.

Numéroter dans l'ordre des opérations — le dossier se lit alors comme une
recette :

```
01-reseau-reprojete-epsg2949.gpkg
02-reseau-decoupe-zone-etude.gpkg
03-reseau-avec-vitesses.gpkg
```

Préférez le **GeoPackage** (`.gpkg`) au shapefile : un fichier au lieu de sept,
des noms de champs non tronqués à 10 caractères, pas d'encodage à deviner.

Travaillez en **SCR projeté** — ici **EPSG:2949** (MTM fuseau 7). Ce n'est pas
un détail de forme pour ce projet : tout l'argument repose sur des **surfaces**
(quelle part du bassin relève de quelle municipalité). Une aire calculée en
EPSG:4326 n'a aucun sens. On ne repasse en géographique qu'à l'export.

C'est le dossier à purger avant d'archiver le projet : c'est le plus lourd, et
c'est reconstructible.

## Étapes attendues pour ce projet

```
01-bassin-versant-epsg2949.gpkg      bassin isolé du jeu MELCCFP
02-municipalites-epsg2949.gpkg       découpages, même SCR
03-hydrographie-bassin.gpkg          plans d'eau découpés sur le bassin
04-overlay-bassin-municipalites.gpkg intersection + aires
05-hydro-avec-statut.gpkg            jointure du CSV de 15-saisie-manuelle/
```

**Ne pas confondre** `10-travail/` et `15-saisie-manuelle/` : ce dossier-ci est
jetable, l'autre non.
