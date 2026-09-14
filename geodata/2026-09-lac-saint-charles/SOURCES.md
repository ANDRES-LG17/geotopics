# Sources — Lac Saint-Charles

Une fiche par jeu de données, **remplie au moment du téléchargement**. Les six
fiches ci-dessous sont pré-remplies d'après `CONCEPTION.md` ; les champs vides
se complètent en téléchargeant.

---

## 1. Bassin versant du lac Saint-Charles

| | |
| --- | --- |
| **Titre exact** | Aires de drainage en cours d'eau et bassins versants de lacs |
| **Fournisseur** | MELCCFP, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/aires-de-drainage-bassins-versants |
| **Téléchargement (GPKG)** | https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/Aire_drainage/DQ/AD_CE_BV_Lacs_gpkg.zip — **47 Mo** |
| **Métadonnées (PDF)** | https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/Aire_drainage/DQ/Bassins-versants-de-lacs.pdf |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Métadonnées màj** | 2026-05-07 |
| **Téléchargé le** | |
| **Millésime des données** | |
| **Attribution exigée** | |
| **Fichier** | `00-brut/donnees-quebec/` |
| **SCR d'origine** | |

*Vérifié le 2026-09-11 : fiche et téléchargements répondent (HTTP 200).*

Autres formats sur la même fiche : FGDB, GeoJSON, CSV. Services en ligne
disponibles (EsriREST et WMS), pratiques pour **inspecter avant de télécharger
47 Mo** :

```
WMS : https://geo.environnement.gouv.qc.ca/donnees/services/Eau/AD_CE_BV_Lacs/MapServer/WMSServer
```

QGIS : Couche ▸ Ajouter une couche ▸ WMS/WMTS. Utile pour repérer visuellement
le bon bassin **avant** de filtrer le fichier complet.

Le jeu contient aussi une couche ponctuelle d'exutoires et des tables
d'utilisation du territoire. **Lire `Bassins-versants-de-lacs.pdf` avant de
filtrer** : c'est lui qui donne les attributs d'identification.

**Piège connu** — le jeu contient plusieurs « bassins versants de lac ». Notez
ici le critère exact retenu pour isoler le bon (code, identifiant, attribut) :

> …

**À vérifier** — la superficie calculée doit retomber sur les **169 km²**
annoncés. Un écart notable signale soit le mauvais bassin, soit un SCR non
projeté au moment du calcul.

---

## 2. Limites municipales

| | |
| --- | --- |
| **Titre exact** | Découpages administratifs (SDA) |
| **Fournisseur** | MRNF, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs |
| **Téléchargement (GPKG 20k)** | https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Theme/Local/SDA_20k/GPKG/SDA.gpkg.zip — **100 Mo** |
| **Téléchargement (SHP 20k)** | https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Theme/Local/SDA_20k/SHP/SDA.shp.zip |
| **Structure physique (PDF)** | https://diffusion.mern.gouv.qc.ca/Diffusion/RGQ/Documentation/SDA/Structure_physique_SDA20k.pdf |
| **Renvois municipaux (CSV)** | https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Theme/Local/Municipalites_Renvois/CSV/Municipalites_renvois.csv |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Métadonnées màj** | 2026-08-25 |
| **Téléchargé le** | |
| **Fichier** | `00-brut/donnees-quebec/` |
| **Échelle** | 1/20 000 |

*Vérifié le 2026-09-11 : fiche et téléchargements répondent (HTTP 200).*

**Prendre le GPKG**, pas le SHP : le SDA contient plusieurs couches (municipalités,
arrondissements, MRC, régions, communautés métropolitaines) — un GeoPackage les
garde dans un seul fichier, là où le SHP en fait autant de jeux de sept fichiers.

Ne garder que la couche **municipale**. Lire `Structure_physique_SDA20k.pdf` pour
les noms de champs exacts.

**`Municipalites_renvois.csv`** est utile : il donne les correspondances de codes
géographiques (MUS/MRC), ce qui sert à joindre proprement les données de
population de la fiche 5 — plus fiable qu'une jointure par nom.

**Municipalités attendues dans le bassin** — Québec, Stoneham-et-Tewkesbury,
Lac-Delage, Lac-Beauport, Saint-Gabriel-de-Valcartier. Si l'overlay en fait
apparaître d'autres, ce n'est pas une erreur à corriger en silence : à noter dans
`JOURNAL.md`, puis dans l'entrée.

---

## 3. Hydrographie — plans d'eau

| | |
| --- | --- |
| **Titre exact** | Hydrographie - Cours d'eau surfaciques |
| **Fournisseur** | Ville de Québec, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/hydrographie-cours-d-eau-surfaciques |
| **GeoJSON direct** | https://www.donneesquebec.ca/recherche/dataset/5d725484-a008-4c53-a0be-33798b69518d/resource/6212d1e9-5568-4877-b5a8-6d5f43fb54a2/download/vdq-hydrocourseauxsurface.geojson |
| **SHP** | https://www.donneesquebec.ca/recherche/dataset/5d725484-a008-4c53-a0be-33798b69518d/resource/081ae929-1a8d-42d4-8ad0-bcaffbb36ac7/download/vdq-hydrocourseauxsurface.zip |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Métadonnées màj** | 2026-09-06 |
| **Téléchargé le** | |
| **Contact** | Application.DonneesOuvertes@Ville.quebec.qc.ca |
| **Fichier** | `00-brut/ville-de-quebec/` |

*Vérifié le 2026-09-11 : fiche et GeoJSON répondent (HTTP 200).*

La fiche contient deux couches distinctes — « Cours d'eau surfaciques » (les
polygones, c'est celle-ci) et « Centre cours d'eau » (les axes). Pour compter des
plans d'eau, ce sont les **surfaciques**.

### Couverture complémentaire, hors Québec

| | |
| --- | --- |
| **Fournisseur** | MRNF — Géobase du réseau hydrographique du Québec (GRHQ) |
| **URL** | https://mrnf.gouv.qc.ca/repertoire-geographique/reseau-hydrographique-grhq/ |
| **Téléchargé le** | |
| **Licence** | |

**Limite connue, structurante** — ce jeu couvre le territoire de la Ville de
Québec. Or la majeure partie du bassin est **hors Québec**. Une couverture
partielle sous-compterait les plans d'eau non réglementés — c'est-à-dire
qu'elle affaiblirait mécaniquement l'argument central du lab.

Vérifier la couverture réelle avant tout décompte, et compléter au besoin par la
**BDTQ provinciale** (fiche à ajouter ici si elle est utilisée). Si le décompte
« 20+ » ne peut être établi sur tout le bassin, le dire dans l'entrée plutôt que
d'avancer un chiffre partiel.

---

## 4. Statut réglementaire

| | |
| --- | --- |
| **Source pressentie** | APEL — *Faire autrement pour une protection des milieux naturels et des ressources en eau* (2017), 122 p. |
| **PDF direct** | https://agiro.org/wp-content/uploads/Developper_protection_milieux_naturels_eau_APEL-201702.pdf |
| **Consulté le** | |
| **Nature** | **Donnée dérivée, saisie à la main** — voir `15-saisie-manuelle/` |

> ⚠️ **La source de l'argument « 1 sur 20+ » n'est pas encore établie.**
>
> `CONCEPTION.md` l'attribue à un « mémoire de l'APEL au BAPE ». Une première
> recherche ne trouve pas ce mémoire, mais trouve le document 2017 ci-dessus —
> qui, d'après sa page de présentation, formule des **recommandations** de
> mesures réglementaires et non réglementaires, sans inventorier les plans d'eau
> un par un avec leur statut.
>
> Si c'est confirmé à la lecture du PDF, le chiffre « 20+ » n'a pas encore de
> source, et l'indicateur n° 1 du lab — le plus fort des cinq — repose sur du
> vide. **À trancher avant toute saisie.**
>
> Trois issues possibles :
> 1. le document 2017 contient bien l'inventaire → noter le chapitre et saisir ;
> 2. le vrai document est ailleurs (mémoire BAPE, diagnostic 2022, autre) → le
>    retrouver et l'ajouter ici ;
> 3. aucune source ne l'établit → **construire le décompte soi-même** à partir de
>    l'hydrographie et des règlements municipaux, et le présenter comme un
>    dénombrement propre, pas comme une citation.
>
> L'issue 3 reste honnête et reste publiable — à condition de le dire.

**Note de vocabulaire** — l'APEL s'appelle aujourd'hui **Agiro**. Les documents
d'avant le changement de nom portent « APEL » ; les citer sous le nom qu'ils
portent, en signalant la continuité.

Ce n'est pas un jeu de données ouvert : c'est une lecture d'un document,
transcrite. Chaque ligne du CSV porte sa `source_page`. Le lab doit présenter
cette couche comme une lecture documentaire, pas comme un registre officiel.

---

## 3 bis. Base de données des lacs et cours d'eau (LCE) ⭐

**La source du décompte.** Couvre tout le Québec, ce qui règle la lacune de la
fiche 3.

| | |
| --- | --- |
| **Titre exact** | Base de données des lacs et cours d'eau (LCE) |
| **Fournisseur** | MELCCFP, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/base-de-donnees-des-lacs-et-cours-d-eau-lce |
| **Téléchargement (FGDB)** | https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/Base_donnees_lacs_cours_eau/lce.gdb.zip — **18 Mo** |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Métadonnées màj** | 2024-09-04 |
| **Téléchargé le** | 2026-09-11 |
| **Fichier** | `00-brut/donnees-quebec/lce.gdb.zip` |
| **Couverture** | 148 724 lacs, tout le Québec |

### ⚠️ Prendre le FGDB, jamais le SQLite

Le portail offre les deux. **Le SQLite a tous ses attributs vides** — les
148 724 enregistrements ont `NULL` partout sauf la géométrie. Vérifié :
`COUNT(nom_cours_deau)` = 0.

Le FGDB porte les mêmes entités avec leurs attributs. Correspondances :

| | SQLite (vide) | FGDB (utilisable) |
| --- | --- | --- |
| Couche | `centroides_lacs` | `CE_LAC` |
| Nom | `nom_cours_deau` | `NOM_LAC` |
| Bassin versant | `superf_bassin_versant` | `SUPERF_BASSIN_VERSANT_LAC` (en ha) |
| Géométrie | `GEOMETRY` | `SHAPE` |

Sur FGDB, le dialecte SQLITE d'OGR échoue : utiliser `-where` avec le dialecte
natif, ou convertir d'abord en GPKG.

**Champs utiles** — `NO_LAC`, `NOM_LAC`, `SUPERF_BASSIN_VERSANT_LAC`,
`ALTITUDE_LAC`, `PERIMETRE_LAC`, `PROFONDEUR_MAX_LAC`, `VOLUME_LAC`.

**Notre lac** — `NO_LAC 01067`, lon −71,3881 / lat 46,9398, altitude 151 m,
périmètre 18,51 km, bassin versant **165,76 km²**.

**Décompte obtenu** — **25 lacs** dans le bassin retenu, dont 15 nommés. C'est le
chiffre publiable de l'indicateur n° 1, et il est **produit**, non cité.

---

## 3 quater. Géobase du réseau hydrographique du Québec (GRHQ) ⭐

**La source des contours.** Le LCE (§ 3 bis) ne donne que des centroïdes ; c'est
la GRHQ qui fournit la géométrie des lacs, sur tout le Québec.

| | |
| --- | --- |
| **Titre exact** | Géobase du réseau hydrographique du Québec (GRHQ) |
| **Fournisseur** | MRNF, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/grhq |
| **Index des blocs (CSV)** | https://diffusion.mern.gouv.qc.ca/Diffusion/RGQ/Documentation/GRHQ/Index_GRHQ.csv |
| **Notre bloc (région 05)** | https://diffusion.mern.gouv.qc.ca/diffusion/RGQ/Vectoriel/Carte_Topo/Local/GRHQ/FGDB/05/05.zip — **297 Mo** |
| **Guide (PDF)** | https://diffusion.mern.gouv.qc.ca/Diffusion/RGQ/Documentation/GRHQ/Guide_GRHQ.pdf |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Téléchargé le** | 2026-09-11 |
| **Fichier** | `00-brut/donnees-quebec/GRHQ_05.zip` |

**Comment s'y retrouver** — le jeu se télécharge par région hydrographique
(16 blocs). Le bloc 05 se subdivise ensuite en 11 FGDB par sous-bassin ; notre
lac est dans **`GRHQ_05AM.gdb`**.

**Couche utile : `RH_S`** (réseau hydrographique surfacique), 3D Multi Polygon.
Champs : `NO_LAC`, `TOPONYME`, `SUP_HA`, `PERIM_M`, `TYPECE`, `PERENNITE`.

`NO_LAC` est la **même clé que le LCE** : les deux jeux se joignent directement.
Attention, la colonne de géométrie s'appelle `SHAPE`, pas `geom`.

**Résultat** — **18 polygones de lac** dans le bassin, 17 nommés, 539 ha au
total. Le lac Saint-Charles (`01067`) en fait **351 ha**, soit 65 % de la surface
lacustre du bassin.

**Existe aussi en haute résolution** (GRHQ-HR, slug
`geobase-du-reseau-hydrographique-du-quebec-a-haute-resolution-grhq-hr`), si la
finesse du contour devenait un enjeu.

---

## 3 ter. Écartés, et pourquoi

**Géobase des bathymétries de lac (GBLQ)** —
https://www.donneesquebec.ca/recherche/dataset/bathymetries-lacs (CC-BY 4.0).
Donne la profondeur des lacs **déjà sondés**. Un lac absent n'est pas un lac
inexistant : c'est un lac jamais levé. Inutilisable pour dénombrer ; utile si
l'entrée décrit la morphologie du lac.

**CanVec / Réseau hydro national (RHN), RNCan** —
https://open.canada.ca/data/fr/dataset/9d96e8c9-22fe-4ad2-b5e8-94a6991b744b
(Licence du gouvernement ouvert — Canada). Couverture pancanadienne au
1/50 000 ou mieux. Bonne solution de repli, mais le LCE est produit par le
ministère québécois qui définit aussi la réglementation : pour un argument
portant sur la gouvernance québécoise, c'est la source la plus cohérente. Le RHN
resterait pertinent pour une comparaison interprovinciale.

---

## 4 bis. États trophiques des lacs (RSVL)

| | |
| --- | --- |
| **Titre exact** | États trophiques des lacs |
| **Fournisseur** | MELCCFP, via Données Québec |
| **Fiche** | https://www.donneesquebec.ca/recherche/dataset/lacs-participants-au-reseau-de-surveillance-volontaire-rsvl |
| **Téléchargement (GPKG)** | https://stqc380donopppdtce01.blob.core.windows.net/donnees-ouvertes/RSVL/DQ/RSVL_gpkg.zip — **144 Mo** |
| **Licence** | **Attribution (CC-BY 4.0)** |
| **Métadonnées màj** | 2026-06-18 |
| **Couverture** | lacs suivis de 2004 à 2025 |
| **Téléchargé le** | 2026-09-11 |
| **Fichier** | `00-brut/donnees-quebec/RSVL_gpkg.zip` |

Cinq couches : `lacs_p`, `stations_p`, `exutoires_p`, `lacs_s`, `bv_s`.

**Ce qu'il n'apporte pas** — son `bv_s` porte le même `NO_LCE_L 01464` que le jeu
principal, c'est-à-dire le lac Saint-Charles **de Charlevoix**. Notre bassin n'y
est pas non plus.

**Ce qu'il apporte** — par bassin suivi : occupation du sol (`PC_FORET`,
`PC_AGRICOLE`, `PC_ANTHROPIQUE`, `PC_HUMIDE`, `PC_COUPE_REGEN`, avec `ANNEE_UT`)
et état trophique. Neuf lacs suivis dans la zone de notre bassin : Beauport,
Delage, Bleu, Jaune, Tourbillon, Morin, Saint-Joseph, Trois Petits Lacs, et un
sans toponyme.

**Piste à considérer** — « suivi au RSVL » est un fait vérifiable et daté, là où
le statut réglementaire (§ 4) reste introuvable. Un décompte « X lacs suivis sur
N plans d'eau du bassin » dit quelque chose de proche, et se source.

---

## 5. Population par municipalité

| | |
| --- | --- |
| **Titre exact** | Estimations de la population des municipalités, Québec, 1er juillet 2001 à 2025 |
| **Fournisseur** | Institut de la statistique du Québec (ISQ) |
| **Page** | https://statistique.quebec.ca/en/document/population-and-age-and-sex-structure-municipalities |
| **Téléchargement (XLSX)** | https://statistique.quebec.ca/en/fichier/population-estimates-municipalities-quebec.xlsx — **280 Ko** |
| **Années couvertes** | 2001–2025 |
| **Téléchargé le** | 2026-09-14 |
| **Fichier** | `00-brut/isq/population-municipalites-2001-2025.xlsx` |
| **Extraction** | `10-travail/extraire_population.py` → `30-export/lac-st-charles-population-v1.csv` |

### ⚠️ Deux pièges

**Le bon fichier est le plus petit.** La page propose aussi « Estimations par
groupe d'âge et genre » (13,78 Mo) : ce fichier ne couvre que les municipalités
de **25 000 habitants et plus**, ce qui exclut quatre des cinq du bassin. Le
fichier de 280 Ko les couvre toutes.

**Les dernières années portent un suffixe** — `2022r` à `2024r` (révisées),
`2025p` (provisoire). Un filtre `20\d\d` strict s'arrête silencieusement à 2021.
Le CSV produit conserve ce statut dans une colonne dédiée.

### Résultat

| Municipalité | 2001 | 2025 | Croissance |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | 5 346 | 10 147 | **+89,8 %** |
| Lac-Delage | 454 | 810 | +78,4 % |
| Lac-Beauport | 5 655 | 8 524 | +50,7 % |
| Saint-Gabriel-de-Valcartier | 2 318 | 3 400 | +46,7 % |
| Québec | 486 439 | 592 658 | +21,8 % |

Sert d'**indicateur indirect** de pression : les taux sont municipaux, pas
« dans le bassin ». Une municipalité n'est pas entièrement dans le bassin
versant, et la croissance peut se produire ailleurs sur son territoire. À dire
tel quel dans l'entrée.

Sert d'**indicateur indirect** de pression de développement — ce n'est pas une
mesure de pression. À dire tel quel dans l'entrée : la population d'une
municipalité croît parfois loin du bassin.

Les frontières municipales changent (fusions, défusions). Si la série traverse
une refonte, la rupture est un artefact administratif, pas une croissance.

---

## 6. Contexte narratif

| | |
| --- | --- |
| **Sources** | Diagnostics APEL 2012 et 2022 ; Ville de Québec — « Bonnes pratiques autour du lac Saint-Charles » ; Agiro — publications |
| **Ville de Québec** | https://www.ville.quebec.qc.ca/citoyens/environnement/eau/protection-cours-deau/bassins-versants-et-sources-deau-potable/bonnes-pratiques-lac-saint-charles.aspx |
| **Agiro — publications** | https://agiro.org/publications/ |
| **OBV Capitale — PDE** | https://www.obvcapitale.org/plan-directeur-eau/bassin-de-la-riviere-saint-charles-lacs/ |
| **Consulté le** | 2026-09-11 (pages web) |
| **Usage** | Rédaction seulement — aucune géométrie |

### Faits relevés, à citer

- **Saint-Augustin-de-Desmaures : tranché.** La page « Bonnes pratiques » de la
  Ville de Québec énonce que le lac alimente en eau potable plus de 300 000
  citoyens de **Québec, Saint-Augustin-de-Desmaures, L'Ancienne-Lorette et
  Wendake**. Les quatre municipalités desservies sont donc nommées.
- **La prise d'eau est à 11 km en aval du lac**, sur la rivière Saint-Charles —
  ce n'est pas le lac lui-même. Elle dessert ~300 000 personnes, soit **53 % de
  l'agglomération de Québec** (source Agiro).
- **Superficie du lac : 3,6 km²** (360 ha), périmètre 17 km — à ne pas confondre
  avec les 169 km² du bassin.
- Activités déjà encadrées dans le bassin de la prise d'eau : baignade, bateaux à
  essence, camping sauvage et feux à ciel ouvert y sont interdits.

Ces faits **renforcent** la thèse plutôt qu'ils ne l'affaiblissent : le territoire
qui décide (les municipalités du bassin) et celui qui boit (les quatre
municipalités desservies) ne se recouvrent pas — et la liste des deux est
maintenant nommée, donc cartographiable.

---

## 7. Entretien — source conceptuelle

| | |
| --- | --- |
| **Référence** | « Un statut juridique pour le fleuve Saint-Laurent », entretien avec Nathalie Gravel par Annie Labrecque, Québec Science |
| **URL** | |
| **Consulté le** | |

**L'entretien ne parle pas du lac Saint-Charles.** Le lab l'utilise comme cadre
d'analyse transposé, pas comme source sur ce lac. Voir § 7 bis pour la source
qui, elle, porte directement sur le lac.

---

## 7 bis. Communication scientifique sur ce lac — Gravel 2025 ⭐

**La source qui change le statut du projet.** Contrairement à l'entretien, elle
porte directement sur le lac Saint-Charles.

| | |
| --- | --- |
| **Titre** | Developing Favorable Grounds for Participatory Water Governance and the Rise of Eco-Citizenship, the Case of Lake St. Charles, Quebec |
| **Autrice** | Nathalie Gravel — Université Laval |
| **Date** | 21 mai 2025, 15:00–15:15 |
| **Type** | Communication orale (Oral Presentation) |
| **Abstract ID** | 133 |
| **Session** | CS112 — Vers une gouvernance adaptative des sources d'eau potable face aux changements climatiques |
| **Colloque** | **Congrès annuel 2025 de l'Association canadienne des géographes (CAG / ACG)** |
| **Session** | CS112, co-organisée par **Nathalie Gravel et Olof Suire** |
| **URL du programme** | https://www.meet-here.ca/CAG-ACG-2025/session/3014399/ |
| **Consulté le** | 2026-09-14 |
| **Fichier** | `00-brut/gravel/communication-gravel-2025-lac-saint-charles.md` |

**✅ Vérifié le 2026-09-14** — la page publique de la session confirme le titre
exact, la session CS112, la date du 21 mai 2025 et l'heure de passage (15:00).

Deux nuances par rapport au résumé initial :

- la session a **deux organisateurs** : Gravel *et* **Olof Suire**. Le citer si
  la session est mentionnée ; piste à explorer par ailleurs ;
- l'**abstract ID 133** n'apparaît pas sur la page publique. Sans conséquence, la
  référence étant identifiable sans lui.

**Cadre théorique** — théorie de l'acteur-réseau (Actor-Network Theory) :
réseaux, discours, alliances, marges de manœuvre entre parties prenantes.

**Ce qu'elle établit sur ce lac** — recherche collaborative en cours ; échec des
tentatives antérieures de gouvernance participative ; déficit démocratique et
injustices perçues ; tensions personnel municipal ↔ riverains sur les eaux usées
et le coût du traitement ; déficience dans la définition conjointe d'une vision ;
parties prenantes incluant citoyens et représentants autochtones ; lecture en
termes de transition d'une gestion **technocratique** vers une **gouvernance
participative**.

**Ce qu'elle n'établit pas** — aucune superficie, aucune part municipale, aucun
décompte de lacs, aucun inventaire réglementaire. Ces mesures sont les nôtres.

### ⚠️ Précautions de citation

1. **Résumé de communication, pas article revu par les pairs.** Les résultats y
   sont annoncés comme *early results*. Citer « communication scientifique,
   2025 », jamais comme conclusion établie.
2. **Vérifier s'il existe une publication ultérieure** issue de ces travaux, et
   la citer de préférence. Case ci-dessous.
3. **Compléter le nom du colloque et l'URL du programme** avant publication : une
   référence sans provenance vérifiable ne vaut pas mieux qu'une affirmation
   non sourcée.
4. Le texte du résumé est reproduit à usage de travail dans `00-brut/`. **Dans
   l'entrée publiée, citer brièvement et renvoyer à la source** — ne pas
   reproduire le résumé intégral.

| À vérifier | Fait ? |
| --- | --- |
| Nom exact et année du colloque | ☑ CAG / ACG 2025 |
| URL du programme | ☑ meet-here.ca |
| Ville hôte du congrès | ☐ |
| Existence d'une publication issue de ces travaux | ☐ |
| Autres publications de N. Gravel sur ce bassin | ☐ |
| Travaux d'Olof Suire (co-organisateur) | ☐ |

---

## Vérification avant publication

- [ ] la redistribution du dérivé est permise par chaque licence ci-dessus ;
- [ ] `attribution` du lab reprend les formules exigées ;
- [ ] le millésime de chaque couche apparaît dans l'entrée ;
- [ ] la note de méthode distingue l'entretien (cadre) des sources du lac (faits) ;
- [ ] le décompte « 1 sur 20+ » couvre bien **tout** le bassin, ou le texte dit
      sur quelle emprise il porte ;
- [ ] le statut réglementaire est présenté comme lecture d'un mémoire ;
- [ ] Saint-Augustin-de-Desmaures tranché, ou la question posée ouvertement ;
- [ ] aucune donnée personnelle ni adresse précise dans l'export.
