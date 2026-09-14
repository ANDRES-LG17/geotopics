# L'atelier géomatique

Ici vit la matière première : shapefiles, rasters, projets QGIS, DWG, tableurs.
Tout ce sur quoi on travaille avant qu'une carte existe.

**Rien de ce dossier ne part en ligne.** `.gitignore` ne laisse passer que les
notes (`.md`) et le gabarit. Le site publié ne sert qu'un GeoJSON allégé dans
`public/data/` — voir « La frontière » plus bas.

## Un projet = un dossier

```
geodata/
├── README.md               ← ce fichier
├── _gabarit-projet/        ← à copier pour démarrer
├── _commun/                ← ce qui sert à plusieurs projets
├── _archives/              ← projets terminés, gelés
│
└── 2026-09-lac-saint-charles/
    ├── 00-brut/            ← téléchargements intacts
    ├── 10-travail/         ← intermédiaires, jetables
    ├── 20-sig/             ← projets QGIS / ArcGIS / AutoCAD
    ├── 30-export/          ← le GeoJSON destiné au site
    ├── 40-livrables/       ← PDF, mises en page, captures
    ├── SOURCES.md          ← d'où vient chaque donnée
    └── JOURNAL.md          ← ce qui a été fait, et pourquoi
```

Les étages sont un squelette, pas un carcan : un projet ajoute l'étage dont il a
besoin. `2026-09-lac-saint-charles` a ainsi un `15-saisie-manuelle/`, parce que
son statut réglementaire n'existe dans aucun portail et se saisit à la main. Un
projet qui commence par un relevé terrain, ou par une numérisation de plans
papier, aurait le même besoin. La règle qui ne bouge pas, c'est le sens de
circulation : la donnée monte, elle ne redescend jamais.

### Nommer un dossier de projet

```
AAAA-MM-sujet-en-minuscules
2026-01-bassin-versant-chaudiere
2026-03-reseau-cyclable-levis
```

La date en tête range le dossier chronologiquement tout seul. Le sujet reste
identique à l'identifiant du lab (`src/labs/`) et au nom de l'entrée
(`content/entries/`) : un seul mot-clé traverse toute la chaîne, du
téléchargement à l'article publié.

Pas d'accents, pas d'espaces, pas de majuscules. QGIS, GDAL et les scripts
Node/Python traversent ces chemins sans broncher, et Windows ne casse rien au
passage.

## Les cinq étages, et pourquoi ils sont numérotés

Les numéros imposent un sens de circulation : la donnée monte, elle ne redescend
jamais. `30-export` ne réécrit pas dans `00-brut`.

### `00-brut/` — sacré, en lecture seule

Le fichier tel qu'il a été téléchargé. Nom d'origine, archive `.zip` comprise.
**On n'édite jamais ici.** Le jour où quelqu'un — un recruteur technique, un
collègue, vous-même dans un an — demande d'où sort un chiffre, vous voulez
pouvoir montrer l'original intact à côté du dérivé. C'est ce qui sépare un
travail vérifiable d'une carte jolie.

Un sous-dossier par fournisseur, ça se relit mieux :

```
00-brut/
├── donnees-quebec/
│   └── reseau-routier-2025.zip
└── mern/
    └── mnt-1m-22c05.tif
```

### `10-travail/` — jetable par construction

Reprojections, découpes, jointures, tous les intermédiaires. La règle : **tout
ici doit pouvoir être reconstruit** depuis `00-brut/`. Si un fichier de ce
dossier est irremplaçable, c'est qu'il manque une étape écrite quelque part —
dans `JOURNAL.md` ou dans un script.

Préfixez par l'ordre des opérations, le dossier se lit alors comme une recette :

```
10-travail/
├── 01-reseau-reprojete-epsg2949.gpkg
├── 02-reseau-decoupe-zone-etude.gpkg
└── 03-reseau-avec-vitesses.gpkg
```

Préférez le **GeoPackage** (`.gpkg`) au shapefile pour les intermédiaires : un
seul fichier au lieu de sept, pas de limite à 10 caractères sur les noms de
champs, pas d'encodage à deviner. Le shapefile reste en `00-brut/` parce que
c'est ce que les portails distribuent, pas parce qu'il est bon.

### `20-sig/` — le projet, selon l'outil

```
20-sig/
├── qgis/
│   ├── bassin-versant.qgz
│   └── styles/            ← .qml exportés, versionnables à la main
├── arcgis/                ← .aprx, si le projet passe par ArcGIS Pro
└── autocad/               ← .dwg, .dxf
```

Un sous-dossier par logiciel, créé au besoin. **Enregistrez le `.qgz` avec des
chemins relatifs** (QGIS : Projet ▸ Propriétés ▸ Général ▸ Chemins « relatif ») —
sinon le dossier cesse d'être déplaçable, et une sauvegarde restaurée ailleurs
s'ouvre sur des couches introuvables.

Exportez les styles en `.qml` à côté : c'est du XML, ça se relit, et ça survit à
un projet corrompu.

### `30-export/` — la frontière avec le site

Ce qui sort d'ici est destiné à `public/data/`. Nom déjà versionné, prêt à être
copié :

```
30-export/
└── bassin-versant-v1.geojson
```

Trois contraintes, avant de copier (le détail est dans
`public/data/README.md`) :

| Poids | Verdict |
| --- | --- |
| < 500 Ko | sans problème |
| 500 Ko – 2 Mo | acceptable si la carte est le sujet de l'entrée |
| > 2 Mo | simplifier, arrondir, ou passer aux tuiles vectorielles |

- **EPSG:4326** en sortie — MapLibre ne lit que ça ;
- coordonnées arrondies à 4 décimales (≈ 11 m) ;
- un bloc `metadata` dans le GeoJSON : quel script, quelle date, quelle source.

### `40-livrables/` — ce qui se regarde

Mises en page PDF, cartes imprimables, captures pour l'article, figures. Ce qui
finit dans l'entrée passe ensuite dans `public/covers/`, redimensionné.

## `_commun/` — ce qui ne appartient à aucun projet

```
_commun/
├── referentiels/   ← limites administratives, MNT régional, fonds réutilisés
├── styles/         ← palettes .qml maison, cohérentes d'un projet à l'autre
└── scripts/        ← utilitaires partagés (reprojection, allègement, contrôles)
```

Une donnée arrive ici quand elle sert **au troisième projet**, pas avant.
Factoriser trop tôt coûte plus cher que dupliquer.

## `_archives/` — les projets gelés

Un projet publié et clos se déplace ici tel quel. Avant de le geler, purgez
`10-travail/` : c'est reconstructible, et c'est ce qui pèse le plus.

## La frontière : atelier ↔ site

```
geodata/<projet>/30-export/sujet-v1.geojson
        │
        │  copie manuelle, après contrôle du poids
        ▼
public/data/sujet-v1.geojson          ← versionné dans git, servi au navigateur
        ▲
        │  décrit par
src/labs/sujet.ts                     ← couches, couleurs, cadrage, légende
        ▲
        │  appelé par le front matter  lab: "sujet"
content/entries/sujet.fr.md  +  sujet.en.md
```

Le script qui produit l'export vit dans `scripts/` (versionné, c'est du code),
pas ici. Ce dossier contient des **données** ; `scripts/` contient la **méthode**.
C'est ce qui rend le travail reproductible pour quelqu'un qui n'a pas vos
fichiers.

## Sauvegarde

Git versionne les **notes** (`.md`) de ce dossier — elles ne pèsent rien et
portent le raisonnement. Il ignore tout le reste : les données sont à votre
charge. Une copie sur disque externe ou dans un nuage suffit.

Par ordre d'irremplaçabilité :

| | Reconstructible ? | |
| --- | --- | --- |
| Saisies manuelles (`15-…`) | **non** — refaire, c'est refaire à la main | à sauvegarder en priorité |
| `00-brut/` | seulement si le portail existe encore et n'a pas changé de millésime | à sauvegarder |
| `20-sig/` | non — des heures de mise en forme | à sauvegarder |
| `30-export/`, `40-livrables/` | oui, par le script | utile, pas vital |
| `10-travail/` | oui, par construction | inutile |

Les notes sont dans git, donc déjà à l'abri : c'est la raison pour laquelle
`SOURCES.md` et `JOURNAL.md` doivent porter ce qui compte.

## Démarrer un projet

1. copier `_gabarit-projet/` en `AAAA-MM-sujet/` ;
2. remplir `SOURCES.md` **au moment du téléchargement**, pas après — l'URL et la
   licence sont introuvables six mois plus tard ;
3. travailler ;
4. exporter dans `30-export/`, copier vers `public/data/` ;
5. écrire le lab et l'entrée.
