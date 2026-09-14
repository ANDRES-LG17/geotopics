# Journal — Lac Saint-Charles

Ce qui a été fait, et **pourquoi**. Les gestes se retrouvent dans les fichiers ;
les décisions, non.

La conception figée est dans `CONCEPTION.md` — ce journal enregistre ce qui
change ensuite, au contact des données.

---

## Question de départ

Protéger un plan d'eau « par morceaux » ne suffit pas : le bassin versant du lac
Saint-Charles dépasse largement la municipalité qui boit son eau, et un seul de
ses plans d'eau est réglementé.

## Zone d'étude et SCR

- **Emprise** : bassin versant du lac Saint-Charles, 169 km² (à confirmer par le
  calcul) ;
- **SCR de travail** : **EPSG:2949** (MTM fuseau 7) — projeté, indispensable :
  tout l'argument repose sur des **surfaces** (part du bassin par municipalité).
  Une aire calculée en EPSG:4326 n'a aucun sens ;
- **SCR de sortie** : EPSG:4326, imposé par MapLibre.

Reprojeter à l'entrée, une seule fois. Ne repasser en géographique qu'à l'export.

---

## 2026-09-11 — Ouverture du projet

**Fait** — atelier créé depuis le gabarit ; `CONCEPTION.md` déposé ;
`SOURCES.md` pré-rempli avec les six jeux identifiés ; étage
`15-saisie-manuelle/` ajouté avec le gabarit CSV du statut réglementaire.

**Pourquoi un étage 15** — le statut réglementaire n'existe dans aucun portail :
il se lit dans le mémoire de l'APEL et se saisit à la main. Ce n'est ni du brut
(pas un téléchargement) ni du travail (pas reconstructible par script). Le
séparer rend visible qu'il faut le sauvegarder comme du brut.

---

## 2026-09-11 — Repérage des sources en ligne

**Fait** — URL de téléchargement trouvées et notées dans `SOURCES.md` pour le
bassin versant, les découpages administratifs et l'hydrographie. Deux points du
cadrage se déplacent.

### Saint-Augustin-de-Desmaures : tranché ✅

La page « Bonnes pratiques autour du lac Saint-Charles » de la Ville de Québec
nomme les municipalités desservies : **Québec, Saint-Augustin-de-Desmaures,
L'Ancienne-Lorette et Wendake** — plus de 300 000 citoyens.

**Ce que ça change** — l'argument gagne en précision. Il ne s'agit plus de « la
ville qui boit » contre « les municipalités du bassin », mais de deux ensembles
nommés qui ne se recouvrent pas :

| Qui **boit** l'eau | Qui **décide** sur le bassin |
| --- | --- |
| Québec | Québec |
| Saint-Augustin-de-Desmaures | Stoneham-et-Tewkesbury |
| L'Ancienne-Lorette | Lac-Delage |
| Wendake | Lac-Beauport |
| | Saint-Gabriel-de-Valcartier |

Seule Québec figure dans les deux colonnes. C'est la carte n° 2 du lab, et elle
est plus forte ainsi : trois municipalités boivent sans décider, quatre décident
sans boire.

Précision à ne pas perdre : **la prise d'eau est à 11 km en aval du lac**, sur la
rivière Saint-Charles. Écrire « le lac alimente » est un raccourci ; le dire
proprement coûte une phrase.

### La source du « 1 sur 20+ » : fragilisée ⚠️

`CONCEPTION.md` attribue le décompte à un « mémoire de l'APEL au BAPE ». Ce
mémoire ne se trouve pas. Ce qui se trouve, c'est *Faire autrement pour une
protection des milieux naturels et des ressources en eau* (APEL, 2017, 122 p.),
dont la présentation annonce des **recommandations** de mesures réglementaires —
pas un inventaire des plans d'eau avec leur statut.

**Pourquoi c'est sérieux** — c'est l'argument n° 1, celui noté « fort » dans
`CONCEPTION.md` § 3. S'il repose sur une source mal identifiée, il ne tient pas.

**Décision** — lire le PDF 2017 avant toute saisie. Trois issues, toutes
publiables, mais qui ne s'écrivent pas pareil :

1. l'inventaire y est → noter le chapitre, saisir, citer ;
2. il est ailleurs (diagnostic 2022 ?) → retrouver le document ;
3. il n'existe pas → **le construire soi-même** par croisement hydrographie ×
   règlements municipaux, et le présenter comme un dénombrement propre.

L'issue 3 est la plus exigeante et la plus intéressante : un décompte original,
méthode publiée, est un meilleur objet de portfolio qu'un chiffre recopié. Mais
elle interdit d'écrire « selon l'APEL ».

**Note** — l'APEL s'appelle désormais **Agiro**.

---

## 2026-09-11 — Vérification des liens (correctif)

**Fait** — la première URL notée pour le bassin versant
(`aires-de-drainage-de-lacs`) répondait **404**. Le bon identifiant est
`aires-de-drainage-bassins-versants`, et le titre exact du jeu est *Aires de
drainage en cours d'eau et bassins versants de lacs*. Toutes les fiches ont été
revérifiées et les liens **directs** de téléchargement notés.

**Méthode retenue** — interroger l'API du portail plutôt que se fier à une page
de résultats :

```bash
curl -s "https://www.donneesquebec.ca/recherche/api/3/action/package_show?id=<slug>"
```

Elle donne le titre exact, la licence, la date de mise à jour et l'URL réelle de
chaque ressource. C'est plus sûr, et ça remplit `SOURCES.md` sans recopier à la
main. À réutiliser pour tout jeu de Données Québec.

**Ce que ça a rapporté au passage**

- licences confirmées : **CC-BY 4.0** pour les trois jeux ;
- poids réels : bassin 47 Mo, SDA 100 Mo — à savoir avant de lancer QGIS ;
- un **WMS** sur le jeu des bassins versants : permet de repérer le bon bassin à
  l'écran sans télécharger l'archive complète ;
- `Municipalites_renvois.csv` (MRNF) : codes géographiques officiels, pour
  joindre la population **par code** plutôt que par nom — les noms de
  municipalités sont une mauvaise clé (accents, tirets, « Saint- » / « St- »).

**Leçon** — un lien trouvé par recherche n'est pas un lien vérifié. Vérifier le
code HTTP avant de noter une URL dans `SOURCES.md`.

---

## 2026-09-11 — Données téléchargées et inspectées

**Outils** — QGIS 3.44 est installé et fournit `ogrinfo` :

```
"/c/Program Files/QGIS 3.44.14/bin/ogrinfo.exe"
```

ArcMap 10.5/10.8 et `arcpy` (Python 2.7) sont également disponibles. `ogrinfo`
suffit pour l'inspection ; ArcMap reste utile pour la mise en page.

**Téléchargé dans `00-brut/`** — bassins versants (48 Mo), SDA (101 Mo),
hydrographie VDQ (24 Mo), RSVL (144 Mo), plus les PDF de structure et
`Municipalites_renvois.csv`. Les deux ZIP volumineux ont été vérifiés
(`unzip -t`) : le SDA avait été tronqué par une interruption, repris avec
`curl -C -`.

### ⚠️ Le bassin versant du lac Saint-Charles n'est PAS dans `bv_s`

C'est le résultat structurant de la journée.

La couche `bv_s` du jeu MELCCFP contient **1 242** bassins versants de lacs. Deux
entités portent le nom « Saint-Charles, Lac » :

| NO_LCE_L | Superficie | Localisation | |
| --- | --- | --- | --- |
| 01341 | 3,11 km² | lon −70,85 / lat 46,09 | Beauce ? |
| 01464 | 3,64 km² | lon −70,99 / lat 46,77 | Charlevoix |

**Aucune n'est le nôtre**, qui se trouve vers lon −71,42 / lat 46,93. Une
recherche par emprise autour du vrai lac ramène ses voisins — Delage (5,86 km²),
Beauport (6,76 km²), Bleu, Jaune, Tourbillon — mais pas lui.

Deux pièges évités d'un coup :

1. **le piège du nom** — `HYDRONYME` seul aurait donné le lac de Charlevoix. Sa
   superficie de 3,64 km² correspond *exactement* à celle publiée par Agiro pour
   notre lac (3,6 km²), donc le contrôle « la superficie concorde » aurait
   validé la mauvaise entité. Il fallait une vérification **géographique**.
2. **le piège d'échelle** — `SUPERF_TOT_KM2` dans `bv_s` est la superficie du
   **plan d'eau**, pas de son bassin versant. Les 169 km² ne s'y trouvent pas.

### Où sont les 169 km² : la couche `ad_s`

`ad_s` (aires de drainage de stations de suivi) contient des entités dont la
superficie encadre la bonne valeur, au bon endroit :

| NO_BQMA | Superficie |
| --- | --- |
| 05090041 | 170,03 km² |
| 05090016 | 170,04 km² |
| 05080073 | 170,43 km² |

**170 km² contre 169 annoncés** — l'écart est d'un demi pour cent. Ces aires sont
délimitées par une **station de mesure**, pas par le lac : le contour dépend du
point de fermeture retenu. À départager dans QGIS en regardant lequel se ferme au
bon endroit, et à documenter comme choix.

**Conséquence de méthode** — le bassin ne se prend pas dans un jeu tout fait : il
se choisit, et le choix s'explique. C'est un meilleur sujet d'article qu'un
polygone téléchargé.

### RSVL — utile, mais pas pour le bassin

Jeu proposé en cours de route : **États trophiques des lacs** (MELCCFP, CC-BY 4.0,
màj 2026-06-18), 5 couches dont `bv_s` et `lacs_s`.

Son `bv_s` porte le même `NO_LCE_L 01464` — donc **le même lac de Charlevoix**.
Le nôtre n'y est pas davantage.

Ce qu'il apporte réellement, et qui est précieux : des attributs d'occupation du
sol par bassin (`PC_FORET`, `PC_AGRICOLE`, `PC_ANTHROPIQUE`, `PC_HUMIDE`,
`PC_COUPE_REGEN`, `ANNEE_UT`) et un état trophique 2004-2025. Neuf lacs suivis se
trouvent dans la zone du bassin : Beauport, Delage, Bleu, Jaune, Tourbillon,
Morin, Saint-Joseph, Trois Petits Lacs, et un sans toponyme.

**Piste** — « suivi au RSVL » est un **fait vérifiable**, contrairement au statut
réglementaire qui reste introuvable. Neuf lacs suivis dans un bassin qui en
compte des dizaines, c'est un indicateur du même ordre que celui recherché, et
sourçable. À considérer comme repli, ou comme couche complémentaire.

### Hydrographie VDQ — un seul attribut

3 896 entités, **un seul champ : `ID`**. Pas de toponyme, pas de type, pas de
superficie. Identifier « le lac Saint-Charles » ne peut donc pas se faire par
attribut : ce sera par intersection géométrique.

Emprise réelle : lon −71,63..−70,81 / lat 46,68..**47,13**. Le bassin remonte
plus au nord (Stoneham, Saint-Gabriel-de-Valcartier) : la couverture partielle
est confirmée, la GRHQ sera nécessaire pour compter sur tout le bassin.

### SDA — les huit municipalités confirmées

Couche `munic_s`, champs `MUS_CO_GEO` (code officiel) et `MUS_NM_MUN`.

| Code | Municipalité | MRC | Superficie |
| --- | --- | --- | --- |
| 23027 | Québec | Québec | 485,34 km² |
| 22035 | Stoneham-et-Tewkesbury | La Jacques-Cartier | 686,23 km² |
| 22025 | Saint-Gabriel-de-Valcartier | La Jacques-Cartier | 447,31 km² |
| 22040 | Lac-Beauport | La Jacques-Cartier | 64,18 km² |
| 22030 | Lac-Delage | La Jacques-Cartier | 2,11 km² |
| 23072 | Saint-Augustin-de-Desmaures | Québec | 105,26 km² |
| 23057 | L'Ancienne-Lorette | Québec | 7,70 km² |
| 23802 | Wendake | Québec | 2,26 km² |

Détail qui nourrit la thèse : les quatre municipalités du bassin hors Québec
appartiennent toutes à la **MRC de La Jacques-Cartier**, tandis que celles qui
boivent l'eau relèvent de l'**agglomération de Québec**. La frontière entre « qui
décide » et « qui boit » est aussi une frontière de MRC.

Joindre par `MUS_CO_GEO`, jamais par nom.

---

## 2026-09-11 — Projet QGIS monté, premiers résultats

**Fait** — `20-sig/qgis/lac-saint-charles.qgz`, bâti par
`20-sig/qgis/_build_projet.py` (PyQGIS). Le projet est **reconstructible** : si
le `.qgz` se perd, le script le refait. Chemins relatifs vérifiés, projet en
EPSG:2949.

Couches de travail dans `10-travail/99-travail.gpkg`.

### Le lac identifié : `ID 43524`

L'hydrographie VDQ n'ayant qu'un champ `ID`, le lac a été trouvé par
**géométrie** : centroïde lon −71,3853 / lat 46,9353, superficie **365,1 ha**.
Agiro publie 360 ha — concordance à 1,4 %.

C'est le troisième plus grand polygone du jeu ; les deux plus grands (5 462 et
4 879 ha) sont le fleuve.

### Le bassin retenu : `05090041`

Deux des cinq candidates **contiennent** le lac (`ST_Contains`) :

| NO_BQMA | Aire calculée | Contient le lac |
| --- | --- | --- |
| **05090041** | **170,01 km²** | **oui** |
| 05090016 | 170,02 km² | oui |
| 05080073 | 170,43 km² | non |
| 05080102 | 138,74 km² | non |
| 05080138 | 221,89 km² | non |

Les deux retenues diffèrent de **1,18 ha sur 17 000** — soit 0,007 %.
Indiscernables à l'échelle du lab. `05090041` retenue, arbitrairement mais
explicitement ; `05090016` reste dans le projet en tirets pour que le choix soit
visible.

Aire calculée = aire déclarée à 0,01 km² près : le SCR projeté est correct.
**170,01 km² contre 169 annoncés** — l'écart de 0,6 % vient du point de fermeture
et se dit en une phrase.

### 🎯 L'overlay : l'argument central, chiffré

| Municipalité | MRC | Part du bassin | % |
| --- | --- | --- | --- |
| Stoneham-et-Tewkesbury | La Jacques-Cartier | 134,86 km² | **79,3 %** |
| Québec | Québec | 25,32 km² | **14,9 %** |
| Lac-Beauport | La Jacques-Cartier | 4,86 km² | 2,9 % |
| Saint-Gabriel-de-Valcartier | La Jacques-Cartier | 2,87 km² | 1,7 % |
| Lac-Delage | La Jacques-Cartier | 2,11 km² | 1,2 % |

**La thèse est vérifiée, et plus forte que prévu.** La ville qui boit l'eau
contrôle **moins de 15 %** du territoire qui l'alimente. Une seule municipalité —
Stoneham-et-Tewkesbury, qui ne boit pas cette eau — en contrôle **près de 80 %**.

Les quatre municipalités hors Québec relèvent toutes de la MRC de La
Jacques-Cartier : 85,1 % du bassin est administré par une autre MRC que celle qui
consomme l'eau.

Ce chiffre n'était pas dans `CONCEPTION.md` : il sort des données. C'est le titre
de l'entrée.

### Le décompte des plans d'eau : 200

`hydro_bassin` — 200 polygones intersectant le bassin retenu, dont **14 de plus
d'un hectare** et 3 de plus de dix.

⚠️ Sur la **seule emprise VDQ**, qui ne couvre pas tout le bassin. Stoneham
représentant 79 % du territoire, le décompte réel est vraisemblablement bien
supérieur — et c'est justement là que la couverture manque. La GRHQ devient
nécessaire, non plus pour la complétude, mais parce que **l'essentiel du bassin
est hors champ**.

Un seuil de surface sera nécessaire : un polygone de 12 m² n'est pas un « plan
d'eau » au sens de l'argument. À fixer avant de publier un chiffre.

---

## 2026-09-11 — Avertissement 1 résolu : la base LCE

**Jeu retenu** — *Base de données des lacs et cours d'eau (LCE)*, MELCCFP,
CC-BY 4.0. **Couvre tout le Québec** : la lacune de couverture hors Québec
disparaît.

### ⚠️ Prendre le FGDB, pas le SQLite

Le portail offre deux formats. **Le SQLite est inutilisable** : les 148 724
enregistrements ont *tous* leurs attributs à `NULL` — nom, superficie, bassin
versant, coordonnées. Seule la géométrie survit.

Le **FGDB** (`lce.gdb`) contient les mêmes entités avec leurs attributs
renseignés. Les noms de couches et de champs diffèrent d'un format à l'autre :

| | SQLite | FGDB |
| --- | --- | --- |
| Couche | `centroides_lacs` | `CE_LAC` |
| Nom | `nom_cours_deau` (vide) | `NOM_LAC` |
| Bassin | `superf_bassin_versant` (vide) | `SUPERF_BASSIN_VERSANT_LAC` |
| Géométrie | `GEOMETRY` | `SHAPE` |

**Leçon** — deux formats du même jeu ne sont pas interchangeables. Vérifier le
taux de remplissage (`COUNT(champ)` vs `COUNT(*)`) avant de bâtir quoi que ce
soit dessus. Le SQLite aurait donné 0 lac nommé sans lever d'erreur.

Note technique : sur FGDB, le dialecte SQLITE d'OGR échoue — utiliser `-where`
et le dialecte natif, ou passer par un GPKG intermédiaire.

### Le lac retrouvé, et confirmé une troisième fois

`NO_LAC 01067`, lon −71,3881 / lat 46,9398, altitude 151 m, périmètre 18,51 km.

**`SUPERF_BASSIN_VERSANT_LAC` = 16 576 ha = 165,76 km².**

Troisième mesure indépendante du bassin :

| Source | Superficie |
| --- | --- |
| Agiro (publié) | 169 km² |
| `ad_s` 05090041 (calcul QGIS) | 170,01 km² |
| **LCE (attribut MELCCFP)** | **165,76 km²** |

Les trois tiennent dans une fourchette de 2,5 %. L'entrée annoncera **≈ 170 km²**
en citant la source retenue, et mentionnera l'écart : trois organismes publics
mesurent le même bassin à quelques km² près, ce qui illustre au passage que le
contour dépend du point de fermeture.

### 🎯 Le décompte : 25 lacs

**25 lacs** dans le bassin retenu, dont **15 portant un toponyme**.

Les nommés : Saint-Charles, Delage, Durand, du Sud-Ouest, des Deux Truites, de
l'Aqueduc, Demers, Logan, les Trois Petits Lacs, Fripon, Dubrin, Drouin, à la
Loutre, étang Bellevue, Turgeon.

**L'argument « 1 sur 20+ » est vérifié — et il est désormais nôtre.** Ce n'est
plus un chiffre cité d'un mémoire introuvable : c'est un dénombrement fait sur
des données publiques, reproductible, avec la liste des noms à l'appui.

Formulation défendable : *« Le bassin versant du lac Saint-Charles compte
25 lacs. Un seul — celui qui alimente la prise d'eau — fait l'objet d'un
encadrement spécifique. »*

Il reste à étayer la seconde phrase (statut réglementaire, § 4 de `SOURCES.md`) :
le décompte est acquis, l'asymétrie de protection ne l'est pas encore.

### Ce qui remplace l'avertissement 1

L'ancien décompte (200 polygones VDQ) mélangeait lacs, élargissements de cours
d'eau et flaques, sur une emprise partielle. Les 25 lacs LCE sont des **entités
nommées comme lacs par le ministère**, sur **tout** le bassin. Le seuil de
surface arbitraire devient inutile : le critère n'est plus une taille choisie par
nous, c'est la définition du producteur de la donnée.

L'avertissement 2 tombe avec le premier.

### Correctif — le LCE n'est qu'un semis de points

Constaté en ouvrant le projet : `CE_LAC` ne contient que des **centroïdes**. Un
point par lac, aucun contour. Utile pour dénombrer, inutile pour dessiner.

**Solution : la GRHQ.** Téléchargée par région hydrographique (la nôtre est la
**05**, 297 Mo), elle se subdivise par sous-bassin : notre lac est dans
`GRHQ_05AM.gdb`, couche **`RH_S`** (réseau hydrographique surfacique).

`RH_S` porte `NO_LAC` — la **même clé** que le LCE — plus `TOPONYME`, `SUP_HA`,
`PERIM_M`. La jointure entre les deux jeux est directe.

**18 polygones de lac** dans le bassin, 17 nommés, 539 ha au total :

| Lac | ha | | Lac | ha |
| --- | --- | --- | --- | --- |
| **Saint-Charles** | **351,0** | | à la Loutre | 6,08 |
| Delage | 51,74 | | des Deux Truites | 5,57 |
| Durand | 34,11 | | Trois Petits Lacs (2) | 4,79 |
| du Sud-Ouest | 25,24 | | de l'Aqueduc | 4,11 |
| Les Trois Petits Lacs | 16,27 | | Lagon | 3,06 |
| Demers | 14,11 | | McKee | 2,69 |
| Turgeon | 13,90 | | Dubrin | 2,44 |
| | | | Fripon | 1,86 |
| | | | Étang Bellevue (2) | 0,84 / 0,55 |

Le lac Saint-Charles représente **65 %** de la surface lacustre du bassin.

**18 polygones contre 25 centroïdes** — l'écart n'est pas une erreur. Le LCE
recense des lacs que la GRHQ ne dessine pas (trop petits, ou contour non levé).
Les deux chiffres sont justes, ils ne comptent pas la même chose :

- **25** = lacs inventoriés au répertoire du MELCCFP ;
- **18** = lacs dont le contour est cartographié.

Pour l'entrée, **18** est préférable : cartographiable, donc montrable, donc
vérifiable par le lecteur. Le 25 se mentionne en note. L'argument tient dans les
deux cas — un seul lac encadré, sur 18 comme sur 25.

Troisième mesure du lac : **351 ha** (GRHQ) contre 365 ha (polygone VDQ) et
360 ha (Agiro). Trois producteurs, 4 % d'écart.

### Ce que la bathymétrie (GBLQ) n'apporte pas

Jeu envisagé : *Géobase des bathymétries de lac du Québec*. Il donne la
**profondeur** des lacs déjà levés — utile pour décrire un lac, inutile pour en
dénombrer : un lac absent de la géobase n'est pas un lac inexistant, c'est un lac
jamais sondé. Écarté pour le décompte ; éventuellement utile en illustration.

---

## 2026-09-14 — Une source directe sur ce lac change le projet

**Fait** — communication scientifique de N. Gravel (21 mai 2025, abstract 133)
portant **sur le lac Saint-Charles lui-même**. Déposée en
`00-brut/gravel/`, fichée en `SOURCES.md` § 7 bis. `CONCEPTION.md` §§ 1, 2 et 3
révisés.

### Ce qui tombe : la précaution « elle n'a jamais parlé de ce lac »

La règle de méthode initiale supposait que le lac était **notre** cas d'étude,
choisi pour illustrer un cadre qu'elle développait sur le fleuve. C'était exact
au vu de l'entretien Québec Science ; ça ne l'est plus. Le lac Saint-Charles est
l'objet de ses travaux en cours.

La distinction reste nécessaire, mais **déplacée** : elle ne sépare plus « son
fleuve » de « notre lac », elle sépare **son cadre d'analyse** de **nos
mesures**. La communication n'avance aucun chiffre de superficie, de part
municipale ou de décompte : ces mesures restent les nôtres, et engagent notre
seule responsabilité.

### Cinq arguments nouveaux, tous attribuables

Aux cinq arguments transposés de l'entretien s'ajoutent (voir `CONCEPTION.md`
§ 3, colonne « Src » = A) :

6. les tentatives antérieures de gouvernance participative ont **échoué** ;
7. **déficit démocratique** et injustices perçues — tensions entre personnel
   municipal et riverains sur la réduction des eaux usées et le coût du
   traitement ;
8. question centrale : **quels obstacles empêchent de modifier la configuration
   du pouvoir** dans les structures de gestion du lac ;
9. lecture d'ensemble : transition d'une gestion **technocratique** vers une
   **gouvernance participative** ;
10. parties prenantes incluant **citoyens et représentants autochtones**.

### Deux arguments révisés à la hausse

**N° 4 (menaces).** Écarté auparavant faute de preuve locale pour les surverses.
La communication parle explicitement de tensions sur *wastewater reduction and
treatment costs* pour ce lac : ce n'est plus une menace transposée, c'est un
conflit documenté ici.

**N° 5 (vision partagée).** Cessait d'être une analogie : le défaut de définition
conjointe d'une vision est **constaté** par la chercheuse sur ce bassin.

### 🎯 Le déplacement de fond, et ce qu'il fait au lab

La thèse était **géographique** : le découpage administratif ne suit pas
l'hydrologie. Elle devient aussi **politique** : le problème n'est pas seulement
que le territoire est mal découpé, c'est que *les tentatives de changer cela ont
échoué*.

Conséquence pour le lab : nos chiffres cessent d'être la conclusion pour devenir
le **terrain**. Le 79,3 % / 14,9 % montre pourquoi une gouvernance partagée est
structurellement difficile ; il ne dit pas pourquoi elle ne s'installe pas. Cette
seconde question est celle de la chercheuse, et le lab doit **renvoyer à ses
travaux** plutôt que prétendre y répondre.

Formulation retenue pour la note de méthode :

> *La carte montre pourquoi c'est difficile. Elle ne dit pas pourquoi ça ne
> change pas — c'est l'objet des travaux de Gravel (2025).*

C'est une position plus honnête **et** plus intéressante : le lab devient une
contribution cartographique à une recherche en cours, pas une démonstration
close.

### 💡 Piste sérieuse pour le point bloquant

Le statut réglementaire reste introuvable (§ 4 de `SOURCES.md`). La communication
ouvre une autre voie : elle emploie la **théorie de l'acteur-réseau** et parle de
tensions **sur les eaux usées et leurs coûts**.

Deux conséquences pratiques :

1. **Chercher du côté des eaux usées**, pas seulement de la protection des rives.
   Traitement, surverses, coûts, ouvrages : ce sont des objets administratifs
   documentés (avis, budgets, programmes), plus faciles à retrouver qu'un
   inventaire de règlements par plan d'eau.
2. **Le n° 4 peut remplacer le n° 1** comme second indicateur. Si l'asymétrie
   réglementaire reste hors d'atteinte, l'asymétrie **financière** — qui paie le
   traitement, qui décide de l'aménagement — dit la même chose, sur des sources
   publiques accessibles.

À explorer avant de renoncer à l'indicateur n° 1.

### Statut de la source, à ne pas oublier

Résumé de communication orale, *early results*, pas d'article revu par les pairs.
Trois cases restent ouvertes dans `SOURCES.md` § 7 bis : nom du colloque, URL du
programme, existence d'une publication ultérieure. **À remplir avant
publication.**

---

## 2026-09-14 — Les quatre indicateurs, affinés par Gravel 2025

**Le périmètre du lab ne change pas** : les quatre indicateurs de
`CONCEPTION.md` § 4 sont maintenus. Ce que la communication apporte, ce sont des
**précisions**, pas des coupes.

> *Note de travail.* Une réduction à un seul indicateur a été rédigée puis
> annulée le même jour : « un exemple, pas une étude » portait sur le **ton** —
> un lab lisible en deux minutes, pas une thèse — non sur le **périmètre**.
> Distinction à retenir pour la suite : resserrer l'écriture, pas le contenu.

### Indicateur 1 — lacs

Reste suspendu au statut réglementaire. **Repli identifié** : l'asymétrie
**d'attention** est déjà démontrable sans lui (RSVL suit 9 lacs de la zone,
couverture bathymétrique partielle, hydrographie municipale limitée aux
frontières de la ville). Formulation de repli : *un lac suivi, dix-sept dans
l'angle mort.*

### Indicateur 2 — parts municipales

Complet. **Précision ajoutée** : 85,1 % du bassin relève d'une autre MRC que
celle qui boit l'eau. C'est la traduction cartographique de la *configuration du
pouvoir* que Gravel interroge — l'indicateur gagne un ancrage théorique.

### Indicateur 3 — pression démographique

**Change de statut.** N'est plus un simple proxy d'urbanisation : Gravel
documente des tensions actives sur la réduction des eaux usées et le coût du
traitement. La croissance démographique devient le moteur d'un conflit
identifié — plus de résidents, plus d'eaux usées, désaccord sur qui paie.

La réserve tient toujours : la population peut croître hors bassin.

### Indicateur 4 — schéma d'acteurs

**Le plus transformé.** Il manquait un contenu ; la communication le fournit :

- représentants **autochtones** parties prenantes — Wendake est déjà dans nos
  données comme municipalité desservie ;
- **résidents riverains** acteur distinct du personnel municipal, et en tension
  avec lui ;
- tentatives antérieures de gouvernance participative **échouées**.

Le schéma cesse d'être un organigramme pour devenir une **carte de relations**,
conforme au cadre acteur-réseau mobilisé par la chercheuse.

### Conséquence pratique

Aucune sur les données déjà produites. Restent à obtenir : la série de population
(indicateur 3) et la matière du schéma (indicateur 4). Le statut réglementaire
garde son repli.

---

## 2026-09-14 — Référence Gravel vérifiée, et population obtenue

### ✅ La référence est confirmée — colloque CAG 2025

La communication existe, au **congrès annuel 2025 de l'Association canadienne
des géographes (CAG / ACG)**. Page de session :

```
https://www.meet-here.ca/CAG-ACG-2025/session/3014399/
```

Confirmés : le titre exact, la session **CS112** bilingue (« Vers une gouvernance
adaptative des sources d'eau potable / Towards adaptive governance of drinking
water sources in the face of climate change »), la date du **21 mai 2025** et
l'heure de passage (15:00).

**Élément nouveau — la session a deux organisateurs** : Nathalie Gravel **et
Olof Suire**. Le résumé fourni ne mentionnait que Gravel comme *convenor*. À
citer correctement, et piste à explorer : Suire travaille vraisemblablement sur
les mêmes questions.

**Non confirmé** : l'*abstract ID 133* n'apparaît pas sur la page publique. Sans
conséquence — la référence est identifiable sans lui.

Restent ouverts : la ville hôte du congrès, et l'existence d'une publication
issue de ces travaux.

### ✅ Indicateur 3 — série de population 2001-2025

**Source** — ISQ, *Estimations de la population des municipalités, Québec,
1er juillet 2001 à 2025*. XLSX 280 Ko, toutes les municipalités.

⚠️ **Piège évité** : la page de l'ISQ propose plusieurs fichiers. Celui
« par groupe d'âge et genre » (13,78 Mo) ne couvre que les **municipalités de
25 000 habitants et plus** — il exclut quatre des cinq du bassin. Le bon fichier
est le plus petit (280 Ko), qui les couvre toutes.

Second piège : les dernières colonnes portent un suffixe — `2022r` (révisée),
`2025p` (provisoire). Un filtre sur `20\d\d` strict s'arrête à 2021 sans rien
signaler. Le CSV produit garde le statut dans une colonne à part : une estimation
provisoire ne se présente pas comme définitive.

Extraction par `10-travail/extraire_population.py` — lecture directe du XML du
classeur, sans openpyxl ni pandas : reproductible avec n'importe quel Python.

### 🎯 Le résultat, et il est fort

| Municipalité | 2001 | 2025 | Croissance | Part du bassin |
| --- | --- | --- | --- | --- |
| **Stoneham-et-Tewkesbury** | 5 346 | 10 147 | **+89,8 %** | **79,3 %** |
| Lac-Delage | 454 | 810 | +78,4 % | 1,2 % |
| Lac-Beauport | 5 655 | 8 524 | +50,7 % | 2,9 % |
| Saint-Gabriel-de-Valcartier | 2 318 | 3 400 | +46,7 % | 1,7 % |
| **Québec** | 486 439 | 592 658 | **+21,8 %** | **14,9 %** |

**La municipalité qui contrôle 79,3 % du bassin a presque doublé de population
en 24 ans — quatre fois plus vite que la ville qui boit l'eau.**

Les quatre municipalités du bassin qui ne boivent pas cette eau croissent toutes
entre +47 % et +90 %. Celle qui la boit croît de +22 %.

L'indicateur 3 cesse d'être un proxy vague : il montre que **la pression augmente
précisément là où le contrôle échappe à l'usager**. Combiné à ce que documente
Gravel (tensions sur les eaux usées et leur coût), le tableau se tient : plus de
résidents en amont, plus d'eaux usées, et le désaccord porte sur qui paie.

**Réserve maintenue** — la croissance peut se produire hors bassin, une
municipalité n'étant pas entièrement dans le bassin versant. Les taux ci-dessus
sont municipaux, pas « dans le bassin ». À dire dans l'entrée. Un raffinement
possible : pondérer par la part de territoire, mais cela supposerait que la
population se répartit uniformément — hypothèse douteuse en zone de villégiature.

Export : `30-export/lac-st-charles-population-v1.csv` (12 Ko, 200 lignes,
8 municipalités × 25 ans).

---

## 2026-09-14 — Le lab est construit et publiable

**Fait** — la chaîne complète, de l'atelier au site.

```
scripts/analysis/lac-saint-charles.py    export GeoJSON (189 Ko, 24 entités)
public/data/lac-st-charles-v1.geojson    5 municipalités + 18 lacs + bassin
src/labs/types.ts                        vocabulaire étendu
src/labs/lac-saint-charles.ts            le lab, 5 couches, 3 scènes
src/components/LabMap.tsx                moteur : extrusion, filtres, scènes
content/entries/lac-saint-charles.{fr,en}.md
```

Typecheck, lint et `next build` passent ; les pages FR et EN sont générées et
servies (HTTP 200 vérifié), le GeoJSON aussi.

### Le vocabulaire des labs a été étendu

Quatre ajouts dans `types.ts`, tous réutilisables par de futurs labs :

- **`kind: "extrusion"`** avec `LabHeight` — hauteur fixe ou dérivée d'un champ,
  multipliée par une échelle ;
- **`LabCamera`** (`pitch`, `bearing`) fusionné dans `LabView` ;
- **`LabScene`** — un récit en étapes : cadrage + couches visibles + légende ;
- **`filter`** sur toutes les couches — plusieurs couches sur une même source.

Ce dernier point règle un vrai problème : un seul GeoJSON au lieu de trois, donc
un aller-retour réseau au lieu de trois, avec une propriété `couche` qui dit à
quelle couche appartient chaque entité.

### ⚠️ L'échelle d'extrusion se calibre, elle ne se devine pas

Première valeur essayée : `scale: 90`. Vérification faite après coup, le bloc de
Stoneham culminait à **12 137 m** pour un bassin de **17,9 km de large** — les
deux tiers de la carte, masquant tout le reste.

Calibrage :

| Échelle | Hauteur Stoneham | Part de la largeur |
| --- | --- | --- |
| 20 | 2 697 m | 15 % |
| **30** | **4 046 m** | **23 %** ✅ |
| 40 | 5 394 m | 30 % |
| 90 | 12 137 m | 68 % ❌ |

Retenu : **30**. Assez pour dominer, pas assez pour écraser les petits blocs
(Lac-Delage tombe à 63 m, encore visible).

**Leçon** — une échelle d'extrusion se rapporte toujours à l'emprise réelle.
Mesurer la largeur du bassin avant de choisir, pas après.

### Les trois scènes

1. **Le territoire** — extrusion, caméra à 50°. Les blocs s'élèvent à la mesure
   de la part du bassin. Le plus haut ne boit pas cette eau.
2. **Les 18 lacs** — caméra redescendue à 22°, extrusion masquée. Le lac
   principal se distingue des dix-sept autres par la couleur.
3. **La pression** — tout visible, caméra à 55° sous un autre angle. La légende
   porte les taux de croissance.

Pilotées par **boutons**, jamais par défilement détourné : le défilement
narratif se bat avec celui de l'article, casse sur mobile et ne se pilote pas au
clavier. Les boutons sont des `role="tab"`, la légende est en `aria-live`.

### Choix d'accessibilité et de mobile

- **`prefers-reduced-motion`** — les scènes sont atteintes d'un coup, sans
  déplacement de caméra. Le contenu est identique : l'animation n'a jamais
  porté d'information.
- **Sous 640 px** — l'inclinaison est plafonnée à 40° et la rotation annulée. Une
  vue très rasante sur écran étroit écrase les polygones lointains.

### La couleur code le rapport à l'eau

Vert pour qui boit (Québec), rouge pour qui décide sans boire. Pas une couleur
par municipalité : la carte se lit avant la légende.

---

## 2026-09-14 — La carte ne s'affichait pas : le worker de MapLibre

**Symptôme** — aucune carte, aucun message. Ni pour ce lab, ni pour le lab de
démonstration — donc antérieur à ce projet.

**Cause** — MapLibre GL JS 6 ne met plus son worker dans le bundle : il le charge
comme un module séparé, dont l'URL est résolue à l'exécution depuis
`import.meta.url` :

```js
new Worker(url, { type: "module" })   // maplibre-gl-worker.mjs
```

Turbopack place `maplibre-gl.mjs` dans `/_next/static/chunks/` **sans y copier le
worker**. MapLibre le demande donc à un chemin inexistant :

```
node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs   19 122 o   existe
/_next/static/chunks/maplibre-gl-worker.mjs            404        absent
```

Le serveur répond par sa page 404 en HTML, le navigateur refuse le module
(« non-JavaScript MIME type of text/html »), et la carte ne s'initialise jamais.

**Pourquoi c'était muet** — MapLibre n'atteint pas le point où il sait produire
une erreur. Rien dans `map.on("error")`, rien qu'un périmètre React puisse
capter.

**Correctif** — servir le worker depuis `public/` et le déclarer :

```
scripts/copy-maplibre-worker.mjs   copie au postinstall (suit la version)
src/components/LabMap.tsx          setWorkerUrl("/maplibre-gl-worker.mjs")
```

Le worker devient un actif du site comme un autre. Cohérent avec la règle des
labs : rien qui dépende d'une résolution extérieure.

### Ce que le diagnostic a coûté, et pourquoi

Quatre allers-retours à tâtonner avant d'auditer. L'erreur de méthode : avoir
traité un avertissement d'hydratation — causé par une extension de navigateur,
visible dès le premier message — comme s'il pouvait être la panne. Il ne l'était
pas, et il masquait la ligne qui comptait.

**Leçon** — face à une panne silencieuse, tester le **cas de contrôle** d'abord.
Le lab de démonstration échouait à l'identique : cela seul écartait tout le code
écrit pour ce projet, et pointait le moteur. Cinq minutes au lieu de quatre
tours.

### Deux bugs trouvés pendant l'audit (secondaires, corrigés)

Ils n'expliquaient pas la panne — sans worker, aucune couche n'est dessinée de
toute façon — mais ils auraient frappé juste après.

**Booléens comparés à des nombres.** `boit` et `principal` sont des booléens
dans le GeoJSON ; les expressions les comparaient à `1`/`0`. Un `match` MapLibre
exige des étiquettes chaîne ou nombre. Remplacé par `case` pour la couleur, et
par `["==", …, true|false]` pour les filtres.

Le lab de démonstration, lui, compare `duration = 60` (entier) à des entiers :
cohérent. C'est ce contraste qui a rendu le défaut visible.

**Erreurs de carte invisibles.** `LabMap` ne signalait au lecteur que les échecs
de requête (`AJAXError`). Désormais toute erreur du moteur s'affiche, et un
contrôle après chargement vérifie que chaque couche déclarée existe bien — un
style invalide lève pendant `addLayer`, dans un rappel asynchrone que ni
`map.on("error")` ni un périmètre React ne voient.

---

## Décisions structurantes

À reprendre presque telles quelles dans l'entrée.

| Décision | Raison | Conséquence si elle est fausse |
| --- | --- | --- |
| ~~L'entretien sert de cadre, elle n'a jamais parlé de ce lac~~ → **révisé 2026-09-14** : la communication 2025 porte sur ce lac. La frontière n'est plus « son fleuve / notre lac » mais **son cadre / nos mesures** | Elle documente la gouvernance du lac ; elle n'avance aucun chiffre cartographique | Confondre ses constats avec nos calculs — ou continuer à sous-citer une chercheuse qui a effectivement travaillé sur ce cas |
| Le lab **renvoie** à ses travaux pour la question du pouvoir, sans y répondre | Nos données montrent le terrain, pas les blocages | Prétendre conclure sur une question de sociologie politique avec des polygones |
| L'argument « juridictions » (n° 3) présenté comme **analogie**, pas équivalence | Chez elle la complexité est verticale (3 paliers), ici horizontale (municipalités voisines) | Un lecteur informé repère l'abus et cesse de croire le reste |
| Surverses et agriculture **écartés** des indicateurs | Aucune preuve qu'ils s'appliquent ici ; décrits pour Montréal / le fleuve | Une menace inventée pour faire nombre décrédibilise les trois autres |
| Population = indicateur **indirect** de pression | Aucune donnée directe de pression de développement | La croissance peut être hors bassin : la carte montrerait une pression qui n'existe pas |
| SCR de travail projeté (EPSG:2949) | Tout l'argument repose sur des surfaces | Des parts de bassin fausses, donc l'argument central faux |
| Statut réglementaire saisi à la main, avec `source_page` | N'existe pas en données ouvertes | Sans traçabilité page à page, le chiffre « 20+ » est invérifiable |

---

## Points à trancher

- [x] ~~**Saint-Augustin-de-Desmaures**~~ — tranché le 2026-09-11 : desservi.
      Les quatre municipalités alimentées sont nommées par la Ville de Québec.
- [ ] **Source du « 1 sur 20+ »** — *bloquant pour l'indicateur n° 1.* Lire le
      PDF APEL 2017 et trancher entre les trois issues du journal.
- [ ] **Couverture hydrographique hors Québec** — le jeu de la Ville couvre son
      seul territoire, alors que le bassin déborde. Sans complément (BDTQ), le
      décompte « 20+ » ne porte que sur une partie du bassin : la couverture
      réelle doit être écrite noir sur blanc.
- [x] ~~**Quelle aire de drainage retenir**~~ — `05090041`, seule avec
      `05090016` à contenir le lac ; 1,18 ha les sépare. Choix explicité.
- [x] ~~**Le lac lui-même**~~ — `ID 43524` de l'hydrographie VDQ, trouvé par
      géométrie. 365,1 ha contre 360 publiés.
- [x] ~~**Couverture hydrographique hors Québec**~~ — résolu par la base LCE
      (couvre tout le Québec). **25 lacs** dans le bassin, 15 nommés.
- [x] ~~**Seuil de surface des plans d'eau**~~ — sans objet : le critère est la
      définition « lac » du MELCCFP, pas un seuil choisi par nous.
- [ ] **Statut réglementaire** — le décompte est acquis, l'asymétrie de
      protection reste à étayer. Avant d'y renoncer, explorer la piste **eaux
      usées / coûts de traitement** ouverte par Gravel 2025 : l'asymétrie
      financière dit la même chose sur des sources plus accessibles.
- [ ] **Compléter la référence Gravel 2025** — nom du colloque, URL du
      programme, publication ultérieure éventuelle (`SOURCES.md` § 7 bis).
      **Bloquant pour la publication**, pas pour le travail.
- [ ] **Municipalités de l'overlay** — si l'intersection en fait apparaître
      d'autres que les cinq attendues, le noter plutôt que les écarter.
- [ ] **Seuil de surface** — une municipalité qui touche le bassin sur 0,3 km²
      compte-t-elle comme partie prenante ? Fixer le seuil **avant** de voir les
      résultats, et le dire.

## Contrôles qualité

- [ ] géométries valides (Vecteur ▸ Outils de géométrie ▸ Vérifier la validité) ;
- [ ] SCR déclaré = SCR réel (superposer à un fond connu) ;
- [ ] somme des parts municipales = aire totale du bassin (aux arrondis près) ;
- [ ] aire du bassin ≈ 169 km² ;
- [ ] toute ligne du CSV manuel joint bien une entité (`id_hydro` non vide) — le
      script échoue bruyamment sinon ;
- [ ] décompte des plans d'eau recoupé avec le mémoire de l'APEL ;
- [ ] ordres de grandeur plausibles (m² vs km² : ça se voit tout de suite).
