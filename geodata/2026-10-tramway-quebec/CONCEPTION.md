# TramCité — parcourir la ligne avant qu'elle existe

Lab interactif pour GeoTopics — deuxième projet de l'atelier.

**Nature du projet : une carte qu'on parcourt.** Le lecteur suit les 19,3 km du
tramway de Québec, station par station, sur la ville en trois dimensions. Il
voit ce que la ligne traverse, où elle plonge sous la colline, quels quartiers
elle relie.

## L'idée

> **Personne ne connaît encore ce tracé. La carte le fait parcourir.**

Le tramway est annoncé depuis des années, débattu, financé — et pourtant presque
personne ne saurait dire par où il passe réellement. Quels quartiers. Quelles
rues. Où il disparaît sous terre et où il ressort.

**Ce que ça donne à voir, concrètement** — le Gendre en périphérie, la traversée
de Sainte-Foy, le campus de l'Université Laval, la montée de René-Lévesque, la
plongée en tunnel sous la colline parlementaire, la ressortie sur de la
Couronne, Saint-Roch, puis la 1re Avenue jusqu'à Charlesbourg. **Sept ambiances
de ville en dix-neuf kilomètres.**

---

## La problématique

Le parcours seul serait une belle visite guidée. Ce qui en fait un travail, c'est
la question que les chiffres posent — et à laquelle le tracé répond
partiellement.

> **Une ligne unique, mise en service en 2033, dans une région où
> l'automobile assure 78 % des déplacements et où la part du transport
> collectif n'a pas bougé depuis 2006.**
>
> Qu'est-ce que cette ligne dessert réellement ?

Ce n'est pas une question rhétorique : **elle se mesure.** Le tracé passe là où
il passe, et pas ailleurs. Ce qu'il atteint — et ce qu'il n'atteint pas — est
une donnée, pas une opinion.

### Les trois constats qui la fondent

**1. Le transport collectif est immobile depuis dix-sept ans.**

Part modale du TC en pointe du matin, EOD 2006 à 2023 :

| | 2006 | 2011 | 2017 | 2023 |
| --- | --- | --- | --- | --- |
| Agglomération de Québec | 13,7 % | 15,1 % | 14,1 % | **14,5 %** |
| Ville de Lévis | 6,4 % | 6,2 % | 7,5 % | 8,6 % |
| Couronne nord | 1,3 % | 2,3 % | 2,2 % | **1,9 %** |
| **Total** | 10,7 % | 11,5 % | 10,9 % | **11,2 %** |

Quatre enquêtes, dix-sept ans, **+0,5 point** dans l'agglomération. La couronne
nord a reculé sous son niveau de 2011. Sur 24 heures, le TC ne représente que
**6,9 %** des déplacements contre **78,3 %** pour l'automobile.

**2. La croissance se fait là où le TC n'existe pas.**

L'EOD 2023 est explicite : la croissance démographique est « plus marquée en
périphérie qu'au centre ». Or c'est en périphérie que la part du TC est la plus
faible — 1,9 % dans la couronne nord — et que la motorisation est la plus
haute : **1,84 véhicule par ménage** dans la couronne sud contre **1,25** dans
l'agglomération.

**La population croît là où le réseau est le plus faible.** C'est le constat le
plus fort du dossier, et il est cartographiable.

**3. Des signaux contraires, dans les deux sens.**

À porter honnêtement, parce qu'ils nuancent :

| Signal | Sens |
| --- | --- |
| Motorisation 1,44 → **1,37** (2017-2023), première baisse depuis 2006 | favorable |
| Permis de conduire chez les 15-24 ans : **−2,2 points** | favorable |
| Vélo : seul mode en croissance continue depuis 2006 | favorable |
| Achalandage RTC 2025 : **−6 %** (29,6 M), première baisse post-pandémie | défavorable |
| Télétravail hybride : 3,0 % (2022) → **18,2 %** (2024) | ambigu |
| Essence : **+67 %** en dollars courants depuis 2006, sans effet sur la part du TC | révélateur |

Le dernier mérite d'être souligné : **le prix de l'essence a augmenté des deux
tiers sans déplacer la part modale.** Le coût seul ne change pas les
comportements — c'est un argument classique en mobilité durable, et les données
locales le confirment.

### Ce que la carte mesure

La problématique ci-dessus est le contexte. **Ce que le lab apporte en propre**,
c'est la mesure de ce que la ligne dessert — trois chiffres à calculer, pas à
citer :

1. **Combien de personnes habitent à moins de 800 m d'une station ?**
   Population du recensement 2021 croisée avec les aires de marche. Rapporté à
   la population de l'agglomération, cela donne la couverture réelle de la
   ligne.
2. **Quel volume bâti chaque station dessert-elle ?** C'est la lecture 3D : une
   station entourée de tours ne dessert pas la même chose qu'une station
   entourée de stationnements. Comparable d'une station à l'autre.
3. **Où le tracé passe-t-il à côté de la densité ?** Les secteurs denses situés
   hors des 800 m. C'est la question la plus intéressante, et la plus
   cartographique.

**Ce que la carte ne prétend pas dire** — ni que le tramway est une bonne ou une
mauvaise décision, ni ce qu'il faudrait construire à la place. Elle mesure une
couverture, sur un tracé arrêté. Le débat politique ne se tranche pas avec une
aire de marche.

*Note de méthode à écrire — une aire de marche de 800 m à vol d'oiseau surestime
toujours la desserte : rivières, autoroutes et falaises coupent des trajets qui
paraissent courts. Si le calcul se fait à vol d'oiseau, le dire ; si le réseau
piéton réel est utilisé, le dire aussi.
[tramquebec.00h11.ca](https://tramquebec.00h11.ca/) a fait ce calcul sur réseau
réel — méthode à citer.*

État : **cadrage**.

> `JOURNAL.md` pour ce qui change en cours de route, `SOURCES.md` pour la
> provenance des données. Ici, le cadrage.

**Référence visuelle** — [Oslo · Et kart å utforske](https://norway-charts.netlify.app/oslo_kart/),
décortiqué en § 6. Ses 49 lieux nommés, chacun avec son cadrage et ses deux
phrases, sont exactement le dispositif à reprendre — appliqué cette fois à une
ligne plutôt qu'à une ville entière.

---

## 1. Le dispositif : un parcours en scènes

C'est le cœur du projet, et c'est ce que `LabScene` sait déjà faire.

Le lecteur avance par **boutons** — jamais par défilement détourné, qui casse la
lecture de la page et ne se pilote pas au clavier. À chaque scène, la caméra se
déplace, une légende s'affiche, et certaines couches apparaissent.

### Les sept séquences pressenties

Une par ambiance de ville, pas une par station — 29 scènes seraient une
corvée.

| # | Séquence | Ce qu'on y voit |
| --- | --- | --- |
| 1 | **Le Gendre → Chaudière** | Le terminus ouest, en périphérie. Tissu discontinu, grands stationnements |
| 2 | **Sainte-Foy** | Boulevard Laurier, les tours, le pôle d'échanges |
| 3 | **Université Laval** | La traversée du campus |
| 4 | **René-Lévesque** | La montée vers la haute-ville, tissu résidentiel dense |
| 5 | **Le tunnel** | **Le moment fort.** La ligne plonge sous la colline parlementaire |
| 6 | **Saint-Roch** | La ressortie en basse-ville, le pôle d'échanges |
| 7 | **1re Avenue → Charlesbourg** | La remontée vers le terminus nord |

**La scène 5 est celle qui fait le projet.** 1,8 à 2 km sous terre, à 15-40 m de
profondeur, parce que la pente entre basse-ville et haute-ville atteint **12 %**
là où un tramway sur rail franchit **6 à 9 %**. C'est un fait géomatique pur,
il s'explique en une phrase, et presque personne ne le sait.

*À concevoir : comment montrer une ligne enfouie ? Piste — la ligne passe en
tireté et s'enfonce visiblement sous la surface du terrain, pendant que le bâti
au-dessus devient translucide. À tester tôt : c'est le geste graphique le plus
délicat et le plus payant du lab.*

### Les 29 stations

Toutes présentes, toutes nommées, toutes survolables. **C'est ce que le lecteur
vient chercher** : « est-ce que ça passe près de chez moi ? »

Ordre d'ouest en est : Le Gendre · Chaudière · McCartney · Pie-XII · Bégon ·
Duchesneau · Roland-Beaudin · Sainte-Foy · CHUL · Place Sainte-Foy ·
Université Laval · Desjardins · Myrand · Maguire · Holland ·
Collège Saint-Charles-Garnier · Belvédère · Brown · Cartier ·
**Colline Parlementaire** · **D'Youville** · Jean-Paul-L'Allier · Saint-Roch ·
9ᵉ Rue · Hôpital Saint-François D'Assise · 18ᵉ Rue · Patro Roc-Amadour ·
Des Peupliers · Charlesbourg.

*(Colline Parlementaire et D'Youville sont les deux stations souterraines.)*

Quatre **pôles d'échanges** à marquer différemment : Sainte-Foy, Université
Laval, Saint-Roch, Charlesbourg.

## 2. Le critère de réussite

| | |
| --- | --- |
| **On apprend quelque chose** | « je ne savais pas que ça passait là » |
| **Un chiffre reste en tête** | la couverture de la ligne, mesurée, pas citée |
| **Elle est belle** | on a envie de la faire tourner |
| **Le parcours se suit** | sept scènes, chacune lisible en quelques secondes |
| **Elle tourne partout** | téléphone compris, sans saccade |
| **Elle tient dans le budget** | < 2 Mo, idéalement < 500 Ko |
| **Elle est honnête** | sources citées, millésimes dits, approximations assumées |

**Le registre visé** — celui de Lac Saint-Charles : un travail qui mesure, cite
ses sources et assume ses limites, et qui se lit en cinq minutes. Un exercice
académique complet, pas un mémoire.

Ce qui n'est **pas** un critère : l'exhaustivité, la revue de littérature, la
prospective. La carte mesure un état ; elle ne prédit rien.

## 3. Les couches, par ordre d'importance

### 1. Le tracé et les 29 stations *(le sujet)*

La ligne, nette, au-dessus de tout. Les stations en points nommés, survolables.
Le tunnel traité à part (§ 1).

### 2. Le bâti en volume *(ce qui donne le parcours)*

Bâtiments extrudés, couleur unique et calme — c'est le parti d'Oslo, et c'est ce
qui laisse la ligne ressortir. **Sans le bâti, un parcours de station en station
n'est qu'un trait sur un fond.** C'est le volume qui fait qu'on traverse
*quelque chose*.

### 3. Le relief

MNT lidar, ombrage discret. Indispensable ici : **c'est le relief qui explique
le tunnel.** À la scène 5, on doit voir la côte.

### 4. Les aires de marche et la population desservie *(la mesure)*

Le rayon de 800 m autour de chaque station, et la population qu'il contient.
**C'est ce qui porte la problématique** (§ La problématique, « ce que la carte
mesure ») : sans cette couche, le lab est une visite guidée.

Deux lectures possibles, à trancher :

- **par station** — chaque station porte son chiffre, survolable. Permet le
  classement et la comparaison ;
- **en continu** — un dégradé de densité sous le tracé, qui montre d'un coup où
  la ligne longe du monde et où elle traverse du vide.

*Les deux sont compatibles : le dégradé donne la vue d'ensemble, l'infobulle
donne le détail. C'est le dispositif de Lac Saint-Charles.*

### 5. Le réseau du RTC *(en appui, discret)*

Les parcours d'autobus en lignes très fines, en fond. Ils situent le tramway
dans ce qui existe. **À n'activer que sur certaines scènes** — aux pôles
d'échanges, où la correspondance est le sujet.

### 6. Le réseau cyclable et les stations àVélo

Même rôle d'appui. Données propres et légères.

### Ce qui reste hors de la carte

Fréquentation, temps de parcours, valeur foncière, coûts. Les parts modales et
les chiffres de contexte vont dans le texte de l'entrée (annexe), pas dans les
couches — **sauf** ceux que le lab calcule lui-même (§ La problématique).

Valeur foncière et terrains vacants le long du tracé : déjà traités, et bien,
par [tramquebec.00h11.ca](https://tramquebec.00h11.ca/). **À citer dans
l'entrée** — et à ne pas refaire. Leur calcul d'aires de marche sur réseau
piéton réel est la référence méthodologique.

## 4. Zone d'étude

- **Emprise** : le corridor du tracé, avec une marge de part et d'autre —
  environ 800 m, la distance de marche usuelle ;
- **SCR de travail** : EPSG:2949 (MTM fuseau 7) ;
- **SCR de sortie** : EPSG:4326, imposé par MapLibre.

**La contrainte est le poids du bâti.** La ligne et les stations ne pèsent
rien ; les bâtiments, si. Le parcours en scènes offre toutefois une porte de
sortie élégante : **on n'a besoin de bâti détaillé que là où la caméra se
pose.** Trois issues, à trancher après mesure :

1. **bâti détaillé sur les sept séquences seulement**, sommaire ailleurs ;
2. **bâti simplifié sur tout le corridor** ;
3. **tuiles vectorielles** — la vraie solution, plus de travail.

*Point de départ recommandé : une seule séquence, complète, pour mesurer.*

## 5. Données

Fiches complètes dans `SOURCES.md`, **au téléchargement**.

| Donnée | Source | Existe ? | Notes |
| --- | --- | --- | --- |
| **Tracé du tramway** | Relation OSM « Le Tramway de Québec » | **oui** (19,1 km) | Le vectoriel officiel n'est **pas** ouvert — à dire dans la note |
| **Les 29 stations** | tramcite.info / Wikipédia / OSM | oui | Noms vérifiés (§ 1). Positions à extraire d'OSM, à contrôler |
| **Section en tunnel** | tramcite.info / plans de la Ville | oui | Du jardin Jean-Paul-L'Allier à l'avenue Turnbull |
| **Parcours et arrêts du RTC** | `cdn.rtcquebec.ca/…/ESRI_SHPFILES.zip` | **oui** | Contient arrêts, parcours, stations **àVélo**, zones Flexibus |
| Horaires / fréquences | `cdn.rtcquebec.ca/…/googletransit.zip` (GTFS) | oui | Seulement si on module l'épaisseur des lignes |
| **Réseau cyclable** | Ville de Québec / Données Québec | **oui** | Piste, bande, chaussée désignée |
| **Empreintes de bâtiments** | OSM | oui | Gratuit, immédiat |
| **Hauteur / étages** | OSM `height` / `building:levels`, puis rôle foncier | oui | Voir ci-dessous |
| **MNT (relief)** | Lidar Québec — produits dérivés | **oui, gratuit** | À convertir en tuiles `raster-dem` |
| **Population par aire de diffusion** | Recensement 2021 — Statistique Canada | **oui** | Pour la population desservie. Les AD sont l'échelon le plus fin diffusé |
| **Réseau piéton** | OSM | oui | Pour une aire de marche réelle plutôt qu'à vol d'oiseau. Trottoirs souvent absents en périphérie — **limite à dire** |
| Résultats EOD 2023 | MTMD / CMQuébec | à vérifier | Seulement si une désagrégation par secteur est diffusée. Sinon, les chiffres restent du contexte cité |

**Licence du RTC** — usage personnel et commercial permis, attribution
obligatoire **avec date de mise à jour** :

> « Application, produit ou service, intégrant les Informations publiques du
> Réseau de transport de la Capitale, mises à jour le \_\_\_\_\_\_\_\_. »

À reprendre mot pour mot dans le champ `attribution` du lab.

### La hauteur des bâtiments

Trois voies, par coût croissant :

1. **OSM `height` / `building:levels`** — immédiat, couverture partielle.
   **Commencer par là.** Oslo assume ce repli et le dit à l'écran ;
2. **rôle foncier géoréférencé** — « nombre d'étages » × ~3 m. Couvrant,
   officiel, approximatif ;
3. **MNS − MNT (lidar)** — la hauteur mesurée. La plus juste, la plus lourde.

**La voie 1 suffit à publier.** Les autres font l'amélioration d'une version
suivante — et le sujet d'un second partage.

## 6. Ce qu'on prend à Oslo

Bundle analysé : React + MapLibre, fond **OpenFreeMap — le même que notre lab
actuel**.

### Le dispositif des lieux nommés — *ce qui compte le plus ici*

49 lieux, chacun avec un identifiant, un nom, un **eyebrow en capitales**, deux
phrases écrites à la main, et un cadrage (`coordinates`, `zoom`, `bearing: -12`
constant) :

> **Bjørvika** — OPERAEN OG BARCODE
> « Le toit de l'Opéra s'élève droit du fjord, et derrière lui Barcode
> s'aligne. La partie la plus récente d'Oslo, bâtie là où passaient les voies
> du port. »

**C'est le modèle exact de nos sept séquences.** Le `bearing` constant donne une
signature visuelle : toutes les vues se ressemblent, la ville tourne mais
l'angle tient.

### Les trois palettes

```
        land      water     green     forest    road      building  line      light     shade
day     #e6e9dc   #8fc7ca   #b8c99e   #acbf97   #f5f3e7   #e0dfce   #d3d9c9   #fff9e8   #6d8074
evening #ded7c5   #799da8   #a8b38c   #9da886   #ece1c9   #eed7b7   #c6beac   #ffbe81   #806f77
night   #253b40   #142c38   #304c46   #2b4741   #647271   #72867f   #344c50   #c6e1f0   #10262c
```

Ce n'est pas un filtre de luminosité : la lumière change de teinte (crème →
orange → bleu froid). **La nuit fait ressortir une ligne lumineuse sur ville
sombre** — probablement le rendu à partager.

### Les réglages qui font le rendu

```js
// lumière
light: { anchor: "map", color: light, intensity: 0.32, position: [1.5, 210, 35] }

// terrain
{ type: "raster-dem", encoding: "terrarium", tileSize: 512, maxzoom: 15 }
hillshade: { "hillshade-exaggeration": 0.22 }   // discret : on sent le relief

// bâtiments
"fill-extrusion-height": ["max", 5, ["coalesce", ["get","render_height"], 8]]
"fill-extrusion-vertical-gradient": true         // le dégradé sur les façades
```

Plancher à 5 m, repli à 8 m : un bâtiment sans hauteur ne s'écrase pas à zéro.
**`vertical-gradient` fait une grande part de la beauté.**

Vue initiale d'Oslo : `pitch: 35`, `bearing: -12`.

### Ce qu'on laisse

Les huit flux temps réel. Notre règle — un lab ne dépend de rien d'extérieur —
existe pour que le carnet survive à ses dépendances. Un lien partagé doit encore
marcher dans six mois.

## 7. Ce qu'il faut ajouter au vocabulaire des labs

`src/labs/types.ts` ne connaît ni terrain ni lumière :

```ts
terrain?: { dem: string; exaggeration?: number };
light?: "day" | "evening" | "night";
```

**`LabScene` existe déjà** — `id`, `label` bilingue, `caption`, `view`,
`layers`, `duration` — et c'est exactement le dispositif du parcours.
`LabHeight` gère déjà l'extrusion portant une donnée. **L'essentiel est en
place** : il manque le terrain, la lumière, et le traitement de la ligne
enfouie.

*Lac Saint-Charles n'utilise pas les scènes — il les avait écartées parce que
son propos tenait sur une seule image. Ici c'est l'inverse : le parcours EST le
sujet. Le vocabulaire prévoyait le cas ; ce lab sera le premier à s'en servir.*

## 8. La chaîne

```
geodata/2026-10-tramway-quebec/          ← ce dossier
scripts/analysis/tramway-quebec.py       ← la méthode, versionnée
public/data/tramway-quebec-v1.geojson    ← le budget de poids décide de l'emprise
src/labs/tramway-quebec.ts               ← + une ligne dans src/labs/index.ts
content/entries/tramway-quebec.fr.md     ← l'entrée
content/entries/tramway-quebec.en.md     ← la même, en anglais
```

## 9. Prochaines étapes

L'ordre compte : **voir quelque chose à l'écran le plus tôt possible.**

**Le visuel d'abord**

- [ ] récupérer le tracé et les 29 stations depuis OSM ; contrôler les noms
      contre la liste du § 1
- [ ] identifier précisément la section en tunnel
- [ ] extraire le bâti OSM d'**une seule séquence** (Saint-Roch ou la colline)
- [ ] mesurer le poids → décide de la stratégie d'emprise (§ 4)
- [ ] étendre `types.ts` : `terrain`, `light` — puis `LabMap`
- [ ] **première vue 3D à l'écran** avec la ligne, palette « day »
- [ ] **prototyper la scène du tunnel** — le geste le plus délicat, à valider tôt

**La mesure ensuite** *(c'est elle qui fait le travail, pas la visite guidée)*

- [ ] télécharger les aires de diffusion et la population (recensement 2021)
- [ ] calculer les aires de marche de 800 m — à vol d'oiseau d'abord, sur réseau
      piéton si le temps le permet ; **dire laquelle dans la note**
- [ ] **population desservie, par station et au total** — le chiffre à retenir
- [ ] volume bâti par station — la lecture 3D de la desserte
- [ ] repérer les secteurs denses **hors** des 800 m : ce que la ligne manque
- [ ] recouper le total avec la population de l'agglomération : quel pourcentage ?

**Le rendu**

- [ ] MNT lidar → tuiles `raster-dem`
- [ ] écrire les sept scènes : cadrage, titre, deux phrases chacune (FR + EN)
- [ ] tester la palette « night »
- [ ] rédiger la note de méthode : hypothèses, limites, ce qui est approximé
- [ ] publier avec `labOnly: true`, partager, puis étendre

**Le piège à éviter** : accumuler des données avant d'avoir vu la carte tourner.
**L'autre piège** : s'arrêter à la visite guidée. Le parcours attire ; c'est la
mesure qui fait le travail.

---

## 10. Le tableau de bord

*Concept arrêté le 2026-10-05, avant toute conception graphique ni code.*

### Le public, et le registre

Le lab s'adresse à **tout public** — un citoyen venu de LinkedIn doit pouvoir
manipuler la carte et en saisir l'objectif en quelques secondes. Il reste
pourtant **un outil technique** : les termes sont exacts, le registre est
**formel et impersonnel**, comme dans un rapport. Ni « voisins » ni « la ville
que vous perdez » : *population desservie*, *aire de marche*, *cercle
théorique* — chacun accompagné d'une définition courte.

### Les cinq principes

1. **Rigueur des termes, clarté de la présentation.** Chaque terme technique
   porte une définition d'une ligne, accessible sur place (« ? »).
2. **Toute valeur s'accompagne d'une comparaison.** « 4 747 habitants » isolé
   ne dit rien ; « 22ᵉ sur 29, moyenne de la ligne : 5 900 » situe.
3. **Une hiérarchie de lecture :** un chiffre principal, puis les graphiques,
   puis les indicateurs détaillés. Rien n'est caché ; tout se lit dans l'ordre.
4. **Une phrase de synthèse par station**, générée à partir des données, au
   registre d'un rapport : c'est elle qui rend le constat lisible pour un
   non-spécialiste.
5. **La méthode et les sources toujours accessibles**, repliées en pied de
   panneau.

### La composition du panneau

```
┌───────────────────────────────────────┐
│ Pôle d'échanges Saint-Roch    23 / 29 │
│                                       │
│ POPULATION DESSERVIE · 8 MIN À PIED   │
│ 4 120 habitants                       │
│ 22e sur 29 stations · moyenne 5 900   │
│                                       │
│ Durée de marche   ●━━━━━━━○──── 8 min │
│                                       │
│ AIRE DE MARCHE ET CERCLE THÉORIQUE  ? │
│   ha                                  │
│    │         ╱ cercle théorique       │
│    │      ╱ ●                         │
│    │   ╱ ─── aire de marche réelle    │
│    └──────────────────────── min      │
│ « La rivière Saint-Charles limite     │
│   l'aire de marche à 41 % du cercle   │
│   théorique. »                        │
│                                       │
│ MODE DE TRANSPORT DOMICILE–TRAVAIL  ? │
│      ◯        ■ Automobile      62 %  │
│     62 %      ■ Transport collectif 21│
│  automobile   ■ Transport actif   17 %│
│                                       │
│ INDICATEURS                           │
│ Aire de marche           72,7 ha      │
│ Cercle théorique         98,5 ha      │
│ Part du cercle atteinte  74 %         │
│ Rues parcourues          26,8 km      │
│                                       │
│ ▸ Méthode et sources                  │
└───────────────────────────────────────┘
```

*(Valeurs illustratives.)*

### Les éléments

**En-tête** — nom de la station, statut (*pôle d'échanges* ou station), rang
sur la ligne (n / 29).

**Chiffre principal** — la population desservie à la durée choisie, avec son
**rang** parmi les 29 stations et la **moyenne de la ligne** à la même durée.

**Courbe « aire de marche et cercle théorique »** — deux courbes de 2 à 15 min :
le cercle qu'on atteindrait en ligne droite (gris, pointillé) et l'aire réelle
(cyan, la couleur de l'aire sur la carte). L'écart entre les deux est ce que le
terrain retranche — rivière, autoroute, falaise. **Un point suit le curseur.**
C'est le graphique qui porte le propos méthodologique du lab : le rayon
théorique de 800 m surestime la desserte.

**Anneau « mode de transport domicile–travail »** — part des résidents de
l'aire selon leur mode principal, regroupé en trois catégories : *Automobile*,
*Transport collectif*, *Transport actif* (marche et vélo). Au centre, la part
de l'automobile. **Il se recalcule avec le curseur**, l'aire couvrant d'autres
secteurs ; la transition doit être fondue, pour se lire comme une évolution et
non comme un saut. Couleurs : automobile en gris foncé, transport collectif en
violet (celui du tramway), transport actif en vert — jamais le cyan ni l'orange,
qui désignent déjà l'aire et les rues sur la carte.

**Phrase de synthèse** — générée selon le profil de la station : obstacle
principal (rivière, autoroute), part du cercle atteinte, rang.

**Indicateurs** — les valeurs techniques conservées : aire de marche (ha),
cercle théorique (ha), part du cercle atteinte (%), rues parcourues (km).

**Méthode et sources** — vitesse de 4,2 km/h et sa justification, réseau
piéton OSM, recensement de 2021, méthode de pondération par la surface,
origine des positions de stations.

### Les données nouvelles

- **Mode de transport domicile–travail**, recensement de **2021**, par aire de
  diffusion, réparti sur l'aire de marche par pondération de surface — même
  méthode que la population. Source : le profil du recensement déjà extrait
  (fichier de 6,5 Go, `00-brut/statcan`).
- **Limites à écrire dans la méthode :** le recensement date de **mai 2021, en
  pleine pandémie** — le transport collectif y est sous-représenté ; la
  donnée ne porte que sur les **personnes occupées travaillant hors du
  domicile** et provient du **questionnaire détaillé** (un ménage sur quatre).

### Les choix techniques

- Graphiques dessinés en **SVG, sans bibliothèque** : aucun poids ajouté.
- Les valeurs par palier (population, aires, modes de transport) sont
  **précalculées** dans les fichiers de station chargés au clic — le panneau
  n'effectue aucun calcul géographique.
- Sur téléphone, le panneau occupe 40 % de la hauteur : sections repliables.

### Écarté, pour l'instant

- La **courbe de population** (minutes → habitants) : redondante avec le
  chiffre principal et le curseur.
- Le **profil des 29 stations** en barres : fort, mais il charge le panneau ;
  à reconsidérer comme bandeau sous la carte.
- Les **services à 15 minutes** (écoles, épiceries, santé, depuis OSM) et les
  **correspondances du RTC** : seconde phase.

---

## Annexe — le contexte, pour le texte de l'entrée

Ces chiffres ne sont **pas** cartographiés. Ils situent, en deux ou trois
phrases. Les citer sans en tirer de conclusion.

**Le tramway**

- **19,3 km**, **29 stations**, de Le Gendre (Cap-Rouge) à Charlesbourg ;
- **4 pôles d'échanges** : Sainte-Foy, Université Laval, Saint-Roch,
  Charlesbourg ;
- **1,8 à 2 km en tunnel** sous la colline parlementaire, à **15-40 m** de
  profondeur ; deux stations souterraines (Colline Parlementaire, D'Youville) ;
- la pente entre basse-ville et haute-ville atteint **12 %** ; un tramway sur
  rail franchit **6 à 9 %** — d'où le tunnel ;
- itinéraire : rue Mendel, chemin des Quatre-Bourgeois, avenue Roland-Beaudin,
  boulevard Laurier, campus de l'Université Laval, boulevard René-Lévesque
  Ouest, tunnel, rue de la Couronne, 1re Avenue ;
- excavation du tunnel **devancée à 2026** ; chantier officiel en 2027 ; mise en
  service visée en **2033**.

**EOD 2023** *(MTMD, mai 2025 — 36 893 ménages, 41 municipalités)*

| | |
| --- | --- |
| Automobile, tous modes | **78,3 %** des déplacements (24 h) |
| Transport en commun | 6,9 % (24 h) · 11,2 % (pointe du matin) |
| Part du TC, agglomération de Québec | 14,1 % (2017) → 14,5 % (2023) |
| Motorisation des ménages | 1,44 (2017) → **1,37** (2023) — première baisse |
| Télétravail, RMR de Québec | 5,6 % (2016) → **28,5 %** (nov. 2023) |

**Contexte 2025-2026** — achalandage du RTC 2025 : 29,6 M de déplacements,
**−6 %**, première baisse depuis la pandémie, attribuée aux trois grèves de
l'année.
