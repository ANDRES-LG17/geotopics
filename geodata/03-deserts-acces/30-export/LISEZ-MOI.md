# 30 — Export : la frontière avec le site

Ce qui sort d'ici est copié vers `public/data/` et servi au navigateur. Le nom
porte déjà sa version :

```
sujet-v1.geojson
```

`next.config.ts` marque `/data/*` comme `immutable` pour un an : **un fichier
publié ne doit jamais changer de contenu**. Pour mettre à jour, écrire `-v2`,
changer la source dans `src/labs/<sujet>.ts`, puis supprimer `-v1`.

## Avant de copier

- [ ] **EPSG:4326** — MapLibre ne lit que ça ;
- [ ] coordonnées arrondies à 4 décimales (≈ 11 m) ;
- [ ] géométries simplifiées au détail que le zoom maximal justifie ;
- [ ] uniquement les champs réellement affichés — le reste voyage pour rien ;
- [ ] un bloc `metadata` : script générateur, date, source ;
- [ ] poids vérifié :

| Poids | Verdict |
| --- | --- |
| < 500 Ko | sans problème |
| 500 Ko – 2 Mo | acceptable si la carte est le sujet de l'entrée |
| > 2 Mo | simplifier, arrondir, ou passer aux tuiles vectorielles |

- [ ] aucune donnée personnelle, aucune adresse précise ;
- [ ] licences de `SOURCES.md` compatibles avec la redistribution.

## Export reproductible

Un export fait à la main dans QGIS est difficile à refaire à l'identique. Dès
qu'un jeu de données est amené à être mis à jour, écrivez le script dans
`scripts/` — il est versionné, lui, et c'est lui qui rend le travail
reproductible par quelqu'un qui n'a pas vos fichiers.
