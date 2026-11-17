# Journal — 15 minutes à pied, à vélo, en auto (Québec–Lévis)

Lab : `modes-quebec-levis` (`src/labs/modes-quebec-levis.ts`,
`src/components/ModesMap.tsx`). Bâti sur les bases du lab vélo
(`geodata/04-velo-quebec-levis/`), dont il reprend les données brutes, le MNT,
la grille et le moteur de portée.

## 2026-11-17 — Première version

### La question

Depuis un même point, combien de territoire atteint-on en 15 minutes à pied,
à vélo et en auto, l'été et l'hiver ? Trois taches superposées sous le
curseur ; sous la carte, une carte par mode : bandeau animé et trois barres
(5, 10, 15 min) de surface de terre atteinte.

### Décisions de l'auteur

- **Carte** : les trois taches de 15 min à la fois (pas un mode à la fois).
- **Panneaux** : une rangée sous la carte, sans défilement — rangée basse de
  trois cartes en écran large, carrousel horizontal au téléphone.
- **Auto** : limite affichée × facteur (pas le flux libre, pas l'heure de pointe).
- **Vidéos** : le cycliste du lab vélo pour le vélo ; à pied et en auto,
  prompts fournis (`40-livrables/PROMPTS-VIDEOS.md`), pictogramme en attendant.
- Le bloc « 4 / 4 fonctions à moins de 15 min » n'est pas repris.

### Les trois graphes, une grille

| Mode | Graphe | Arêtes | Poids |
| --- | --- | --- | --- |
| À vélo | `velo-quebec-levis-graphe-v4.json`, **tel quel** (scénario `tout`) | — | 2,0 Mo |
| À pied | `modes-quebec-levis-pied-v1.json` | 117 465 | 2,6 Mo |
| En auto | `modes-quebec-levis-auto-v1.json` | 56 703 | 2,1 Mo |

Script : `scripts/analysis/modes-quebec-levis-01-graphes.py`. Les graphes à
pied et en auto sont placés dans la **grille du vélo** (mêmes cellules de
100 m, même masque de terre) : les surfaces se comparent cellule pour
cellule. Les arêtes dont un bout sort de la grille sont retirées (1 785 à
pied, 1 137 en auto) : la tache s'arrête à Québec + Lévis + 500 m. C'est une
vraie limite pour l'auto, qui sortirait de l'agglomération par l'autoroute.

### À pied

- Voies : tout `highway` sauf autoroutes, `foot=no`, accès privé (sauf
  `foot=yes`), et les non-voies (construction, projetées…). Escaliers et
  trottoirs compris. Les deux sens toujours.
- Vitesse : fonction de Tobler (1993), `6 · exp(−3,5 · |s + 0,05|)` km/h —
  5,0 km/h à plat, maximum 6 km/h en légère descente. Pente échantillonnée
  tous les 10 m sur le MNT HRDEM 8 m du lab vélo, lissée sur 30 m, bornée à
  ±25 % ; tabliers de ponts interpolés entre leurs bouts.
- Hiver : × 12/13 ≈ 0,92, uniforme. NTNU (2021) : un trottoir d'hiver
  entretenu ajoute ≈ 1 min/km à plat, soit 12 → 13 min/km à 5 km/h. La
  glace vive en ajoute ≈ 2 : non retenu (le modèle vise un trottoir entretenu).

### En auto

- Voies : tout ce qui est carrossable, autoroutes comprises ; sans allées de
  stationnement, entrées privées, service au volant (comme le vélo), ni
  `access`/`motor_vehicle`/`motorcar` = no/private. Sens uniques et giratoires
  respectés ; autoroutes à sens unique par défaut.
- Vitesse affichée : `VITESSEMAX` de la Ville de Québec (appariement à 12 m,
  comme le lab vélo), sinon `maxspeed` OSM, sinon le défaut du lab vélo
  (+ autoroute 100, bretelle 60). Une voie rapide garde au moins le défaut
  de sa classe (un échangeur apparié à une rue de la Ville).
- **Facteur — HYPOTHÈSE à confirmer** : × 0,70 sur les rues (feux, arrêts,
  virages, circulation), × 0,85 sur autoroutes et voies rapides. Ordre de
  grandeur courant dans les études d'accessibilité qui corrigent la limite
  affichée (r5r, gradients de congestion) ; non calé sur des temps observés
  à Québec. À recouper (données de vitesse observées, Google/TomTom, ou
  enquête OD) avant l'article.
- Hiver (scénario `hiver` du graphe, temps remplacés arête par arête) :
  FHWA, Road Weather Management Program — chaussée enneigée ou fondante,
  −30 à −40 % sur les artères → **× 0,65** sur les rues ; neige légère,
  −3 à −13 % sur autoroute → **× 0,92**.
- Ni temps de stationnement ni marche jusqu'à l'auto : la tache est un
  maximum. Traversier exclu des trois modes.

À vérifier : quelques rues résidentielles portent 100 km/h ou 5 km/h
(appariement ou `maxspeed` douteux) — rapport du script, tableau par classe.

### Ce que montrent les barres

Surface de terre atteinte (km², eau retirée), à 5, 10 et 15 min. La barre
pleine est un disque de référence par mode : la distance en ligne droite à
5 (pied), 20 (vélo) ou 50 km/h (auto), **plus 200 m** — la bande que la tache
peint de part et d'autre de chaque rue atteinte (`RAYON` de `reach.ts`). Sans
ces 200 m, à pied, les barres de 5 et 10 min dépassaient toujours le disque.
L'hiver : la barre d'été en contour, l'écart en %.

### Couleurs (révisé le même jour, à la demande de l'auteur)

Première version : les rampes orange / bleu du lab vélo. Retirée : la carte
ressemblait trop à celle déjà publiée sur les réseaux sociaux.

Retenu : **une teinte par mode** — violet à pied, vert à vélo, ambre en
auto —, plus sourde l'hiver, et un **bord en tirets** par tache, d'un motif
propre au mode (points, tirets courts, tirets longs), tiré du canevas par
carrés marchants (`contours` dans `ModesMap.tsx`). Remplissage à 0,32 : les
trois taches se superposent sans virer au brun. L'hiver, le fond de carte
passe au gris bleuté (fond #dde3ea, eau #b4c2d0).

Validé au script de la skill dataviz (palette catégorielle, voisins) :

| | Pied | Vélo | Auto | Fond | Écart daltonien min. | Vision normale min. |
| --- | --- | --- | --- | --- | --- | --- |
| Été | #6d3fc0 | #1f9d6b | #e0a100 | #f2f3f0 | 10,8 | 22,7 |
| Hiver | #5a34a8 | #0a8259 | #b07f00 | #dde3ea | 8,1 | 18,3 |

L'ambre reste sous 3:1 sur le fond (2,0 l'été, 2,8 l'hiver) : le bord en
tirets plus foncé (#9c7000 / #7a5800) et le nom du mode sur chaque carte en
tiennent lieu. Premier essai d'hiver (#4b2c83, #13694a) refusé par le
script : violet trop sombre, vert trop gris.

### Vérifié

Navigateur (Chromium, 1440 × 860 et 390 × 844) : aucune erreur console, pas
de défilement de page ni de débordement horizontal. Départ avenue Bélanger,
l'été : 4,8 km² à pied, 39 km² à vélo, 154 km² en auto ; l'hiver −11 %,
−34 %, −40 %.

## 2026-11-17 — Bandeaux à pied et en auto

Images du cycliste éditées (Gemini), animées (Veo) par l'auteur : même décor,
même personnage, la série tient. Traitement :
`scripts/analysis/modes-quebec-levis-02-bandeaux.sh`.

- **Boucle** — PSNR contre la première image, dans la bande recadrée (voisins
  ≈ 18–22 dB). Auto : raccord naturel (été image 209 à 21,4 dB ; hiver 216 à
  18,5) → coupé là. À pied : rien au-dessus de 15,3 dB → fondu enchaîné de
  24 images. Raccords mesurés après coup : à pied 21,6 / 21,9 dB (voisins
  22,4 / 21,3), auto 17,7 / 16,9 dB (voisins 20,6 / 18,1).
- **Vitesse** — sol mesuré par corrélation de phase (trottoir, tiers gauche),
  px/image sur 1000 px de large : vélo 9,4 / 8,6 ; à pied 5,8 / 3,5 ;
  auto 11,6 / 12,7 (été / hiver). L'été est lu à 1 ; l'hiver est lu pour que
  le sol défile au facteur du modèle : à pied × 1,54 (→ 0,92), auto × 0,59
  (→ 0,65). Le vélo garde son 0,96. Si la marche d'hiver paraît pressée à
  × 1,54, c'est le réglage à revoir (`winterRate`).
- **Cadre** — colonne du téléphone en 3:2 (en 4:3, l'avant de l'auto était
  rogné).
