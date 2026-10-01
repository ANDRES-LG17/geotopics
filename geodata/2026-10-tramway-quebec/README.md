# TramCité — parcourir la ligne avant qu'elle existe

Deuxième projet de l'atelier. **Une carte qu'on parcourt** : les 19,3 km du
tramway de Québec, station par station, sur la ville en trois dimensions.

L'idée tient en une phrase : **personne ne connaît encore ce tracé**. La carte
le fait découvrir — quels quartiers, quelles rues, et où la ligne plonge sous la
colline parlementaire.

## La problématique

Le parcours attire ; la mesure fait le travail.

> Une ligne unique, en service en 2033, dans une région où l'automobile assure
> **78,3 %** des déplacements et où la part du transport collectif est passée de
> 13,7 % à **14,5 %** en dix-sept ans. **Qu'est-ce que cette ligne dessert
> réellement ?**

Trois chiffres à calculer, pas à citer : la population à moins de 800 m d'une
station, le volume bâti desservi par station, et les secteurs denses que le
tracé manque. Le détail est en § « La problématique » de `CONCEPTION.md`.

**Commencer par `CONCEPTION.md`** — la problématique, les sept séquences du
parcours, les 29 stations, et les réglages repris à la référence visuelle
([Oslo · Et kart å utforske](https://norway-charts.netlify.app/oslo_kart/)).

## La règle de ce projet

> **Voir quelque chose à l'écran le plus tôt possible.**

Une séquence, hauteurs OSM, palette « day ». Ça suffit à valider le rendu. La
mesure de la desserte vient ensuite — et c'est elle qui distingue ce lab d'une
visite guidée.

## Les trois choses à valider tôt

1. **La scène du tunnel.** Comment montre-t-on une ligne enfouie à 15-40 m ?
   C'est le geste graphique le plus délicat et le plus payant — à prototyper
   avant tout le reste.
2. **Le poids.** Le bâti pèse, la ligne non. Le parcours en scènes permet de
   n'avoir du bâti détaillé que là où la caméra se pose.
3. **La hauteur des bâtiments.** Trois voies (§ 5) ; OSM suffit pour publier.

## Ce qui est déjà en place côté site

`LabScene` existe déjà dans `src/labs/types.ts` — `view`, `caption`, `layers`,
`duration`. **C'est exactement le dispositif du parcours.** Lac Saint-Charles ne
s'en servait pas ; ce lab sera le premier.

Il manque `terrain` et `light`, et le traitement de la ligne enfouie.

## Ce qui existe déjà ailleurs

[tramquebec.00h11.ca](https://tramquebec.00h11.ca/) a traité le corridor en 2D :
densité, valeur foncière, aires de marche. **À citer dans l'entrée.** Notre
apport est le parcours et le volume.

## Les trois notes de ce dossier

| | Quand l'écrire | Ce qu'elle porte |
| --- | --- | --- |
| `CONCEPTION.md` | avant de commencer | le cadrage, figé une fois pris |
| `SOURCES.md` | au téléchargement de chaque jeu | URL, licence, millésime, limites |
| `JOURNAL.md` | au fil de l'eau | ce qui a été fait, et **pourquoi** |

Ces trois fichiers sont les seuls de ce dossier que git versionne — les données
sont à votre charge.

Le mode d'emploi complet est dans `geodata/README.md`.
