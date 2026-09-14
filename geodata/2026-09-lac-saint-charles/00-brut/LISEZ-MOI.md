# 00 — Brut : lecture seule

Le fichier **tel qu'il a été téléchargé**. Nom d'origine conservé, archive `.zip`
laissée fermée si possible.

**On n'édite jamais ici.** Pas de reprojection, pas de découpe, pas de correction
d'attribut. Tout cela appartient à `10-travail/`.

La raison est vérifiable plus que théorique : le jour où un chiffre est contesté,
il faut pouvoir poser l'original intact à côté du dérivé et montrer le chemin
entre les deux. C'est ce qui distingue un travail qu'on peut défendre d'une carte
qu'il faut croire sur parole.

Un sous-dossier par fournisseur :

```
00-brut/
├── donnees-quebec/
│   └── reseau-routier-2025.zip
└── mern/
    └── mnt-1m-22c05.tif
```

Chaque jeu déposé ici reçoit sa fiche dans `SOURCES.md` **le jour même** — URL,
licence, millésime. Six mois plus tard, ces informations sont perdues.

---

## À télécharger pour ce projet

Les fiches complètes (licence, pièges, champs à noter) sont dans `SOURCES.md`.
Ordre conseillé : les deux premiers suffisent pour la première session QGIS.

Liens vérifiés le 2026-09-11 (HTTP 200). Licences : **CC-BY 4.0** pour les trois
premiers.

### 1. Bassin versant → `donnees-quebec/` — 47 Mo

*Aires de drainage en cours d'eau et bassins versants de lacs* (MELCCFP)

```
Fiche :   https://www.donneesquebec.ca/recherche/dataset/aires-de-drainage-bassins-versants
GPKG  :   https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/Aire_drainage/DQ/AD_CE_BV_Lacs_gpkg.zip
PDF   :   https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/Aire_drainage/DQ/Bassins-versants-de-lacs.pdf
```

Le jeu couvre **tout le Québec**. Avant de télécharger 47 Mo, le WMS permet de
repérer le bon bassin à l'écran (voir `SOURCES.md` § 1).

### 2. Limites municipales → `donnees-quebec/` — 100 Mo

*Découpages administratifs (SDA), 1/20 000* (MRNF)

```
Fiche :   https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs
GPKG  :   https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Theme/Local/SDA_20k/GPKG/SDA.gpkg.zip
PDF   :   https://diffusion.mern.gouv.qc.ca/Diffusion/RGQ/Documentation/SDA/Structure_physique_SDA20k.pdf
CSV   :   https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Theme/Local/Municipalites_Renvois/CSV/Municipalites_renvois.csv
```

**GPKG plutôt que SHP** : le SDA contient plusieurs couches, le GeoPackage les
garde dans un seul fichier. Ne garder que la couche municipale.

### 3. Hydrographie → `ville-de-quebec/`

*Hydrographie - Cours d'eau surfaciques* (Ville de Québec)

```
Fiche   : https://www.donneesquebec.ca/recherche/dataset/hydrographie-cours-d-eau-surfaciques
GeoJSON : https://www.donneesquebec.ca/recherche/dataset/5d725484-a008-4c53-a0be-33798b69518d/resource/6212d1e9-5568-4877-b5a8-6d5f43fb54a2/download/vdq-hydrocourseauxsurface.geojson
```

Prendre les **surfaciques** (polygones), pas « Centre cours d'eau » (axes) : on
compte des plans d'eau.

⚠️ Couvre le **seul territoire de la Ville de Québec**, alors que le bassin
déborde sur quatre municipalités. Prévoir la **GRHQ** du MRNF pour le reste.
Sans cela, tout décompte de plans d'eau porte sur une fraction du bassin.

### 4. APEL / Agiro → `apel/`

*Faire autrement pour une protection des milieux naturels et des ressources en
eau* (2017, 122 p.) — lien dans `SOURCES.md` § 4.

**À lire avant de saisir quoi que ce soit** : il n'est pas établi que ce
document contienne l'inventaire des plans d'eau par statut réglementaire. C'est
le point bloquant de l'indicateur n° 1. Voir le journal du 2026-09-11.

### 5. Population → `isq/`

ISQ ou Statistique Canada, pour les cinq municipalités du bassin. Aucun
géotraitement : c'est un CSV.
