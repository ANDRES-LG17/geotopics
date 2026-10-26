# Sources — Portée vélo Québec–Lévis

Une fiche par jeu de données, **remplie au moment du téléchargement**. L'URL
exacte et la licence sont introuvables six mois plus tard, et c'est précisément
au moment de publier qu'on en a besoin : le champ `attribution` du lab doit dire
la vérité.

---

## Article — remplacement du tablier du pont de Québec

| | |
| --- | --- |
| **Fournisseur** | Le Journal de Québec — Jean-François Racine |
| **URL** | https://www.journaldequebec.com/2026/08/12/le-ministere-des-transports-ignore-encore-quelle-sera-la-solution-pour-le-remplacement-du-tablier-du-pont-de-quebec |
| **Téléchargé le** | 2026-10-21 (texte lu, non archivé) |
| **Millésime** | 2026-08-12 |
| **Licence** | droits réservés — citation courte seulement |
| **Attribution exigée** | Jean-François Racine, *Le Journal de Québec*, 12 août 2026 |
| **Redistribution** | interdite — citer et lier, ne pas reproduire |
| **Fichier** | aucun (article de presse) |
| **SCR d'origine** | — |

**Faits utilisés** :

- voie cyclable actuelle de 1,3 m ; les cyclistes doivent normalement
  descendre de vélo → hypothèse de 5 km/h, scénario A ;
- élargissement possible à 2,5 m lors de la réfection → scénario C ;
- reconstruction à l'identique parmi les hypothèses à l'étude → scénario A
  prolongé ;
- en 2026, projet à l'étape de planification, sans échéancier ni solution
  retenue (porte-parole du MTMD, Louis-André Bertrand) ;
- 735 déplacements piétons et vélo par jour en été (2023) ; ≈ 30 000 véhicules
  par jour ;
- les travaux de la tête des ponts ne modifient pas le passage piéton et vélo.

**Limites connues** — article de presse, pas une donnée officielle. Le 1,3 m
et le 2,5 m sont à recouper avec le MTMD avant publication. Le chiffre de 735
déplacements est repris de la page du projet sur Québec.ca, qui reste la
source à citer.

---

## Réseau cyclable — Ville de Québec

| | |
| --- | --- |
| **Fournisseur** | Ville de Québec, via Données Québec (jeu `vque_24`) |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/vque_24 — SHP : https://www.donneesquebec.ca/recherche/dataset/8dba5a63-49b2-4d20-8333-f99df764ce10/resource/91dca5f8-5762-4dba-8472-82e9b5d15060/download/vdq-reseaucyclable.zip |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | ressource modifiée le 2026-02-17 |
| **Licence** | CC-BY 4.0 |
| **Attribution exigée** | Source : Ville de Québec, Données Québec (CC-BY 4.0) |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/vdq/vdq-reseaucyclable.zip` |
| **SCR d'origine** | EPSG:4326 (`.prj` WGS 84) |

**Champs utilisés** (7 657 segments) :

- `TYPE` — `Bande cyclable` (4 690), `Piste cyclable` (2 189), `Chaussée
  désignée` (778) ;
- `SENS_UNIQU` — `O` / `N` : sens unique ou non ;
- `NOM_TOPOGR` — nom de l'aménagement (« Piste cyclable Corridor du
  Littoral ») ;
- `LONGUEUR` — longueur approximative, calculée en MTM 7 selon la fiche.

**Limites connues** — aucune vitesse automobile : la règle des 40 km/h pour
les bandes exige OSM. Aucune distinction entre piste en site propre et piste
sur rue. Les sentiers polyvalents hors réseau officiel n'y sont pas.

---

## Piste cyclable — Ville de Lévis

| | |
| --- | --- |
| **Fournisseur** | Ville de Lévis, via Données Québec (jeu `piste-cyclable-levis`) |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/piste-cyclable-levis — SHP : https://www.donneesquebec.ca/recherche/dataset/328dd2ea-7270-4730-a57f-eddf868da4e0/resource/be35ef7a-f199-41f6-9c0e-b58cdd0532f5/download/piste-cyclable.zip — FGDB : …/resource/904ddb74-e781-48d0-8052-dc363820c42c/download/piste-cyclable_fgdb.zip |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | ressource modifiée le 2026-05-15 (mise à jour annuelle) |
| **Licence** | CC-BY 4.0 |
| **Attribution exigée** | Source : Ville de Lévis, Données Québec (CC-BY 4.0) |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/levis/piste-cyclable.zip`, `00-brut/levis/piste-cyclable_fgdb.zip` |
| **SCR d'origine** | EPSG:4326 (`.prj` WGS 84) |

**Champs utilisés** (615 segments) :

- `TypeVoieCy` — type d'aménagement, **codé sans dictionnaire** (ni la fiche
  ni le domaine du FGDB ne le décrivent). Lecture déduite des largeurs et des
  noms, **à confirmer** :

  | Code | Segments | km | Indices | Lecture probable |
  | --- | --- | --- | --- | --- |
  | 1 | 125 | 70 | aucune largeur | chaussée désignée |
  | 2 | 74 | 124 | toujours 2,0 m ; Route verte le long de Marie-Victorin | accotement asphalté |
  | 3 | 157 | 47 | 1,5–3 m, rues nommées | bande cyclable |
  | 5 | 90 | 53 | 2–4 m ; parcours du Triage, Harlaka | piste cyclable |
  | 7 | 169 | 58 | 2–4 m ; parcours des Anses, surfaces poussière de pierre | sentier polyvalent hors rue |

- `LargCyc` — largeur en mètres (vide sur 187 segments) ;
- `TypeRevt` — `A` asphalte, `P` probablement poussière de pierre ;
- `TopResCyc` — nom du parcours (vide sur 418 segments).

**Limites connues** — codes de `TypeVoieCy` non documentés : écrire à
donneesouvertes@ville.levis.qc.ca avant publication. Aucune vitesse
automobile. `IdRte` toujours vide.

---

## Voies publiques — Ville de Québec

| | |
| --- | --- |
| **Fournisseur** | Ville de Québec, via Données Québec (jeu `vque_18`) |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/vque_18 — SHP : https://www.donneesquebec.ca/recherche/dataset/e4915d10-9c33-47a8-8e06-cf39306ef583/resource/99be670a-7720-48b4-87f3-df2947602b39/download/vdq-voiepublique.zip |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | jeu modifié le 2026-10-21 |
| **Licence** | CC-BY 4.0 |
| **Attribution exigée** | Source : Ville de Québec, Données Québec (CC-BY 4.0) |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/vdq/vdq-voiepublique.zip` |
| **SCR d'origine** | EPSG:4326 (`.prj` WGS 84) |

**Champs utilisés** (28 793 segments, centre de chaussée) :

- `VITESSEMAX` — vitesse affichée, en km/h. Renseignée sur 22 666 segments :
  30 (14 015), 50 (5 055), 40 (2 788), 100 (360), 20 (214)… Vide sur 6 127 ;
- `TYPE` — `Tronçon` (20 970), puis bandes, pistes, liens piétonniers,
  chaussées désignées, trottoirs hors rue, rues privées ;
- `DIR_SENS_U` — sens unique (`C`, `D`) ou vide.

**Limites connues** — c'est la vitesse **officielle** de la Ville, à
préférer aux défauts : la rue résidentielle de Québec est surtout à 30 km/h,
pas à 40. Géométrie propre à la Ville : un appariement avec OSM est
nécessaire.

---

## Réseau routier — Ville de Lévis

| | |
| --- | --- |
| **Fournisseur** | Ville de Lévis, via Données Québec (jeu `reseau-routier-levis`) |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/reseau-routier-levis — SHP : https://www.donneesquebec.ca/recherche/dataset/1f1783de-4dec-42e6-a0fe-009032da520f/resource/74a5b71b-1b5b-4212-a6d3-79181e3c33c0/download/reseau-routier.zip |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | jeu modifié le 2026-05-27 |
| **Licence** | CC-BY 4.0 |
| **Attribution exigée** | Source : Ville de Lévis, Données Québec (CC-BY 4.0) |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/levis/reseau-routier.zip` |
| **SCR d'origine** | EPSG:4326 (`.prj` WGS 84) |

**Champs utilisés** (6 480 segments) :

- `CLASSIFICA` — classe fonctionnelle : locale secondaire (4 149), collectrice
  (967), locale principale (585), artère (274), autoroute, régionale,
  nationale, projetée ;
- `Voie_Nombr` — nombre de voies.

**Limites connues** — **aucune vitesse**. En l'absence de règlement
municipal, la limite sur une rue de Lévis est celle du Code de la sécurité
routière : 50 km/h en zone urbaine. Les rares valeurs OSM le confirment
(rues résidentielles étiquetées : 19 km à 50, 11 km à 30, sans doute des
zones scolaires). Le conseil étudie l'uniformisation des vitesses depuis
juillet 2026 (Le Soleil, 2026-07-30) ; rien d'adopté à cette date.

---

## Relief — HRDEM, mosaïque lidar 1 m (lu à 8 m)

| | |
| --- | --- |
| **Fournisseur** | Ressources naturelles Canada — CanElevation, HRDEM |
| **URL** | https://datacube.services.geo.ca/stac/api/collections/hrdem-mosaic-1m — COG : https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/9_3-mosaic-1m-dtm.tif |
| **Téléchargé le** | 2026-10-21, par lecture partielle (`scripts/analysis/velo-quebec-levis-00-telecharger-mne.py`) |
| **Millésime** | élément STAC daté du 2024-08-24 ; les levés lidar sous-jacents sont plus anciens et varient selon le secteur |
| **Licence** | Licence du gouvernement ouvert — Canada 2.0 |
| **Attribution exigée** | Contient des informations visées par la Licence du gouvernement ouvert — Canada |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/nrcan/hrdem-mosaic-1m-dtm-8m-quebec-levis.tif` |
| **SCR d'origine** | EPSG:3979 (Lambert conique du Canada, NAD83 CSRS) |

**Champs utilisés** — MNT (terrain nu), en mètres. Lu sur l'aperçu à 8 m du
COG, en moyenne. Le mosaïque fait 500 000 × 500 000 pixels : seuls les blocs
de la zone, avec 1,5 km de marge, ont été lus.

**Limites connues** — terrain nu : sur un pont, le MNT donne le fond de la
vallée et non le tablier (altitude interpolée sur les ponts, voir
`scripts/analysis/velo-quebec-levis-02-construire-graphe.py`). À 8 m, une côte courte et raide est un peu
adoucie. Trous possibles hors couverture lidar : comblés par MRDEM-30.

---

## Relief — MRDEM-30 (comblement)

| | |
| --- | --- |
| **Fournisseur** | Ressources naturelles Canada — CanElevation, MRDEM |
| **URL** | https://open.canada.ca/data/en/dataset/18752265-bda3-498c-a4ba-9dfe68cb98da — COG : https://canelevation-dem.s3.ca-central-1.amazonaws.com/mrdem-30/mrdem-30-dtm.tif |
| **Téléchargé le** | 2026-10-21, par lecture partielle (`scripts/analysis/velo-quebec-levis-00-telecharger-mne.py`) |
| **Millésime** | élément STAC daté du 2026-06-22 |
| **Licence** | Licence du gouvernement ouvert — Canada 2.0 |
| **Attribution exigée** | Contient des informations visées par la Licence du gouvernement ouvert — Canada |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/nrcan/mrdem-30-dtm-quebec-levis.tif` |
| **SCR d'origine** | EPSG:3979 |

**Limites connues** — 30 m : sert uniquement là où le HRDEM est vide.

---

## Population 2021 — géographie du recensement harmonisée (ISQ)

| | |
| --- | --- |
| **Fournisseur** | Institut de la statistique du Québec, via Données Québec (jeu `geographie-recensement-2021-harmo`) ; données de Statistique Canada, Recensement 2021 |
| **URL** | https://www.donneesquebec.ca/recherche/dataset/geographie-recensement-2021-harmo — FGDB : https://www.donneesquebec.ca/recherche/dataset/1c54bc07-3fd7-489b-bcb5-3f318ec22255/resource/8f1bb63d-c482-48ea-9f0e-2d990a704c6b/download/geo_recensement_2021_qc_harmonise_isq_format_gdb.zip |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | Recensement 2021 ; harmonisation ISQ de 2022 (jeu modifié le 2024-07-08) |
| **Licence** | CC-BY 4.0 |
| **Attribution exigée** | Source : Institut de la statistique du Québec, d'après Statistique Canada, Recensement de 2021 (CC-BY 4.0) |
| **Redistribution** | autorisée, dérivés compris, avec attribution |
| **Fichier** | `00-brut/isq/geo_recensement_2021_qc_harmonise_isq_format_gdb.zip`, fiche de métadonnées `geographie-recensement-population-2021-quebec-metadonnees.pdf` |
| **SCR d'origine** | EPSG:6623 (NAD83 CSRS, Québec Lambert) |

**Champs utilisés** — couche `AD_2021_QC_LimCarto_harmo` (aires de
diffusion, limites cartographiques) : `ADIDU`, `CO_MUN`, `NOM_MUN`,
`Population_2021`. Totaux : Québec 549 459, Lévis 149 683, conformes au
recensement.

**Limites connues** — pas d'îlots de diffusion dans ce jeu : l'AD
(≈ 400–700 habitants) est la maille la plus fine. Les fichiers d'îlots de
Statistique Canada refusent le téléchargement automatisé (HTTP 403). La
population est répartie à l'intérieur de l'AD sur les cellules de 1 ha qui
contiennent une rue résidentielle (`scripts/analysis/velo-quebec-levis-02b-population-cellules.py`) : c'est une
estimation, pas une donnée.

---

## Traversier Québec–Lévis — OpenStreetMap

| | |
| --- | --- |
| **Fournisseur** | OpenStreetMap, via l'API Overpass |
| **URL** | requête dans `00-brut/osm/overpass-requete-traversier.txt` |
| **Téléchargé le** | 2026-10-21 |
| **Millésime** | instantané au 2026-10-21 |
| **Licence** | ODbL 1.0 |
| **Attribution exigée** | © les contributeurs d'OpenStreetMap |
| **Redistribution** | autorisée ; dérivé sous ODbL |
| **Fichier** | `00-brut/osm/osm-ferry-quebec-levis-2026-10-21.json` |
| **SCR d'origine** | EPSG:4326 |

**Champs utilisés** — voie 160012029 « Québec - Lévis » : géométrie (les deux
quais), `bicycle=yes`, `duration=00:20`.

**Limites connues** — ni fréquence ni horaire. Le temps retenu (12 min de
traversée, 15 min d'attente moyenne) est une hypothèse à confirmer avec
l'horaire 2026-2027 de la Société des traversiers du Québec.

---

## Lieux de la ville des 15 minutes — OpenStreetMap

| | |
| --- | --- |
| **Fournisseur** | OpenStreetMap, via Overpass — serveur miroir overpass.kumi.systems (le serveur principal était saturé, HTTP 502) |
| **URL** | requête dans `00-brut/osm/overpass-requete-lieux.txt` |
| **Téléchargé le** | 2026-10-22 |
| **Millésime** | **base OSM du 2026-07-24** (le miroir avait trois mois de retard sur le réseau viaire, base du 2026-10-21) |
| **Licence** | ODbL 1.0 |
| **Attribution exigée** | © les contributeurs d'OpenStreetMap |
| **Redistribution** | autorisée ; dérivé sous ODbL |
| **Fichier** | `00-brut/osm/osm-lieux-quebec-levis-2026-10-22.json` (1 957 éléments) |
| **SCR d'origine** | EPSG:4326 |

**Champs utilisés** — `amenity`, `shop`, `leisure`, `healthcare`, `tourism`,
`name` ; géométrie (`out geom`) pour rattacher les parcs par leur bord.
Classement en quatre fonctions dans `scripts/analysis/velo-quebec-levis-09-lieux.py`.

**Limites connues** — complétude d'OSM non vérifiée contre les répertoires
officiels (MSSS M02, MEQ-MES), par choix (« tout OSM »). `healthcare=*` ramène
aussi des lieux qui ne sont pas des services de proximité (soins palliatifs,
laboratoires). Présence comptée, pas la capacité. Cadre : Moreno, Allam,
Chabaud, Gall et Pratlong (2021), « Introducing the 15-Minute City »,
*Smart Cities* — liste des six fonctions à vérifier dans l'article.

---

## Bandeau des saisons — illustration et animation générées par IA

| | |
| --- | --- |
| **Fournisseur** | Google : Gemini (Nano Banana) pour les images, Veo pour les vidéos — générées par l'auteur |
| **URL** | — (génération dans l'application Gemini / Flow) |
| **Téléchargé le** | 2026-10-22 |
| **Millésime** | 2026-10-22 |
| **Licence** | contenu généré par IA, selon les conditions d'utilisation de Google applicables au compte de l'auteur — à vérifier avant publication |
| **Attribution exigée** | aucune imposée ; mention d'honnêteté retenue : « illustration et animation générées par IA (Google Gemini, Veo) » |
| **Redistribution** | selon les conditions de Google |
| **Fichier** | `00-brut/ia/quebec-ete.png`, `quebec-hiver.png` (3168 × 1344), `quebec-ete.mp4`, `quebec-hiver.mp4` (1280 × 720, 10 s, 24 i/s, avec son) |
| **SCR d'origine** | — |

**Traitement** (ffmpeg portatif, hors projet) : boucle sans couture — le
segment [1,5 s ; 10 s] se termine en fondu vers [0 ; 1,5 s], la dernière
image rejoint la première (similarité structurelle 0,94 → 0,98) ; recadrage
25:11 sur la bande du Château au traversier ; 800 × 352 ; son retiré ; WebM
VP9 et MP4 H.264 (85–120 Ko), affiche WebP. Sortie :
`30-export/saisons/`, copiée dans `public/data/velo-quebec-levis-{ete,hiver}-v1.*`.

**Limites connues** — illustration, pas un relevé : aucune valeur
documentaire. Prompts dans la conversation de travail (Nano Banana : vue de
Québec depuis Lévis, style vectoriel plat ; l'hiver obtenu en ÉDITANT l'image
d'été pour garder le cadrage).

---

## Littérature — vitesse du vélo en hiver

Pas un jeu de données : les études qui fondent l'interrupteur été / hiver.

- **Shoman, Imine, Acerra, Lantieri (2023)** — prénoms à vérifier.
  « Evaluation of Cycling Safety and Comfort in Bad Weather and Surface
  Conditions Using an Instrumented Bicycle », *IEEE Access* 11, 15096–15108.
  Vitesse moyenne 15,73 km/h au sec, 12,45 km/h sur surface enneigée. **Le
  rapport 0,79 est celui du lab.** Les auteurs parlent d'environ 15 % avec
  leur vitesse normalisée : à recouper dans le texte intégral.
- **Yan, Maat, van Wee (2026).** « Cycling speed and weather: Roles of
  cyclist weather-sensitivity, spatial and infrastructural conditions »,
  *International Journal of Sustainable Transportation*,
  doi:10.1080/15568318.2026.2718239. Neige : −0,808 km/h (jours mêlés).
- **Fenre, Klein-Paste (2021).** « Bicycle rolling resistance under
  winter conditions », *Cold Regions Science and Technology*. Crr ≈ 0,01 sur
  asphalte nu, ≈ 0,06 en neige meuble profonde.

**Limites** — échantillons européens, cyclistes volontaires. Le modèle du lab
applique un seul taux à toutes les voies.

---

## Réseau viaire — OpenStreetMap (extrait Overpass)

| | |
| --- | --- |
| **Fournisseur** | OpenStreetMap, via l'API Overpass (overpass-api.de) |
| **URL** | https://overpass-api.de/api/interpreter — requête dans `00-brut/osm/overpass-requete.txt` |
| **Téléchargé le** | 2026-10-21 (base OSM du 2026-10-21T20:13:40Z) |
| **Millésime** | instantané au 2026-10-21 |
| **Licence** | ODbL 1.0 |
| **Attribution exigée** | © les contributeurs d'OpenStreetMap |
| **Redistribution** | autorisée ; un dérivé publié reste sous ODbL (partage à l'identique) |
| **Fichier** | `00-brut/osm/osm-highway-quebec-levis-2026-10-21.json` (50 Mo, 62 044 voies) |
| **SCR d'origine** | EPSG:4326 |

Requête : toutes les voies `highway=*` dans le rectangle 46,60 N – 47,00 N,
71,60 O – 70,90 O, géométrie comprise. Le rectangle déborde sur les
municipalités voisines : découper sur les limites de Québec et Lévis en
`10-travail/`. L'extrait Geofabrik du Québec (1,16 Go) a été écarté : trop
lourd pour deux villes.

**Champs utilisés** :

- `highway` — classe de voie ;
- `maxspeed` — vitesse affichée, pour le seuil de 40 km/h ;
- `cycleway`, `cycleway:left|right|both` — `lane`, `track`, `shared_lane`,
  `shoulder`, `separate` ;
- `bicycle` — `designated`, `yes`, `no`, `dismount` ;
- `surface`, `width`.

**Limites connues** — `maxspeed` absent sur 80 % des rues résidentielles
(2 463 km sur 3 068) et sur la moitié des `tertiary` : il faudra une règle
par défaut. Les `path` (1 087 km) mêlent pistes cyclables et sentiers de
forêt. La couverture des bandes est inégale : à recouper avec les couches
municipales.

---

## Vérification avant publication

- [ ] la redistribution du dérivé est permise par chaque licence ci-dessus ;
- [ ] `attribution` du lab reprend les formules exigées ;
- [ ] le millésime apparaît dans l'entrée — une carte sans date ment par omission ;
- [ ] aucune donnée personnelle ni adresse précise dans l'export.
