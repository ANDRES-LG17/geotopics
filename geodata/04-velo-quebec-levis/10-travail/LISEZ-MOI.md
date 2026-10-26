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

Travaillez en **SCR projeté** (EPSG:2949 pour la région de Québec). Les mesures
de distance et de surface calculées en coordonnées géographiques n'ont pas de
sens. On ne repasse en EPSG:4326 qu'à l'export.

C'est le dossier à purger avant d'archiver le projet : c'est le plus lourd, et
c'est reconstructible.
