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
