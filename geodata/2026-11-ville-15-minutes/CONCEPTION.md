# La ville à pied — ce que la marche a perdu à Québec

Lab interactif pour GeoTopics — troisième projet de l'atelier.

État : **idée cadrée, données à vérifier**. Ce document s'écrit *avant* de
toucher aux données et au code.

> Document de conception. Ce qui change en cours de route se note dans
> `JOURNAL.md` ; la provenance des données, dans `SOURCES.md`.

**Pourquoi séparé du tramway** — voir § 2. Les deux projets se ressemblent de
loin et jouent à des échelles opposées. Les garder distincts donne deux thèses
qui se défendent seules.

---

## 1. La question de départ

> **La marche a reculé d'un quart en dix-sept ans dans une région qui dit se
> densifier. Où exactement, et qu'est-ce qui a changé à ces endroits-là ?**

Le chiffre est mesuré, pas supposé. EOD 2023 (MTMD, 36 893 ménages) :

| | 2006 | 2023 | |
| --- | --- | --- | --- |
| Déplacements à pied, 24 h | 242 700 | **182 700** | **−24,7 %** |

Et la baisse n'est pas uniforme — c'est ce qui en fait une carte :

| Région | Variation 2017 → 2023 |
| --- | --- |
| Agglomération de Québec | −5,4 % |
| Ville de Lévis | −13,5 % |
| **Couronne nord** | **−38,4 %** |
| Couronne sud | −9,1 % |

La couronne nord a perdu près de quatre marcheurs sur dix **en six ans**.

## 2. Pourquoi ce n'est PAS le projet tramway

Les deux sujets touchent la mobilité, et c'est là que s'arrête la ressemblance.
**Ils jouent à des échelles opposées** :

- le tramway est un mode de **longue distance** — 19 km d'un bout à l'autre ;
- la ville à pied, c'est **ne pas avoir à se déplacer**.

Un quartier parfaitement marchable n'a pas besoin de tramway. Les données de
l'EOD 2023 le disent nettement — répartition modale selon la distance :

| Distance | Déplacements | Part à pied |
| --- | --- | --- |
| Moins de 1 km | 215 000 | **44 %** |
| 1 à 5 km | 442 300 | 12 % |
| 5 à 10 km | 260 000 | 6 % |
| 10 à 20 km | 173 800 | 2 % |

Sous le kilomètre, on marche. Au-delà de cinq, presque plus. Les deux projets
ne parlent pas de la même ville.

**Le point de contact, s'il fallait en garder un** : une station de tramway ne
sert qu'à condition qu'on puisse l'atteindre et vivre autour à pied. Cette
question-là appartient au projet tramway (son indicateur 3), pas ici.

## 3. La thèse (à vérifier par la mesure)

> On a construit là où on ne marche pas. La croissance démographique de la
> région s'est faite **en périphérie** — l'EOD le dit explicitement : « une
> croissance démographique continue depuis 2006, plus marquée en périphérie
> qu'au centre ». Or la périphérie est faite de tissus où la marche utilitaire
> n'est pas possible : distances, absence de destinations, réseau piéton
> discontinu.
>
> La baisse de la marche ne serait donc pas un changement d'habitude. Ce serait
> un **déplacement de population vers des endroits où marcher n'est pas une
> option**.

**Si la mesure contredit cette phrase, c'est le sujet de l'article.**

Contre-hypothèses à tester honnêtement — le télétravail (28,5 % en novembre
2023) supprime des déplacements courts vers le travail ; le commerce en ligne
supprime des courses à pied ; le vieillissement joue aussi. **La carte ne
pourra pas trancher seule** : à dire dans la note de méthode.

**Ce que la carte ne prétend pas dire** — ni que la périphérie est mal faite, ni
ce qu'il faudrait construire. Elle montre où la marche a reculé et à quoi
ressemblent ces endroits.

## 4. Ce que la carte va montrer

### Indicateur 1 — où la marche a reculé *(le cœur)*

- **Ce qu'on voit** : la variation des déplacements à pied par secteur, 2006 →
  2023 ;
- **Géométrie** : les secteurs de l'EOD, en aplat ou en extrusion ;
- **Donnée** : EOD 2023 et éditions antérieures, par secteur ;
- **Le point à vérifier** : est-ce que le découpage par secteur est **public et
  géoréférencé** ? Les faits saillants ne donnent que quatre grandes régions —
  c'est trop grossier pour une carte. **C'est le point bloquant du projet.**

### Indicateur 2 — à quoi ressemblent ces endroits

- **Ce qu'on voit** : la forme bâtie là où la marche a reculé — densité,
  mixité, présence de destinations à moins d'un kilomètre ;
- **Donnée** : rôle d'évaluation foncière (usage, nombre d'étages), OSM
  (commerces, écoles, services) ;
- **Pourquoi** : c'est ce qui transforme un pourcentage en explication.

### Indicateur 3 — ce qu'il y a à moins d'un kilomètre

- **Ce qu'on voit** : pour un lieu donné, ce qu'on atteint à pied en dix
  minutes **sur le réseau réel**, pas à vol d'oiseau ;
- **Donnée** : réseau piéton OSM + destinations ;
- **Attention** : `tramquebec.00h11.ca` fait déjà ce calcul autour des stations
  de tramway. Méthode à citer, terrain différent.

### Ce qui n'est pas un indicateur

Les recommandations d'aménagement. La carte mesure, l'article commente.

## 5. Données pressenties

Fiches complètes dans `SOURCES.md`, **au téléchargement**.

| Donnée | Source | Existe ? | Notes |
| --- | --- | --- | --- |
| **Déplacements à pied par secteur** | EOD 2023 — MTMD / CMQuébec | **à vérifier** | Les faits saillants (PDF) ne donnent que 4 régions. Les fichiers détaillés existent-ils en ouvert ? **Point bloquant** |
| Découpage des secteurs EOD | MTMD — annexe 3 « Grands secteurs » | probablement | Vérifier s'il est diffusé en vectoriel |
| Bâti, usages, étages | Rôle d'évaluation foncière géoréférencé — Données Québec | **oui** | Déjà repéré pour le projet tramway |
| Commerces, écoles, services | OpenStreetMap | oui | Complétude variable en périphérie — limite à dire |
| Réseau piéton | OpenStreetMap | oui | Trottoirs souvent absents des données en banlieue — **limite majeure** |
| Population par secteur | Recensement 2021 — StatCan | oui | Pour rapporter la marche à la population |

### Le point bloquant, à vérifier EN PREMIER

> **Est-ce que les résultats de l'EOD 2023 sont diffusés à une échelle
> géographique plus fine que les quatre grandes régions ?**

Sans cela, il n'y a pas de carte — seulement quatre chiffres, qui font un
tableau et pas un lab. Trois pistes :

1. le portail de données de la **CMQuébec**, qui cite des outils interactifs ;
2. les fichiers détaillés du **MTMD** (les EOD 2011 et 2017 sont diffusées) ;
3. à défaut, **demander** : une EOD est financée par des fonds publics.

**À trancher avant toute autre chose.** Si la réponse est non, le projet change
de forme : il faudrait alors partir du bâti et du recensement pour mesurer la
*marchabilité* plutôt que la marche observée — une carte de potentiel, pas de
comportement. Moins fort, mais faisable.

## 6. Ce que ce projet doit prouver

Lac Saint-Charles : overlay, parts, projection conique, infobulle riche.
Tramway : lidar, 3D, volume de données.

Celui-ci ajouterait :

1. **l'analyse de réseau** — isochrones piétonnes sur graphe réel, qui est un
   savoir-faire distinct du calcul de surfaces ;
2. **la série temporelle** — quatre éditions d'enquête, 2006 à 2023 ;
3. **le croisement enquête × territoire** — rapporter un comportement déclaré à
   une forme bâtie mesurée.

## 7. La chaîne

```
geodata/2026-11-ville-15-minutes/         ← ce dossier
scripts/analysis/ville-15-minutes.py      ← la méthode, versionnée
public/data/ville-15-minutes-v1.geojson   ← < 500 Ko de préférence
src/labs/ville-15-minutes.ts              ← + une ligne dans src/labs/index.ts
content/entries/ville-15-minutes.fr.md    ← l'entrée
content/entries/ville-15-minutes.en.md    ← la même, en anglais
```

Le nom est provisoire : « ville-15-minutes » est un concept très utilisé, et le
projet gagnerait un titre qui lui appartienne — à revoir quand la thèse sera
mesurée.

## 8. Prochaines étapes

- [ ] **trancher le point bloquant** (§ 5) : l'EOD est-elle diffusée par
      secteur ? Tout dépend de cette réponse
- [ ] lire le rapport complet de l'EOD 2023, pas seulement les faits saillants
- [ ] vérifier ce que `tramquebec.00h11.ca` a déjà fait sur les aires de marche
- [ ] tester la complétude des trottoirs OSM sur un secteur de couronne nord
- [ ] si le point bloquant tombe : reformuler en carte de *potentiel* (§ 5)
- [ ] télécharger, remplir `SOURCES.md`, travailler
- [ ] publier avec `labOnly: true`, un secteur d'abord

---

## Annexe — les chiffres vérifiés de l'EOD 2023

Source : *La mobilité des personnes dans la région de Québec-Lévis — Faits
saillants*, MTMD, mai 2025. ISBN 978-2-921925-68-6. Enquête du 4 septembre au
16 décembre 2023, 36 893 ménages, 41 villes et municipalités.

**Répartition modale, 24 h, 2023**

| Mode | Part | Déplacements |
| --- | --- | --- |
| Auto-conducteur | 64,7 % | 1 300 500 |
| Auto-passager | 13,6 % | 272 300 |
| Marche | 9,1 % | 182 600 |
| Transport en commun | 6,9 % | 137 900 |
| Autres | 4,6 % | 92 400 |
| Vélo | 1,9 % | 38 000 |

L'automobile totalise **78,3 %** sur 24 h et 71,5 % en pointe du matin.
*(Les parts se calculent sur les déplacements-modes : leur somme dépasse
100 %.)*

**Part modale du transport en commun, pointe du matin**

| | 2006 | 2011 | 2017 | 2023 |
| --- | --- | --- | --- | --- |
| Total | 10,7 % | 11,5 % | 10,9 % | 11,2 % |
| Agglomération de Québec | 13,7 % | 15,1 % | 14,1 % | 14,5 % |
| Ville de Lévis | 6,4 % | 6,2 % | 7,5 % | 8,6 % |
| Couronne nord | 1,3 % | 2,3 % | 2,2 % | 1,9 % |

**Télétravail, RMR de Québec**

| | |
| --- | --- |
| Jusqu'en 2016 | ~5,6 % |
| 2021 (recensement) | 25,8 % |
| Novembre 2023 | **28,5 %** (Québec : 25,1 %) |
| Août 2024 | 28,6 % — stabilisation |
| Mode hybride, janvier 2022 | 3,0 % |
| Mode hybride, août 2024 | **18,2 %** |

Les hybrides se déplacent moins **les lundis et les vendredis** ; la présence au
lieu de travail domine du mardi au jeudi.

**Motorisation des ménages (véhicules par ménage)**

| | 2006 | 2011 | 2017 | 2023 |
| --- | --- | --- | --- | --- |
| Total | 1,31 | 1,38 | 1,44 | **1,37** |
| Agglomération de Québec | 1,19 | 1,25 | 1,31 | 1,25 |
| Couronne sud | 1,83 | 1,88 | 1,92 | 1,84 |

**Première baisse depuis 2006** (−4,6 % entre 2017 et 2023), après une hausse
continue.

**Autres constats utiles**

- 2 009 700 déplacements par jour en 2023, **−6,8 %** vs 2017 ;
- déplacements par personne mobile : 3,3 (2017) → **3,0** (2023), plus bas
  niveau depuis 2006 ;
- part des personnes ne se déplaçant pas un jour type : ~15 % (2006, 2011) →
  16,5 % (2017) → **24,0 %** (2023) ;
- la période de jour entre les deux pointes gagne : 26,4 % → **28,0 %** ;
- essence : **+67 %** en dollars courants entre 2006 et 2023 ;
- permis de conduire chez les 15-24 ans : **−2,2 points** ;
- l'agglomération de Québec concentre **87 %** des déplacements à pied.
