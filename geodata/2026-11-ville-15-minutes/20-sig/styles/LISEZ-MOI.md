# Styles exportés

Les `.qml` (QGIS) ou `.lyrx` (ArcGIS) exportés depuis le projet.

Un style qui n'existe que dans le `.qgz` disparaît avec lui. Exporté ici, c'est
du XML : relisible, comparable dans un diff, réutilisable sur un autre projet.

Les palettes destinées à servir sur plusieurs projets migrent vers
`geodata/_commun/styles/` — quand elles servent au troisième, pas avant.
