"use client";

import { useEffect, useRef } from "react";

/**
 * Sphère géodésique en fil de fer, qui flotte et suit le curseur.
 *
 * Pourquoi cette forme : une géodésique est à la fois un globe et un polyèdre.
 * Elle dit « Terre » sans avoir à dessiner de continents, et la triangulation
 * qu'elle affiche est exactement celle des maillages du métier.
 *
 * Pourquoi un canvas et non du SVG : la version SVG écrivait cinq attributs
 * sur chacune des 120 arêtes à chaque image, soit 36 000 mutations du DOM par
 * seconde — chacune invalidant style et géométrie du nœud. Tant que la sphère
 * était petite, ça passait. À la moitié de l'écran, la surface à repeindre a
 * eu raison de la fluidité. Le canvas ne touche pas au DOM du tout : on écrit
 * dans un tampon que le navigateur remonte en texture.
 *
 * Pourquoi pas Three.js : la géométrie tient en cinquante lignes et le rendu
 * en une trentaine. Importer un moteur 3D pour tracer 120 segments coûterait
 * plus cher que toute la page réunie.
 *
 * Contrepartie assumée : sans JavaScript, rien ne s'affiche. L'objet est
 * purement décoratif et `aria-hidden`, donc aucune information n'est perdue.
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
 * Rayon réellement occupé à l'écran. La perspective élargit la silhouette :
 * un point vu sous l'angle θ se projette en sinθ·F/(F−cosθ), maximal pour
 * cosθ = 1/F, ce qui donne 1,046 et non 1. C'est ce rayon-là qui doit tenir
 * dans le canvas, sinon la sphère flotte au milieu d'une marge vide.
 */
const HALF = (Math.sqrt(1 - 1 / (FOCAL * FOCAL)) * FOCAL) / (FOCAL - 1 / FOCAL) + 0.015;

/**
 * Nombre de paliers d'opacité pour le rendu de profondeur.
 *
 * Une passe de tracé par palier, au lieu d'une par arête : six appels à
 * `stroke()` remplacent cent vingt. L'œil ne distingue pas six niveaux d'un
 * dégradé continu à cette opacité.
 */
const DEPTH_STEPS = 6;

export default function Globe({
  className = "",
  /**
   * Épaisseur du trait, en fraction de la largeur rendue.
   *
   * Exprimée en proportion et non en pixels : la sphère change de taille
   * selon l'écran, et une planète se dessine au trait fin — une épaisseur
   * fixe la ferait passer pour un ballon sur grand écran.
   */
  strokeRatio = 0.0016,
}: {
  className?: string;
  strokeRatio?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const context = element.getContext("2d", { alpha: true });
    if (!context) return;

    // Les fonctions ci-dessous sont des déclarations, donc remontées en tête
    // de portée : TypeScript les analyse comme si elles pouvaient s'exécuter
    // avant les gardes, et y perd le fait que les deux valeurs sont non nulles.
    // Ces deux alias figent le type une bonne fois.
    const canvas: HTMLCanvasElement = element;
    const ctx: CanvasRenderingContext2D = context;

    // Le canvas hérite de `color` par CSS ; on lit la valeur résolue une fois
    // plutôt que de la coder en dur, pour rester branché sur les jetons du site.
    const stroke = getComputedStyle(canvas).color;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let size = 0;
    let spin = 0;
    let tiltX = 0;
    let tiltY = 0;
    let targetX = 0;
    let targetY = 0;
    let raf = 0;
    let onScreen = true;

    // Alloués une fois : à 60 images par seconde, recréer ces tableaux
    // reviendrait à donner au ramasse-miettes du travail toutes les 16 ms.
    const px = new Float32Array(verts.length);
    const py = new Float32Array(verts.length);
    const pz = new Float32Array(verts.length);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      // On plafonne la densité : au-delà de 2, le gain est invisible et la
      // surface à remplir croît au carré.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = rect.width;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (!size) return;

      const ax = tiltX;
      const ay = spin + tiltY;
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);

      const scale = size / 2 / HALF;
      const centre = size / 2;

      for (let i = 0; i < verts.length; i++) {
        const [x, y, z] = verts[i];
        // Rotation X puis Y, puis projection perspective.
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const s = FOCAL / (FOCAL - z2);
        px[i] = centre + x2 * s * scale;
        py[i] = centre + y1 * s * scale;
        pz[i] = z2;
      }

      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(0.6, size * strokeRatio);
      ctx.lineCap = "round";

      // Un tracé par palier de profondeur : l'arrière de la sphère s'efface,
      // mais en six passes au lieu de cent vingt.
      for (let step = 0; step < DEPTH_STEPS; step++) {
        ctx.beginPath();
        let any = false;

        for (let e = 0; e < edges.length; e++) {
          const [a, b] = edges[e];
          const depth = (pz[a] + pz[b]) / 2;
          const bucket = Math.min(
            DEPTH_STEPS - 1,
            Math.max(0, Math.floor(((depth + 1) / 2) * DEPTH_STEPS)),
          );
          if (bucket !== step) continue;
          ctx.moveTo(px[a], py[a]);
          ctx.lineTo(px[b], py[b]);
          any = true;
        }

        if (!any) continue;
        ctx.globalAlpha = 0.1 + (0.5 * (step + 0.5)) / DEPTH_STEPS;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
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

    // Rien ne tourne quand la sphère est hors champ ou l'onglet en arrière-plan :
    // une boucle d'animation qui tourne dans le vide vide la batterie.
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !document.hidden) start();
      else stop();
    });
    seen.observe(canvas);

    const resized = new ResizeObserver(resize);
    resized.observe(canvas);

    function onVisibility() {
      if (document.hidden) stop();
      else if (onScreen) start();
    }

    resize();
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      seen.disconnect();
      resized.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [strokeRatio]);

  return (
    // Purement décoratif : aucune information n'y est portée.
    <canvas ref={canvasRef} aria-hidden="true" className={`block ${className}`} />
  );
}
