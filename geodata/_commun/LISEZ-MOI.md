# Commun — ce qui n'appartient à aucun projet

```
_commun/
├── referentiels/   ← limites administratives, MNT régional, fonds réutilisés
├── styles/         ← palettes .qml maison, cohérentes d'un projet à l'autre
└── scripts/        ← utilitaires de préparation partagés
```

**Une donnée arrive ici quand elle sert au troisième projet**, pas avant.
Factoriser trop tôt coûte plus cher que dupliquer : on paie le coût de
l'abstraction sans jamais en toucher le bénéfice.

`referentiels/` garde sa propre traçabilité : un `SOURCES.md` ici aussi, avec la
même exigence — fournisseur, URL, millésime, licence.

Attention à la distinction avec `scripts/` à la racine du dépôt : celui-ci est
versionné et produit les données publiées ; `_commun/scripts/` reste local,
pour les utilitaires d'atelier qui n'ont pas vocation à être publiés.
