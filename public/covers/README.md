# Visuels de couverture du carrousel

Déposez ici les images, GIF et vidéos utilisés en fond des diapositives, puis
référencez-les depuis l'en-tête d'une entrée :

```yaml
cover: "/covers/mon-projet.jpg"
```

Sans `cover`, la diapositive retombe sur le dégradé de sa famille de travaux —
c'est un fond acceptable, pas un manque à combler d'urgence.

## Formats

| Extension                  | Rendu                          |
| -------------------------- | ------------------------------ |
| `.jpg` `.png` `.webp` `.avif` | image fixe                  |
| `.gif`                     | animé, en boucle, tout seul    |
| `.mp4` `.webm`             | vidéo muette, en boucle        |

Le type est déduit de l'extension : rien d'autre à déclarer.

## Ce qui fait un bon visuel ici

**Cadrage.** La diapositive est très large et courte (environ 21:9 sur grand
écran). Une image verticale sera recadrée par le milieu — prévoyez un sujet qui
survit à la coupe.

**Le texte occupe la gauche.** Titre, description et bouton s'y posent, sur un
voile sombre. Gardez ce côté calme et placez le sujet à droite.

**Taille.** 1600 px de large suffisent. Au-delà, on paie du téléchargement que
personne ne voit.

**Vidéo : la sobriété est une contrainte technique.** Elle se lance seule, en
boucle et sans son, derrière du texte à lire. Un plan lent et peu contrasté
tient ; un montage nerveux rend le titre illisible et détourne l'attention de
ce qu'on est venu lire. Visez quelques secondes et quelques mégaoctets — le
fichier est chargé par tout le monde, y compris sur données mobiles.

**GIF : attention au poids.** Le format compresse très mal. Au-delà de deux ou
trois secondes, un `.mp4` muet pèse dix fois moins pour un meilleur rendu.

## Accessibilité

Ces visuels sont décoratifs : ils portent `aria-hidden` et un texte alternatif
vide. Aucune information ne doit donc n'exister que dans l'image — ce qui
compte doit se trouver dans le titre ou la description de l'entrée.

Le réglage « animations réduites » du système coupe le zoom lent, mais **pas**
la lecture d'une vidéo ou d'un GIF : le navigateur ne nous laisse pas figer un
GIF, et une vidéo décorative reste sous le contrôle du bouton de pause du
carrousel. Si l'entrée doit rester sage pour tout le monde, préférez une image
fixe.
