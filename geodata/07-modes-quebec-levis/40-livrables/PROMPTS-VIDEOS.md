# Bandeaux animés — à pied et en auto

Les deux bandeaux qui manquent au lab « trois modes ». Ils forment une SÉRIE
avec le cycliste du lab vélo : même décor, même lumière, même personnage. Le
même jeune homme marche, pédale, conduit — seul le mode change.

## La méthode : ÉDITER l'image du cycliste, ne pas repartir de zéro

Générer une image neuve « dans le même style » donne toujours un autre ciel,
d'autres arbres, une autre ville. On part donc des images d'origine du
cycliste et on ne remplace que le sujet :

| Saison | Image à joindre dans Gemini (Nano Banana) |
| --- | --- |
| Été | `geodata/04-velo-quebec-levis/00-brut/ia/bandeau-velo-ete-image.png` |
| Hiver | `geodata/04-velo-quebec-levis/00-brut/ia/bandeau-velo-hiver-image.png` |

Quatre éditions (pied été, pied hiver, auto été, auto hiver), toutes faites
depuis l'image du cycliste de LA MÊME SAISON — pas l'hiver depuis l'été :
le décor d'hiver du cycliste est ainsi repris à l'identique.

Puis chaque image animée dans Veo (1280 × 720, 24 i/s, 10 s, comme le
cycliste). Je fais ensuite la boucle, le recadrage 5:2 et la compression.

**Cadrage à respecter** — l'image finale est recadrée en 5:2 (bande centrale
1280 × 512, de y = 120 à y = 632), puis rognée sur les côtés dans la carte
(≈ 4:3 au téléphone) : **le sujet entier au centre, dans le tiers du milieu,
la tête sous y ≈ 150 et les pieds / les roues au-dessus de y ≈ 600**, comme
le cycliste.

### Ce qui fait le style (à ne pas perdre)

Illustration éditoriale plate, aplats doux sans contour noir, ombres simples.
- Été : ciel pêche-abricot en dégradé ; silhouette de la vieille ville
  (toits du Château Frontenac, une flèche d'église, des coupoles) en terre
  cuite monochrome ; arbres ronds vert olive ; réverbères noirs à lanterne ;
  bande d'herbe ; trottoir gris clair à joints ; chaussée asphalte foncé à
  ligne blanche.
- Hiver : ciel bleu-gris pâle ; même silhouette, bleu-gris, toits enneigés ;
  arbres nus foncés chargés de neige ; réverbères coiffés de neige ; bancs
  de neige ; flocons blancs ronds ; chaussée foncée mouillée, traces de
  gadoue.
- Le personnage : jeune homme, cheveux roux-châtain, profil vers la droite.
  Été : veste orange-rouille aux manches retroussées, jean bleu marine,
  chaussures foncées. Hiver : doudoune bleue, tuque orange, foulard gris,
  pantalon marine, bottes foncées.

---

## À pied — été (édition de `bandeau-velo-ete-image.png`)

> Edit this image. Keep EVERYTHING identical — the peach sky, the Québec City
> skyline silhouette, the trees, the street lamps, the grass, the sidewalk,
> the road, the colors and the flat vector style. Only replace the cyclist
> and the bicycle: the same young man (same red-brown hair, same rust-orange
> jacket with rolled sleeves, same navy jeans, dark shoes, no helmet) is now
> WALKING on the light grey sidewalk, in profile, facing right, mid-stride,
> arms swinging naturally, a small dark backpack. He stands exactly where
> the cyclist was horizontally, centered in the frame, his whole body
> visible, his feet on the sidewalk. Nothing on the road. No text.

## À pied — hiver (édition de `bandeau-velo-hiver-image.png`)

> Edit this image. Keep EVERYTHING identical — the pale blue-grey sky, the
> snowy skyline, the bare snowy trees, the snow-capped lamps, the
> snowbanks, the falling snow, the wet road, the colors and the flat vector
> style. Only replace the cyclist and the bicycle: the same young man (same
> blue puffer jacket, orange knit beanie, grey scarf, navy trousers) is now
> WALKING on the snowy sidewalk, in profile, facing right, mid-stride, in
> dark winter boots, a small dark backpack. He stands exactly where the
> cyclist was horizontally, centered in the frame, his whole body visible,
> his boots on the sidewalk. Nothing on the road. No text.

## À pied — animation (Veo, une fois par saison)

> Animate this flat illustration as a 10-second side-scrolling loop, like a
> video game. The man stays fixed in the center of the frame and walks in
> place at a calm natural pace: alternating legs, natural arm swing, a very
> slight up-and-down bob. His feet must stay planted on the sidewalk at each
> step, with no sliding. The sidewalk, grass, trees and street lamps scroll
> slowly from right to left at the speed of his steps; the city skyline in
> the background scrolls much slower (parallax); the sky does not move.
> [Winter: snowflakes fall gently and drift.] Fixed camera, no zoom, no
> pan, no cut, no other people, no text. Keep the exact flat vector style
> and colors of the image.

---

## En auto — été (édition de `bandeau-velo-ete-image.png`)

> Edit this image. Keep EVERYTHING identical — the peach sky, the Québec City
> skyline silhouette, the trees, the street lamps, the grass, the sidewalk,
> the road, the colors and the flat vector style. Only replace the cyclist
> and the bicycle: a small compact hatchback car seen exactly in side
> profile, driving to the right on the dark road, in a muted dark teal (the
> color of the bicycle frame) with simple solid mustard-ochre hubcaps (the
> color of the bike tires) and no spokes. Through the side window we see the
> same young man driving (same red-brown hair, rust-orange jacket). The car
> is centered in the frame horizontally, where the cyclist was, its wheels on
> the road, the whole car visible with space on both sides. No brand, no
> logo, no license plate text. No text.

## En auto — hiver (édition de `bandeau-velo-hiver-image.png`)

> Edit this image. Keep EVERYTHING identical — the pale blue-grey sky, the
> snowy skyline, the bare snowy trees, the snow-capped lamps, the
> snowbanks, the falling snow, the wet slushy road, the colors and the flat
> vector style. Only replace the cyclist and the bicycle: the same small
> compact hatchback car in muted dark teal with solid mustard-ochre hubcaps
> and no spokes, seen exactly in side profile, driving to the right on the
> slushy road, a layer of snow on its roof, headlights on with a soft warm
> glow. Through the side window we see the same young man driving (orange
> beanie, blue puffer jacket). The car is centered in the frame
> horizontally, where the cyclist was, its wheels on the road, the whole car
> visible with space on both sides. No brand, no logo, no license plate
> text. No text.

## En auto — animation (Veo, une fois par saison)

> Animate this flat illustration as a 10-second side-scrolling loop, like a
> video game. The car stays fixed in the center of the frame and drives
> steadily: the wheels rotate, the body bounces very slightly, the driver
> barely moves. The road markings, sidewalk, grass, trees and street lamps
> scroll from right to left, clearly faster than a bicycle; the city skyline
> in the background scrolls much slower (parallax); the sky does not move.
> [Winter: snowflakes fall and streak slightly backwards, a light spray of
> slush behind the wheels.] Fixed camera, no zoom, no pan, no cut, no other
> vehicles, no people, no text. Keep the exact flat vector style and colors
> of the image.

---

## Contrôles avant de me les envoyer

- Le décor est-il bien CELUI du cycliste (même ville, mêmes arbres) ? Sinon,
  refaire l'édition en insistant « keep everything identical ».
- Le sujet reste-t-il au centre pendant les 10 s, sans dériver ?
- À pied : les pieds ne glissent pas sur le trottoir.
- En auto : roues pleines (pas de rayons : ils scintillent à 24 i/s).
- Pas de texte, pas de marque, pas de plaque lisible.

## Une fois les vidéos générées

Déposer les 4 images et les 4 vidéos dans
`geodata/07-modes-quebec-levis/00-brut/ia/` sous les noms
`bandeau-{pied,auto}-{ete,hiver}-image.png` et
`bandeau-{pied,auto}-{ete,hiver}.mp4`. Je m'occupe ensuite de :
la boucle sans couture, le recadrage 5:2, la compression (WebM + MP4 +
affiche WebP), le réglage de la vitesse de lecture pour que le sol défile
dans le bon rapport entre les trois modes (et 0,92 / 0,65 l'hiver, comme
le modèle), et l'ajout de `media` aux modes `pied` et `auto` dans
`src/labs/modes-quebec-levis.ts`.
