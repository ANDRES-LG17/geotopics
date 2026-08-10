/**
 * Fond de l'ouverture : une ville qui se dissout dans le territoire.
 *
 *   npm run topo
 *
 * Ce que dessine ce script : une scène axonométrique où un tissu urbain
 * — des volumes extrudés depuis une subdivision parcellaire — se raréfie
 * jusqu'à ne laisser que le relief, rendu en courbes de niveau portées à leur
 * altitude réelle. C'est un modèle LOD1 posé sur un MNT : un livrable de
 * géomatique, pas une texture décorative.
 *
 * Pourquoi ce sujet : des courbes de niveau seules racontent un paysage sans
 * personne. La géomatique, l'urbanisme et l'aménagement parlent tous du
 * rapport entre les gens et le territoire — il manquait la couche humaine.
 *
 * La chaîne, en trois temps — la même que pour les labs :
 *
 *   1. définir une surface (fBm, un bruit doux : la variante à crêtes
 *      produisait des arêtes vives dont on ne voulait pas) ;
 *   2. en extraire les isolignes par marching squares, puis projeter le tout
 *      en isométrie avec la ville extrudée par-dessus ;
 *   3. écrire un SVG versionné dans `public/topo/`.
 *
 * Le calcul a lieu ici, une fois. Le site ne sert qu'un fichier statique.
 *
 * ENCRE CONSTANTE — la règle qui empêche la page d'avoir l'air chargée.
 * L'œil ne compte pas les traits, il perçoit la quantité d'encre. Les deux
 * systèmes ne se superposent donc pas : sous la ville, on dessine MOINS de
 * courbes (et non des courbes plus pâles), chaque niveau se retirant à une
 * densité urbaine différente pour qu'aucune couture ne se voie.
 *
 * Les valeurs par défaut ci-dessous ne sont pas des estimations : elles
 * sortent d'une douzaine de mesures de la densité d'encre colonne par
 * colonne. Toutes se règlent par variable d'environnement, pour pouvoir
 * refaire le balayage sans éditer le fichier :
 *
 *   ZOOM=2.8 LEVELS=16 node scripts/build-topo-scene.mjs
 *
 * Résultat retenu : encre 0,80 et variation 25,7 % (contre 0,63 et 20,5 %
 * pour le fond précédent, fait de courbes seules). C'est un fond mesurablement
 * plus dense — un choix assumé, en échange du propos.
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
 * Bruit fractionnaire brownien (fBm) — la somme d'octaves, sans repliement.
 *
 * C'est ici que se joue « doux » contre « escarpé ». La variante à crêtes
 * (`1 − |bruit|`) repliait chaque passage par zéro en arête vive : c'était
 * elle qui produisait les pics. En sommant le bruit tel quel, la surface reste
 * dérivable partout et les courbes de niveau deviennent des boucles molles.
 *
 * Peu d'octaves, volontairement : chaque octave ajoutée remet du détail fin,
 * donc des sinuosités. Trois suffisent à éviter l'aspect « patron
 * géométrique » sans rien casser de la douceur.
 */
function fbm(x, y, octaves = 3) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let o = 0; o < octaves; o++) {
    sum += noise(x * frequency, y * frequency) * amplitude;
    total += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum / total;
}

/** Nombre de massifs sur la largeur. Plus haut = relief plus resserré. */
const TERRAIN_SCALE = 2.1;

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

  return fbm(nx, ny) * (0.45 + 0.85 * envelope);
}

/* -------------------------------------------------------------------------
   2. Échantillonnage et marching squares
   ------------------------------------------------------------------------- */

// Dominio ampliado. El plano proyectado debe ser MAS GRANDE que el marco para
// poder sangrar por los cuatro lados: un objeto centrado deja las esquinas
// vacias, y eso es lo que hacia que la version anterior midiera 96% de
// variacion. El ruido es continuo, asi que muestrear fuera de [0,1] es legitimo
// y las formas conservan su tamano.
const U0 = -0.85, U1 = 1.85;
const V0 = -0.85, V1 = 1.85;

/** Extension del plano, en unidades de plano. */
const PW = (U1 - U0) * WIDTH;
const PH = (V1 - V0) * HEIGHT;

const COLS = 700;
const ROWS = 395;

const grid = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    row.push(height(U0 + (U1 - U0) * (c / (COLS - 1)), V0 + (V1 - V0) * (r / (ROWS - 1))));
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
  const sx = PW / (COLS - 1);
  const sy = PH / (ROWS - 1);

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

/**
 * Convertit une polyligne en courbe lisse (Catmull-Rom → Bézier cubique).
 *
 * Pourquoi c'est nécessaire : le marching squares rend des segments droits, et
 * la simplification en supprime encore. Tracés tels quels, les virages se
 * voient comme des angles — exactement les « pics » qu'on cherche à éliminer.
 * Passer par des Béziers rend la tangente continue : plus aucun coin, quelle
 * que soit l'agressivité de la simplification.
 *
 * Le facteur 1/6 est celui qui fait coïncider une Catmull-Rom uniforme avec
 * son équivalent en Bézier cubique.
 */
function toSmoothPath(points) {
  const n = points.length;
  if (n < 3) {
    return "M" + points.map(([x, y]) => `${r(x)} ${r(y)}`).join("L");
  }

  // Une courbe de niveau fermée doit le rester : on boucle les voisins au
  // lieu de dupliquer les extrémités, sinon la jointure fait un angle.
  const [fx, fy] = points[0];
  const [lx, ly] = points[n - 1];
  const closed = Math.hypot(fx - lx, fy - ly) < 1.5;

  const at = (i) => {
    if (closed) return points[(i + n) % n];
    return points[Math.max(0, Math.min(n - 1, i))];
  };

  let d = `M${r(fx)} ${r(fy)}`;
  const last = closed ? n : n - 1;

  for (let i = 0; i < last; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);

    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;

    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(x2)} ${r(y2)}`;
  }

  return closed ? d + "Z" : d;
}

/** Une décimale : sous le demi-pixel, l'écart ne se voit pas. */
const r = (v) => Math.round(v * 10) / 10;

/* =========================================================================
   3. Proyección isométrica: modelo LOD1 sobre MNT
   ========================================================================= */

const num = (v, d) =>
  v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v);

const LEVEL_COUNT = num(process.env.LEVELS, 20);
const TOLERANCE = num(process.env.TOL, 3);
const INDEX_EVERY = 5;

const STROKE = "#0e1a15";
const OPACITY_REGULAR = 0.06;
const OPACITY_INDEX = 0.115;

/** Isométrica clásica a 30°. */
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

/** Cuánto levanta el relieve, en unidades de plano. */
const Z_TERRAIN = num(process.env.ZT, 380);
/** Altura máxima de un volumen edificado. */
const Z_BUILD = num(process.env.ZB, 70);

const project = (x, y, z) => [(x - y) * COS, (x + y) * SIN - z];

/* --- encuadre: proyectamos las esquinas para saber qué caja ocupamos --- */
const probe = [];
for (const x of [0, PW]) for (const y of [0, PH])
  for (const z of [0, Z_TERRAIN + Z_BUILD]) probe.push(project(x, y, z));
const bx0 = Math.min(...probe.map((p) => p[0]));
const bx1 = Math.max(...probe.map((p) => p[0]));
const by0 = Math.min(...probe.map((p) => p[1]));
const by1 = Math.max(...probe.map((p) => p[1]));

const VB_W = 1600, VB_H = 900;
// `max` y no `min`: queremos CUBRIR el marco, no caber dentro de el.
const fit = Math.max(VB_W / (bx1 - bx0), VB_H / (by1 - by0)) * num(process.env.ZOOM, 2.4);
// Encuadre deliberado: en vez de centrar la caja entera (que al ampliar el
// zoom deja la ciudad fuera de plano), se centra el punto del plano donde la
// urbanizacion vale 0.5 — es decir, la transicion misma. Es el sujeto.
const FOCUS_U = num(process.env.FOCUSU, 0.44);
const [fx, fy] = project(FOCUS_U * PW, 0.5 * PH, Z_TERRAIN * 0.5);
const offX = VB_W * num(process.env.ANCHORX, 0.32) - fx * fit;
const offY = VB_H * num(process.env.ANCHORY, 0.46) - fy * fit;

const screen = (x, y, z) => {
  const [sx, sy] = project(x, y, z);
  return [sx * fit + offX, sy * fit + offY];
};

/* --- suelo: curvas de nivel llevadas a su altura real --- */
const smoothstep = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** 1 donde hay ciudad, 0 donde solo queda territorio. */
const urban = (xn) => 1 - smoothstep(0.22, 0.66, xn);

/**
 * Recorta al marco. Con el dominio ampliado, buena parte de la geometria cae
 * fuera del viewBox: guardarla es peso puro que nadie llega a ver.
 */
function clipBox(pts, pad = 70) {
  const inside = ([x, y]) =>
    x >= -pad && x <= VB_W + pad && y >= -pad && y <= VB_H + pad;
  const out = [];
  let run = [];
  for (const q of pts) {
    if (inside(q)) run.push(q);
    else { if (run.length > 3) out.push(run); run = []; }
  }
  if (run.length > 3) out.push(run);
  return out;
}

const regular = [], index = [];
for (let i = 1; i < LEVEL_COUNT; i++) {
  const t01 = i / LEVEL_COUNT;
  const level = zMin + (zMax - zMin) * t01;
  const z = t01 * Z_TERRAIN;

  let chains = stitch(isolineSegments(level));

  // Tinta constante: bajo la ciudad se dibujan MENOS curvas, no curvas mas
  // tenues. Cada nivel desaparece a una densidad urbana distinta, asi que las
  // curvas se retiran de una en una y no se ve una costura.
  const rank = ((i * 7) % LEVEL_COUNT) / LEVEL_COUNT;
  const keepUpTo = rank * num(process.env.YIELD, 1.4);
  chains = chains.flatMap((chain) => {
    const out = []; let run = [];
    for (const q of chain) {
      if (urban(q[0] / PW) <= keepUpTo) run.push(q);
      else { if (run.length > 3) out.push(run); run = []; }
    }
    if (run.length > 3) out.push(run);
    return out;
  });

  const d = chains
    .flatMap((chain) => clipBox(simplify(chain, TOLERANCE).map(([x, y]) => screen(x, y, z))))
    .map(toSmoothPath)
    .join("");
  if (d) (i % INDEX_EVERY === 0 ? index : regular).push(d);
}

/* --- ciudad: volúmenes extruidos desde una subdivisión del plano --- */
const blockRand = mulberry32(SEED ^ 0x5eed);
const leaves = [];

function subdivide(x0, y0, x1, y1, depth) {
  const w = urban((x0 + x1) / 2 / PW);
  const maxDepth = Math.round(w * num(process.env.DEPTH, 14));
  const MIN = num(process.env.MIN, 95);
  const small = x1 - x0 < MIN || y1 - y0 < MIN;
  if (depth >= maxDepth || small) {
    // Antes se exigia `!small`, lo que descartaba justamente las manzanas mas
    // finas: el tejido urbano denso desaparecia y solo quedaban los bloques
    // grandes de la periferia.
    if (w > 0.12) leaves.push([x0, y0, x1, y1, w]);
    return;
  }
  const s = 0.36 + blockRand() * 0.28;
  if (x1 - x0 > y1 - y0) {
    const xm = x0 + (x1 - x0) * s;
    subdivide(x0, y0, xm, y1, depth + 1);
    subdivide(xm, y0, x1, y1, depth + 1);
  } else {
    const ym = y0 + (y1 - y0) * s;
    subdivide(x0, y0, x1, ym, depth + 1);
    subdivide(x0, ym, x1, y1, depth + 1);
  }
}
subdivide(0, 0, PW, PH, 0);

/** Altura del terreno normalizada en un punto del plano. */
const groundZ = (x, y) =>
  ((height(U0 + (U1 - U0) * (x / PW), V0 + (V1 - V0) * (y / PH)) - zMin) /
    (zMax - zMin)) * Z_TERRAIN;

// Pintor: los volúmenes del fondo primero, para que los de delante tapen.
leaves.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));

const poly = (pts) => "M" + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join("L") + "Z";
const buildings = [];

for (const [x0, y0, x1, y1, w] of leaves) {
  // Una manzana demasiado grande no se edifica: extruida poco se lee como una
  // lamina blanca, y en un plano real seria suelo libre, no un edificio.
  const MAXLEAF = num(process.env.MAXLEAF, 300);
  if (x1 - x0 > MAXLEAF || y1 - y0 > MAXLEAF) continue;
  // Retranqueo: los volúmenes no llegan al borde de su manzana.
  const inset = Math.min(10, (x1 - x0) * 0.18, (y1 - y0) * 0.18);
  const a = x0 + inset, b = y0 + inset, c = x1 - inset, e = y1 - inset;

  const base = groundZ((a + c) / 2, (b + e) / 2);
  const h = Z_BUILD * (0.3 + blockRand() * 0.7) * w;
  // Un volumen casi plano se lee como una sabana blanca, no como un edificio.
  // Por debajo de este umbral no se dibuja nada: la manzana queda vacia.
  if (h < num(process.env.HMIN, 14)) continue;
  const top = base + h;

  const T = [screen(a, b, top), screen(c, b, top), screen(c, e, top), screen(a, e, top)];
  const Bf = [screen(a, b, base), screen(c, b, base), screen(c, e, base), screen(a, e, base)];

  // En isométrica, el vértice de mayor (x+y) queda al frente: las dos caras
  // que lo tocan son las visibles. La trasera no se dibuja.
  const cx = T.reduce((s, q) => s + q[0], 0) / 4;
  const cy = T.reduce((s, q) => s + q[1], 0) / 4;
  if (cx < -220 || cx > VB_W + 220 || cy < -220 || cy > VB_H + 220) continue;

  buildings.push(poly([T[1], T[2], Bf[2], Bf[1]]));  // cara derecha
  buildings.push(poly([T[2], T[3], Bf[3], Bf[2]]));  // cara izquierda
  buildings.push(poly(T));                            // cubierta
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" ` +
  `preserveAspectRatio="xMidYMid slice">` +
  `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#fff"/>` +
  `<stop offset="0.55" stop-color="#fff" stop-opacity="0.55"/>` +
  `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
  `</linearGradient>` +
  `<mask id="m"><rect width="${VB_W}" height="${VB_H}" fill="url(#f)"/></mask>` +
  `</defs>` +
  `<g mask="url(#m)" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
  `<g fill="none" stroke-width="1" stroke-opacity="${OPACITY_REGULAR}">` +
  regular.map((d) => `<path d="${d}"/>`).join("") +
  `</g>` +
  `<g fill="none" stroke-width="1.5" stroke-opacity="${OPACITY_INDEX}">` +
  index.map((d) => `<path d="${d}"/>`).join("") +
  `</g>` +
  // Relleno blanco: los volúmenes tapan las curvas que quedan detrás, que es
  // lo que los hace leerse como sólidos y evita que la tinta se acumule.
  `<g fill="#ffffff" stroke-width="1" stroke-opacity="${OPACITY_INDEX}">` +
  buildings.map((d) => `<path d="${d}"/>`).join("") +
  `</g>` +
  `</g></svg>`;

const OUT = path.join(process.cwd(), "public", "topo", "scene-v1.svg");
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, svg, "utf8");
console.log(`  ${leaves.length} volumenes, ${LEVEL_COUNT - 1} curvas -> public/topo/scene-v1.svg (${(svg.length / 1024).toFixed(1)} Ko)`);
