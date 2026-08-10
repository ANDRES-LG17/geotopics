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
 *   1. définir une surface (ici : une somme de gaussiennes, sommets et
 *      dépressions, plus une pente générale) ;
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
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/* -------------------------------------------------------------------------
   1. La surface
   ------------------------------------------------------------------------- */

/** Format du dessin. Large : il couvre une bande d'écran, pas un carré. */
const WIDTH = 1600;
const HEIGHT = 900;
const ASPECT = WIDTH / HEIGHT;

/**
 * Sommets (h > 0) et cuvettes (h < 0), en coordonnées normalisées.
 * `r` est le rayon d'influence : petit = relief abrupt, donc courbes serrées.
 */
const FEATURES = [
  { x: 0.14, y: 0.30, h: 1.00, r: 0.20 },
  { x: 0.33, y: 0.66, h: 0.62, r: 0.15 },
  { x: 0.52, y: 0.22, h: 0.85, r: 0.24 },
  { x: 0.68, y: 0.78, h: 0.70, r: 0.18 },
  { x: 0.86, y: 0.40, h: 1.10, r: 0.26 },
  { x: 0.46, y: 0.94, h: -0.55, r: 0.17 },
  { x: 0.02, y: 0.80, h: -0.48, r: 0.15 },
  { x: 0.74, y: 0.05, h: -0.40, r: 0.13 },
];

/**
 * Altitude en (x, y), tous deux dans [0, 1].
 *
 * Les distances sont corrigées de l'allongement du format : sans cela, les
 * gaussiennes s'étireraient horizontalement et les courbes prendraient une
 * forme d'œuf au lieu d'être rondes.
 */
function height(x, y) {
  let h = 0;
  for (const f of FEATURES) {
    const dx = (x - f.x) * ASPECT;
    const dy = y - f.y;
    const d2 = (dx * dx + dy * dy) / (f.r * f.r);
    h += f.h * Math.exp(-d2);
  }
  // Pente générale : évite un relief trop symétrique et incline l'ensemble.
  return h + 0.30 * x - 0.16 * y;
}

/* -------------------------------------------------------------------------
   2. Échantillonnage et marching squares
   ------------------------------------------------------------------------- */

const COLS = 260;
const ROWS = 150;

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
const LEVEL_COUNT = 30;
const INDEX_EVERY = 5;

/** Couleur et opacités : celles du site, inchangées. Seule la maîtresse fonce. */
const STROKE = "#0e1a15";
const OPACITY_REGULAR = 0.06;
const OPACITY_INDEX = 0.115;
const WIDTH_REGULAR = 1;
const WIDTH_INDEX = 1.5;

/** Sous le pixel, l'écart ne se voit pas : il ne coûte que des octets. */
const TOLERANCE = 0.8;

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

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" ` +
  `preserveAspectRatio="xMidYMid slice">` +
  `<g fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
  `<g stroke-width="${WIDTH_REGULAR}" stroke-opacity="${OPACITY_REGULAR}">` +
  regular.map((d) => `<path d="${d}"/>`).join("") +
  `</g>` +
  `<g stroke-width="${WIDTH_INDEX}" stroke-opacity="${OPACITY_INDEX}">` +
  index.map((d) => `<path d="${d}"/>`).join("") +
  `</g></g></svg>`;

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
