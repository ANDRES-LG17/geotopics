/**
 * Fond de l'ouverture : de vraies courbes de niveau.
 *
 *   node scripts/build-topo-contours.mjs
 *
 * Ce que remplace ce script : le motif précédent était cinq ondes parallèles
 * dans une tuile de 120 px, répétée une soixantaine de fois. Joli, mais faux —
 * des courbes de niveau ne sont ni parallèles ni périodiques. Elles se
 * resserrent là où la pente est forte, s'écartent sur les plats, et se ferment
 * autour des sommets et des cuvettes. Sur le carnet d'un géomaticien, la
 * différence se voit.
 *
 * La chaîne, en trois temps — la même que pour les labs :
 *
 *   1. définir une surface — ici une multifractale à crêtes, qui donne des
 *      lignes de crête vives et des vallées ramifiées là où une simple somme
 *      de gaussiennes ne produirait que des collines rondes ;
 *   2. l'échantillonner sur une grille et en extraire les isolignes par
 *      « marching squares » ;
 *   3. écrire un SVG versionné dans `public/topo/`.
 *
 * Le calcul a lieu ici, une fois. Le site ne sert qu'un fichier statique.
 *
 * Convention cartographique respectée : une courbe sur cinq est une **courbe
 * maîtresse** (courbe index), tracée un peu plus sombre et un peu plus épaisse.
 * C'est elle qui donne la lecture du relief ; les intercalaires restent
 * discrètes.
 *
 * Poids du fichier : le relief fractal est autrement plus bavard qu'un relief
 * lisse. Deux réglages le gouvernent, ajustables par variable d'environnement
 * pour pouvoir balayer les valeurs sans éditer le fichier :
 *
 *   LEVELS=44 TOL=2.2 node scripts/build-topo-contours.mjs
 *
 * Les valeurs par défaut donnent ~171 Ko bruts, soit ~54 Ko sur le réseau une
 * fois compressés. À 6 % d'opacité derrière du texte, monter plus haut en
 * détail coûte des octets sans rien ajouter que l'œil puisse voir.
 */

import { writeFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

/* -------------------------------------------------------------------------
   1. La surface
   ------------------------------------------------------------------------- */

/** Format du dessin. Large : il couvre une bande d'écran, pas un carré. */
const WIDTH = 1600;
const HEIGHT = 900;
const ASPECT = WIDTH / HEIGHT;

/**
 * Graine du relief. Changez-la pour obtenir un tout autre massif :
 * c'est le seul bouton qui redessine complètement la carte.
 */
const SEED = 20260807;

/** Générateur déterministe — mêmes montagnes à chaque exécution. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bruit de gradient (type Perlin), sur une table de permutation mélangée.
 * Renvoie une valeur continue et dérivable dans [−1, 1] environ.
 */
function makeNoise(seed) {
  const rand = mulberry32(seed);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const G = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  const dot = (h, x, y) => {
    const g = G[h & 7];
    return g[0] * x + g[1] * y;
  };
  // Courbe d'atténuation de Perlin : dérivées nulles aux bornes, donc pas
  // de cassure visible aux frontières de cellule.
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + (b - a) * t;

  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    return mix(
      mix(dot(aa, xf, yf), dot(ba, xf - 1, yf), u),
      mix(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u),
      v,
    );
  };
}

const noise = makeNoise(SEED);

/**
 * Multifractale à crêtes (« ridged multifractal ») — la fonction qui fait la
 * différence entre des collines et des montagnes.
 *
 * Le repliement `1 − |bruit|` transforme chaque passage par zéro en arête
 * vive : c'est de là que viennent les lignes de crête. Le carré creuse les
 * vallées. Et la pondération par l'octave précédente empêche le détail fin
 * d'apparaître dans les fonds plats — dans un vrai relief, les aspérités se
 * concentrent en altitude, pas dans les plaines.
 */
function ridged(x, y, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 1;

  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise(x * frequency, y * frequency));
    n *= n;
    n *= weight;
    weight = Math.min(1, n * 2);
    sum += n * amplitude;
    frequency *= 2.05;
    amplitude *= 0.5;
  }
  return sum;
}

/** Nombre de massifs sur la largeur. Plus haut = relief plus resserré. */
const TERRAIN_SCALE = 2.7;

/**
 * Altitude en (x, y), tous deux dans [0, 1].
 *
 * L'abscisse est corrigée de l'allongement du format : sans cela le relief
 * serait étiré horizontalement et les crêtes prendraient toutes la même
 * direction.
 */
function height(x, y) {
  const nx = x * ASPECT * TERRAIN_SCALE;
  const ny = y * TERRAIN_SCALE;

  // Enveloppe très basse fréquence : elle décide où sont les massifs et où
  // sont les plaines. Sans elle, le relief est uniformément accidenté et la
  // carte n'a plus de respiration.
  const envelope = 0.5 + 0.5 * noise(nx * 0.32 + 40, ny * 0.32 - 25);

  return ridged(nx, ny) * (0.25 + 1.05 * envelope);
}

/* -------------------------------------------------------------------------
   2. Échantillonnage et marching squares
   ------------------------------------------------------------------------- */

const COLS = 440;
const ROWS = 248;

const grid = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    row.push(height(c / (COLS - 1), r / (ROWS - 1)));
  }
  grid.push(row);
}

let zMin = Infinity;
let zMax = -Infinity;
for (const row of grid) {
  for (const z of row) {
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
}

/** Interpolation linéaire du point où la courbe traverse une arête. */
function lerp(ax, ay, av, bx, by, bv, level) {
  const t = (level - av) / (bv - av);
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

/**
 * Segments d'isoligne pour un niveau donné.
 *
 * Chaque cellule est lue par ses quatre coins ; le code sur 4 bits dit
 * lesquels sont au-dessus du niveau, et donc par quelles arêtes la courbe
 * entre et sort. Les deux cas ambigus (5 et 10, les « selles ») sont tranchés
 * par la moyenne des quatre coins — sinon les courbes se croisent en X là où
 * elles devraient s'éviter.
 */
function isolineSegments(level) {
  const segments = [];
  const sx = WIDTH / (COLS - 1);
  const sy = HEIGHT / (ROWS - 1);

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const br = grid[r + 1][c + 1];
      const bl = grid[r + 1][c];

      let code =
        (tl >= level ? 8 : 0) |
        (tr >= level ? 4 : 0) |
        (br >= level ? 2 : 0) |
        (bl >= level ? 1 : 0);
      if (code === 0 || code === 15) continue;

      const x0 = c * sx;
      const x1 = (c + 1) * sx;
      const y0 = r * sy;
      const y1 = (r + 1) * sy;

      const top = () => lerp(x0, y0, tl, x1, y0, tr, level);
      const right = () => lerp(x1, y0, tr, x1, y1, br, level);
      const bottom = () => lerp(x0, y1, bl, x1, y1, br, level);
      const left = () => lerp(x0, y0, tl, x0, y1, bl, level);

      if (code === 5 || code === 10) {
        const centre = (tl + tr + br + bl) / 4;
        // Le centre bascule la selle : on relie les arêtes deux à deux dans
        // le sens qui laisse les hauts ensemble.
        const flip = centre >= level;
        if ((code === 5) === flip) {
          segments.push([left(), top()], [bottom(), right()]);
        } else {
          segments.push([left(), bottom()], [top(), right()]);
        }
        continue;
      }

      const PAIRS = {
        1: ["left", "bottom"],
        2: ["bottom", "right"],
        3: ["left", "right"],
        4: ["top", "right"],
        6: ["top", "bottom"],
        7: ["left", "top"],
        8: ["top", "left"],
        9: ["top", "bottom"],
        11: ["top", "right"],
        12: ["left", "right"],
        13: ["bottom", "right"],
        14: ["left", "bottom"],
      };
      const edges = { top, right, bottom, left };
      const [a, b] = PAIRS[code];
      segments.push([edges[a](), edges[b]()]);
    }
  }
  return segments;
}

/**
 * Recoud les segments en polylignes.
 *
 * Sans cette étape le SVG contiendrait des dizaines de milliers de segments
 * indépendants — un fichier énorme, et des jointures visibles aux angles.
 * On rassemble par extrémités communes, à la précision d'arrondi près.
 */
function stitch(segments) {
  const key = (p) => `${p[0].toFixed(1)}|${p[1].toFixed(1)}`;
  const ends = new Map();

  segments.forEach((seg, i) => {
    for (const p of seg) {
      const k = key(p);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push(i);
    }
  });

  const used = new Array(segments.length).fill(false);
  const paths = [];

  /** Prolonge une chaîne depuis une extrémité, tant qu'un segment s'y raccorde. */
  function extend(chain, fromEnd) {
    for (;;) {
      const tip = fromEnd ? chain[chain.length - 1] : chain[0];
      const candidates = ends.get(key(tip)) ?? [];
      const nextIndex = candidates.find((i) => !used[i]);
      if (nextIndex === undefined) return;

      used[nextIndex] = true;
      const [a, b] = segments[nextIndex];
      const next = key(a) === key(tip) ? b : a;
      if (fromEnd) chain.push(next);
      else chain.unshift(next);
    }
  }

  segments.forEach((seg, i) => {
    if (used[i]) return;
    used[i] = true;
    const chain = [seg[0], seg[1]];
    extend(chain, true);
    extend(chain, false);
    // Les fragments d'un ou deux points sont du bruit de bord.
    if (chain.length > 3) paths.push(chain);
  });

  return paths;
}

/**
 * Simplification de Douglas-Peucker.
 *
 * Le marching squares suit la grille : sur une pente régulière, il produit des
 * dizaines de points quasi alignés qui ne disent rien de plus que les deux
 * extrémités. Sans cette passe, le SVG pèse 150 Ko pour un fond décoratif.
 *
 * La tolérance est en pixels du `viewBox` : en dessous du pixel, l'écart est
 * invisible à l'écran, donc le point ne coûte que des octets.
 */
function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const norm = Math.hypot(dx, dy);

  let worst = 0;
  let worstIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    // Distance du point au segment [a, b]. Si a et b sont confondus (courbe
    // fermée), on retombe sur la distance à ce point.
    const d =
      norm === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / norm;
    if (d > worst) {
      worst = d;
      worstIndex = i;
    }
  }

  if (worst <= tolerance) return [points[0], points[points.length - 1]];

  return [
    ...simplify(points.slice(0, worstIndex + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(worstIndex), tolerance),
  ];
}

/* -------------------------------------------------------------------------
   3. Écriture du SVG
   ------------------------------------------------------------------------- */

/** Nombre d'équidistances. Une courbe sur cinq sera maîtresse. */
/** `??` ne rattrape pas la chaîne vide : `LEVELS=` donnerait 0 et un SVG nul. */
const num = (value, fallback) =>
  value === undefined || value === "" || Number.isNaN(Number(value))
    ? fallback
    : Number(value);

const LEVEL_COUNT = num(process.env.LEVELS, 38);
const INDEX_EVERY = 5;

/** Couleur et opacités : celles du site, inchangées. Seule la maîtresse fonce. */
const STROKE = "#0e1a15";
const OPACITY_REGULAR = 0.06;
const OPACITY_INDEX = 0.115;
const WIDTH_REGULAR = 1;
const WIDTH_INDEX = 1.5;

/** Sous le pixel, l'écart ne se voit pas : il ne coûte que des octets. */
const TOLERANCE = num(process.env.TOL, 2.6);

const regular = [];
const index = [];
let pointsBefore = 0;
let pointsAfter = 0;

for (let i = 1; i < LEVEL_COUNT; i++) {
  const level = zMin + ((zMax - zMin) * i) / LEVEL_COUNT;
  const chains = stitch(isolineSegments(level));

  const d = chains
    .map((chain) => {
      pointsBefore += chain.length;
      const kept = simplify(chain, TOLERANCE);
      pointsAfter += kept.length;
      // Coordonnées entières : dans un viewBox de 1600 × 900, la décimale ne
      // se voit pas et coûte deux caractères par point.
      return (
        "M" + kept.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join("L")
      );
    })
    .join("");

  if (!d) continue;
  (i % INDEX_EVERY === 0 ? index : regular).push(d);
}

/**
 * Le fondu vers le bas est cuit dans le fichier, au lieu d'être appliqué par
 * un `mask-image` en CSS. Un masque CSS force une couche de composition que le
 * navigateur re-mélange à chaque image dès qu'une animation passe par-dessus ;
 * ici le dégradé est résolu une fois, au moment où l'image est rastérisée.
 */
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" ` +
  `preserveAspectRatio="xMidYMid slice">` +
  `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#fff"/>` +
  `<stop offset="0.55" stop-color="#fff" stop-opacity="0.55"/>` +
  `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
  `</linearGradient>` +
  `<mask id="m"><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#f)"/></mask>` +
  `</defs>` +
  `<g mask="url(#m)" fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
  `<g stroke-width="${WIDTH_REGULAR}" stroke-opacity="${OPACITY_REGULAR}">` +
  regular.map((d) => `<path d="${d}"/>`).join("") +
  `</g>` +
  `<g stroke-width="${WIDTH_INDEX}" stroke-opacity="${OPACITY_INDEX}">` +
  index.map((d) => `<path d="${d}"/>`).join("") +
  `</g></g></svg>`;

/* -------------------------------------------------------------------------
   4. Ombrage du relief (hillshade)
   -------------------------------------------------------------------------

   Les courbes disent l'altitude, l'ombrage dit la forme. Ensemble, la carte
   cesse d'être un réseau de lignes et devient un terrain qu'on lit d'un coup
   d'œil — c'est le rôle qu'a l'estompage sur une carte topographique.

   Formule de Horn, celle qu'implémente l'outil Hillshade d'ArcGIS : on estime
   la pente et l'exposition à partir des huit voisins, puis on éclaire.

   Pourquoi une image matricielle et non du SVG : un ombrage est un dégradé
   continu. En vecteur il faudrait des milliers de polygones. Et c'est ici
   exactement l'inverse des courbes — un champ lisse est le meilleur cas pour
   un codec d'image, là où le trait fin en est le pire.
   ------------------------------------------------------------------------- */

/** Résolution de l'ombrage. Un dégradé lisse n'a pas besoin de plus. */
const SHADE_W = 1100;
const SHADE_H = 619;

/** Lumière au nord-ouest, à 45° — la convention cartographique. */
const AZIMUTH = (315 * Math.PI) / 180;
const ALTITUDE = (45 * Math.PI) / 180;

/**
 * Exagération du relief. Au-delà de 1, les pentes sont accentuées : sur un
 * fond aussi pâle, sans cela l'ombrage serait invisible.
 */
const Z_FACTOR = 2.6;

/**
 * Gris le plus sombre autorisé — le seul réglage de la force de l'ombrage.
 *
 * 255 = invisible, 214 = franchement marqué. Autour de 240, l'ombrage se
 * perçoit sans qu'on puisse le regarder : le relief se devine, le texte
 * reste le premier lisible. C'est ce qu'on cherche pour un fond.
 */
const DARKEST = num(process.env.SHADE, 240);

const shade = Buffer.alloc(SHADE_W * SHADE_H);
const zenith = Math.PI / 2 - ALTITUDE;
const cosZenith = Math.cos(zenith);
const sinZenith = Math.sin(zenith);

/** Pas de la grille, en unités de la surface. */
const stepX = 1 / (SHADE_W - 1);
const stepY = 1 / (SHADE_H - 1);

for (let j = 0; j < SHADE_H; j++) {
  const v = j / (SHADE_H - 1);
  for (let i = 0; i < SHADE_W; i++) {
    const u = i / (SHADE_W - 1);

    // Les huit voisins, échantillonnés directement dans la surface : pas
    // besoin de stocker une grille intermédiaire, la fonction est continue.
    const a = height(u - stepX, v - stepY);
    const b = height(u, v - stepY);
    const c = height(u + stepX, v - stepY);
    const d = height(u - stepX, v);
    const f = height(u + stepX, v);
    const g = height(u - stepX, v + stepY);
    const h = height(u, v + stepY);
    const k = height(u + stepX, v + stepY);

    const dzdx = (c + 2 * f + k - (a + 2 * d + g)) / (8 * stepX);
    const dzdy = (g + 2 * h + k - (a + 2 * b + c)) / (8 * stepY);

    const slope = Math.atan(Z_FACTOR * Math.hypot(dzdx, dzdy));
    const aspect = Math.atan2(dzdy, -dzdx);

    let lit =
      cosZenith * Math.cos(slope) +
      sinZenith * Math.sin(slope) * Math.cos(AZIMUTH - aspect);
    lit = Math.max(0, Math.min(1, lit));

    // Le fondu vers le bas est cuit ici aussi, pour que l'ombrage disparaisse
    // au même rythme que les courbes.
    const fade = Math.min(1, Math.max(0, 1 - (v - 0.45) / 0.55));

    // On ne descend jamais au noir : l'ombrage est ramené dans une plage
    // étroite près du blanc, sinon il cesse d'être un fond.
    const value = 255 - (255 - DARKEST) * (1 - lit) * fade;
    shade[j * SHADE_W + i] = Math.round(value);
  }
}

const sharp = (await import("sharp")).default;
const SHADE_OUT = path.join(process.cwd(), "public", "topo", "hillshade-v1.webp");
mkdirSync(path.dirname(SHADE_OUT), { recursive: true });
await sharp(shade, { raw: { width: SHADE_W, height: SHADE_H, channels: 1 } })
  .webp({ quality: 82, effort: 6 })
  .toFile(SHADE_OUT);

const shadeKb = (statSync(SHADE_OUT).size / 1024).toFixed(1);
console.log(`  public/topo/hillshade-v1.webp (${shadeKb} Ko)`);

const OUT = path.join(process.cwd(), "public", "topo", "contours-v1.svg");
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, svg, "utf8");

const kb = (svg.length / 1024).toFixed(1);
const cut = (100 * (1 - pointsAfter / pointsBefore)).toFixed(0);
console.log(
  `✓ ${LEVEL_COUNT - 1} courbes (dont ${index.length} maîtresses), ` +
    `altitudes ${zMin.toFixed(2)} à ${zMax.toFixed(2)}\n` +
    `  simplification : ${pointsBefore} → ${pointsAfter} points (−${cut} %)\n` +
    `  public/topo/contours-v1.svg (${kb} Ko)`,
);
