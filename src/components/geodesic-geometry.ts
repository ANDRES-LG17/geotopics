/**
 * La sphère géodésique de `Globe`, arrêtée sur image.
 *
 * Ce sont les 120 arêtes du globe qui tourne sur la page d'accueil, projetées
 * une fois pour toutes dans sa pose de repos — rotation nulle, aucune
 * inclinaison du curseur. Même icosaèdre subdivisé une fois, même focale, même
 * dégradé de profondeur en six paliers. Le globe animé n'a pas « une » pose,
 * il tourne en continu ; celle du repos est la seule qu'on puisse appeler
 * canonique.
 *
 * Aucun limbe ici, contrairement à une version antérieure de cette marque : le
 * globe n'en dessine pas, et ce cercle surajouté était ce qui trahissait le
 * plus l'écart entre le décor et le logo.
 *
 * L'épaisseur du trait ne fait pas partie de ces coordonnées. Elle est réglée
 * par qui affiche la marque, parce qu'elle seule doit changer avec la taille :
 * à 29 px dans l'en-tête, le trait du décor (0,16 % de la largeur) tombe sous
 * le seuil du visible. La géométrie, elle, ne bouge pas — seule l'encre varie.
 *
 * Nombres morts par construction : pour une autre pose, on régénère la pose
 * entière depuis la géométrie de `Globe`, on ne retouche pas les décimales.
 */

/**
 * Arêtes réparties en six paliers de profondeur, de l'arrière vers l'avant.
 * Les opacités sont celles de `Globe` : 0,1 + 0,5·(palier + 0,5) / 6.
 */
export const GEODESIC_EDGES = [
  {
    opacity: 0.142,
    d: "M32.00 44.68L23.88 53.27M40.12 53.27L32.00 44.68M32.00 44.68L19.82 39.53M19.82 39.53L9.79 32.00M19.82 39.53L19.82 24.47M19.82 24.47L9.79 32.00M32.00 44.68L32.00 32.00M32.00 32.00L19.82 39.53M32.00 19.32L19.82 24.47M19.82 24.47L32.00 32.00M32.00 32.00L32.00 19.32M44.18 39.53L32.00 44.68M54.21 32.00L44.18 39.53M32.00 19.32L40.12 10.73M23.88 10.73L32.00 19.32M32.00 19.32L44.18 24.47M44.18 24.47L54.21 32.00M44.18 24.47L44.18 39.53M32.00 32.00L44.18 24.47M44.18 39.53L32.00 32.00",
  },
  {
    opacity: 0.225,
    d: "M23.88 53.27L40.12 53.27M23.88 53.27L9.64 45.82M19.82 39.53L23.88 53.27M9.79 32.00L9.64 45.82M9.64 45.82L19.82 39.53M9.79 32.00L9.64 18.18M40.12 53.27L44.18 39.53M54.36 45.82L40.12 53.27M44.18 39.53L54.36 45.82M54.36 45.82L54.21 32.00M40.12 10.73L23.88 10.73M40.12 10.73L54.36 18.18M44.18 24.47L40.12 10.73M54.21 32.00L54.36 18.18M54.36 18.18L44.18 24.47M23.88 10.73L19.82 24.47M9.64 18.18L23.88 10.73M19.82 24.47L9.64 18.18",
  },
  {
    opacity: 0.308,
    d: "M32.00 62.15L23.88 53.27M23.88 53.27L16.15 57.65M47.85 57.65L40.12 53.27M40.12 53.27L32.00 62.15M9.64 45.82L16.15 57.65M9.79 32.00L1.85 32.00M1.85 32.00L9.64 45.82M9.64 18.18L1.85 32.00M9.64 18.18L16.15 6.35M47.85 57.65L54.36 45.82M32.00 1.85L40.12 10.73M40.12 10.73L47.85 6.35M16.15 6.35L23.88 10.73M23.88 10.73L32.00 1.85M54.36 18.18L47.85 6.35M54.21 32.00L62.15 32.00M62.15 32.00L54.36 18.18M54.36 45.82L62.15 32.00",
  },
  {
    opacity: 0.392,
    d: "M16.15 57.65L5.17 48.58M21.08 60.60L16.15 57.65M21.08 60.60L32.00 62.15M32.00 62.15L16.15 57.65M47.85 57.65L32.00 62.15M32.00 62.15L42.92 60.60M42.92 60.60L47.85 57.65M9.64 45.82L5.17 48.58M5.17 48.58L1.85 32.00M1.85 32.00L1.66 32.00M58.83 48.58L47.85 57.65M1.85 32.00L5.17 15.42M16.15 6.35L5.17 15.42M5.17 15.42L9.64 18.18M47.85 6.35L58.83 15.42M42.92 3.40L47.85 6.35M42.92 3.40L32.00 1.85M32.00 1.85L47.85 6.35M16.15 6.35L32.00 1.85M32.00 1.85L21.08 3.40M21.08 3.40L16.15 6.35M54.36 18.18L58.83 15.42M58.83 15.42L62.15 32.00M62.15 32.00L62.34 32.00M62.15 32.00L58.83 48.58M58.83 48.58L54.36 45.82",
  },
  {
    opacity: 0.475,
    d: "M5.17 48.58L21.08 60.60M12.22 44.23L5.17 48.58M5.17 48.58L1.66 32.00M21.08 60.60L12.22 44.23M42.92 60.60L21.08 60.60M42.92 60.60L58.83 48.58M51.78 44.23L42.92 60.60M62.34 32.00L58.83 48.58M58.83 48.58L51.78 44.23M5.17 15.42L1.66 32.00M58.83 15.42L42.92 3.40M51.78 19.77L58.83 15.42M58.83 15.42L62.34 32.00M42.92 3.40L51.78 19.77M21.08 3.40L42.92 3.40M21.08 3.40L5.17 15.42M12.22 19.77L21.08 3.40M5.17 15.42L12.22 19.77",
  },
  {
    opacity: 0.558,
    d: "M1.66 32.00L12.22 44.23M32.00 53.14L21.08 60.60M12.22 44.23L32.00 53.14M32.00 53.14L42.92 60.60M32.00 53.14L51.78 44.23M51.78 44.23L62.34 32.00M12.22 44.23L32.00 32.00M32.00 32.00L32.00 53.14M1.66 32.00L12.22 19.77M12.22 19.77L12.22 44.23M32.00 10.86L32.00 32.00M32.00 32.00L12.22 19.77M12.22 19.77L32.00 10.86M62.34 32.00L51.78 19.77M32.00 10.86L42.92 3.40M51.78 19.77L32.00 10.86M32.00 10.86L21.08 3.40M51.78 19.77L32.00 32.00M51.78 44.23L51.78 19.77M32.00 32.00L51.78 44.23",
  },
] as const;

/** Repère de dessin. Les coordonnées ci-dessus n'ont de sens que dedans. */
export const GEODESIC_VIEWBOX = "0 0 64 64";

/**
 * Épaisseur par défaut, en unités du `viewBox`.
 *
 * 0,8 : le trait fin est ce qui distingue une planète d'un ballon, et la
 * maille de 120 arêtes ne respire que si les segments restent des cheveux.
 * À 115 px dans le titre d'accueil cela fait 1,4 px à l'écran ; dans
 * l'en-tête, où le rendu tombe à 29 px, c'est l'opacité qui rattrape la
 * finesse — voir `Logo`.
 */
export const GEODESIC_STROKE = 0.8;
