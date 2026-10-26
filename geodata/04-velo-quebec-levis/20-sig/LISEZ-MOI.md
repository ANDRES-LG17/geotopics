# 20 — SIG : le projet, selon l'outil

Un sous-dossier par logiciel, créé au besoin :

```
20-sig/
├── qgis/          ← .qgz  (+ styles/ pour les .qml)
├── arcgis/        ← .aprx, .lyrx
└── autocad/       ← .dwg, .dxf
```

## Chemins relatifs — non négociable

QGIS : **Projet ▸ Propriétés ▸ Général ▸ Chemins « relatif »**.
ArcGIS Pro enregistre en relatif par défaut ; vérifiez-le quand même.

Sans cela, le dossier cesse d'être déplaçable : une sauvegarde restaurée
ailleurs, ou simplement un disque qui change de lettre, s'ouvre sur des couches
introuvables.

## Exportez les styles

Clic droit sur la couche ▸ Exporter ▸ Enregistrer comme fichier de style QGIS,
vers `styles/`. Un `.qml` est du XML : il se relit, il se compare, et il survit à
un projet corrompu. Un style qui n'existe que dans le `.qgz` est perdu avec lui.

## AutoCAD

Le DWG reste ici ; la conversion vers un format SIG appartient à `10-travail/`.
Notez dans `JOURNAL.md` l'hypothèse de géoréférencement retenue — un DWG en
coordonnées locales ne devient une donnée géographique qu'au prix d'une décision
qu'il faut pouvoir justifier.
