# 15 — Saisie manuelle

Étage ajouté pour ce projet : le statut réglementaire des plans d'eau du bassin
**n'existe en données ouvertes nulle part**. Il est lu dans le mémoire de l'APEL
au BAPE et saisi à la main.

Une donnée saisie à la main est une donnée que **vous** produisez. Elle n'est pas
moins bonne que celle d'un portail, mais elle n'a de valeur que si sa provenance
est traçable ligne par ligne : d'où la colonne `source_page` dans le CSV.

C'est un étage à part, pas `00-brut/` (ce n'est pas un téléchargement) ni
`10-travail/` (ce n'est **pas** reconstructible : le refaire, c'est le refaire à
la main).

## Sauvegarde

Le seul fichier du projet qui ne peut être régénéré par aucun script. À traiter
comme `00-brut/` : il est irremplaçable.

## Règles de saisie

- une ligne par plan d'eau, jamais de ligne « divers » ou « autres » ;
- `statut` prend une valeur d'une liste fermée — voir l'en-tête du CSV ;
- dans le doute, `statut = a_verifier` plutôt qu'une supposition : une case vide
  se repère, une supposition se propage jusqu'à la carte publiée ;
- `source_page` obligatoire — la page du mémoire, pas « le mémoire » ;
- encodage **UTF-8**, séparateur **virgule**.

## La jointure vers la géométrie

Le nom d'un plan d'eau ne suffit pas comme clé : les graphies varient d'un jeu à
l'autre (« Lac Saint-Charles » / « Lac St-Charles »). Le CSV garde donc à la fois
`nom` (lisible, pour l'affichage) et `id_hydro` (l'identifiant de la couche
hydrographique, pour la jointure).

Remplir `id_hydro` **dans QGIS**, en cliquant chaque entité : c'est le seul moyen
de garantir que la ligne saisie correspond bien au polygone affiché. Les lignes
sans `id_hydro` ne seront pas jointes — le script doit le signaler bruyamment
plutôt que les laisser disparaître en silence.
