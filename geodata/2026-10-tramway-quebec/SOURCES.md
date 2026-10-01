# Sources — Tramway de Québec (TramCité)

Une fiche par jeu de données, **remplie au moment du téléchargement**. L'URL
exacte et la licence sont introuvables six mois plus tard, et c'est précisément
au moment de publier qu'on en a besoin : le champ `attribution` du lab doit dire
la vérité.

---

## Tracé du tramway — OpenStreetMap

| | |
| --- | --- |
| **Fournisseur** | OpenStreetMap, via l'API Overpass |
| **URL** | `https://overpass-api.de/api/interpreter` |
| **Téléchargé le** | 2026-10-01 |
| **Millésime de la donnée** | Base OSM au 2026-06-01 ; le tracé lui-même décrit **l'avis au marché du 19 décembre 2024** (voir `description` ci-dessous) |
| **Licence** | ODbL 1.0 |
| **Attribution exigée** | « © les contributeurs d'OpenStreetMap » — ODbL impose aussi de signaler les modifications et de partager les dérivés sous même licence |
| **Redistribution** | autorisée, sous ODbL |
| **Fichier** | `00-brut/osm/overpass-futur-tramway-2026-10-01.json` |
| **Requête** | `00-brut/osm/requete-overpass.txt` |
| **SCR d'origine** | EPSG:4326 |

### La requête

```
[out:json][timeout:180];
way["name"="Futur Tramway de Québec"](46.70,-71.45,46.92,-71.10);
out geom;
```

**Comment on l'a trouvée, et pourquoi c'est à noter.** Les requêtes évidentes ne
donnent rien : il n'existe **aucune relation** `route=tram` ni `route_master`
pour ce tramway, parce que la ligne n'est pas construite. Le tracé est porté par
sept *ways* isolés, étiquetés `railway=proposed` et nommés « Futur Tramway de
Québec ». C'est Nominatim qui a permis de trouver le bon nom.

Deux conséquences pratiques :
- la requête dépend d'un **nom exact** — si un contributeur le renomme, elle
  cesse de fonctionner. Le fichier brut est donc la vraie source, pas la requête ;
- il n'y a pas d'ordre topologique garanti par une relation. Les tronçons se
  chaînent bien (vérifié : chaque tronçon finit où le suivant commence), mais
  c'est une propriété observée, pas une garantie.

**Un User-Agent est obligatoire.** Sans en-tête `User-Agent`, Overpass répond
406. Les requêtes à regex large (`~"tram|light_rail"`) expirent en 504 : il faut
interroger un tag précis à la fois.

### Ce que contiennent les données

**7 tronçons, 18,35 km au total** (l'annonce officielle dit 19,3 km — l'écart est
à dire dans la note de méthode ; il vient probablement de l'antenne de
Charlesbourg, incomplète dans OSM).

| ID du way | Longueur | Sommets | État | Particularité |
| --- | --- | --- | --- | --- |
| 1554915809 | 0,86 km | 10 | `proposed` | tronçon ouest, montée Mendel |
| 1554915807 | 0,04 km | 2 | **`construction`** | viaduc |
| 1012496032 | 3,37 km | 18 | `proposed` | |
| 1558354781 | 0,07 km | 2 | `proposed` | |
| 778997313 | 8,39 km | 90 | `proposed` | le plus long — autoroute Charest, 2e Avenue |
| 1110656739 | 1,73 km | 27 | `proposed` | **`tunnel=yes`** — la colline parlementaire |
| 1110656734 | 3,90 km | 67 | `proposed` | tronçon nord, vers Charlesbourg |

**Emprise mesurée** `[ouest, sud, est, nord]` :
`-71.3532, 46.7602, -71.2146, 46.8415`

**Champs utilisés** — avec leur signification réelle :

- `name` = « Futur Tramway de Québec » — la clé de la requête ;
- `railway` = `proposed` (6 tronçons) ou `construction` (1) — l'état du tronçon ;
- `tunnel` = `yes` — **un seul tronçon**, et c'est la scène 5 du lab ;
- `bridge` = `viaduct` — un seul tronçon ;
- `start_date` = `2033` — la mise en service visée ;
- `wikidata` = `Q3537177`, `wikipedia` = `fr:Tramway de Québec` ;
- `description` = « Sujet à modification. Trajet de l'avis au marché du
  19 décembre 2024. »

**Limites connues** — ce que cette donnée ne dit pas :

1. **Le tracé est provisoire et OSM le dit lui-même** : « Sujet à
   modification ». Il reflète l'avis au marché de décembre 2024, pas un plan
   d'exécution. À reprendre mot pour mot dans la note du lab.
2. **18,35 km contre 19,3 km annoncés** — il manque environ un kilomètre. À
   vérifier : l'antenne de Charlesbourg est-elle complète ?
3. **Le vectoriel officiel n'est pas en données ouvertes.** OSM est une
   reconstitution par des contributeurs, pas la donnée de la Ville. C'est la
   limite la plus importante du projet, et elle doit être dite clairement.
4. **Pas de profondeur pour le tunnel.** Les 15-40 m cités viennent de la
   documentation du projet, pas de la géométrie.

---

## Les 29 stations — INTROUVABLES en données ouvertes

| | |
| --- | --- |
| **Recherché le** | 2026-10-01 |
| **Résultat** | **une seule** entité trouvée dans OSM |

La seule : way `1432347900`, « Future station de tramway », à
46.79703 / −71.23986, étiquetée `landuse=brownfield` (un terrain, pas un arrêt).

Aucun `railway=tram_stop`, aucun `proposed:railway=station`, aucun
`public_transport` lié au tramway. **Les 29 stations ne sont pas cartographiées**
— ce qui est normal pour un réseau non construit.

### Les trois voies pour les obtenir

À trancher. C'est le point bloquant du projet, au même titre que la hauteur des
bâtiments.

1. **Saisie manuelle** depuis les plans publiés (tramcite.info, PDF du RTC).
   Les 29 noms sont connus et vérifiés (voir § 1 de `CONCEPTION.md`) ; il manque
   les coordonnées. Un CSV dans `15-saisie-manuelle/`, exactement comme le
   statut réglementaire du projet Lac Saint-Charles. **C'est la voie la plus
   probable.**
2. **Interpolation sur le tracé** — placer les stations aux intersections
   nommées. Rapide, approximatif, et malhonnête si on ne le dit pas.
3. **Demander à la Ville** — une donnée financée par des fonds publics. Lent,
   mais c'est la seule voie vers une position exacte.

**Si la voie 1 ou 2 est retenue, la note de méthode doit dire que les positions
sont approximatives.** Une station placée à 100 m près déplace son aire de
marche de 800 m — et donc le chiffre de population desservie, qui est la mesure
centrale du lab.

---

## Réseau marchable — OpenStreetMap

| | |
| --- | --- |
| **Fournisseur** | OpenStreetMap, via l'API Overpass |
| **Téléchargé le** | 2026-10-01 |
| **Emprise** | `46.7930, -71.2600 → 46.8290, -71.1950` — Saint-Roch et la colline, pour l'essai sur une station |
| **Licence** | ODbL 1.0 |
| **Fichier** | `00-brut/osm/reseau-pieton.json` |
| **SCR d'origine** | EPSG:4326 |

Treize requêtes, **une par type de voie** : les regex larges expirent (504).
Le script de récupération est dans le dossier de travail.

### Ce que contient le réseau, et pourquoi ça compte

La question qui pouvait faire tomber la méthode : **les trottoirs sont-ils
cartographiés ?** Sans eux, l'isochrone se calcule sur des axes de chaussée et
sort trop généreuse — sans que rien ne le signale.

Relevé sur le secteur de Saint-Roch :

| | |
| --- | --- |
| Voies piétonnes | **2 013** |
| dont `footway=sidewalk` (trottoirs) | 444 |
| dont `footway=crossing` (traversées) | 383 |
| dont `highway=steps` (escaliers) | **181** |

**Les 181 escaliers sont la pièce décisive.** C'est par eux qu'on monte de la
Basse-Ville à la Haute-Ville. Les écarter rendrait la colline artificiellement
inaccessible ; les garder sans pénaliser leur pente la rend un peu trop facile.
Le second biais est le plus honnête des deux, et il est dit dans la note.

**Limite à vérifier avant d'étendre aux 29 stations** — cette densité est celle
du centre. À Sainte-Foy ou Charlesbourg, les trottoirs sont peut-être absents
d'OSM, ce qui gonflerait les isochrones de banlieue. Le biais irait alors à
l'envers de ce que le lab veut montrer : **à contrôler secteur par secteur.**

---

## Positions des stations — saisie manuelle

| | |
| --- | --- |
| **Fichier** | `15-saisie-manuelle/stations-tramcite.json` |
| **Méthode** | repérage des lieux nommés par le plan officiel, coordonnées relevées via Nominatim |
| **Précision déclarée** | 50 à 100 m selon la station, champ `precision_m` |
| **Commencé le** | 2026-10-01 |

Les 29 stations ne figurent pas dans OSM (voir plus haut). Leurs **noms** sont
connus et vérifiés ; leurs **coordonnées** sont saisies ici, une par une, avec
la source de chaque repère.

**Ce que la précision coûte** — une aire de marche de 1 200 m déplacée de 100 m
ne couvre plus tout à fait le même quartier, et le chiffre de population
desservie bouge avec elle. C'est pourquoi chaque station porte son
`precision_m` et sa `source` : le lecteur doit pouvoir juger.

Deux stations saisies pour l'essai :

| Station | Repère | Précision |
| --- | --- | --- |
| Jean-Paul-L'Allier | Jardin Jean-Paul-L'Allier — la documentation place l'entrée du tunnel à ce jardin | 50 m |
| Saint-Roch | Place Jacques-Cartier, rue de la Couronne — pôle d'échanges annoncé dans ce secteur | 100 m |

---

## Population — recensement 2021, Statistique Canada

| | |
| --- | --- |
| **Fournisseur** | Statistique Canada |
| **Téléchargé le** | 2026-10-01 |
| **Millésime** | recensement de 2021 |
| **Licence** | Licence ouverte de Statistique Canada |
| **Attribution exigée** | « Source : Statistique Canada, Recensement de la population de 2021 » |
| **Fichiers** | `00-brut/statcan/aires-diffusion.geojson` · `00-brut/statcan/population-ad.json` |
| **SCR d'origine** | EPSG:3347 (Lambert), reprojeté en EPSG:4326 |

Deux jeux, parce que **Statistique Canada sépare la géométrie des chiffres** :

1. **Limites des aires de diffusion** — `lad_000b21a_f.zip`, 197 Mo compressés,
   414 Mo de shapefile. Découpé à l'emprise du corridor avec `ogr2ogr` :
   **433 aires**, 1,2 Mo.
2. **Profil du recensement, Québec** — 435 Mo compressés, **6,5 Go** de CSV.

### Comment extraire 433 lignes d'un fichier de 6,5 Go

Le CSV ne tient pas en mémoire et ne s'extrait pas entièrement sur disque. Deux
choses le rendent praticable :

- l'archive contient un **fichier d'index** (625 ko) qui donne la ligne de début
  de chaque géographie — les 433 aires se situent entre les lignes 3 183 512 et
  6 345 974 ;
- `unzip -p` écrit le CSV sur la sortie standard, qu'on lit **en flux** : le
  fichier n'est jamais écrit sur disque ni chargé en mémoire.

Résultat : **6,3 millions de lignes lues en 8 secondes**, 433 aires sur 433,
**253 911 habitants** dans le corridor.

Le format d'une ligne, vérifié sur le fichier — l'identifiant de caractéristique
n'est pas entre guillemets, ce qui a fait échouer un premier filtre :

```
2021,"2021S051224231035","24231035","Aire de diffusion","24231035",
0.0,0.0,"00999",1,"Population, 2021",1,241,"",…
```

**Champs utilisés** :

- `IDUGD` — identifiant de l'aire, préfixé `2021S0512` ;
- `ID_CARACTERISTIQUE` = `1` — la ligne « Population, 2021 » ;
- `C1_CHIFFRE_TOTAL` — les habitants.

**Limites connues** :

1. **La population est estimée, pas comptée.** Une aire de diffusion tombe
   rarement entière dans une isochrone : on compte la part de ses habitants
   proportionnelle à la part de sa surface recouverte. Cela suppose la
   population **uniformément répartie** dans l'aire, ce qui est faux dans le
   détail — un secteur qui mêle un parc et une tour concentre ses habitants d'un
   côté. À l'échelle d'une aire de diffusion l'écart reste acceptable, et c'est
   la convention des études de desserte. **À dire dans la note du lab.**
2. **Millésime 2021**, soit deux ans avant l'EOD et douze ans avant la mise en
   service. La population aura changé.
3. Les aires sans population déclarée — parc, zone industrielle — sont gardées à
   zéro : elles comptent dans la surface, pas dans les habitants.

---

## À télécharger — fiches à remplir au moment de le faire

- [ ] **Population par aire de diffusion** — recensement 2021, Statistique
      Canada. Formats offerts : SHP, GML, GDB (**pas de GeoJSON** — conversion
      nécessaire). Licence à vérifier.
- [ ] **Parcours et arrêts du RTC** —
      `https://cdn.rtcquebec.ca/Site_Internet/DonneesOuvertes/ESRI_SHPFILES.zip`.
      Licence propre au RTC, **attribution avec date de mise à jour obligatoire** :
      « Application, produit ou service, intégrant les Informations publiques du
      Réseau de transport de la Capitale, mises à jour le \_\_\_\_\_\_\_\_. »
- [ ] **GTFS du RTC** —
      `https://cdn.rtcquebec.ca/Site_Internet/DonneesOuvertes/googletransit.zip`
      (seulement si on module l'épaisseur des lignes selon la fréquence).
- [ ] **Réseau cyclable** — Ville de Québec / Données Québec.
- [ ] **MNT lidar** — Données Québec, produits dérivés du lidar. Gratuit depuis
      2022. *Bloqué côté site : `LabMap` ne sait pas déclarer de source
      `raster-dem` — voir `CONCEPTION.md` § 7.*

---

## Vérification avant publication

- [ ] la redistribution du dérivé est permise par chaque licence ci-dessus ;
- [ ] `attribution` du lab reprend les formules exigées — **ODbL pour OSM**,
      formule du RTC **avec date** si ses données sont utilisées ;
- [ ] le millésime apparaît dans l'entrée — une carte sans date ment par
      omission. Ici, deux dates comptent : celle du tracé (avis au marché de
      **décembre 2024**) et celle du recensement (**2021**) ;
- [ ] la mention « tracé sujet à modification » figure dans la note du lab ;
- [ ] l'origine des positions de stations est dite (officielle, saisie, ou
      interpolée) ;
- [ ] aucune donnée personnelle ni adresse précise dans l'export.
