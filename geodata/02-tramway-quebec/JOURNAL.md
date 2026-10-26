# Journal — Tramway de Québec (TramCité)

Ce qui a été fait, et **pourquoi**. Les gestes se retrouvent dans les fichiers ;
les décisions, non. C'est ici qu'on écrit les secondes.

Ce journal est la matière première de l'article : la section « ce qu'on a
supposé » s'écrit toute seule quand les hypothèses ont été notées au moment où
on les prenait.

---

## Question de départ

Faire parcourir les 19 km du futur tramway sur la ville en trois dimensions, et
mesurer ce que la ligne dessert réellement — la population à moins de 800 m de
chaque station.

## Zone d'étude et SCR

- **Emprise mesurée sur le tracé** `[ouest, sud, est, nord]` :
  `-71.3361, 46.7602, -71.2146, 46.8415`
- **SCR de travail** : EPSG:2949 (MTM fuseau 7) — projeté, pour que les mesures
  de distance et de surface aient un sens ;
- **SCR de sortie** : EPSG:4326 — imposé par MapLibre.

---

## 2026-10-01

**Fait** — récupéré le tracé depuis OpenStreetMap via Overpass, écrit
`scripts/build-tramway-quebec.mjs`, produit
`public/data/tramway-quebec-v1.geojson` (8 entités, 10,3 ko).

**Pourquoi OSM** — le vectoriel officiel n'est pas en données ouvertes.
Vérifié sur `tramcite.info/fr/le-trace` : la page offre une image cliquable et
une légende, **aucun fichier géospatial**. Le RTC ne diffuse que son réseau
d'autobus actuel. OSM est donc la seule voie praticable, et c'est une limite à
dire clairement dans la note du lab.

### Trois obstacles techniques, pour mémoire

1. **Overpass exige un `User-Agent`** — sans en-tête, il répond `406 Not
   Acceptable`, ce qui ressemble à une erreur de syntaxe et n'en est pas.
2. **Les requêtes à regex large expirent** (`504`). Il faut interroger un tag
   précis à la fois : `way["name"="Futur Tramway de Québec"]`.
3. **Aucune relation `route=tram` n'existe** pour ce tramway. Les requêtes
   évidentes renvoient zéro résultat. C'est Nominatim qui a donné le bon nom —
   la ligne n'étant pas construite, elle est portée par sept `way` isolés
   étiquetés `railway=proposed`.

### Le chaînage : une erreur et sa correction

**Hypothèse posée, puis abandonnée** — ranger les tronçons d'ouest en est, par
leur longitude minimale. Elle paraissait évidente pour une ligne qui va de
Cap-Rouge à Charlesbourg.

**Elle était fausse.** Le contrôle de continuité inscrit dans le script a
annoncé 24,14 km au lieu de 18,35 et trois ruptures, dont une de 4,3 km. La
cause est dans le tracé : **après le tunnel, la ligne remonte vers le nord**.
Un tri par longitude plaçait donc l'antenne de Charlesbourg au milieu, et la
ligne repartait en arrière.

**Ce que ça coûte si on ne le voit pas** — une carte qui dessine un aller-retour
fantôme et annonce 24 km. Le contrôle valait la peine d'être écrit avant d'en
avoir besoin.

**Correction** — un chaînage par extrémités, qui croît par les deux bouts de la
chaîne. Croître seulement par la fin ne suffit pas : le départ est choisi sur la
première extrémité libre rencontrée, et un court tronçon — le viaduc de 40 m —
peut n'avoir de voisin que d'un côté sans être le bout de la ligne.

**Ordre retenu** : `1110656734 → 1110656739 (tunnel) → 778997313 →
1012496032 → 1554915807 (viaduc)`, soit **17,46 km**.

### Les deux tronçons hors chaîne

Vérifié à la main sur la matrice des distances entre extrémités. Ils sont de
**nature différente**, et la distinction compte pour la note du lab :

| Tronçon | Longueur | Nature |
| --- | --- | --- |
| `1554915809` | 0,86 km | **Trou dans la donnée.** Montée Mendel, à 709 m du reste ; le tronçon intermédiaire est absent d'OSM |
| `1558354781` | 0,07 km | **Doublon de parcours.** Connecteur entre `1012496032` et `778997313`, deux tronçons qui se touchent déjà à 67 m |

Les deux sont écrits sous la couche `tronçon_isolé` : une donnée qu'OSM porte et
que la chaîne n'a pas prise reste une information. Le lab décidera de les
dessiner ou non.

**À vérifier** — le trou de la montée Mendel explique-t-il à lui seul l'écart de
1,54 km avec les 19 km annoncés ? 709 m de trou + 860 m de tronçon isolé
= 1,57 km, ce qui tombe juste. **À confirmer avant de publier le chiffre.**

### Écarts entre les sources, à trancher

| | tramcite.info | Wikipédia | OSM mesuré |
| --- | --- | --- | --- |
| Longueur | **19 km** | 19,3 km | 17,46 km (+ 0,86 isolé) |
| Stations | **29** | 29 | 1 |
| Pôles d'échanges | **5** | 4 | — |
| Tunnel | **2 km** | 1,8 km | 1,73 km |

Le site officiel dit **5 pôles d'échanges**, Wikipédia en nomme **4** (Sainte-Foy,
Université Laval, Saint-Roch, Charlesbourg). **Le cinquième reste à identifier.**

Pour le tunnel, les trois sources convergent autour de 1,7 à 2 km — l'ordre de
grandeur est sûr.

**Décision** — citer les chiffres **officiels** (19 km, 29 stations, 5 pôles) dans
le texte, et la longueur **mesurée** quand on parle de la géométrie dessinée.
Annoncer 19 km en dessinant 17,5 serait un mensonge par omission.

### Les 29 stations : point bloquant confirmé

**Une seule** entité trouvée dans OSM — way `1432347900`, « Future station de
tramway », étiquetée `landuse=brownfield` : un terrain, pas un arrêt.

Les 29 noms sont connus et vérifiés (Wikipédia, recoupé avec les secteurs de
`tramcite.info`). **Il manque les coordonnées.** Sans elles, pas d'aire de
marche, donc pas de mesure de population — c'est-à-dire pas de travail, seulement
une visite guidée.

**À trancher** — saisie manuelle dans `15-saisie-manuelle/` depuis les plans
publiés, comme le statut réglementaire du projet Lac Saint-Charles. C'est la voie
la plus probable. Conséquence à assumer : une station placée à 100 m près déplace
son aire de marche, et donc le chiffre de population.

### Le rendu 3D : ce que les tuiles permettent vraiment

**Fait** — étendu le vocabulaire des labs (`restyleLayers`, `light`, `cap`/`join`
sur les lignes), écrit `src/labs/tramway-quebec.ts`, carte à l'écran.

**Pourquoi repeindre le fond plutôt que servir nos bâtiments** — le style Liberty
d'OpenFreeMap porte déjà une couche `building-3d` en `fill-extrusion`, dont la
hauteur vient du champ `render_height` des tuiles OpenMapTiles. Télécharger les
empreintes de Québec pour redessiner ce que le fond dessine déjà coûterait des
mégaoctets. Le lab complet pèse **10,3 ko**.

**Hypothèse posée, puis corrigée deux fois.**

*Première version* — cadrer le corridor entier (17,5 km) et abaisser le `minzoom`
de la couche du fond à 11, pour que les volumes soient là dès l'ouverture. La
console a répondu `building-3d:0` : aucun bâtiment dessiné.

*Deuxième version* — abaisser à 13. Mieux : `building-3d:14`. Mais toujours à
plat.

**La cause, vérifiée sur les tuiles de Québec elles-mêmes :**

| Zoom | Couche `building` | Champ `render_height` |
| --- | --- | --- |
| 13 | **présente** | **absent** |
| 14 | présente | **présent** |

Les hauteurs n'existent qu'**à partir du zoom 14**. En dessous, la couche est là
mais ses entités n'ont pas d'épaisseur : extruder donnerait un sol colorié, pour
le même temps de calcul.

**Ce que ça coûte** — le cadrage d'ouverture ne peut pas montrer les 17,5 km. Il
faut ouvrir sur un quartier. **C'est la donnée qui commande le cadrage, pas
l'inverse** — et c'est aussi ce qui justifie le parcours en scènes : si l'on ne
peut pas tout voir d'un coup, autant faire avancer le lecteur.

**À vérifier** — le `maxzoom: 14` des tuiles signifie qu'au-delà le moteur
agrandit la dernière tuile. Jusqu'où cela reste-t-il net ? `maxZoom: 17.5` est un
pari à confirmer à l'œil.

### Le cadrage dépend de la fenêtre — et c'était le vrai défaut

**Constaté par l'usage** : la carte s'ouvrait sur un simple trait, sans aucun
bâtiment. Ma capture de contrôle, elle, les montrait.

**La cause** — cadrer une emprise donne un zoom qui dépend de la **taille du
conteneur**. La capture tombait au zoom **14,05** ; le seuil des hauteurs est à
**14,00**. Cinq centièmes de marge. Toute fenêtre plus petite passait en dessous,
et la ville s'aplatissait.

| Fenêtre | Zoom d'ouverture (ancienne emprise) | Volumes |
| --- | --- | --- |
| Écran large 1800×900 | 14,60 | oui |
| Ma capture 1326×630 | **14,05** | oui, de justesse |
| Fenêtre moyenne 1200×600 | 13,97 | **non** |
| Fenêtre étroite 900×500 | 13,69 | **non** |
| Téléphone 390×560 | 13,02 | **non** |

**Ce que ça coûte, et pourquoi c'est pernicieux** — aucune erreur n'est levée.
La couche existe, elle se dessine, elle est simplement plate. Sur un lab vérifié
une seule fois, à une seule taille de fenêtre, le défaut passe inaperçu —
jusqu'à ce qu'un lecteur ouvre la page sur un portable.

**Correction, à deux niveaux :**

1. **Dans le lab** — emprise d'ouverture réduite à ~1,2 × 0,9 km sur Saint-Roch
   et la colline ;
2. **Dans le vocabulaire** — `minZoom` sur les vues à emprise, qui interdit au
   cadrage de descendre sous un seuil même si l'emprise ne tient plus. Le lab
   demande 14,2, avec de la marge cette fois.

**Hypothèse assumée** — sur petit écran, l'emprise déborde du cadre. Mieux vaut
voir une partie de la scène en volume que la scène entière à plat.

**Leçon à retenir pour les labs suivants** — vérifier un rendu à **une seule
taille de fenêtre ne prouve rien** dès qu'une couche a un seuil de zoom. Le
plancher appartient au vocabulaire, pas au réglage d'un lab : tout lab qui
s'appuiera sur une donnée à seuil rencontrera le même piège.

### Trois obstacles d'outillage, pour mémoire

1. **Overpass exige un `User-Agent`** — sinon `406`, qui ressemble à une erreur
   de syntaxe.
2. **Les tuiles d'OpenFreeMap passent par une URL versionnée**
   (`/planet/20260927_080001_pt/{z}/{x}/{y}.pbf`), que seul le TileJSON donne.
   Interroger `/planet/{z}/{x}/{y}.pbf` directement renvoie 200 avec 0 octet —
   un faux négatif qui fait croire à une absence de couverture.
3. **Capturer la carte demande d'attendre le dessin**, pas un délai. Le
   `--virtual-time-budget` de Chrome gèle l'horloge et MapLibre ne finit jamais
   son rendu : capture blanche. Il faut piloter par le protocole DevTools et
   lire les pixels du canvas. Script jetable dans le dossier de travail.

### Les aires de marche : essai sur deux stations

**Fait** — écrit `scripts/analysis/tramway-isochrones.py`, calculé les aires de
marche de 15 minutes autour de Jean-Paul-L'Allier et Saint-Roch.

**Pourquoi un essai avant de saisir les 29 stations** — la méthode reposait sur
une inconnue : *le réseau piéton d'OSM est-il assez complet pour que le calcul
veuille dire quelque chose ?* Une heure de saisie manuelle aurait été perdue si
la réponse était non.

**Le réseau est bon, et mieux que prévu :**

| | |
| --- | --- |
| Voies marchables | 5 878 |
| Sommets | 32 513 |
| Nœuds du graphe / arêtes | 22 371 / 26 555 |
| Composantes connexes | 31, dont **une qui contient 99 %** |
| Escaliers | 238, dont **141 dans la zone de la falaise** |

Les 99 % en une seule composante disent que le graphe n'est pas fragmenté — le
piège classique de ce genre de calcul. Et les escaliers nommés — Escalier de la
Chapelle, Escalier Lépine, Escalier du Faubourg — sont bien les voies réelles
qui montent en Haute-Ville.

**Le résultat, et c'est ce qu'on cherchait :**

| | Jean-Paul-L'Allier | Saint-Roch |
| --- | --- | --- |
| Superficie atteignable | **314,2 ha** | **308,8 ha** |
| Disque théorique de 1 200 m | 452 ha | 452 ha |
| **Part réelle** | **69 %** | **68 %** |
| Rue parcourue | 129,1 km | 119,9 km |
| Trous intérieurs du polygone | 36 | 29 |

**Un cercle aurait surestimé d'un tiers.** Les 31 % manquants sont ce que la
falaise, la rivière Saint-Charles et l'autoroute Dufferin retranchent — et ils
ne se répartissent pas également dans toutes les directions. La forme s'étire
jusqu'à 2,2 km sur un axe tout en couvrant bien moins de surface : elle a des
tentacules, pas un rayon.

Les trous intérieurs sont les îlots que l'on contourne sans les traverser.

**Décisions de méthode, inscrites dans le script :**

| Choix | Raison |
| --- | --- |
| 4,8 km/h × 15 min = 1 200 m | valeur usuelle des études de transport, et celle de `tramquebec.00h11.ca` — garde les résultats comparables |
| Couloir de 40 m autour des rues atteintes | une rue dessert les bâtiments qui la bordent, pas son seul axe. 40 m ≈ profondeur d'un îlot de Québec |
| **Pas d'enveloppe convexe** | elle comblerait les trous et les découpes, c'est-à-dire l'information |
| Arêtes tronquées au prorata | sans cela l'isochrone déborde ou se coupe net à chaque intersection |
| Nœuds arrondis au mètre | recolle deux voies qui partagent un sommet sans partager son identifiant OSM. Sans cet arrondi, le graphe explose en milliers de composantes |

**Limites assumées, écrites dans les métadonnées du GeoJSON** — la vitesse ne
tient compte ni de la pente ni de l'hiver québécois ; les escaliers sont
franchis sans pénalité, ce qui rend la Haute-Ville un peu trop facile d'accès.

**À vérifier avant d'étendre aux 29 stations** — la densité de trottoirs relevée
ici est celle du **centre**. À Sainte-Foy ou Charlesbourg, OSM ne porte
peut-être que des axes de chaussée, ce qui gonflerait les isochrones de
banlieue. Le biais irait alors à l'inverse de ce que le lab veut montrer :
**contrôle secteur par secteur obligatoire.**

### Six paliers, et ce qu'ils révèlent

**Fait** — le script calcule maintenant six aires par station (3, 5, 7, 10, 12,
15 min), pour alimenter un curseur de durée dans le lab.

**Comment, sans sextupler le coût** — le graphe n'est parcouru qu'**une fois**,
jusqu'au plus grand palier. Les distances obtenues servent ensuite à découper
les six formes. Ajouter un palier ne coûte que son polygone.

**Le constat que les paliers font apparaître**, et qui n'était pas prévu :

| | 3 min | 5 min | 7 min | 10 min | 12 min | 15 min |
| --- | --- | --- | --- | --- | --- | --- |
| Jean-Paul-L'Allier | 85 % | 80 % | 75 % | 71 % | 70 % | **69 %** |
| Saint-Roch | **91 %** | 79 % | 74 % | 70 % | 68 % | **68 %** |

*(part de ce qu'un cercle du même rayon aurait promis)*

**La part tombe à mesure qu'on s'éloigne.** À trois minutes, presque tout est
atteignable — on est dans la trame, rien ne barre. À quinze, un tiers a disparu.

**Ce que ça dit** : les coupures ne sont pas près de la station, elles
apparaissent quand le rayon s'allonge. La falaise, la rivière et l'autoroute
sont des obstacles de *deuxième couronne*. C'est exactement ce qu'un curseur
donne à voir en mouvement, et ce qu'une forme figée à 15 minutes tait.

**Poids** — 12 polygones pour 2 stations : 45,7 ko. Projection pour les 29 :
**663 ko**. Au-delà des 500 ko idéaux, mais dans la fourchette « acceptable si
la carte est le sujet » de `public/data/README.md` — et elle l'est.

### Le clic, le panneau, le curseur

**Fait** — ajouté `select` au vocabulaire des labs : `key`, `title`, `rows`,
`revealLayers`, `slider`. Et dans `LabMap` : un gestionnaire de clic, un état de
sélection, un panneau et un curseur.

**Pourquoi une sélection et pas un survol** — le survol s'efface dès que le
curseur bouge. Il montre, il ne permet pas d'agir. Dès que le lecteur doit faire
varier une durée et lire plusieurs chiffres, il faut que son choix persiste. Et
le survol **n'existe pas au doigt** : le lab était jusqu'ici inutilisable sur
téléphone, ce que le clic corrige au passage.

**Pourquoi les aires naissent éteintes** — vingt-neuf taches superposées ne se
lisent pas. Elles n'apparaissent que pour la station choisie, filtrées par
`revealLayers` sur la clé de station **et** sur le palier courant.

**Pourquoi le curseur ouvre à 15 et non à 0** — l'aire complète est là dès le
clic ; la réduire devient une exploration. Ouvrir à 0 aurait fait d'un geste que
rien n'annonce le péage pour voir quoi que ce soit.

**Décision d'interface** — le panneau est en surimpression sur la carte, pas à
côté : la carte garde toute sa largeur tant que rien n'est choisi. En bas sur
téléphone, là où le pouce atteint ; à gauche au-delà de 640 px, du côté opposé
aux commandes de zoom.

Le curseur est un `input range` natif. Il se pilote au clavier, annonce sa
valeur aux lecteurs d'écran, et se saisit au doigt — trois choses qu'un curseur
dessiné à la main aurait fallu réécrire.

**À vérifier** — les chiffres du panneau sont relus par `querySourceFeatures`
après chaque changement de palier. Si une tuile n'est pas chargée, la lecture ne
trouve rien : on garde alors les chiffres précédents plutôt que de vider le
panneau, qui clignoterait à chaque mouvement.

### Le panneau sort de la carte

**Fait** — le panneau de sélection, d'abord posé en surimpression sur la carte,
est déplacé à côté d'elle. `LabPanel` devient un composant à part, et `LabMap`
remonte la sélection à son parent au lieu de la rendre lui-même.

**Pourquoi** — un panneau posé sur la carte masque le territoire au moment
précis où le lecteur veut le regarder. Pire : il masque surtout ce qui entoure
l'entité choisie, c'est-à-dire ce qu'on vient d'ouvrir. Une carte qu'on vient
consulter doit rester entière.

**Ce que ça entraîne, et qui n'était pas évident :**

1. **L'état remonte.** La sélection reste dans `LabMap` — c'est la carte qui
   sait ce qui a été cliqué — mais le palier du curseur descend depuis le
   parent, puisque le curseur vit désormais dehors.
2. **La carte doit se redimensionner.** L'ouverture du panneau la rétrécit sans
   que la fenêtre bouge, et MapLibre ne s'en aperçoit pas seul : le canevas
   garderait son ancienne largeur et déformerait la projection. Un
   `ResizeObserver` sur le conteneur règle cela.
3. **Le panneau garde sa place même vide.** Sinon la carte changerait de largeur
   à chaque clic, MapLibre redessinerait tout, et le lecteur verrait la carte
   sauter sous ses yeux au moment où il vient d'y choisir quelque chose. D'où le
   champ `empty` du vocabulaire : cette place vide doit dire ce qu'on attend.
4. **Trois pages à mettre à jour, pas une.** `LabEmbed` (l'entrée) et
   `LabPreview` (la prévisualisation) montent la carte séparément. La
   prévisualisation avait été oubliée au premier essai — et c'est précisément la
   page où l'on vérifie une mise en page avant de la publier.

**Disposition** — deux colonnes au-delà de 1024 px, le panneau à 20 rem. En
dessous, il passe SOUS la carte : à cette largeur, deux colonnes donnent deux
bandes trop étroites pour l'une comme pour l'autre. Une hauteur maximale lui est
alors imposée, sinon une liste un peu longue pousserait la carte hors de
l'écran — et c'est leur coexistence qui fait le propos.

### Le panneau s'ouvrait sans ses chiffres

**Constaté au test** — après un clic, le panneau affichait son titre et son
curseur, mais aucune valeur. Les chiffres n'apparaissaient qu'au **premier
mouvement du curseur**.

**La cause** — `querySourceFeatures` était appelée juste après `setFilter`, dans
le même tour. MapLibre n'avait pas encore retraité ses tuiles avec le nouveau
filtre : la requête renvoyait zéro entité. Bouger le curseur déclenchait un
second passage, et là les tuiles étaient prêtes.

**Correction** — relire une fois tout de suite (pour le cas où les tuiles sont
déjà à jour) puis une seconde fois sur l'évènement `idle`, qui signale que la
carte a fini de redessiner.

**Ce que ça coûtait si on ne le voyait pas** — un lecteur clique, lit un panneau
vide, et conclut que le lab ne fonctionne pas. Le défaut ne se voit qu'en
testant le clic **sans toucher à rien d'autre** : toute vérification qui bouge
le curseur le masque.

### La vitesse de marche : 4,2 km/h et non 4,8

**Décidé** — la portée de 15 minutes passe de **1 200 m à 1 050 m**.

**Pourquoi** — 4,8 km/h est la valeur usuelle des études de transport, et celle
qu'emploie `tramquebec.00h11.ca`. Elle décrit un adulte valide marchant d'un bon
pas sur un **trottoir plat et sec**.

Ce n'est pas Québec. La ville monte — le tracé franchit une falaise — et la
neige couvre les trottoirs quatre mois par an quand elle n'en fait pas des
corridors d'un mètre. Une aire calculée à 4,8 km/h décrit une ville qui existe
de mai à octobre.

**Ce que ça change, mesuré :**

| | 4,8 km/h | 4,2 km/h | écart |
| --- | --- | --- | --- |
| Portée à 15 min | 1 200 m | **1 050 m** | −12,5 % |
| Saint-Roch, surface | 308,8 ha | **234,5 ha** | −24 % |
| Saint-Roch, habitants | 23 146 | **18 456** | **−20 %** |
| Jean-Paul-L'Allier, habitants | 23 018 | **18 923** | −18 % |
| Poids projeté, 29 stations | 666 ko | **525 ko** | −21 % |

**Près de cinq mille personnes de différence sur une seule station**, pour un
paramètre qu'on ne voit jamais discuté. C'est la leçon à retenir : dans ce genre
de calcul, l'hypothèse de vitesse pèse plus lourd que le raffinement de la
méthode.

**Le prix, assumé et écrit dans les métadonnées** — les chiffres ne se comparent
plus directement à ceux des études qui retiennent 4,8 km/h. La note donne le
facteur : une surface varie comme le carré de la portée.

### Le curseur part de zéro

**Fait** — le palier 0 est ajouté aux crans, et le curseur s'ouvre dessus : au
clic, la station est marquée mais aucune aire n'est dessinée. C'est le lecteur
qui la fait grandir.

**Pourquoi** — la croissance dit quelque chose que la forme finale tait :
l'aire s'étire d'abord le long de quelques axes, puis remplit les quartiers, et
c'est au bout du parcours que les coupures mordent. Le lecteur qui pousse le
curseur le voit arriver.

**Le risque assumé** — qui ne touche pas au curseur ne voit rien. C'est le prix
de montrer la croissance plutôt que le résultat, et il est accepté en
connaissance de cause.

**Un déroulé automatique a été écrit puis retiré.** L'aire grandissait seule de
0 à 15 en un peu plus d'une seconde. Deux raisons de l'abandonner : le lecteur
n'a pas la main sur ce qu'il regarde, et une carte qui bouge toute seule à
l'ouverture fatigue plus qu'elle n'explique.

**Deux garde-fous conservés :**

- aucune forme n'est calculée pour le palier 0 — il n'y a rien à atteindre en
  zéro minute. Le panneau affiche alors des tirets **en gardant ses lignes** :
  sans cela il se replierait et se déplierait au fil du curseur ;
- changer de station ramène le curseur à son palier d'ouverture. Sans cela, une
  station choisie après qu'on a descendu le curseur s'ouvrirait elle aussi en
  bas, et le lecteur verrait une aire minuscule sans comprendre pourquoi.

### La prévisualisation passe en plein écran

**Fait** — le bandeau de diagnostic et le pied de page disparaissent ; la carte
prend toute la fenêtre.

**Pourquoi** — cette page sert à juger du rendu. Un bandeau de trois lignes et
un pied de page en prenaient quatre : on jugeait une carte plus courte que celle
qu'on publierait.

Le relevé de diagnostic reste, en surimpression discrète en haut à droite. Il
nomme les deux pannes qui échouent en silence — conteneur de hauteur nulle,
WebGL absent — et sans lui elles se ressemblent toutes les deux.

**Légende et provenance** descendent au pied du panneau. Elles y sont mieux
qu'en bandeau : le panneau a de la place en bas, et c'est de toute façon là
qu'on lit ce que la carte montre. L'attribution n'est pas facultative — ODbL
l'exige.

### Lisser le tracé

**Constaté à l'œil** — le tracé « paraît sale ». La mesure a confirmé pourquoi.

| | |
| --- | --- |
| Sommets | 200 pour 17,5 km |
| Segment médian | 48 m |
| Segment le plus court | **0,0 m** — des doublons exacts |
| Segment le plus long | **810 m** |
| Angles de plus de 25° | 13 |
| Angle le plus vif | **98°** |

Trois défauts distincts, qu'un seul remède n'aurait pas corrigés :

1. **Densité inégale** — un segment de 810 m dessiné d'un trait à côté de
   segments de 50 m : un coude là où la voie courbe, des micro-tremblements là
   où les sommets se serrent ;
2. **Angles impossibles** — un tramway ne pivote pas de 98° sur un point. Son
   rayon de courbure minimal avoisine 25 m. Ces angles sont des artefacts de
   numérisation d'OSM, pas des virages réels ;
3. **Doublons exacts** — invisibles, mais ils cassent tout algorithme de
   lissage (une direction ne se calcule pas sur un segment nul) et fausseront
   les métriques dont `line-gradient` a besoin pour une animation.

**La méthode retenue : Chaikin, et non Catmull-Rom.** Une spline de Catmull-Rom
passe PAR tous les sommets et courbe entre eux ; Chaikin coupe les angles — la
courbe frôle les sommets au lieu de les traverser. C'est ce que fait une voie
ferrée, qui décrit une courbe de raccordement là où un relevé pose un point.

**L'ordre a demandé quatre essais**, et c'est la partie qui valait d'être
notée :

| Essai | Ordre | Résultat |
| --- | --- | --- |
| 1 | redensifier, lisser, **nettoyer (60 cm)** | le nettoyage final ramenait 800 sommets à 56 et effaçait le lissage |
| 2 | nettoyer, lisser, redensifier | régulier, mais le rééchantillonnage **recrée des angles dans les courbes** : 42° → 71° |
| 3 | idem, pas plus fin | fichier doublé, treize angles vifs — autant que le brut |
| **4** | **nettoyer, redensifier (30 m), lisser, redensifier (12 m)** | **le bon** |

L'idée qui les départage : **le lissage doit venir en dernier, sur une matière
déjà régulière**. D'où deux rééchantillonnages — un large en entrée, pour que
Chaikin ait des segments égaux à couper ; un plus fin en sortie, qui repose le
pas final sans recouper les courbes.

**Résultat :**

| | brut | affiné |
| --- | --- | --- |
| Sommets | 200 | 1 451 |
| Segment médian | 48 m irrégulier | **12,0 m constant** |
| Angles > 25° | 13 | **6** |
| Angle maximal | **98°** | **43°** |
| Poids du fichier | 10,3 ko | 63,3 ko |

**Deux décisions de méthode attenantes :**

- **Cinq décimales au lieu de quatre.** La règle de `public/data/README.md` est
  quatre décimales (≈ 11 m), bonne pour des polygones qu'on regarde de loin.
  Elle remettait des marches d'escalier dans la courbe qu'on venait d'adoucir :
  le lissage se perdait à l'écriture. Cinq décimales valent 1,1 m.
- **Le lissage s'applique à la ligne entière, puis se redécoupe.** Lisser
  chaque tronçon séparément laissait un angle vif à chaque jonction —
  précisément là où le tracé passe du tunnel à la surface. Les frontières sont
  retrouvées par **le sommet lissé le plus proche**, et non au prorata des
  longueurs : un premier essai au prorata réduisait le tunnel de 1,73 km à
  0,84 km, parce que le lissage ne raccourcit pas uniformément — il mord
  davantage là où les angles sont vifs.

**Le fichier passe de 10 à 63 ko**, ce qui reste négligeable et achète la pièce
centrale du lab. Cette régularité est aussi ce dont une animation le long du
tracé aura besoin : à pas inégal, un train paraîtrait accélérer et ralentir sans
raison.

### Une rame parcourt la ligne

**Fait** — une lueur remonte le tracé de Charlesbourg vers Cap-Rouge, en
quatorze secondes.

**La méthode : `line-gradient`, et rien d'autre.** MapLibre sait étaler une
couleur le long d'une ligne, du début à la fin. En déplaçant à chaque image la
position d'une tache claire dans ce dégradé, on obtient un point lumineux qui
file sur les rails. Aucune donnée ajoutée, aucune géométrie recalculée : c'est
le GPU qui repeint.

Les deux autres voies envisagées, et pourquoi elles ont été écartées :

- **un point GeoJSON déplacé à chaque image** — il faudrait recalculer une
  position le long de la ligne, réécrire la source, et laisser MapLibre
  retraiter ses tuiles soixante fois par seconde. Plus de contrôle (on pourrait
  marquer un arrêt en station), beaucoup plus cher ;
- **`line-dasharray` décalé** — l'effet « fourmis qui marchent ». Le moins cher
  des trois, mais il donne un flux, pas un véhicule.

**Trois contraintes imposées par MapLibre**, toutes découvertes en chemin :

1. la source doit déclarer `lineMetrics: true`, sinon le dégradé ne sait pas où
   il en est. C'est un calcul de plus à chaque tuile, d'où le fait qu'il ne soit
   pas activé par défaut — et d'où la forme longue ajoutée au vocabulaire des
   sources ;
2. `line-gradient` est **incompatible avec `line-dasharray`** : la rame ne peut
   donc pas emprunter la couche du tunnel, qui est en pointillé ;
3. la géométrie doit être **continue**. Sur des tronçons séparés, la lueur se
   répéterait sur chacun au lieu de parcourir l'ensemble.

Cette troisième contrainte explique l'intérêt rétrospectif de la couche
`ligne` : elle existait depuis le premier export, inutilisée, et c'est
exactement ce qu'il fallait.

**Ce que le lissage rend possible.** Une lueur avance à vitesse constante **dans
le dégradé**, pas sur le terrain : si les sommets sont irréguliers, elle paraît
accélérer et ralentir sans raison. Le pas constant de 12 m obtenu plus haut est
donc ce qui rend l'animation crédible — ce n'était pas le but du lissage, c'en
est la conséquence heureuse.

**Deux garde-fous, pour ne pas vider une batterie :**

- un `IntersectionObserver` arrête l'animation dès que la carte sort de
  l'écran ;
- `visibilitychange` l'arrête sur un onglet caché.

Et `prefers-reduced-motion` la supprime entièrement : la ligne reste dessinée
par ses autres couches, rien ne manque à la lecture.

**Pourquoi ce n'est pas un ornement** — une ligne dessinée ne dit pas qu'elle se
parcourt. Une lueur qui la remonte le dit sans un mot, et donne au lecteur le
**sens de la marche**, que rien d'autre sur la carte n'indique.

**Deux réglages corrigés après l'avoir vue tourner :**

*La vitesse — 14 s puis 38 s pour les 17,4 km.* Le défaut n'était pas la vitesse
en soi, mais l'échelle : le lab s'ouvre sur un **quartier**, pas sur la ligne
entière. À 14 s, la rame entrait et sortait du cadre avant qu'on ait pu la
suivre. On n'imite pas un horaire — le trajet réel prendra une quarantaine de
minutes — mais le mouvement doit rester lisible quand on regarde une station.

*La traînée — un bord net devenu dégradé.* La première version passait de la
couleur pleine au transparent en un **millième** de la ligne : la rame avait un
bord franc devant comme derrière, et se lisait comme un segment qui saute plutôt
que comme un véhicule qui passe. Trois paliers intermédiaires (35 %, 65 %, 85 %)
en font une comète — dense en tête, évanouie en queue — et sa longueur passe de
4 à 7 % de la ligne, soit environ 1,2 km. Une traînée courte file comme un
éclair ; allongée, elle se lit.

L'avant reste franc à dessein : c'est lui qui donne le sens de la marche.

### Audit de performance : la carte se mangeait elle-même

**Constaté à l'usage** — le lab devient pâteux, au chargement comme au
déplacement, y compris en local.

**Mesuré** (page du lab, navigateur sans accélération matérielle) :

| | |
| --- | --- |
| Téléchargé | 1,35 Mo en 32 requêtes |
| dont scripts | **1 115 ko — 83 %** |
| dont données du lab | 175 ko |
| DOM prêt | 1 243 ms |
| Chargement complet | 6 390 ms |
| **Boucle d'animation** | **17 images/s** au lieu de 60 |
| Mémoire JS | 58 Mo |

**Les données ne sont pas en cause** : 460 ko pour l'ensemble de `public/data`,
dont 175 ko de tuiles de fond. Le poids est ailleurs.

### Trois causes, par ordre de gravité

**1. L'animation de la rame se mangeait la carte.**

`setPaintProperty` était appelée à **chaque image**, soixante fois par seconde.
Chaque appel oblige MapLibre à relire l'expression, la valider contre la
spécification de style, recompiler la rampe de couleur et repeindre la couche
entière — 1 451 sommets. La carte tombait à dix-sept images par seconde :
l'animation se mangeait elle-même, et tout le reste avec.

Aggravant : chaque image construisait une `Map`, la triait et l'aplatissait.
Trois allocations par image, soixante fois par seconde — le ramasse-miettes
passait son temps à nettoyer derrière la boucle.

*Corrigé* — repeint limité à vingt images par seconde (la lueur n'avance que de
0,13 % entre deux images sur un parcours de trente-huit secondes), tableau de
bornes réutilisé sans tri, et cache des teintes.

**2. Deux gestionnaires de survol interrogeaient la carte en parallèle.**

Il y en avait un pour l'infobulle et un pour le curseur, chacun appelant
`queryRenderedFeatures` — l'opération la plus chère de MapLibre côté
processeur — **à chaque pixel parcouru par la souris**. C'est la cause directe
du déplacement pâteux, bien plus que le volume des données.

*Corrigé* — un gestionnaire unique sert les deux besoins, limité à une image, et
la liste des couches existantes est calculée une fois au lieu d'être refiltrée à
chaque mouvement.

**3. Les 245 ko de `next-devtools`.**

Ils n'existent qu'en développement et ne pèsent pas sur le site publié, mais ils
expliquent une partie de la lenteur constatée en local. Rien à corriger.

### Ce qui était déjà bon

- MapLibre isolé par import dynamique : son poids ne touche que les pages qui
  portent une carte ;
- en-tête `immutable` sur `/data/`, qui tire parti des noms versionnés ;
- le globe de la page d'accueil s'arrête hors de l'écran et sur onglet caché ;
- l'unique `<img>` non optimisée est documentée — l'optimiseur de Next fige les
  GIF animés sur leur première image.

**La leçon** — l'instinct disait « trop de données ». La mesure disait
« dix-sept images par seconde ». Les deux coupables étaient des boucles qui
tournaient trop vite, pas des fichiers trop gros.

**Résultat mesuré après correction :**

| | avant | après |
| --- | --- | --- |
| Chargement complet | 6 390 ms | **2 690 ms** |
| Boucle de rendu | 17 images/s | **24 images/s** |

### Le carnet relisait ses fichiers à chaque appel

**Trouvé en auditant la page d'accueil** — elle ne télécharge que 140 ko, et
pourtant son DOM met **5 486 ms** à être prêt. Le poids n'explique rien ; le
travail serveur, si.

`allParsed()` relit le dossier `content/entries/`, ouvre chaque fichier et
analyse chaque en-tête YAML. Elle est appelée par la page d'accueil, la liste du
carnet, le flux RSS et le plan du site — et plusieurs fois au sein d'un même
rendu. **Sans cache, les dix fichiers étaient relus du disque à chaque appel.**

`getEntry` était pire : une page d'article l'appelle trois fois — métadonnées,
JSON-LD, corps — et chaque appel relançait la conversion markdown → HTML, le
travail le plus coûteux du rendu.

*Corrigé* — `cache` de React sur les deux. La mémorisation ne dure que le temps
d'une requête : en développement, ajouter une entrée se voit toujours au
rechargement suivant. Ce n'est pas un cache de contenu, c'est la suppression
d'un travail refait pour rien dans le même rendu.

### Montrer les rues, pas seulement l'enveloppe

**Fait** — les rues réellement parcourues sont exportées, un fichier par
station, chargé au clic.

**Pourquoi** — l'aire de marche est une enveloppe : elle dit jusqu'où l'on va,
pas par où. Les rues montrent le calcul lui-même. On y voit la marche progresser
le long de quelques axes avant de remplir les quartiers, et surtout **pourquoi**
la forme se coupe — les rues s'arrêtent devant la falaise, la rivière,
l'autoroute. L'enveloppe, elle, ne dit que le résultat.

**Ce qui rendait la chose possible sans rien recalculer** — le script
construisait déjà ces segments pour les envelopper, puis les jetait. La donnée
existait ; elle n'était pas exportée.

**Un seul jeu pour tous les paliers.** Chaque tronçon porte `m`, la distance à
laquelle la marche l'atteint. Le lab filtre sur ce champ — à 4,2 km/h, une
minute vaut 70 m — et l'apparition progressive sort du filtre, sans données
supplémentaires. C'est la **vérité du calcul**, pas un effet : les rues
surgissent dans l'ordre réel où on les parcourt.

**Le poids, et trois essais pour le tenir :**

| Réglage | Poids |
| --- | --- |
| Tranches de 50 m | 452 ko — 55 % des tronçons à deux sommets |
| Tranches de 150 m + simplification à 4 m | **269 ko** |
| `linemerge` avant `unary_union` | inchangé — les rues sont réellement fragmentées dans OSM |

**269 à 300 ko par station**, contre huit mégaoctets si on servait les
vingt-neuf d'avance. D'où le chargement à la demande, nouveau dans le
vocabulaire (`onDemand`), avec mise en cache : revenir sur une station déjà vue
ne recharge rien.

*Vérifié* — avant le clic, aucun fichier de rues n'est demandé ; au clic, un
seul part.

### L'onde qui marque le passage d'un palier

**Fait** — quand le curseur monte, le contour de la nouvelle aire s'épaissit
brusquement puis revient à son repos pendant que la tache grandit.

**Pourquoi pas une interpolation de formes** — un morphing entre le polygone de
trois minutes et celui de cinq demanderait d'apparier des contours qui n'ont ni
le même nombre de sommets ni la même topologie — l'un a deux trous, l'autre
quatre. Beaucoup de code pour un résultat fragile.

On anime donc **l'épaisseur et l'opacité du contour**, ce qui suffit à faire
lire un anneau qui avance vers l'extérieur là où un changement de forme se
verrait comme un saut. Montée vive sur le premier quart, retour doux sur le
reste.

**Deux garde-fous** — l'onde ne se joue que vers le HAUT (la jouer à l'envers
mentirait sur le geste), et `prefers-reduced-motion` la supprime.

---

## Décisions structurantes

À reprendre presque telles quelles dans l'article.

| Décision | Raison | Conséquence si elle est fausse |
| --- | --- | --- |
| Tracé depuis OSM, pas la Ville | le vectoriel officiel n'est pas ouvert (vérifié sur tramcite.info) | le tracé dessiné s'écarte du projet réel ; OSM le dit « sujet à modification » |
| Chaînage par extrémités, pas par longitude | la ligne remonte vers le nord après le tunnel | ligne brisée, longueur fausse de 6 km — détecté par le contrôle de continuité |
| Tronçon isolé conservé dans l'export | une donnée incomplète reste une donnée | le lecteur voit un segment détaché sans explication, si la note ne le dit pas |
| Bâtiments 3D depuis le fond de carte | `building-3d` existe déjà dans le style Liberty, avec `render_height` | dépendance au fournisseur du fond ; les données du lab, elles, restent |
| Longueur mesurée annoncée à côté de l'officielle | 17,46 ≠ 19 | une carte qui annonce 19 km en dessinant 17,5 ment par omission |

## Contrôles qualité

- [x] géométries valides — 216 sommets, aucune ligne à moins de 2 points ;
- [x] continuité du tracé vérifiée par le script à chaque exécution ;
- [x] SCR déclaré = SCR réel — EPSG:4326, emprise cohérente avec Québec ;
- [x] ordres de grandeur plausibles — 17,46 km pour 19 annoncés, écart expliqué ;
- [x] poids de l'export : 10,3 ko, très en dessous du budget de 500 ko ;
- [ ] totaux recoupés avec une source indépendante — **le cinquième pôle
      d'échanges reste à identifier** ;
- [ ] positions des 29 stations — à obtenir.
