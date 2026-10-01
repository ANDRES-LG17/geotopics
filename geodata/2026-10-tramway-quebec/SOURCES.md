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
