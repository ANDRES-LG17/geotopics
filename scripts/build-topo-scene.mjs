/**
 * Fond de l'ouverture : prépare l'image de la scène pour le web.
 *
 *   npm run topo
 *
 *   assets/scene-source.png   →   public/topo/scene-v2.avif
 *                                 public/topo/scene-v2.webp
 *
 * Le dessin — un tissu urbain isométrique qui se dissout dans le relief — est
 * fourni par un graphiste. Ce script ne dessine rien : il traduit ce fichier en
 * une couche prête à poser derrière le texte.
 *
 * La source vit dans `assets/` et non dans `public/` : tout ce qui est dans
 * `public/` est servi, et un PNG de 1,6 Mo accessible publiquement ne rend
 * service à personne.
 *
 * Trois transformations, et leurs raisons :
 *
 *   1. Le blanc devient transparent, l'encre prend la couleur du site.
 *      La luminance sert d'alpha : un trait noir devient opaque, le papier
 *      disparaît. Sans cela on poserait un rectangle blanc sur une page
 *      blanche — invisible tant que rien ne passe derrière, cassant dès que
 *      quelque chose y passe.
 *
 *   2. Le fondu vers le bas est cuit dans l'alpha, comme il l'était dans le
 *      SVG précédent. Un masque CSS créerait une couche de composition que le
 *      navigateur re-mélange à chaque image de la sphère animée qui passe
 *      par-dessus.
 *
 *   3. Compression volontairement agressive. L'image s'affiche à 6 %
 *      d'opacité : à cette transparence, les artefacts d'un encodage avec
 *      pertes sont littéralement invisibles, alors qu'ils sauteraient aux yeux
 *      à pleine densité. Mesuré : AVIF q30 pèse 55 Ko, contre 92 Ko à q50 pour
 *      un résultat que l'œil ne distingue pas ici.
 *
 * AVIF **et** WebP : le CSS sert le premier au navigateur qui le comprend.
 * Ici l'écart n'est pas anecdotique — 55 Ko contre 119 Ko — donc les deux
 * fichiers valent leur place dans le dépôt.
 */

import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.join(process.cwd(), "assets", "scene-source.png");
const OUT_DIR = path.join(process.cwd(), "public", "topo");
const BASENAME = "scene-v2";

/** Encre du site. Le dessin source est en gris neutre ; on le reteint. */
const INK = [0x0e, 0x1a, 0x15];

/**
 * Largeur de sortie. La source fait 1376 px : agrandir n'ajoute aucune
 * information et alourdit le fichier. À 6 % d'opacité, la douceur d'un
 * agrandissement par le navigateur ne se voit pas.
 */
const WIDTH = Number(process.env.WIDTH) || 1376;

/** Qualité AVIF. Voir la note 3 ci-dessus avant de la monter. */
const AVIF_Q = Number(process.env.AVIF_Q) || 30;
const WEBP_Q = Number(process.env.WEBP_Q) || 45;

/* L'OPACITÉ FINALE N'EST PAS CUITE ICI — elle est appliquée en CSS.
   ------------------------------------------------------------------
   Première tentative : multiplier l'alpha par 0,064 dans le fichier. Résultat
   mesuré : l'alpha ne disposait plus que de 16 niveaux sur 255, et l'encodage
   avec pertes en a détruit la moitié — AVIF ressortait avec un alpha maximal
   de 7 au lieu de 16, étalé sur 72 % des pixels au lieu de 17 %.

   L'alpha reste donc en pleine dynamique dans le fichier, et
   `.topo-pattern { opacity }` fait la réduction au moment de l'affichage.
   La couche de composition que cela crée est calculée une fois et gardée en
   cache : l'élément ne s'anime jamais. */

/** Profil du fondu : opaque en haut, éteint en bas, coude à 55 %. */
function fadeAt(v) {
  return v < 0.55 ? 1 - 0.45 * (v / 0.55) : 0.55 * (1 - (v - 0.55) / 0.45);
}

const meta = await sharp(SOURCE).metadata();
const height = Math.round((WIDTH * meta.height) / meta.width);

const { data } = await sharp(SOURCE)
  .resize(WIDTH, height, { fit: "fill", kernel: "lanczos3" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(WIDTH * height * 4);
let inked = 0;

for (let y = 0; y < height; y++) {
  const fade = Math.max(0, fadeAt(y / (height - 1)));

  for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x;
    const s = i * 3;
    const luminance =
      (0.2126 * data[s] + 0.7152 * data[s + 1] + 0.0722 * data[s + 2]) / 255;

    const alpha = Math.max(0, Math.min(1, 1 - luminance)) * fade;
    if (alpha > 0.02) inked++;

    rgba[i * 4] = INK[0];
    rgba[i * 4 + 1] = INK[1];
    rgba[i * 4 + 2] = INK[2];
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }
}

const layer = () =>
  sharp(rgba, { raw: { width: WIDTH, height, channels: 4 } });

mkdirSync(OUT_DIR, { recursive: true });

const avifPath = path.join(OUT_DIR, `${BASENAME}.avif`);
const webpPath = path.join(OUT_DIR, `${BASENAME}.webp`);

writeFileSync(
  avifPath,
  await layer().avif({ quality: AVIF_Q, effort: 9 }).toBuffer(),
);
writeFileSync(
  webpPath,
  await layer()
    .webp({ quality: WEBP_Q, alphaQuality: 70, effort: 6 })
    .toBuffer(),
);

const kb = (p) => (statSync(p).size / 1024).toFixed(1);
console.log(
  `✓ ${WIDTH} × ${height}, ${((100 * inked) / (WIDTH * height)).toFixed(1)} % de pixels encrés\n` +
    `  public/topo/${BASENAME}.avif  ${kb(avifPath)} Ko   (servi en priorité)\n` +
    `  public/topo/${BASENAME}.webp  ${kb(webpPath)} Ko   (repli)
` +
    `  opacité finale appliquée en CSS : voir .topo-pattern`,
);
