"use client";

import { useEffect, useRef } from "react";

/**
 * Sphère géodésique en fil de fer, qui flotte et suit le curseur.
 *
 * Pourquoi cette forme : une géodésique est à la fois un globe et un polyèdre.
 * Elle dit « Terre » sans avoir à dessiner de continents, et la triangulation
 * qu'elle affiche est exactement celle des maillages du métier. C'est un objet
 * juste, pas une décoration empruntée.
 *
 * Pourquoi pas Three.js : la géométrie tient en cinquante lignes et le rendu
 * est du SVG. Importer un moteur 3D (plus de 600 Ko) pour tracer 120 segments
 * coûterait plus cher que toute la page réunie.
 */

type V3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;

function normalize([x, y, z]: V3): V3 {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/**
 * Icosaèdre subdivisé puis reprojeté sur la sphère.
 * `depth: 1` donne 42 sommets et 120 arêtes — assez dense pour se lire comme
 * un globe, assez clair pour rester un dessin au trait.
 */
function buildGeodesic(depth: number) {
  const verts: V3[] = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ].map((v) => normalize(v as V3));

  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  for (let s = 0; s < depth; s++) {
    // Le cache évite de créer deux fois le même sommet : deux faces voisines
    // partagent une arête, donc son milieu.
    const cache = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const seen = cache.get(key);
      if (seen !== undefined) return seen;

      const [ax, ay, az] = verts[a];
      const [bx, by, bz] = verts[b];
      verts.push(normalize([(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]));
      cache.set(key, verts.length - 1);
      return verts.length - 1;
    };

    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }

  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const [a, b, c] of faces) {
    for (const [p, q] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = p < q ? `${p}:${q}` : `${q}:${p}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([p, q]);
    }
  }

  return { verts, edges };
}

const { verts, edges } = buildGeodesic(1);

/** Distance de l'œil à l'origine, en rayons. Plus c'est petit, plus ça fuit. */
const FOCAL = 3.4;
/** Inclinaison maximale imposée par le curseur, en radians (~29°). */
const MAX_TILT = 0.5;

/**
 * Demi-largeur du `viewBox`, calée sur le rayon réellement occupé à l'écran.
 *
 * La perspective élargit la silhouette : un point de la sphère unité vu sous
 * l'angle θ se projette en sinθ·FOCAL/(FOCAL−cosθ), maximal pour
 * cosθ = 1/FOCAL, ce qui donne ici un rayon apparent de 1,046 — et non 1.
 *
 * Pourquoi ça compte : si le `viewBox` est plus large que la sphère, la boîte
 * SVG déborde du cadre mais le dessin, lui, reste sagement à l'intérieur. On
 * la serre donc au plus près, pour que la largeur demandée au composant soit
 * bien celle de la sphère visible.
 */
const HALF = Math.sqrt(1 - 1 / (FOCAL * FOCAL)) * FOCAL / (FOCAL - 1 / FOCAL) + 0.02;

export default function Globe({
  className = "",
  /**
   * Épaisseur du trait, en unités du `viewBox` (le rayon vaut 1).
   *
   * À retenir : un SVG agrandi épaissit ses traits avec lui. Plus la sphère
   * est grande, plus il faut descendre cette valeur — une planète se dessine
   * au trait fin, sinon elle a l'air d'un ballon.
   */
  strokeWidth = 0.008,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const lines = Array.from(svg.querySelectorAll("line"));
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let spin = 0;
    let tiltX = 0;
    let tiltY = 0;
    let targetX = 0;
    let targetY = 0;
    let raf = 0;
    let onScreen = true;

    function draw() {
      const ax = tiltX;
      const ay = spin + tiltY;
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);

      // Rotation X puis Y, puis projection perspective.
      const projected = verts.map(([x, y, z]) => {
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const scale = FOCAL / (FOCAL - z2);
        return { x: x2 * scale, y: y1 * scale, z: z2 };
      });

      // On écrit directement dans le DOM plutôt que de repasser par React :
      // 120 arêtes redessinées 60 fois par seconde, c'est 7200 rendus/seconde
      // que le moteur de réconciliation n'a aucune raison de voir passer.
      edges.forEach(([a, b], i) => {
        const p = projected[a];
        const q = projected[b];
        const line = lines[i];
        line.setAttribute("x1", p.x.toFixed(4));
        line.setAttribute("y1", p.y.toFixed(4));
        line.setAttribute("x2", q.x.toFixed(4));
        line.setAttribute("y2", q.y.toFixed(4));
        // Repère de profondeur : l'arrière de la sphère s'efface.
        const depth = (p.z + q.z) / 2;
        line.setAttribute("opacity", (0.1 + 0.5 * ((depth + 1) / 2)).toFixed(3));
      });
    }

    function frame() {
      if (!reduceMotion) spin += 0.0016;
      // Amorti : le globe rattrape le curseur au lieu de le suivre au pixel.
      tiltX += (targetX - tiltX) * 0.045;
      tiltY += (targetY - tiltY) * 0.045;
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onPointer(event: PointerEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      targetY = nx * MAX_TILT;
      targetX = ny * MAX_TILT * 0.6;
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // Rien ne tourne quand le globe est hors champ ou l'onglet en arrière-plan :
    // une boucle d'animation qui tourne dans le vide vide la batterie.
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !document.hidden) start();
      else stop();
    });
    observer.observe(svg);

    function onVisibility() {
      if (document.hidden) stop();
      else if (onScreen) start();
    }

    draw();
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`}
      // Purement décoratif : aucune information n'y est portée.
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        {edges.map((_, i) => (
          <line key={i} x1="0" y1="0" x2="0" y2="0" />
        ))}
      </g>
    </svg>
  );
}
