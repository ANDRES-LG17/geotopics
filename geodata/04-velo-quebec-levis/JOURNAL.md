# Journal — Portée vélo Québec–Lévis

Ce qui a été fait, et **pourquoi**. Les gestes se retrouvent dans les fichiers ;
les décisions, non. C'est ici qu'on écrit les secondes.

Ce journal est la matière première de l'article : la section « ce qu'on a
supposé » s'écrit toute seule quand les hypothèses ont été notées au moment où
on les prenait.

---

## Question de départ

Quels tronçons manquants, une fois aménagés, ouvriraient le plus de territoire
de l'agglomération Québec–Lévis à un trajet à vélo tranquille de 15 minutes ?

## Zone d'étude et SCR

- **Emprise** : ville de Québec et ville de Lévis, traitées comme une seule
  agglomération — le fleuve est une coupure du réseau, pas une frontière
  d'analyse (liens : pont de Québec, traversier Québec–Lévis) ;
- **SCR de travail** : EPSG:2949 (MTM fuseau 7) — projeté, pour que les mesures
  de distance et de surface aient un sens ;
- **SCR de sortie** : EPSG:4326 — imposé par MapLibre.

Travailler en géographique fausse toute mesure. Reprojeter en entrée, une fois,
et n'en sortir qu'à l'export.

---

## 2026-10-21

**Fait** — question de départ fixée ; le pont de Québec traité comme un
scénario du réseau plutôt que comme un lien fixe. Trois états du pont :

| Scénario | Pont | Vitesse sur le pont |
| --- | --- | --- |
| A — actuel / reconstruction à l'identique | voie de 1,3 m, vélo à la main | 5 km/h |
| B — chantier | trottoir fermé, seul reste le traversier | — |
| C — tablier élargi | voie de 2,5 m, on pédale | 20 km/h |

Les tronçons manquants se calculent dans chacun des trois états. L'écart
C − A mesure ce que l'élargissement apporte par rapport à une reconstruction
à l'identique.

**Pourquoi** — le pont de Québec est le seul lien fixe pour le vélo entre les
deux rives (le pont Pierre-Laporte l'interdit). Son tablier, trottoir compris,
est en fin de vie et le ministère n'a retenu ni solution ni échéancier
(Journal de Québec, 2026-08-12 — voir `SOURCES.md`). Les options sur la table
sont précisément A et C ; B est le passage obligé de l'une comme de l'autre.

**Hypothèse posée** — sur le pont actuel, le cycliste marche à côté de son
vélo : 5 km/h, la même règle que portée-vélo applique aux contresens. Source :
« les cyclistes doivent normalement descendre de leur vélo en raison du manque
d'espace » (Journal de Québec). Sur ≈ 990 m, cela donne ≈ 12 min à pied contre
≈ 3 min à vélo. Si une part des cyclistes pédale malgré tout, le scénario A
sous-estime l'accès réel d'aujourd'hui.

**Hypothèse posée** — le trottoir actuel compte comme lien « tranquille » :
il est séparé de la circulation, même s'il est étroit et partagé avec les
piétons. C'est la vitesse qui porte la pénalité, pas le classement.

**Décision** — définition de « tranquille » : la norme *tous âges et
capacités* (NACTO, *All Ages & Abilities*) — un trajet qu'un enfant de 12 ans
ou une personne âgée ferait sans stress.

| Classe | Tranquille ? |
| --- | --- |
| Site propre (piste cyclable, sentier polyvalent) | oui |
| Vélorue, rue locale à ≤ 40 km/h | oui |
| Bande cyclable sur une rue à ≤ 40 km/h | oui |
| Bande cyclable sur une rue à > 40 km/h | non |
| Chaussée désignée, accotement | non |
| Artère sans aménagement | non |

Le seuil de 40 km/h vise la vitesse des voitures, pas celle du vélo. C'est
celui de la NACTO pour une bande peinte (25 mph). Une variante à 50 km/h sera
calculée comme test de sensibilité.

**Hypothèse posée** — les rues locales comptent comme tranquilles : en
banlieue, presque personne n'habite sur une piste. Sans elles, le réseau se
réduit à des îlots et chaque rue devient un « tronçon manquant ».

**À vérifier** —
- ~~longueur réelle du passage~~ — OSM, voie 39456261 : `footway`,
  `bicycle=dismount`, `width=1.3`, 987 m. Les 1,3 m et la descente de vélo
  du Journal de Québec sont confirmés par une source indépendante. Les
  rampes d'accès restent à mesurer ;
- ~~règle par défaut pour `maxspeed`~~ — remplacée par les vitesses
  officielles, voir plus bas ;
- codes `TypeVoieCy` de Lévis : non documentés, lecture déduite dans
  `SOURCES.md` ;
- seuil de 15 min : il n'atteint presque pas l'autre rive hors des têtes de
  pont. Calculer aussi à 30 min, ou publier les deux ;
- traversier Québec–Lévis : accès vélo, horaires, temps d'attente à retenir
  pour le scénario B ;
- les travaux de la tête des ponts ne modifient pas le passage piéton et vélo
  (Journal de Québec) : les accès au pont, sur chaque rive, sont des maillons
  candidats en soi.

### Classement du réseau — `scripts/analysis/velo-quebec-levis-01-classer-reseau.py`

**Fait** — chaque voie OSM à moins de 500 m de Québec ou de Lévis (limites
SDA) est classée : `piste`, `rue_calme`, `a_pied`, `sentier`, `expose` ou
`exclu`. Sortie : `01-reseau-classe-epsg2949.gpkg`.

| Classe | km | Tranquille ? |
| --- | --- | --- |
| rue calme (≤ 40 km/h) | 3 990 | oui |
| piste | 491 | oui |
| sentier (non revêtu) | 779 | oui |
| à pied (trottoir, vélo à la main) | 722 | oui, à 5 km/h |
| exposé (> 40 km/h) | 1 318 | non |

Total retenu : 7 300 km, dont 5 982 km tranquilles. La variante à 50 km/h
n'ajoute que 97 km : il n'y a que 186 km de bandes dans OSM, et 71 km d'entre
elles sont déjà sur des rues à ≤ 40 km/h.

**Recoupement avec les couches municipales** — part du réseau municipal à
moins de 15 m d'une voie cyclable OSM :

- Québec : pistes 95 %, bandes 87 %, chaussées désignées 77 %. OSM est
  fiable ici ;
- Lévis : codes 5 et 7 à 97–99 %, code 3 à 65 %, codes 1 et 2 à 45–49 %. Ça
  conforte la lecture des codes : 5 et 7 sont des pistes physiques, que les
  cartographes OSM tracent toujours ; 1 et 2 sont de la peinture ou de
  l'accotement, souvent pas étiquetés.

**Hypothèse posée** — trottoir sans permission vélo = « à pied », 5 km/h,
tranquille. Même règle que le pont. Coût si c'est faux : un trottoir le long
d'une artère sert de détour tranquille, lent mais réel.

**À vérifier** —
- ~~73 % des kilomètres de rue ont une vitesse par défaut~~ (3 904 km sur
  5 338) — traité : vitesses officielles, section suivante ;
- `service` à 20 km/h compte les allées de stationnement comme rues calmes :
  à filtrer (`service=parking_aisle`, `driveway`) ;
- `sentier` (779 km) mêle sentiers urbains et pistes de forêt : décider s'ils
  restent dans le graphe ;
- bandes de Lévis mal couvertes par OSM : les injecter depuis la couche
  municipale pour la variante à 50 km/h.

### Vitesses officielles — Québec à 30, Lévis à 50

**Fait** — remplacé la vitesse par défaut par la source officielle quand elle
existe :

- **Québec** : `VITESSEMAX` de la couche *Voies publiques*, apparié aux voies
  OSM par proximité. La rue résidentielle type y est à **30 km/h** ;
- **Lévis** : aucune vitesse publiée, aucun règlement d'abaissement. C'est la
  limite du Code de la sécurité routière qui s'applique : **50 km/h**. Les
  valeurs OSM le confirment ;
- **sans donnée**, des deux côtés : 50 km/h, la limite légale en ville.

**Décision** — la norme s'applique telle quelle : à 50 km/h, la rue locale
de Lévis est exposée. Le réseau tranquille de la rive sud se réduit donc
presque à ses pistes. Ce n'est pas un défaut du modèle, c'est le constat : à
norme égale, les deux rives diffèrent par leur règlement de vitesse, pas
seulement par leurs aménagements.

D'où un **scénario D — Lévis à 40 km/h** : les rues locales passent de 50 à
40, comme le proposait l'opposition en 2025 (Le Soleil, 2025-10-14). Le
conseil revoit la question depuis juillet 2026 (Le Soleil, 2026-07-30). Le
projet mesure ainsi deux leviers : **construire** (le pont, les tronçons
manquants) et **réglementer** (la vitesse).

| Scénario | Pont | Rues locales de Lévis |
| --- | --- | --- |
| A — actuel | 1,3 m, à pied | 50 km/h, exposées |
| B — chantier | fermé | 50 km/h |
| C — tablier élargi | 2,5 m, à vélo | 50 km/h |
| D — Lévis à 40 | 1,3 m, à pied | 40 km/h, tranquilles |

**Résultat** (`scripts/analysis/velo-quebec-levis-01-classer-reseau.py`, relancé) :

| | Québec | Lévis |
| --- | --- | --- |
| Réseau retenu | 5 165 km | 2 134 km |
| Tranquille — état actuel | 4 259 km (82 %) | 991 km (46 %) |
| Variante bandes à 50 km/h | 4 335 km | 1 025 km |
| Scénario D — Lévis à 40 | — | 1 588 km (74 %) |

Origine de la vitesse sur les rues de Québec : Ville 2 399 km, défaut
1 226 km, OSM 129 km. Rues locales de Québec : 1 417 km à 30, 224 km à 40,
250 km à 50.

**À vérifier** — à Lévis, 394 des 411 km de « rues calmes » sont des
`service` à 20 km/h : allées de stationnement et entrées privées. Elles
gonflent la part tranquille de Lévis plus que celle de Québec. Il faut les
filtrer (`service=parking_aisle|driveway`) avant de construire le graphe.

### Graphe et îlots — `scripts/analysis/velo-quebec-levis-02-construire-graphe.py`

**Fait** — allées de stationnement, entrées privées et service au volant
retirés (`scripts/analysis/velo-quebec-levis-01-classer-reseau.py`). Les voies sont coupées à chaque nœud OSM
partagé : 63 064 nœuds, 86 172 arêtes, 6 771 km. Vitesses du vélo : 20 km/h
revêtu, 15 non revêtu, 5 à pied. À contresens d'un sens unique, on marche.
Le pont de Québec donne une arête de 987 m, soit 11,8 min à pied.

Le réseau tranquille se découpe en **îlots** : des morceaux reliés entre eux
sans emprunter de voie exposée.

| | État actuel (A) | Lévis à 40 (D) |
| --- | --- | --- |
| Îlots | 2 405 | 2 221 |
| Plus grand îlot | 3 074 km, dont 114 à Lévis | 3 312 km, dont 352 à Lévis |
| Plus grand îlot propre à Lévis | 175 km | 427 km |
| Îlots de moins de 1 km | 2 166 | 1 963 |

Le plus grand îlot passe le fleuve par le pont, mais il ne mord que sur
114 km de Lévis. Même à 40 km/h, Lévis reste coupé en deux grands îlots
(352 et 427 km) : la coupure n'est pas une affaire de vitesse. C'est un
maillon candidat de premier ordre, à localiser.

**À vérifier** — les 2 166 îlots de moins de 1 km : bouts de trottoir, de
sentier, pistes isolées dans un parc. Les regarder dans QGIS avant de les
traiter comme du bruit.

### Tronçons manquants, premier passage — `scripts/analysis/velo-quebec-levis-04-maillons.py`

**Fait** — candidats : le plus court chemin exposé (≤ 300 m) entre deux
îlots d'au moins 1 km, trouvé par un Voronoï sur le réseau exposé. Gain :
paires (départ, arrivée) de cellules de 1 ha nouvellement reliées en 15 min
par un trajet tranquille, le maillon étant aménagé à 20 km/h. Chaque maillon
est évalué seul. Résultat : 102 candidats en A, 125 en D, en 14 s.

**Hypothèse posée** — le territoire se mesure en hectares. La population
pourra s'ajouter comme poids par cellule, sans changer la méthode.

**Constat** — en A, les 15 premiers sont tous à Québec. Lévis n'y figure pas :
ses îlots sont trop petits pour qu'un lien court rapporte gros. Le problème
de Lévis est la vitesse de ses rues, pas un tronçon manquant. En D, trois
maillons de Lévis entrent dans le top 15, dont avenue Taniata (62 m), qui
relie l'îlot de 427 km au grand îlot.

**Artefact** — n° 1 en A : 3 m de l'avenue Lapierre. C'est la traversée du
Corridor des Cheminots : OSM raccroche les deux bouts de la piste à la rue,
à 3 m l'un de l'autre, sans voie de traversée. Ce n'est pas un tronçon
manquant, c'est une traversée de rue. À l'inverse, une traversée sur un nœud
commun ne coûte rien dans le graphe : **les traversées d'artères ne sont pas
pénalisées**. C'est une limite à dire dans l'article.

**Décision** — un lien exposé de ≤ 30 m (la largeur d'une rue) est une
traversée : il devient tranquille, les îlots fusionnent, et la recherche
reprend. Portée-vélo tolère 80 m. Avec 30 m, on ne retire que les artefacts
et on ne cache pas de vrais tronçons sur chaussée (Lapierre, 33 m, reste
candidat).

**Résultat** — 21 traversées fusionnées en A, 24 en D. Il reste 76 candidats
en A et 96 en D. Le grand îlot passe à 3 171 km en A et à 3 447 km en D.

| Rang A | Lien | Longueur | Ce qu'il relie |
| --- | --- | --- | --- |
| 1 | rue de la Promenade-des-Sœurs | 167 m | îlot de 141 km (Cap-Rouge) ↔ îlot de 46 km |
| 2 | rue Einstein | 85 m | grand îlot ↔ îlot de Cap-Rouge |
| 3 | avenue Lapierre | 33 m | grand îlot ↔ îlot de 47 km |

En D, Lévis place quatre liens dans le top 15 : avenue Taniata (n° 4, 62 m,
relie l'îlot de 433 km au grand îlot), un lien sans nom de 45 m (n° 7), le
boulevard Guillaume-Couture (n° 8, 92 m) et la 4e Rue (n° 14, 183 m).

### Relief — HRDEM 8 m

**Fait** — MNT lu en streaming chez NRCan (`scripts/analysis/velo-quebec-levis-00-telecharger-mne.py`) : HRDEM
lidar à 8 m (79 Mo), comblé par MRDEM-30 sur 1,8 % de la zone. Chaque arête
est échantillonnée tous les 10 m, avec un lissage sur 30 m. La vitesse suit
la pente : −1,44 km/h par % de montée, +0,86 km/h par % de descente, bornée
entre 5 et 30 km/h. Les temps deviennent asymétriques.

**Pourquoi** — portée-vélo ignore le dénivelé, ce qui se défend à
Marennes-Oléron mais pas à Québec : falaise de la Haute-Ville, falaise de
Lévis, vallées du Cap-Rouge, de la Chaudière et de l'Etchemin.

**Source vérifiée** — Parkin, J. et Rotheram, J. (2010), « Design speeds and
acceleration characteristics of bicycle traffic for use in planning, design
and appraisal », *Transport Policy* 17(5), 335–341,
doi:10.1016/j.tranpol.2010.03.001. Manuscrit en accès libre, tableau 2 et
§ 4.3 : à plat 6,01 m/s (21,6 km/h) ; « for every additional 1% of downhill
gradient, mean speed is increased by 0.2379 m/s (0.86 kph) and for every
additional 1% of uphill gradient, the mean speed is reduced by 0.4002 m/s
(1.44 kph) ».

**Erreur corrigée** — la première version avait les coefficients de mémoire
et inversés (−0,86 en montée, +0,4 en descente). Une étude allemande de 2024
qui cite le même article les inverse aussi : seul le texte original fait foi.

**Limites de la source** — 18 cyclistes de Leeds, presque tous
expérimentés ; 518 observations prises en fin de démarrage ; R² ajusté
0,266 ; pentes observées entre −8,4 % et +9,3 %. Au-delà, le modèle
extrapole. On garde 20 km/h à plat (portée-vélo) plutôt que leurs 21,6.

**Hypothèse posée** — sur un pont, l'altitude est interpolée entre les
extrémités, parce que le MNT donne le fond de la vallée.

**Contrôle** — côte Gilmour (≈ 10 %) : 4,7 min à la montée et 1,2 à la
descente, contre 1,6 à plat. Côte de la Montagne (≈ 9 %) : 3,2 et 0,9 min.
Sur tout le réseau, le relief ajoute 20 % de temps (46 038 min contre
38 294 à plat).

**Effet sur les maillons** — le classement ne bouge presque pas, mais les
gains baissent de 15 à 20 % : rue de la Promenade-des-Sœurs passe de 57 181
à 45 827 paires (à plat → avec relief), avenue Taniata (en D) de 35 742 à
31 202.

**Limite** — le maillon lui-même est compté à 20 km/h à plat, sans sa
propre pente.

### Scénarios du pont — `scripts/analysis/velo-quebec-levis-06-scenarios-pont.py`

**Fait** — mesuré les trajets tranquilles d'une rive à l'autre : paires
(départ, arrivée) de cellules de 1 ha, l'une à Québec et l'autre à Lévis,
dans les deux sens, en 15 et en 30 min. Tout passe par le pont ou par le
traversier (route OSM 160012029, `bicycle=yes`, quais accrochés au réseau
tranquille à 0 m). Relief compris, traversées de ≤ 30 m fusionnées.

**Hypothèse posée** — traversier : **réaliste 27 min** (12 min de traversée
+ 15 min d'attente moyenne, départ aux 30 min) ; optimiste 12 min (on arrive
au départ). OSM indique une durée de 20 min. **À vérifier auprès de la STQ**
(horaire 2026-2027, règles pour les vélos). Le réaliste sert de référence.

Résultat avec le traversier réaliste :

| Pont | Lévis à 50 — 15 min | 30 min | Lévis à 40 (D) — 15 min | 30 min |
| --- | --- | --- | --- | --- |
| A — actuel, à pied | 81 | 53 455 | 118 | 119 607 |
| B — chantier, fermé | 0 | 406 | 0 | 406 |
| C — 2,5 m, à vélo | 10 964 | 232 136 | 21 823 | 531 042 |

**Constats** :

- **en 15 min, la traversée tranquille n'existe pas aujourd'hui** : 81 paires,
  soit 21 ha de départ. Les 12 min à pied sur le pont mangent le budget.
  Avec un tablier élargi (C), on passe à 10 964 paires : ×135 ;
- **en 30 min**, C multiplie par 4,3 les trajets d'une rive à l'autre
  (53 455 → 232 136) ;
- **le chantier (B) coupe 99 % des trajets** en 30 min : il ne reste que les
  abords immédiats des quais ;
- **les deux leviers se cumulent** : C seul ×4,3, D seul ×2,2, C et D
  ensemble ×9,9 (531 042 paires). L'élargissement rapporte deux fois plus si
  Lévis abaisse aussi ses vitesses, parce qu'il y a alors plus de réseau
  tranquille à atteindre au bout du pont ;
- avec un traversier optimiste, le bateau fait mieux que le pont actuel en
  30 min (87 307 paires contre ≈ 53 000) : il arrive au cœur des deux
  centres-villes, alors que le pont débouche loin, à Sainte-Foy et à
  Saint-Romuald.

### Résidents — `scripts/analysis/velo-quebec-levis-02b-population-cellules.py`

**Fait** — population 2021 des aires de diffusion (ISQ, harmonisée), répartie
à parts égales sur les cellules de 1 ha de chaque AD qui contiennent une rue
résidentielle. Totaux conservés à 480 habitants près (Québec), soit 0,09 %.

**Décision** — classer les maillons en **paires de résidents** : pour chaque
départ, sa population × la population nouvellement joignable en 15 min.
Compter seulement « les résidents qui gagnent au moins une destination »
gonflait les liens vers des recoins : 69 000 « gagnants » pour la 41e Rue
Ouest, qui ouvre un îlot de 1,4 km. Avec les paires de résidents, un lien
rapporte s'il relie des gens à des gens.

**Maillons, nouveau classement (A)** :

| Rang | Lien | Résidents qui gagnent | Voisins gagnés (moyenne) |
| --- | --- | --- | --- |
| 1 | avenue De Gaulle, 81 m | 38 541 | 1 694 |
| 2 | boulevard Sainte-Anne, 122 m | 36 136 | 1 385 |
| 3 | 41e Rue Ouest, 74 m | 69 278 | 667 |
| 5 | rue de la Promenade-des-Sœurs, 167 m | 10 048 | 3 352 |

En D, avenue Taniata (n° 8) : 8 350 résidents gagnent en moyenne 1 957
voisins ; boulevard Guillaume-Couture (n° 9) : 15 207 résidents.

**Pont, en résidents** (traversier réaliste) — résidents ayant au moins une
destination sur l'autre rive par un trajet tranquille :

| Pont | Lévis à 50 — 15 min | 30 min | Lévis à 40 (D) — 15 min | 30 min |
| --- | --- | --- | --- | --- |
| A — actuel | 231 | 26 546 | 429 | 32 959 |
| B — chantier | 0 | 990 | 0 | 990 |
| C — 2,5 m | 10 747 | 66 296 | 15 545 | 74 459 |

Sur 699 142 habitants des deux villes : en 30 min, 3,8 % atteignent l'autre
rive aujourd'hui, 9,5 % avec un tablier élargi, 10,6 % avec Lévis à 40 en
plus. En 15 min : 231 personnes aujourd'hui, 10 747 avec le tablier élargi.

**Correction** — les parts « 82 % / 46 % / 74 % » du tableau des vitesses
officielles datent d'avant le retrait des allées de stationnement. Après :
Québec 81 % tranquille (4 790 km) ; Lévis 42 % aujourd'hui et 72 % en D
(1 981 km). Ce sont ces chiffres que cite le lab.

### Export — `scripts/analysis/velo-quebec-levis-07-exporter.py`

**Fait** — `30-export/velo-quebec-levis-v1.geojson`, copié dans
`public/data/`. 650 Ko : dans la tranche « acceptable si la carte est le
sujet de l'entrée ». Couches : `expose` (287 Ko), `piste` (173 Ko),
`levis_d` (215 Ko), `maillon` (104 tronçons, rangs A et D, résidents), `pont`
(pont et traversier). Simplification à 8 m, coordonnées à 4 décimales,
bloc `metadata` avec scénarios, sources et licence.

**Décision** — les rues calmes ne sont pas exportées : le fond de carte les
montre, et elles auraient fait passer le fichier au-delà de 2 Mo. La carte
montre les barrières, pas le réseau entier.

**Licence** — le fichier dérive d'OSM : il est sous ODbL. Les autres sources
(CC-BY 4.0, Licence du gouvernement ouvert – Canada) sont citées dans
`metadata.sources` et devront l'être dans l'attribution du lab.

### Lab et entrée

**Fait** — lab `src/labs/velo-quebec-levis.ts` (trois scènes : aujourd'hui,
Lévis à 40, pont de Québec), enregistré dans `src/labs/index.ts`. Entrée
`content/entries/velo-quebec-levis.fr.md` et `.en.md`. `tsc` et `eslint`
passent ; les pages `/fr/blog/velo-quebec-levis`, `/en/…` et
`/lab-preview/velo-quebec-levis` répondent 200 en `next dev`.

**À vérifier** — le rendu de la carte dans un vrai navigateur. Edge en mode
headless ne dessine pas le WebGL : la carte y reste vide, celle du lac
Saint-Charles aussi.

**Chiffres de l'entrée** — le tableau du pont est en résidents. Les rapports
×4,3 / ×2,2 / ×10 sont en trajets (paires) : en résidents, c'est ×2,5 pour
le tablier et ×2,8 avec Lévis à 40. Le chantier coupe 96 % des résidents
(99 % des trajets). L'entrée dit les deux, sans les mélanger.

### Tache de portée sous le curseur

**Demande** — la carte doit faire comme portée-vélo : au survol, montrer tout
ce qu'on atteint à vélo par un trajet tranquille, jusqu'à 60 minutes, en
paliers de 30 minutes. Cadrage fixe sur l'agglomération : les scènes ne
déplacent plus la caméra.

**Fait** :

- `scripts/analysis/velo-quebec-levis-08-exporter-graphe.py` → graphe
  tranquille compact (58 287 nœuds, 71 313 arêtes, 1,6 Mo) avec les temps
  relief compris, les traversées fusionnées et quatre scénarios (A, C, D,
  CD), plus une grille Web Mercator de cellules de ≈ 100 m (431 × 447) ;
- `src/lib/reach.ts` : Dijkstra dans le navigateur, peint dans un tableau de
  pixels (une cellule par pixel, dilatée d'une cellule autour de chaque nœud
  atteint). Mesuré sous Node : 1 à 18 ms par calcul ;
- `LabMap` : nouvelle option `reach` (types.ts), source canvas sous les
  couches du lab, recalcul au survol, à l'appui et au changement de scène.
  Les autres labs ne changent pas.

**Contrôle** — surface atteinte en 60 min : Saint-Roch 17 601 ha en A, 18 311
en CD ; Vieux-Lévis **12 ha en A**, 3 601 en D. Le constat du lab se lit
directement sous le curseur.

**Hypothèse posée** — départ accroché au nœud tranquille le plus proche, à
300 m au plus ; au-delà, aucune tache. Pas de temps d'accès à pied jusqu'au
réseau (portée-vélo en compte un).

**À vérifier** — le rendu dans un vrai navigateur : Edge headless ne dessine
pas le WebGL.

### Tache : toutes les voies permises, 15 min, fond gris

**Demandes** — (1) ne montrer que la tache, (2) 15 min, (3) fond gris,
(4) tache lissée sans trous, (5) relier les tronçons coupés : la tache passe
par toute voie où le vélo est permis, seules les autoroutes sont exclues.

**Fait** :

- couches du lab masquées dans toutes les scènes (conservées dans la
  définition) ; une bande de 15 min ; fond OpenFreeMap Positron ;
- `src/lib/reach.ts` : disque de ≈ 200 m autour de chaque nœud atteint,
  trous enclavés bouchés (remplissage depuis le bord de la grille), flou en
  boîte 2 × 2 passes, bord resserré par une courbe en S ; rendu MapLibre
  interpolé (`raster-resampling: linear`) ;
- graphe v2 (1,96 Mo, 63 064 nœuds, 86 172 arêtes) : toutes les arêtes du
  graphe, drapeau 8 « permise », scénarios `tout` et `tout_C`. Les exclusions
  restent celles du classement : autoroutes, `bicycle=no`, voies privées,
  chaussée du pont de Québec (vélo renvoyé au trottoir) ;
- fichier renommé en v2 : `/data/*` est servi immuable, un navigateur qui a
  vu la v1 l'aurait gardée.

**Trous le long des routes (capture du 2026-10-21, secteur L'Ancienne-Lorette)**
— deux causes :

- la tache était peinte autour des NŒUDS atteints. Or 1 882 km du réseau
  (28 %) sont des arêtes de plus de 300 m sans carrefour, 291 de plus de
  1 km : peintes par leurs seuls bouts. Corrigé dans `reach.ts` : chaque
  arête parcourue est tracée (droite entre ses nœuds, à la cellule près),
  sur la part réellement atteinte dans le budget ;
- le polygone de Québec a six trous : les enclaves (L'Ancienne-Lorette,
  Wendake…). Leur intérieur, au-delà de la marge de 500 m, sortait du
  graphe. Corrigé dans `01-classer-reseau` : l'emprise comble les trous.
  +29 km seulement — la plupart de leurs voies entraient déjà par la marge.

Graphe v3 (1,97 Mo, 63 438 nœuds, 86 689 arêtes). Les voies des enclaves
sont rattachées à la ville la plus proche (Québec) dans les statistiques :
les chiffres de Québec bougent de quelques kilomètres (81 % tranquille
inchangé). Les classements et chiffres du pont sont à relancer avant
l'article.

**Trois paliers, rampe bleue** — 0–5, 5–10, 10–15 min, en carte de chaleur.
Rampe validée par le script de la skill dataviz (mode ordinal, fond Positron
`#f2f3f0`) : `#104281` / `#2a78d6` / `#6da7ec`, clarté monotone, palier le plus
clair à 2,25:1 du fond (`#86b6ef` échouait à 1,89:1). Foncé au centre, choix
de l'utilisateur : l'intensité dit la proximité. Opacité 0,75 par palier.
La tache reste au-dessus des étiquettes du fond (choix de l'utilisateur).
Coût : trois bouchages + flous par calcul, ≈ 40 ms (≈ 110 ms au premier).

**Boutons retirés, curseur vélo** — une seule scène (donc aucun bouton) : la
tache sur toutes les voies permises, pont tel qu'il est. Les scénarios C/D
restent dans le graphe. Curseur : rond blanc cerclé de `#104281`, bicyclette
au centre, point chaud au centre (nouvelle option `cursor` de `LabMap`).
Idée à reprendre : réagir quand la tache atteint une tête du pont de Québec.

**Panneau latéral** (`src/components/ReachPanel.tsx`) — la voie sous le
curseur, et la surface de TERRE atteinte en 15, 30 et 45 min, en barres :

- le parcours va jusqu'à 45 min, mais seuls 15 min sont peints ;
- surface = la tache (disque de 200 m, trous bouchés), sans le flou, moins
  les cellules d'eau. Masque de terre : AD de l'ISQ en limites
  CARTOGRAPHIQUES (trait de côte), rastérisées sur la grille Web Mercator,
  92,1 % de terre. Ajouté au graphe v4 (1,98 Mo) en plages ;
- noms des voies dans un second fichier, `velo-quebec-levis-noms-v1.json`
  (6 538 noms, 457 Ko), chargé après le graphe ; un nom propre est préféré à
  « Rue sans nom » parmi les arêtes du nœud de départ ;
- barre = part du disque parcouru à 20 km/h en ligne droite (5, 10, 15 km de
  rayon), comme la « part du disque » de portée-vélo.

**Révision** — le panneau suit la tache : 5, 10 et 15 min (et non 15, 30,
45). Saint-Roch, rue de la Couronne : 4,7 / 15,3 / 30,8 km² ; Vieux-Lévis
4,7 / 14,0 / 23,7 ; Charlesbourg 7,9 / 24,9 / 47,8.

Premier contrôle, à 15 / 30 / 45 min : Saint-Roch 30,8 / 96,3 / 194,8 km² ;
Vieux-Lévis 23,7 / 74,4 / 133,2 ; Charlesbourg 47,8 / 160,0 / 284,3. ≈ 55 ms
par calcul.

**Interrupteur été / hiver** — revue de littérature avant tout code :

| Source | Mesure | Résultat |
| --- | --- | --- |
| Shoman et al., 2023, *IEEE Access* 11 | vélo instrumenté, sec vs enneigé | 15,73 → 12,45 km/h (−21 %) |
| Yan, Maat et van Wee, 2026, *Int. J. Sustainable Transportation* | 65 000 trajets GPS, 224 cyclistes | neige : −0,8 km/h en moyenne (jours mêlés) |
| Fenre et Klein-Paste, 2021, *Cold Regions Sci. & Tech.* | résistance au roulement, Trondheim | Crr 0,01 (asphalte) → 0,06 (neige profonde) |

Calcul physique à puissance constante (≈ 100 W, 90 kg, CdA 0,5) : 20 km/h à
Crr 0,01, ≈ 14 km/h à 0,025, ≈ 7 km/h à 0,06.

**Décision (utilisateur)** — modèle UNIFORME : toutes les vitesses × 0,79
(Shoman). Le modèle par type de voie (rues −21 %, sentiers non déneigés à
pied) a été proposé et écarté pour la simplicité. Limite écrite sous les
barres en hiver.

**Réseau « 4 saisons » de la Ville de Québec** — carte publique (ArcGIS
Experience « Transport et mobilité », Admin_VDQ), mais les couches
(`CI_TRANSPORT_MOBILITE_DEV`) exigent un jeton : « Token Required ». Aucune
licence, absent de Données Québec. Non utilisable sans autorisation —
demander à la Ville si un modèle par type de voie revient. Lévis : aucune
information publique trouvée sur des voies cyclables déneigées.

**Fait** — `reach.ts` : parcours paramétré par un facteur de temps, et
`mesurer()` (surfaces sans peinture). En hiver, l'été est mesuré d'abord et
montré en contour derrière la barre d'hiver, avec l'écart. Contrôle (15 min) :
Saint-Roch 30,8 → 21,2 km² (−31 %), Sainte-Foy −22 %, Vieux-Lévis −24 %,
Charlesbourg −33 %. Moins que le −38 % théorique (0,79²) : le disque de
200 m autour des voies ne rétrécit pas avec la vitesse. ≈ 60 ms par calcul
en hiver (deux parcours).

**Couleur par saison** — été en orange, éclairci à la demande : `#c84a12` /
`#e46d2e` / `#ef9150` à 0,65 d'opacité (d'abord `#9a330f` / `#dd5a1c` à 0,75,
jugé trop fort ; la nouvelle rampe passe aussi le validateur). Hiver en bleu
(inchangé, 0,75). Rampe orange validée au script dataviz (ordinal,
fond `#f2f3f0`, palier clair 2,13:1) ; les essais plus clairs (`#f5a06e`,
`#f29a5f`) échouaient sous 2:1. La tache, les barres et la légende du panneau
changent avec l'interrupteur (`reach.winter.bands`). Touche **H** : bascule
sans bouger la souris (ignorée dans un champ de saisie et avec Ctrl/Alt/Cmd).

**Vue « rues exposées »** (liste déroulante du panneau) — la tache de 15 min
en gris neutre (`#94a3b8`, 0,4), et par-dessus les voies exposées
(> 40 km/h) parcourues dans ce budget, en rouge `#c81e1e` (3,8:1 sur la tache,
5,2:1 sur le fond ; `#dc2626` n'avait que 3,2:1), épaisseur selon la vitesse
des autos. Chaque voie est coupée là où le temps s'épuise. Le panneau donne
les km exposés et leur part des km parcourus.

- fichier partagé avec le futur itinéraire : `velo-quebec-levis-troncons-v1.json`
  (1,65 Mo, chargé au premier passage dans la vue) — coordonnées des nœuds en
  écarts × 1e5, longueur, classe, vitesse auto, dénivelés, pente max par
  arête, dans l'ordre du graphe v4 (graphe inchangé, vérifié octet par octet) ;
- `reach.ts` : `parcourues(minutes)` — arêtes parcourues et part atteinte
  depuis chaque bout, 2 à 5 ms.

Contrôle (15 min, été) : Saint-Roch 102 km exposés sur 665 km parcourus
(15 %) ; Sainte-Foy 18 % ; Charlesbourg 14 % ; **Vieux-Lévis 218 km sur 369
(59 %)**. Le constat du projet se lit d'un coup d'œil.

**Itinéraire entre deux clics** — mode « Itinéraire » du panneau (à côté de
« Portée ») : clic = A, clic = B, troisième clic = nouveau départ.

- itinéraire le plus RAPIDE (choix de l'utilisateur), saison comprise ;
  `reach.ts` : `itineraire()`, Dijkstra arrêté à la cible, prédécesseurs ;
- tracé : liseré blanc, encre si tranquille, rouge `#c81e1e` si exposé (le
  même code que la vue « rues exposées »), points A et B ;
- panneau : temps, distance, dénivelé +, part tranquille (en distance), puis
  les étapes — arêtes consécutives d'une même voie et d'une même difficulté
  réunies, étapes de moins de 30 m fondues dans la précédente ;
- difficulté = CIRCULATION seulement (choix de l'utilisateur) : tranquille
  ou exposée ; la pente max est affichée à part dès 4 %, et « à pied » pour
  les trottoirs et le pont.

Contrôle (Node) : Saint-Roch → Université Laval 23,6 min, 6,3 km, D+ 79 m,
46 % tranquille, 27 ms. Sainte-Foy → Saint-Romuald : 38 min, passe par le
pont de Québec à pied (1,29 km en 12,9 min).

Limite : tracé en ligne droite d'un nœud à l'autre ; une longue courbe sans
carrefour paraît rectiligne.

**Ville des 15 minutes** — cadre : Moreno et al. (2021), six fonctions
sociales à 15 min à pied ou à vélo. Retenues (utilisateur) : se soigner,
apprendre, s'approvisionner, s'épanouir ; « travailler » sans donnée fine.
Source : tout OSM (utilisateur). Métrique : le lieu le plus proche et son
temps — à vélo, presque tout tient en 15 min, c'est le temps au plus proche
qui distingue les quartiers.

- `scripts/analysis/velo-quebec-levis-09-lieux.py` : 1 955 lieux classés,
  1 740 rattachés à un nœud du graphe à ≤ 300 m (parcs par leur BORD),
  1 716 après dédoublonnage → `velo-quebec-levis-lieux-v1.json`, 87 Ko.
  Dépanneurs exclus (pas de panier complet) ;
- Overpass principal saturé (502) : le script valide la réponse et réessaie,
  miroir kumi.systems — base OSM du 2026-07-24 ;
- carte : un clic en vue « temps de parcours » épingle la tache ; les lieux
  qu'elle touche TOMBENT avec un rebond, les plus proches d'abord ; une
  couleur par fonction (`#e87ba4`, `#6250d6`, `#eda100`, `#008300`, palette
  validée toutes paires, contour d'encre) ; clic droit, Échap ou
  « Libérer » rendent la tache au curseur (le menu du navigateur n'est
  retenu que s'il y a une tache épinglée) ;
- correctif : les lieux passaient SOUS la tache quand le graphe arrivait
  avant le fond (la tache était redescendue après coup, au-dessus d'eux).
  Ordre fixé et réappliqué à chaque pose (`ordonnerPortee`) : tache < rues
  exposées < itinéraire < lieux < épingle < points A/B ;
- panneau : X / 4 fonctions, et par fonction la liste triée par temps
  (cinq visibles, le reste dépliable). Saison comprise (touche H).

Contrôle : Vieux-Lévis, été → hiver : approvisionnement 10 → 8 lieux, Metro
Plus 4,0 → 5,0 min.

**Lieux étendus — plusieurs accès** (signalé par l'utilisateur : le parc
linéaire de la rivière Saint-Charles se dessinait en son centre, hors de la
tache, alors qu'on le touche de partout). Lieux v2 : un lieu étendu (parc,
campus, parc linéaire) a pour accès tous les nœuds à ≤ 25 m de son contour ou
dedans, éclaircis à un tous les 200 m ; il est atteint dès qu'un accès l'est,
au temps du plus rapide, et se dessine à cet accès. 2 281 accès pour 1 717
lieux ; parc linéaire Saint-Charles 47 accès sur 10 km, Plaines 21,
Université Laval 39.

Trois erreurs corrigées en chemin, toutes dans `09-lieux.py` :

- relation à contour incomplet (57 morceaux) : seul le premier morceau était
  gardé → tous les morceaux le sont ;
- dédoublonnage : le POINT d'un parc (rendu en premier par Overpass) chassait
  son polygone → la forme la plus étendue passe d'abord ;
- tampons désalignés : `GeoDataFrame({"lieu": index}, geometry=série)`
  alignait la géométrie sur l'index, et chaque lieu héritait du tampon d'un
  autre (les Plaines : 8 nœuds au lieu de 480) → `.values` des deux côtés.

Contrôle : depuis Limoilou au bord de la rivière, parc linéaire à 0,1 min
(30 accès sur 47 dans la tache) ; depuis Vanier, 2,2 min.

**Panneau flottant** (demande de l'auteur) — en écran large, le panneau de
portée flotte sur la carte en haut à gauche (25 rem, ombre, fond translucide),
la carte prend toute la largeur. Exception assumée à la règle des autres labs
(panneau à côté) : la tache se lit autour du curseur. Sous 1024 px il reste
sous la carte. Le bloc « ville des 15 minutes » passe sous les surfaces ; le
mode d'emploi passe en bas à droite.

Fonctions REPLIÉES : une ligne par fonction (couleur, nom, nombre de lieux,
le plus proche et son temps) et une flèche à droite qui déplie la liste
complète (défilante). Un clic sur un lieu zoome la carte dessus (zoom ≥ 15,5,
centre décalé à droite du panneau flottant) et l'entoure d'un anneau
(`lab-lieu-choisi`), effacé au prochain épinglage ou à la libération.
La tache s'efface avec le zoom (`raster-opacity` 1 au zoom ≤ 12,5 → 0,25 au
zoom ≥ 15) : au niveau de la rue, on lit le fond ; lieux, anneau et épingle
restent opaques. Touche **N** : retour au nord, à plat (`resetNorthPitch`),
rappelée dans le panneau à côté de H.

**Bandeau des saisons** — en tête du panneau, à la manière de l'appli météo
de Samsung : Québec vue de Lévis, en été ou sous la neige, en boucle. Images
Nano Banana (l'hiver par édition de l'été, même cadrage), vidéos Veo (image
vers vidéo, caméra fixe). Bouclage, recadrage 25:11 (le Château en haut, le
traversier en bas) et compression faits ici (voir SOURCES.md). Les deux
saisons superposées se fondent en 700 ms à l'interrupteur et à la touche H ;
nom de la voie sur un dégradé sombre ; images fixes si le système demande
moins de mouvement. Mention « générées par IA » dans l'attribution.

Panneau élargi à 28 rem ; liseré intérieur de la couleur de la saison (le
palier 10 min de la tache : `#e46d2e` l'été, `#2a78d6` l'hiver) : d'abord
1,5 px à 35 % (jugé trop discret), puis 3 px à 60 % et halo intérieur de
30 px à 30 % ; fondu en 700 ms au changement de saison.

**Itinéraire refondu : d'un lieu à un autre** (demande de l'auteur) — l'onglet
« Itinéraire » disparaît ; l'itinéraire naît dans la portée :

1. tache épinglée, lieux tombés ;
2. clic sur un lieu → FICHE à côté du point (nom, fonction, genre, temps
   depuis le départ), qui suit la carte quand elle bouge ;
3. « Itinéraire vers un autre lieu » → clic sur un second lieu de la tache →
   itinéraire le plus rapide du premier au second, A et B sur les lieux ;
4. petit panneau en BAS À DROITE de la carte : les deux noms en titre, résumé
   et étapes (même bloc qu'avant), croix pour fermer, liseré de la saison.

Échap : annule d'abord le choix en cours, puis ferme la fiche, puis libère la
tache. Un nouvel épinglage efface fiche et itinéraire. L'itinéraire suit la
saison (touche H). Libellés des 21 genres de lieux dans le lab.

**Boutons aux couleurs de la saison** — plus aucun bouton noir. Variables CSS
sur le conteneur (`--s-fort`, `--s-texte`, `--s-teinte`, `--s-bord`), lues
par tous les boutons, fondues en 700 ms au changement de saison :
principal et sélecteur actif en relief plein (`#c84a12` l'été, 4,7:1 sous
texte blanc ; `#104281` l'hiver, 9,9:1) ; secondaire en contour, texte
`#a63c0e` / `#104281` (6,0:1 / 9,2:1) ; icônes neutres, teinte au survol.
Le moyen de la tache (`#e46d2e`) écarté des boutons : 3,2:1 seulement sous
texte blanc. Zoom + / − de MapLibre laissés neutres (choix de l'auteur).

**Trajet animé** — le trait se dessine de A vers B au rythme du TEMPS de la
route (la tête ralentit dans les côtes et sur le trottoir du pont), une tête
ronde de la couleur de la saison avec une bicyclette blanche en pointe ; les
minutes du petit panneau montent avec elle. Échelle : 0,15 s par minute de
route, bornée à 1,2–6 s — l'hiver (×1,27) dure donc plus longtemps.
Animation au choix du second lieu seulement ; H recalcule le trajet sans le
rejouer. Sans animation si le système le demande.

**Trajet lissé, vert / rouge** — le trajet devient UNE ligne continue,
virages arrondis par une courbe de Bézier de rayon fixe 20 m (moins sur un
tronçon court ; angles presque plats gardés) : un lissage global aurait coupé
à travers les îlots. Chaque sommet garde son heure — l'animation suit
toujours le temps. Couleurs posées en dégradé le long de la ligne
(`line-gradient`, source `lineMetrics`) : tranquille vert `#0f8a5f`, exposé
rouge `#c81e1e` (écart daltonien 8,0 validé, contraste ≥ 3:1) ; second code
indépendant de la couleur : marque blanche discontinue au centre des
tronçons exposés, comme une ligne de chaussée. Barre « part tranquille » et
pastilles des étapes passées au vert. Contrôle, Saint-Roch → Université
Laval : 111 tronçons → 328 sommets lissés, durée conservée (23,6 min),
longueur 6,28 → 6,20 km. Rayon relevé à 60 m (10 points par courbe) : à
l'échelle du quartier, 20 m ne faisaient que 2–3 px et l'angle restait droit
à l'œil ; 472 sommets, 6,18 km. Expressions de dégradé validées par
`maplibre-gl-style-spec`. Le trait noir signalé venait de l'ANCIENNE carte
(couleur encre `#14261f`, segments droits) restée en place après un
rechargement à chaud : la carte n'est créée qu'une fois, il faut un
rechargement complet.

Bandeau animé du panneau d'itinéraire (`src/components/BandeauVelo.tsx`),
phase technique : un cycliste pédale sur place pendant que le décor défile en
parallaxe (ciel, ville, avant-plan, chaussée à quatre vitesses). Une seule
boucle `requestAnimationFrame` déplace les couches ; la vitesse tend en douceur
vers sa cible : × 0,79 en hiver (même facteur que la tache), × 1,6 pendant le
tracé animé. Jambes calculées par cinématique inverse (genou), roues et
pédalier en rotation, léger roulis ; flocons en hiver. Avec
`prefers-reduced-motion`, l'image reste fixe. Dessins provisoires : la phase
design remplacera les couches par les illustrations définitives.

Bandeau du cycliste, version définitive : VIDÉO plutôt que couches. Image
Gemini (Nano Banana, illustration plate éditoriale) puis Veo, une par
saison (`00-brut/ia/bandeau-velo-{ete,hiver}.mp4`, 1280 × 720, 24 i/s,
10 s). Contrôles : cycliste fixe au centre, pieds sur les pédales, roues
sans rayons (pas de scintillement). Boucle : la dernière image d'été et les
deux dernières d'hiver répétaient la première (PSNR 27 dB contre ~21 entre
images voisines) — retirées, le raccord vaut un pas ordinaire. Recadrage
1280 × 512 à y = 120 (5:2 : le 22:7 coupait le casque ou les roues), réduit à
704 × 282, sans son ; WebM 296 / 437 Ko, MP4 372 / 507 Ko, affiche WebP.
Vitesse : le sol d'hiver défile déjà à 0,83 de l'été (corrélation de phase
sur le trottoir : 11,2 contre 13,6 px/image) ; lue à 0,96, la vidéo d'hiver
tombe sur 0,79. Accélération × 1,6 pendant le tracé par la vitesse de
lecture, lissée. Une seule vidéo décodée hors fondu.

Profil en long du trajet — `scripts/analysis/velo-quebec-levis-08b-altitudes-troncons.py` :
le v1 des tronçons ne gardait que le dénivelé cumulé par arête ; le v2 ajoute
l'altitude de chaque nœud (décimètres, en écarts), lue dans le MNT 8 m
(moyenne 3 × 3 ≈ 24 m, comme le lissage des pentes). Ordre des 63 438 nœuds
vérifié identique au v1. 96 nœuds de pont (toutes leurs arêtes sur un pont)
ou sans MNT reçoivent l'altitude de leurs voisins, pondérée par l'inverse de
la longueur. Contrôles : Saint-Roch 8,5 m, place D'Youville 64,8 m,
Université Laval 88,7 m, extrémités du pont de Québec 42,7 et 42,1 m.
1 842 Ko (+9 %). Limite : entre deux nœuds le profil est droit, et un tunnel
garde l'altitude du sol au-dessus. Dans le panneau : altitude selon la
distance, vert / rouge comme la ligne, dévoilé avec l'animation (même
horloge) ; écart vertical d'au moins 20 m. Dénivelé affiché + et −.
Panneau élargi à 26rem (hauteur max 70 %), vidéos réencodées à 832 px (v2) ;
seules les étapes défilent. Fiche d'un lieu passée au-dessus des
infobulles de survol (le bouton d'itinéraire restait caché).

Ville des 15 minutes sortie dans son propre panneau (`PanneauLieux`), collé
au panneau de portée et rangé SOUS lui : il en sort de gauche à droite
(0,5 s) quand la tache est fixée, y rentre à la libération. Le panneau de
portée ne garde que la consigne d'avant le clic : en parcourant la liste, on
ne perd plus de vue le bandeau ni les surfaces.

**Remplacé le même jour** — trois panneaux flottants (portée 28rem, lieux
20rem collé, itinéraire 26rem) dépassaient la largeur de la carte sur un
portable : chevauchements et barre de défilement horizontale. Refonte sur le
patron « deux panneaux » des géoportails (Calcite d'Esri : un panneau
d'analyse, un panneau de résultats ; Google Maps : une feuille à la fois) :
- gauche, PORTÉE, sans défilement : bandeau 25:9, saison et vue sur une
  rangée, raccourcis en une ligne, note des barres derrière un « i »,
  consigne en une ligne ; la légende passe SUR la carte, en bas à gauche ;
- droite, RÉSULTATS, un seul panneau (`PanneauResultats`) : lieux → choix de
  la destination (consigne en tête, un lieu de la liste vaut un clic sur la
  carte) → itinéraire avec « ← Lieux » ; en-tête fixe, une seule zone qui
  défile ;
- largeur selon la carte (ResizeObserver) : 26rem ≥ 1 200 px, 22rem en
  dessous ; sous 900 px un seul panneau ouvert à la fois ;
- panneaux repliables (languette avec le chiffre clé, touches [ et ]) ; les
  boutons de MapLibre glissent à gauche du panneau de résultats ; les zooms
  centrent entre les panneaux ;
- survol lié : un lieu de la liste se cerne sur la carte, un point de la
  carte marque sa ligne et sa fonction ;
- sous 1 024 px, les résultats sont une feuille au bas de la carte (repliée :
  l'en-tête seul) ; le cadre de la carte coupe tout débordement.

Destination choisie : la carte se CADRE sur la tache entière (emprise des
cellules atteintes au dernier palier, `ReachEngine.emprise`, lue juste après
`peindre` ; étendue au trajet s'il en sort), centrée entre les panneaux
ouverts, zoom ≤ 15, 0,9 s. Hiver : la tache est plus petite, le cadre aussi.
Le clic sur un lieu de la liste garde son zoom de rue. Chaque tache fixée
fait repartir la liste des lieux toutes fonctions repliées ; au retour de
l'itinéraire (« ← Lieux »), elle est comme on l'a laissée.

**Erreur corrigée** — le cadrage ne se faisait pas (« Map cannot fit within
canvas »). Le zoom sur un lieu passait les marges des panneaux en `padding`
à `flyTo` : MapLibre le GARDE sur la caméra, et `fitBounds` y ajoute le
sien — deux fois les panneaux, plus de place. Le zoom passe désormais par un
`offset` (ponctuel), et le cadrage remet la marge de la caméra à zéro avant
de calculer.

Notes de méthode RETIRÉES des panneaux (demande de l'auteur : elles prennent
la place des données, l'article les portera) : note des lieux (Moreno, OSM,
parcs, dépanneurs), note des barres et du modèle d'hiver (bouton « i »),
définition des rues exposées, consigne doublée dans la fiche d'un lieu. Les
textes restent dans `src/labs/velo-quebec-levis.ts` pour l'article.

**Erreur corrigée** — un cercle noir restait collé dans la tache après le
tracé : le cercle d'un lieu (zoom ou survol de la liste) ne s'efface qu'à la
sortie du survol, et la liste, cachée d'un coup par l'itinéraire, ne la
signale jamais. Le choix de la destination efface désormais le cercle.

Bandeau du départ revenu à 25:11 (la proportion des vidéos) : en 25:9, le
ciel et le fleuve étaient trop rognés. Consigne « Cliquez sur la carte… »
retirée du panneau de portée.

Tache fixée d'un clic : la carte se CADRE d'abord sur elle (même cadrage
que pour un trajet, marges calculées comme si les résultats étaient déjà
ouverts), puis les lieux tombent à l'arrivée (`moveend`, 1,4 s au plus ; un
jeton par cadrage pour qu'un clic pendant le vol ne lâche pas les lieux trop
tôt). Mouvement réduit : saut direct, lieux posés sans chute.

Dessin des lieux (propositions A + C retenues par l'auteur). Mesure d'abord
(validateur de palette, contre la couleur RÉELLE de la tache sur le fond
gris) : aucune des quatre couleurs n'atteint 3:1 sur toute la tache —
1,06 (rose sur le cœur orange), 1,07 (vert sur le cœur bleu d'hiver),
1,06 (ambre sur le bord bleu). Deux couleurs saturées de même clarté qui se
touchent vibrent : c'est le « ça crie ». Des teintes plus sourdes ont été
essayées et ÉCHOUENT au daltonisme (vert et ambre confondus, ΔE 5,1) : on
garde les quatre couleurs, on change le dessin.
- A : chaque point cerclé de BLANC (2 px) et d'un fin liseré d'encre
  (55 %) : la figure se détache du fond par la clarté, plus par la teinte.
- C : le plus proche de chaque fonction 1,5 fois plus grand, devant ses
  voisins, avec un halo doux de sa couleur (30 %) — la réponse « où est mon
  épicerie la plus proche ? » se lit sans ouvrir la liste.
Expressions validées par `maplibre-gl-style-spec`.

Vue « rues exposées » REFAITE (proposition 2 retenue par l'auteur : les
traits rouges ne disaient rien au lecteur) → « Sans rues exposées » : ce
que l'on PERD faute d'aménagements. Deux taches de 15 min : grise par
toutes les voies, et par-dessus, dans la couleur de la saison, par les
seules voies tranquilles (scénario A). L'anneau gris = le territoire
qu'on n'atteint qu'en passant par des rues à plus de 40 km/h. Panneau :
« 22,1 km² sur 30,6 », barre, et « Sans rues exposées, vous perdez 8,5 km²
(28 %) ». Moteur : `peindre(…, superposer)` pose la seconde tache sur la
première. 15–45 ms les deux.

**Erreur corrigée** — chaque tache cherchait son propre nœud de départ : à
Limoilou, la grise partait d'une avenue à sens unique mal reliée (16 km²)
et la tranquille d'une piste à 100 m (24,6 km²) — la tranquille sortait
plus grande que le total. Les deux partent désormais du nœud TRANQUILLE le
plus proche (≤ 300 m) ; à défaut, la grise part du nœud ordinaire et la
tranquille vaut 0.

Contrôles, été (hiver) — tout / tranquille / perte :
Saint-Roch 30,6 / 22,1 / 28 % (31 %) ; Sainte-Foy 31,3 / 22,9 / 27 %
(29 %) ; Limoilou 30,5 / 24,6 / 19 % (20 %) ; Charlesbourg 47,8 / 31,2 /
35 % (34 %) ; **Vieux-Lévis 23,6 / 6,2 / 74 % (78 %)** — Lévis, sans rues
à 40 km/h ni grand réseau cyclable, perd presque tout. À reprendre dans
l'article (et à nuancer : les rues locales de Lévis sont comptées à 50).

**Remplacé le même jour** — l'auteur attendait la COLMENA (proposition 1) :
la vue devient « Confort à vélo ». Les chiffres ci-dessus (perte par voies
tranquilles) restent valables pour l'article.
- La tache de 15 min (toutes les voies, grise) est découpée en hexagones de
  400 m (grille Web Mercator, pointe en haut, échelle 1/cos 46,8°).
- Confort d'un hexagone = part pondérée des km parcourus dedans (chaque
  arête au milieu de sa part atteinte) : piste 1, sentier 0,9, rue calme
  0,7, à pied 0,3, exposée 0. Moins de 60 m de voies : pas d'hexagone.
- Rampe vert d'eau, 5 crans (`#45bda9` → `#005d50`), validée en ordinal
  (clarté monotone, cran clair 2,02:1 sur le fond).
- Rouge `#c81e1e` + contour épais `#7f1010` (second code : rouge et cran
  foncé à ΔE 6,7 chez les protanopes) : hexagone où une PISTE s'arrête sur
  une rue exposée. Définition resserrée après essai : une seule arête de
  piste/sentier au nœud, vraie piste (pas un sentier) d'au moins 100 m,
  aucune rue calme, au moins une exposée → 104 coupures sur la zone (806
  avec sentiers et raccords : 39 % d'hexagones rouges à Lévis, le rouge ne
  signalait plus rien).
- Panneau : confort moyen /100 avec un repère sur la rampe, et « N endroits
  où une piste s'arrête net sur une rue rapide ». Légende sur la carte.
- 4–31 ms par position du curseur.

Contrôles (confort /100 · hexagones · coupures) : Saint-Roch 52 · 212 · 5 ;
Sainte-Foy 54 · 221 · 7 ; Limoilou 57 · 110 · 2 ; Charlesbourg 60 · 321 · 8 ;
**Vieux-Lévis 24 · 168 · 15** — même lecture que la perte : Lévis est la
moins confortable (avec la même nuance des rues locales à 50).

### Colmena : hiver réel et corridors VivaCité — scripts 10 à 13

Contexte : deux articles (`CONTEXTE-CONFORT-VELO.md`) — le réseau blanc a
suivi la hausse des cyclistes d'hiver ; 14 corridors, 150 km d'ici 2034.

**Données** (`10-telecharger-vdq-mobilite.py`) — le service public que lit la
carte « Vélo quatre saisons » de la Ville (CI_TRANSPORT_MOBILITE) : couche 12
« Réseau cyclable 4 saisons » (1 120 tronçons, 174,7 km au sol pour 2025-26 :
déneigé 125,4, damé 49,3 — l'article disait 136 km en 2024-25) et couche 0
« Réseau cyclable » (SOUS_TYPE_RC = Corridor : 29 km de CVC réalisés).

**Rattachement** (`11-joindre-hiver-cvc.py`) — arête échantillonnée tous les
10 m, attribut pris si ≥ 60 % des points sont à moins de 12 m. Pistes et
sentiers : 82,5 km déneigés, 50,2 km damés ; CVC réalisés : 21,5 km. Des
rues et trottoirs parallèles prennent aussi l'attribut : sans effet, l'hiver
ne change le poids que des pistes.

**Corridors projetés** (`12-cvc-projetes.py`) — pas de fichier : carte
schématique de la Ville saisie à l'œil
(`15-saisie-manuelle/cvc-projetes-carte-ville.json`). Pixels → mètres par
TRIANGLES sur 19 pastilles géocodées (Nominatim) : une affine unique laissait
628 m d'écart médian, 2 km au pire. Chaque tracé relie ses sommets saisis par
le plus court chemin, préférence légère aux pistes (0,8). Premier essai (un
point par km, préférence forte 0,5) : 209 km de zigzags ; retenu : 172 km,
qui suivent des axes et recouvrent les CVC déjà réalisés (D, F, A). Tracé
INDICATIF — c'est le mot de la Ville.

**Export** (`13-troncons-hiver-cvc.py`) — tronçons v3 : `h` (0, 1 damé,
2 déneigé) et `cvc` (1 réalisé, 2 projeté).

**Lab** — interrupteur « Aujourd'hui / Avec les 14 corridors » dans la vue
confort ; la saison (H) lit l'entretien réel : piste déneigée = poids d'été,
damée 0,6, non entretenue 0 ; rue calme 0,5 (déblayée, bancs de neige) ;
Lévis sans donnée : ses pistes comptent 0 l'hiver (dit dans la légende).
Avec les corridors, toute voie d'un corridor compte 1 (quatre saisons) et
les coupures posées sur un corridor se referment. Corridors dessinés sur la
colmena : réalisés en trait plein, projetés en tirets. Le panneau donne les
quatre lectures (été / hiver × aujourd'hui / corridors).

Contrôles (confort /100 — été, hiver | avec corridors été, hiver) :
Saint-Roch 52, 38 | 55, 41 ; Sainte-Foy 54, 35 | 57, 40 ; Limoilou 57, 41 |
59, 44 ; Charlesbourg 60, 42 | 62, 46 ; Vanier 54, 39 | 56, 42 ;
Vieux-Lévis 24, 12 | 24, 12. L'hiver retire 14 à 19 points ; les corridors
n'en rendent que 2 à 5 en MOYENNE sur la tache — ils sont des lignes dans
une tache de dizaines de km de voies. À discuter avec l'auteur.

**Erreur corrigée** — « H ne change rien » : après le choix de la vue dans
la liste déroulante, le focus restait sur la liste, et les raccourcis sont
ignorés dans un champ de formulaire. La liste rend désormais le focus.

Demandes de l'auteur : (1) interrupteur « avec les 14 corridors » RETIRÉ
(les tracés restent dans les tronçons v3, champ `cvc`) ; (2) le panneau dit
en mots simples comment lire la colmena — vert d'eau foncé « presque tout en
pistes ou rues calmes », clair « surtout des rues rapides », rouge « une
piste s'arrête net » avec le nombre d'endroits ici ; (3) l'HIVER, les pistes
entretenues sont dessinées sur la colmena, bleu hiver `#104281` cerclé de
blanc : trait plein déneigée, tirets damée. Seules les arêtes piste/sentier
sont tracées (le rattachement du script 11 donne aussi l'attribut à des rues
et trottoirs parallèles).

Hexagones qui TOUCHENT une piste (demande de l'auteur : « que les alvéoles
des pistes déneigées ressortent ») : ≥ 80 m de piste dans l'hexagone (piste
parcourue tous les 50 m, chaque hexagone traversé compte) → confort au moins
0,85 ; l'hiver seulement si déneigée (0,85) ou damée (au moins 0,65). Appliqué
d'abord à l'hiver seul : l'hiver passait AU-DESSUS de l'été (Saint-Roch 55
contre 52) — la règle vaut donc aux deux saisons, toute piste l'été. Le
confort moyen du panneau se calcule désormais sur les hexagones (mêmes
valeurs qu'à l'écran), pondérés par leurs km de voies.

Contrôles (été → hiver, /100) : Saint-Roch 72 → 55 (64 alvéoles relevées
l'hiver sur 149) ; Sainte-Foy 73 → 51 ; Limoilou 74 → 59 ; Charlesbourg 73 →
52 ; Vieux-Lévis 57 → 12 (aucune donnée d'entretien : l'écart dit le manque
de données autant que l'hiver).

Pistes d'hiver dessinées avec leur tracé COMPLET
(`14-exporter-pistes-hiver.py` → `pistes-hiver-v1.geojson`, 548 lignes,
160 Ko, simplifiées à 0,5 m) : tracées de nœud à nœud depuis les tronçons,
elles coupaient les courbes et ne se posaient pas sur les voies du fond de
carte (OpenFreeMap, lui aussi tiré d'OpenStreetMap). Chargées au premier
passage en hiver dans la vue confort.

Pistes d'hiver v2 (« restes » aux carrefours, angles vifs) — diagnostic du
v1 : 169 bouts pendants de moins de 25 m (raccords OSM vers trottoirs et
traverses), 215 virages de plus de 30°, 70 de plus de 60°. Corrigé : élagage
répété des bouts pendants < 25 m et des morceaux isolés < 60 m (170 retirés),
crochets de bout coupés (15 derniers mètres à plus de 60° du cap : 11),
lissage de Chaikin 3 passes extrémités FIXES (jonctions exactes), puis
sommets alignés retirés à 0,3 m. Reste : 104 virages > 30°, 14 > 60°, sur
des bouts de quelques mètres — sous le pixel à l'échelle d'un quartier.
378 lignes, 143 Ko. Trait plus épais (3,4 px à z14, liseré 6,5), affiné en
vue d'ensemble. Échelle du panneau et de la légende : « Peu sécuritaire →
Sécuritaire » (choix de l'auteur parmi cinq ; « rues rapides » se lisait
comme un atout pour le vélo). Nuance pour l'article : nous mesurons le
type de voie, pas les accidents.

**« L'hiver ici »** (idée 1 retenue parmi sept) — dans la vue confort, le
clic fixe la tache (cadrage comme pour les lieux) et le panneau de droite
donne : la piste DÉNEIGÉE la plus proche (minutes à vélo l'hiver, ou « plus
de 15 min » et la distance à vol d'oiseau), la piste damée la plus proche,
les km de pistes déneigées et damées atteints en 15 min d'hiver, et la
phrase des articles (réseau blanc 30 → 136 → 175 km ; cyclistes d'hiver
6 000 → 19 000). Toujours aux vitesses d'hiver, quelle que soit la saison
affichée : un second parcours, après l'emprise (il l'écraserait). 9–49 ms.

Contrôles — piste déneigée / damée la plus proche ; km en 15 min d'hiver :
Saint-Roch 1 min / 3 min ; 17,4 déneigés, 11,2 damés · Sainte-Foy 1 / 11 ;
17,6, 2,3 · Limoilou 7 / 10 ; 7,0, 3,5 · Charlesbourg 1 / 5 ; 11,1, 7,4 ·
Val-Bélair > 15 min (4,9 km) / 3 min ; 0, 7,1 · Vieux-Lévis > 15 min
(1,9 km — de l'autre côté du fleuve) / > 15 min ; 0, 0 (pas de donnée).

Panneau « L'hiver ici » : même en-tête que l'itinéraire (le cycliste qui
pédale, toujours l'hiver ; plus vite pendant le tracé), « Libérer » et repli
posés dessus. Le CHEMIN jusqu'à la piste déneigée la plus proche est tracé et
animé comme un itinéraire (vert rues calmes, rouge rues rapides, A → B),
aux vitesses d'hiver ; calculé en dernier dans le dessin (l'itinéraire écrase
le parcours du moteur) et seulement si départ ou piste changent — la tache se
repeint à chaque mouvement de souris. Rien n'est tracé si la piste est à plus
de 15 min, ou si l'on y est déjà.

**Remplacé** — l'auteur voulait (option B) un chemin vers CHAQUE piste
déneigée atteinte en 15 min, en jaune. Une « piste » = un morceau continu du
réseau déneigé (union-find sur les pistes/sentiers déneigés : 67 morceaux,
38 de 300 m ou plus — les autres ignorés). Pour chaque morceau atteint, le
nœud le plus proche (temps d'hiver), et le plus court chemin d'hiver jusqu'à
lui, lissé ; 12 au plus. Jaune `#ffd23f` cerclé d'encre (le jaune seul n'a
pas 3:1 sur la colmena claire), point jaune à l'arrivée. Le panneau les
liste par nom et minutes. Nom d'un morceau : le nom qui y court sur le plus
de mètres, hors génériques — le nom du seul nœud d'arrivée donnait souvent
« Trottoir ou passage piéton ». 9–46 ms par clic.

Contrôles (pistes déneigées à portée en 15 min d'hiver) — Saint-Roch 9 :
rue du Pont 1 min, corridor du Littoral 4, promenade Samuel-De Champlain 6…
corridor des Cheminots 13 · Sainte-Foy 10 : boulevard Hochelaga 1, chemin
des Quatre-Bourgeois 7, Route Verte 5 & 6 9… · Limoilou 5 : corridor du
Littoral 7, 8e Avenue 11, corridor des Cheminots 11… · Charlesbourg 6.

Chemins jaunes et leur liste : l'HIVER seulement (l'été toutes les pistes
sont praticables) ; ils reviennent au retour à l'hiver (H). L'en-tête du
panneau « L'hiver ici » suit la saison, comme celui de l'itinéraire (il était
figé à l'hiver).

Chemins jaunes ANIMÉS comme l'itinéraire : une même horloge en minutes pour
tous (les courts arrivent d'abord, une onde qui gagne chaque piste), une
pointe jaune au bout, le point d'arrivée quand le chemin touche sa piste ;
0,15 s par minute, 1,2 à 6 s ; le cycliste de l'en-tête accélère pendant le
tracé. Départ à la FIN du vol de cadrage (comme la chute des lieux) ; d'un
coup si le système demande moins de mouvement.

**L'été : « L'été ici »** (proposition 1 parmi cinq, avec les corridors
RÉALISÉS seulement — décision de l'auteur : pas les tracés indicatifs) —
même geste, chemins ORANGE `#ff8a1f` (cerclés d'encre) vers chaque corridor
VivaCité réalisé atteint en 15 min d'été. Corridor = morceau continu
d'arêtes `cvc` = 1 (couche officielle de la Ville), ≥ 200 m : 10 morceaux
sur 12. Nom : le plus long nom qui y court. Le panneau devient « L'été ici »
(titre, languette) : le corridor le plus proche, la liste, et la phrase des
articles (14 corridors, 150 km d'ici 2034, « 7 à 77 ans », +32 % aux
compteurs). La saison fait partie de la clé de tracé : H retrace (jaune ↔
orange).

Contrôles (été, 15 min) — Saint-Roch 4 : rue du Pont 1 min, 4e Avenue 6,
rue Dalhousie 6, chemin Sainte-Foy 6 · Sainte-Foy 3 : boulevard Laurier 9,
boulevard Neilson 9, chemin Sainte-Foy 14 · Limoilou 2 · Charlesbourg 3 :
3e Avenue Ouest 1, 3e Avenue Est 2, 4e Avenue 12 · Vieux-Lévis 0. Les noms
recoupent la liste des tronçons de la page « Corridors VivaCité » de la
Ville.

Corridors VivaCité réalisés DESSINÉS l'été, avec les mêmes spécifications que
les pistes déneigées l'hiver (liseré blanc, 3,4 px à z14, affinés en vue
d'ensemble), dans l'orange foncé de l'été `#a63c0e` (pendant du bleu foncé
`#104281` de l'hiver ; les chemins qui y mènent restent orange vif).
`14-exporter-pistes-hiver.py` produit aussi `corridors-v1.geojson`, même
nettoyage (élagage, crochets, Chaikin) ; trottoirs exclus (3,9 km rattachés
par parallélisme) et rues doublant une piste de corridor à moins de 15 m
retirées (0,8 km) ; les rues restantes sont des corridors en bande ou
vélorue. 55 lignes, 16,8 km, 13 Ko. Légende du panneau de gauche : « Corridor
VivaCité réalisé » l'été.

### Fluidité (sans rien changer à l'affichage)

Mesures d'abord : peindre la tache prenait 30 à 50 ms par mouvement du
curseur (16 ms disponibles par image) — le bouchage et le flou parcouraient
les 214 353 cellules de la grille, trois fois par palier et par surface,
pour une tache de quelques milliers de cellules ; la source canevas
« animée » faisait redessiner la carte 60 fois par seconde même au repos ;
les deux vidéos du bandeau du départ décodaient en même temps.

- Moteur (`reach.ts`) : bouchage, flou, surfaces, peinture et emprise ne
  parcourent plus que la ZONE de la tache (rectangle + marge de 10 cellules :
  le flou s'étend de 4, le bord reste vide). **Équivalence vérifiée pixel à
  pixel** contre l'ancienne version sur 300 départs au hasard enchaînés
  (été/hiver, scénarios tout/A, 3 paliers et gris) : pixels, surfaces,
  emprise, temps d'accès, arêtes parcourues identiques — sauf l'emprise d'un
  départ hors réseau (l'ancienne renvoyait toute la grille, jamais demandée).
  Peindre : 32,8 → 2,5 ms en moyenne.
- Carte : source canevas STATIQUE, texture relue une fois par dessin
  (play + pause) ; seul le rectangle qui change (ancienne + nouvelle tache)
  est envoyé au canevas ; un mouvement du curseur qui reste sur le même
  nœud de départ ne recalcule rien.
- Vidéos : une seule décodée à la fois dans le bandeau du départ ; le
  cycliste d'un panneau rangé est en pause, et sa boucle de vitesse ne tourne
  que pendant un changement de vitesse.
- Banc d'essai (Edge sans tête, rendu logiciel — les images/s n'y sont pas
  significatives, les longues tâches si) : survol vue des temps 72 longues
  tâches / 20,5 s → 14 / 1,1 s ; survol vue confort 411 / 80,6 s → 6 / 1,4 s ;
  repos 3 → 0. Captures : tache, colmena, corridors inchangés.

Flèches du clavier : la carte se déplace d'où que soit le focus (MapLibre ne
les écoute que si la carte l'a), en continu tant que la touche est tenue
(600 px/s, Maj 1 500 px/s, diagonales en tenant deux flèches) ; écoutées en
capture pour que MapLibre ne les traite pas deux fois. Pas dans un champ de
saisie ni avec Ctrl / Alt / Cmd. Puis + et − (clavier et pavé) : zoom
CONTINU tant que la touche est tenue, deux niveaux par seconde (un seul,
d'abord, jugé trop lent), avec un élan
(montée et retombée douces) ; une pression brève dure au moins 0,3 s (≈ ¼ de
niveau). Maj n'accélère pas le zoom : elle sert à taper « + » sur bien des
claviers. Même boucle que les flèches : déplacer et zoomer en même temps.

**À vérifier** — conditions d'utilisation de Google pour du contenu généré
publié sur un site professionnel.

**À vérifier** — `healthcare=*` ramène des lieux hors proximité (soins
palliatifs) ; la liste des six fonctions dans l'article de Moreno.

**Conséquence** — sur toutes les voies, la vitesse des autos ne change plus la
tache : les scènes « Lévis à 40 » et « Les deux » montrent la même chose
qu'« Aujourd'hui » et « Pont élargi ». À trancher.

---

## Décisions structurantes

À reprendre presque telles quelles dans l'article :

| Décision | Raison | Conséquence si elle est fausse |
| --- | --- | --- |
| Pont de Québec en trois scénarios (A, B, C) plutôt qu'en lien fixe | solution et échéancier du tablier non arrêtés en 2026 | — (le scénario est explicite) |
| 5 km/h sur le pont actuel (vélo à la main) | voie de 1,3 m ; descente de vélo documentée | sous-estime l'accès actuel si les cyclistes pédalent |
| « Tranquille » = norme *tous âges et capacités*, bande cyclable seulement à ≤ 40 km/h | norme citable (NACTO) | gonfle le nombre de tronçons manquants si les bandes à 50 km/h sont jugées acceptables — d'où la variante à 50 km/h |
| Vitesse officielle (Québec : `VITESSEMAX` ; Lévis : 50 km/h, Code de la sécurité routière) plutôt qu'un défaut uniforme | 73 % des rues sans `maxspeed` dans OSM | — (source officielle) ; l'appariement OSM ↔ Ville peut se tromper aux intersections |
| Vitesse modulée par la pente (Parkin et Rotheram, 2010 : −1,44 / +0,86 km/h par %), MNT HRDEM 8 m | Québec et Lévis sont en relief, contrairement à portée-vélo | échantillon de Leeds, cyclistes expérimentés : surestime la vitesse d'un débutant en côte ; une côte courte est adoucie à 8 m |
| Lien exposé de ≤ 30 m = traversée, pas maillon | artefacts d'OSM aux traversées de pistes | quelques vrais maillons très courts disparaissent du classement |
| Rues locales de Lévis exposées, scénario D à 40 km/h | aucun règlement d'abaissement à Lévis en 2026 | si Lévis adopte 40 km/h, le scénario D devient l'état actuel |
| | | |

## Contrôles qualité

- [ ] géométries valides (Vecteur ▸ Outils de géométrie ▸ Vérifier la validité) ;
- [ ] pas de doublons ni d'entités vides ;
- [ ] SCR déclaré = SCR réel (superposer à un fond connu) ;
- [ ] totaux recoupés avec une source indépendante ;
- [ ] ordres de grandeur plausibles — une surface en m² au lieu de km² se voit
      tout de suite.
