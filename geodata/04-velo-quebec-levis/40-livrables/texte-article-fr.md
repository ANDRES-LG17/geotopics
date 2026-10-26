---
title: "À vélo, le fleuve coupe encore Québec de Lévis"
description: "Quels tronçons manquent au réseau cyclable tranquille de Québec et de Lévis, et que pèse le pont de Québec dans le calcul ? En 15 minutes, 231 résidents atteignent aujourd'hui l'autre rive. Avec un tablier élargi, 10 747."
date: "2026-10-21"
category: "lab"
tools: ["Python", "NetworkX", "GeoPandas", "GDAL", "QGIS", "MapLibre GL JS", "OpenStreetMap"]
storyMapUrl: null
lab: "velo-quebec-levis"
cover: null
---

Québec et Lévis ont multiplié les aménagements cyclables. Mais un réseau ne vaut que par ses raccords : une piste qui s'arrête au bord d'un boulevard à 50 km/h renvoie le cycliste dans la circulation, ou chez lui.

La question de ce lab tient en une phrase : **quels tronçons manquants, une fois aménagés, ouvriraient le plus de territoire de l'agglomération Québec–Lévis à un trajet à vélo tranquille de 15 minutes ?**

Et puisque les deux villes sont traitées comme une seule, une seconde question suit : que vaut le seul lien cyclable fixe entre elles, le pont de Québec, dont le tablier doit être remplacé sans que la solution soit arrêtée ?

## Ce que « tranquille » veut dire

Le critère est la norme **« tous âges et capacités »** de la NACTO : un trajet qu'un enfant de 12 ans ou une personne âgée ferait sans stress. Concrètement :

| Voie | Tranquille ? |
| --- | --- |
| Piste en site propre, sentier polyvalent | oui |
| Rue à 40 km/h ou moins | oui |
| Bande cyclable peinte sur une rue à plus de 40 km/h | **non** |
| Chaussée désignée, accotement, artère | non |

Le seuil vise la vitesse **des voitures**, pas celle du vélo. Une bande peinte ne protège de rien : c'est l'écart de vitesse qui rend une rue praticable ou non.

## Deux rives, deux règlements de vitesse

Les vitesses viennent des sources officielles. La Ville de Québec publie la limite de chacune de ses rues : la rue résidentielle type y est à **30 km/h**. Lévis n'en publie aucune et n'a pas adopté d'abaissement ; c'est donc la limite du Code de la sécurité routière qui s'applique, **50 km/h**.

À norme égale, le résultat diverge :

| | Québec | Lévis |
| --- | --- | --- |
| Réseau tranquille, aujourd'hui | **81 %** des kilomètres | **42 %** |
| Si les rues locales de Lévis passaient à 40 km/h | — | **72 %** |

La différence entre les rives n'est pas d'abord une affaire de pistes. C'est un règlement. Le conseil de Lévis a annoncé en juillet 2026 qu'il revoyait la question : ce scénario, nommé D, en chiffre la portée.

## Les tronçons manquants

Le réseau tranquille ne forme pas un tout : il se découpe en **îlots**, des morceaux reliés entre eux sans passer par une rue exposée. Un tronçon manquant est le plus court lien exposé — de 30 à 300 m — entre deux îlots. En deçà de 30 m, c'est la traversée d'une rue, pas un chaînon absent.

Chaque candidat est évalué seul : s'il était aménagé, combien de résidents pourraient-ils rejoindre de nouveaux voisins en 15 minutes, par un trajet entièrement tranquille ? Le classement compte des **paires de résidents** — qui part, qui est rejoint — pour qu'un lien vers un recoin inhabité ne pèse rien.

| Rang | Tronçon | Longueur | Résidents qui y gagnent | Voisins gagnés, en moyenne |
| --- | --- | --- | --- | --- |
| 1 | avenue De Gaulle | 81 m | 38 541 | 1 694 |
| 2 | boulevard Sainte-Anne | 122 m | 36 136 | 1 385 |
| 3 | 41e Rue Ouest | 74 m | 69 278 | 667 |

Aujourd'hui, **aucun tronçon de Lévis n'entre dans les quinze premiers**. Ses îlots tranquilles sont trop petits pour qu'un lien court rapporte gros : le problème de la rive sud est la vitesse de ses rues, pas un maillon. Dans le scénario D, l'**avenue Taniata** (62 m) et le **boulevard Guillaume-Couture** (92 m) y entrent : ils raccordent alors des quartiers entiers au grand îlot.

## Le pont de Québec

Le trottoir du pont mesure **1,3 m**. Les cyclistes doivent normalement descendre de vélo, rapporte *Le Journal de Québec* (12 août 2026) : les 987 m se franchissent à pied, en près de **12 minutes**. Le ministère des Transports prévoit le remplacement du tablier, trottoir compris, sans avoir arrêté la solution. Un élargissement à 2,5 m figure parmi les options ; une reconstruction à l'identique aussi.

Trois états du pont, croisés avec la vitesse des rues de Lévis. Le chiffre est le nombre de résidents des deux villes qui atteignent l'autre rive par un trajet tranquille :

| Pont | En 15 min | En 30 min | En 30 min, Lévis à 40 km/h |
| --- | --- | --- | --- |
| **Actuel** — 1,3 m, à pied | 231 | 26 546 | 32 959 |
| **Chantier** — fermé, traversier seul | 0 | 990 | 990 |
| **Élargi** — 2,5 m, à vélo | 10 747 | 66 296 | 74 459 |

Trois constats :

- **en 15 minutes, la traversée tranquille n'existe pas aujourd'hui.** Les douze minutes à pied sur le pont mangent le budget. Élargi, le tablier la rend possible pour 10 747 personnes ;
- **un chantier sans passage maintenu couperait 96 % des résidents** de l'autre rive en 30 minutes ; il ne resterait que les abords des quais du traversier ;
- **les deux leviers se renforcent.** Le tablier élargi fait passer les résidents reliés en 30 minutes de 26 546 à 66 296 (×2,5) ; avec Lévis à 40 km/h en plus, à 74 459 (×2,8). Comptés en trajets possibles plutôt qu'en résidents, l'effet est plus net encore : ×4,3 pour le tablier, ×2,2 pour Lévis à 40, près de ×10 pour les deux. Un pont rapporte davantage quand il débouche sur des rues où l'on peut continuer.

## Ce que le modèle suppose

Toute carte d'accessibilité repose sur des hypothèses. Les voici, avec ce qu'elles coûtent si elles sont fausses.

- **La pente compte.** Contrairement à l'outil qui a inspiré ce lab, le relief est intégré : vitesse de 20 km/h à plat, réduite de 1,44 km/h par % de montée et augmentée de 0,86 km/h par % de descente (Parkin et Rotheram, 2010), sur le MNT lidar HRDEM de Ressources naturelles Canada. Ces coefficients viennent de cyclistes expérimentés de Leeds : un débutant monte plus lentement.
- **Les traversées d'artères ne coûtent rien.** Le graphe ne pénalise pas le fait de croiser un boulevard à un carrefour. Le réseau réel est donc moins continu que le modèle.
- **La population est estimée.** Celle des aires de diffusion du recensement 2021 est répartie sur les rues résidentielles. Les totaux sont exacts, la répartition fine ne l'est pas.
- **Le traversier est une hypothèse** : 12 minutes de traversée et 15 minutes d'attente moyenne. À confirmer avec l'horaire de la Société des traversiers du Québec.
- **Chaque tronçon est évalué seul.** Aménager les deux premiers ne rapporte pas la somme de leurs gains.
- **OpenStreetMap n'est pas parfait.** Il couvre 77 à 95 % du réseau cyclable de la Ville de Québec selon le type d'aménagement, mais 65 % seulement des bandes de Lévis, et moins de la moitié de ses chaussées désignées et accotements. Les quinze premiers tronçons demandent une vérification sur le terrain.

## Sources et méthode

Réseau : OpenStreetMap (ODbL). Vitesses et réseaux cyclables : Ville de Québec et Ville de Lévis, via Données Québec. Relief : HRDEM et MRDEM-30, Ressources naturelles Canada. Population : Recensement 2021, géographie harmonisée de l'Institut de la statistique du Québec. Limites municipales : MRNF.

La démarche s'inspire d'[*À portée de vélo*](https://github.com/sit-pmo/portee-velo), du SIT du Pôle Marennes-Oléron, adaptée à une agglomération en relief et à deux rives.

Les chiffres sont calculés une fois, en Python, par les scripts `scripts/analysis/velo-quebec-levis-*.py`. La tache sous le curseur, elle, se calcule à la visite : le navigateur reçoit le graphe tranquille, temps et pentes compris, et refait le parcours en quelques millisecondes à chaque mouvement. Le GeoJSON se télécharge sous la carte.
