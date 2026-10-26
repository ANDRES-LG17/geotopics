"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  boundsPair,
  type LabColor,
  type LabDefinition,
  type LabHeight,
  type LabView,
} from "@/labs/types";
import LabPanel from "./LabPanel";
import { ReachEngine, type ReachBand, type ReachGraph, type ReachNames } from "@/lib/reach";
import ReachPanel, {
  PanneauHiver,
  PanneauResultats,
  type InfoHiver,
  type InfoItineraire,
  type InfoLieux,
  type InfoPortee,
  type LieuListe,
} from "./ReachPanel";

/**
 * Le moteur cartographique — le seul fichier du site qui importe MapLibre.
 *
 * Il n'est jamais importé directement : `LabEmbed` le charge par import
 * dynamique. C'est ce qui garde les 250 ko de MapLibre (plus son CSS) hors du
 * bundle des pages qui ne portent pas de carte.
 *
 * Aucune requête réseau n'est faite en dehors des fichiers du site, tant qu'un
 * lab ne déclare pas de fond de carte : pas de jeton, pas de fournisseur de
 * tuiles, pas de serveur de polices. Un lab sans fond ne peut donc pas cesser
 * de fonctionner parce qu'un compte tiers a expiré.
 *
 * `lac-saint-charles` fait exception et déclare un fond : son propos est
 * territorial, et il se lit mal sans routes ni villages. L'exception est
 * documentée dans le lab lui-même. Les données, elles, viennent toujours du
 * site : si le fournisseur du fond disparaît, la carte perd son décor, pas son
 * contenu.
 */

const BACKGROUND_LAYER = "lab-background";

/**
 * Les fichiers déjà chargés à la demande, gardés pour la session.
 *
 * Hors du composant : revenir sur une entité déjà consultée ne doit rien
 * retélécharger, même après que la carte a été démontée et remontée.
 */
const cacheDemande = new Map<string, unknown>();

/**
 * MapLibre 6 charge son worker comme un module séparé, dont il résout l'URL
 * depuis `import.meta.url`. Sous Turbopack, cette URL pointe vers
 * `/_next/static/chunks/`, où le bundler n'a pas copié le fichier : le serveur
 * répond par sa page 404 en HTML, le navigateur refuse le module (« non-
 * JavaScript MIME type »), et la carte ne s'initialise jamais — silencieusement,
 * puisque MapLibre n'a pas atteint le point où il sait signaler une erreur.
 *
 * On sert donc le worker nous-mêmes depuis `public/`, copié par
 * `scripts/copy-maplibre-worker.mjs` au `postinstall`. Un actif du site comme
 * un autre : rien à résoudre, rien qui dépende du bundler.
 */
setWorkerUrl("/maplibre-gl-worker.mjs");

/**
 * Traduit une couleur du vocabulaire en valeur de peinture MapLibre.
 *
 * Le `as unknown as string` est assumé et confiné ici : décrire le type d'une
 * expression MapLibre demanderait d'importer toute la spécification de style.
 * MapLibre valide l'expression à l'exécution et lève une erreur explicite si
 * elle est mal formée — on le saurait au premier affichage.
 */
function colorValue(color: LabColor, element?: HTMLElement | null): string {
  if (typeof color === "string") return color;
  if (Array.isArray(color)) return color as unknown as string;

  // Jeton CSS : on résout la valeur courante du thème. Elle est relue quand le
  // thème change — voir `syncCouleurs`, sans quoi une couche posée en clair
  // resterait claire sur un fond devenu sombre.
  if ("cssVar" in color) {
    if (!element) return color.fallback;
    return (
      getComputedStyle(element).getPropertyValue(color.cssVar).trim() ||
      color.fallback
    );
  }

  return [
    "match",
    ["get", color.byProperty],
    ...color.match.flatMap(([value, hex]) => [value, hex]),
    color.fallback,
  ] as unknown as string;
}

/** Traduit une hauteur du vocabulaire en valeur d'extrusion MapLibre. */
function heightValue(height: LabHeight): number {
  if (typeof height === "number") return height;

  const valeur = ["to-number", ["get", height.byProperty], 0];

  return [
    "+",
    height.base ?? 0,
    ["*", height.sqrt ? ["sqrt", valeur] : valeur, height.scale],
  ] as unknown as number;
}

/**
 * Courbe d'évolution, dessinée en SVG dans l'infobulle.
 *
 * Specs de tracé : trait de 2 px à jointure ronde, point final de rayon 4 avec
 * un anneau de 2 px en couleur de surface — c'est lui qui garde le point
 * lisible là où il croise la courbe. Aucune grille, aucun axe : à cette taille
 * ils ajouteraient de l'encre sans rien porter. Les deux valeurs extrêmes sont
 * écrites sous la courbe, et c'est tout ce qu'on étiquette.
 */
function Courbe({
  serie,
  color,
  hauteur = 34,
}: {
  serie: Record<string, number>;
  color: string;
  hauteur?: number;
}) {
  const annees = Object.keys(serie).sort();
  if (annees.length < 2) return null;

  const valeurs = annees.map((a) => serie[a]);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const largeur = 180;
  const marge = 5;

  const x = (i: number) => (i / (annees.length - 1)) * (largeur - marge * 2) + marge;
  const y = (v: number) =>
    hauteur - marge - ((v - min) / amplitude) * (hauteur - marge * 2);

  const trace = valeurs.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      className="mt-1 w-full"
      style={{ height: hauteur }}
      aria-hidden="true"
    >
      <path
        d={trace}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Anneau de surface puis point : le point reste lisible sur la courbe. */}
      <circle
        cx={x(valeurs.length - 1)}
        cy={y(valeurs[valeurs.length - 1])}
        r={6}
        fill="var(--tooltip-surface, #f0f9ff)"
      />
      <circle
        cx={x(valeurs.length - 1)}
        cy={y(valeurs[valeurs.length - 1])}
        r={4}
        fill={color}
      />
    </svg>
  );
}

/**
 * Part d'un tout, en barre.
 *
 * Bout arrondi de 4 px côté donnée, carré à la base : la barre pousse depuis
 * une origine, et l'arrondi marque où elle s'arrête.
 */
function Barre({
  valeur,
  max,
  color,
}: {
  valeur: number;
  max: number;
  color: string;
}) {
  const part = Math.max(0, Math.min(1, valeur / max));
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-sky-200/60 dark:bg-slate-700">
      <div
        className="h-full rounded-r-sm"
        style={{ width: `${part * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Sous 640 px, une vue très rasante écrase les polygones lointains au point
 * de les rendre illisibles. On plafonne l'inclinaison plutôt que de refuser
 * la 3D : la scène reste la même, seulement moins inclinée.
 */
function cameraFor(view: LabView, narrow: boolean) {
  const pitch = view.pitch ?? 0;
  return {
    pitch: narrow ? Math.min(pitch, 40) : pitch,
    bearing: narrow ? 0 : view.bearing ?? 0,
  };
}

/**
 * Grille d'HEXAGONES (pointe en haut) en Web Mercator, pour la colmena de
 * confort. `largeur` : d'un côté à l'autre, en mètres AU SOL à la latitude
 * de référence (46,8° N) ; l'échelle de Mercator y vaut 1 / cos φ.
 */
function grilleHex(largeur: number, latRef = 46.8) {
  const R = 6378137;
  const s = largeur / Math.sqrt(3) / Math.cos((latRef * Math.PI) / 180); // rayon, en m Mercator
  const versXY = (lon: number, lat: number) => [
    (R * lon * Math.PI) / 180,
    R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
  ];
  const versLonLat = (x: number, y: number) => [
    (x / R) * (180 / Math.PI),
    (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI),
  ];
  /** Clé « q,r » de l'hexagone qui contient le point (arrondi en cube). */
  const cle = (lon: number, lat: number) => {
    const [x, y] = versXY(lon, lat);
    const q = ((Math.sqrt(3) / 3) * x - y / 3) / s;
    const r = ((2 / 3) * y) / s;
    let rx = Math.round(q);
    let rz = Math.round(r);
    const ry = Math.round(-q - r);
    const dx = Math.abs(rx - q);
    const dy = Math.abs(ry - (-q - r));
    const dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy <= dz) rz = -rx - ry;
    return `${rx},${rz}`;
  };
  /** Les six sommets de l'hexagone `q,r`, fermés, en lon/lat. */
  const anneau = (c: string) => {
    const [q, r] = c.split(",").map(Number);
    const cx = s * Math.sqrt(3) * (q + r / 2);
    const cy = s * 1.5 * r;
    const pts: number[][] = [];
    for (let i = 0; i <= 6; i++) {
      const a = ((60 * (i % 6) + 30) * Math.PI) / 180;
      pts.push(versLonLat(cx + s * Math.cos(a), cy + s * Math.sin(a)));
    }
    return pts;
  };
  return { cle, anneau };
}

/**
 * Options de `fitBounds`, avec le plancher de zoom d'une vue à emprise.
 *
 * `minZoom` dit à MapLibre de ne pas descendre en dessous d'un niveau, quitte à
 * ce que l'emprise déborde du cadre. C'est ce qui garde une scène en volume sur
 * un écran étroit, là où le cadrage automatique l'aplatirait.
 */
function fitOptions(view: LabView) {
  return {
    padding: 24,
    ...("bounds" in view && view.minZoom !== undefined
      ? { minZoom: view.minZoom }
      : {}),
  };
}

export default function LabMap({
  lab,
  label,
  errorLabel,
  locale,
  fill = false,
}: {
  lab: LabDefinition;
  /** Nom du lab pour les lecteurs d'écran — le titre de l'entrée. */
  label: string;
  errorLabel: string;
  /** Langue courante, pour les libellés de scènes. */
  locale?: string;
  /**
   * La carte occupe toute la hauteur de son conteneur, qui décide donc de sa
   * taille. C'est le cas dans une entrée comme en prévisualisation : la
   * hauteur est déclarée à un seul endroit, jamais deux.
   */
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Le conteneur qui passe en plein écran : la carte ET ses boutons, pour que
  // les scènes et la légende restent accessibles une fois agrandi.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const sceneRef = useRef<((i: number, animate: boolean) => void) | null>(null);
  const [failed, setFailed] = useState(false);
  // Entité survolée : position dans la carte, et ses propriétés.
  const [survol, setSurvol] = useState<{
    x: number;
    y: number;
    props: Record<string, unknown>;
  } | null>(null);
  const [scene, setScene] = useState(0);
  const [pleinEcran, setPleinEcran] = useState(false);
  /** Le curseur est sur la carte et une tache de portée est peinte. */
  const [porteeActive, setPorteeActive] = useState(false);
  /** Ce que le panneau de portée affiche : la voie de départ et les surfaces. */
  const [infoPortee, setInfoPortee] = useState<InfoPortee | null>(null);
  /**
   * Conditions d'hiver. Lu dans le rappel de peinture, qui vit dans l'effet
   * de création de la carte : une référence plutôt que l'état seul, sinon le
   * rappel garderait la valeur du premier rendu.
   */
  const [hiver, setHiver] = useState(false);
  const hiverRef = useRef(false);
  /** Colmena : « aujourd'hui » ou « avec les 14 corridors VivaCité ». */
  const [avecCvc, setAvecCvc] = useState(false);
  const avecCvcRef = useRef(false);
  const redessinerRef = useRef<() => void>(() => {});
  const teteSaisonRef = useRef<() => void>(() => {});
  /** Vue de la portée : paliers de temps, ou rues exposées dans la tache. */
  const [vue, setVue] = useState<"temps" | "expose">("temps");
  const vueRef = useRef<"temps" | "expose">("temps");
  const changerVue = (v: "temps" | "expose") => {
    vueRef.current = v;
    setVue(v);
    libererRef.current();
    redessinerRef.current();
  };
  /**
   * Mode : la portée au survol, ou l'itinéraire entre deux clics. Deux modes
   * plutôt qu'un seul geste : au doigt, un appui ne peut pas à la fois poser
   * le départ de la tache et un point d'itinéraire.
   */
  // Le mode « itinéraire » séparé n'existe plus : l'itinéraire se lance
  // depuis la fiche d'un lieu, dans la portée. L'état reste pour les gardes.
  const [mode] = useState<"portee" | "itineraire">("portee");
  const modeRef = useRef<"portee" | "itineraire">("portee");
  const [infoItineraire, setInfoItineraire] = useState<InfoItineraire | null>(null);
  const reinitItineraireRef = useRef<() => void>(() => {});
  /** Noms des deux lieux de l'itinéraire, pour le titre du petit panneau. */
  const [routeNoms, setRouteNoms] = useState<{ a: string; b: string } | null>(null);
  /** Minutes au bout du trait pendant l'animation du trajet ; null = trajet posé. */
  const [minutesAnim, setMinutesAnim] = useState<number | null>(null);
  /**
   * Fiche d'un lieu cliqué : sa description, et le bouton qui lance le choix
   * d'un second lieu. `choix` vrai = on attend le clic sur la destination.
   */
  const [fiche, setFiche] = useState<{
    nom: string;
    fonction: string;
    couleur: string;
    genre: string;
    minutes: number;
    choix: boolean;
  } | null>(null);
  const [fichePos, setFichePos] = useState<{ x: number; y: number } | null>(null);
  const choisirDestinationRef = useRef<(v: boolean) => void>(() => {});
  const fermerFicheRef = useRef<() => void>(() => {});
  const echapRef = useRef<() => void>(() => {});
  /** Ville des 15 minutes : lieux touchés par la tache épinglée. */
  const [infoLieux, setInfoLieux] = useState<InfoLieux | null>(null);
  /** Vue confort : « l'hiver ici », au clic (tache fixée). */
  const [infoHiver, setInfoHiver] = useState<InfoHiver | null>(null);
  const [survolLieu, setSurvolLieu] = useState<{
    x: number;
    y: number;
    nom: string;
    fonction: string;
    couleur: string;
    minutes: number;
  } | null>(null);
  const libererRef = useRef<() => void>(() => {});
  /** Zoom sur un lieu de la liste, posé par l'effet de la carte. */
  const zoomLieuRef = useRef<(lon: number, lat: number) => void>(() => {});
  /** Clic sur un lieu de la liste : destination pendant le choix, zoom sinon. */
  const lieuListeRef = useRef<(l: LieuListe) => void>(() => {});
  /** Survol d'un lieu de la liste : la carte le cerne (null = on rend la main). */
  const surlignerRef = useRef<(l: LieuListe | null) => void>(() => {});

  /**
   * Les deux panneaux (portée à gauche, résultats à droite) : repliés ou non,
   * et la largeur RÉELLE de la carte — c'est elle, pas la fenêtre, qui décide
   * de leur taille et de ce qui tient à l'écran.
   */
  const [pliG, setPliG] = useState(false);
  const [pliD, setPliD] = useState(false);
  /** +1 à chaque tache fixée : la liste des lieux repart repliée. */
  const [numTache, setNumTache] = useState(0);
  const [largeurCarte, setLargeurCarte] = useState(0);
  const [ecranLarge, setEcranLarge] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia("(min-width: 1024px)");
    const suivre = () => setEcranLarge(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);
    return () => requete.removeEventListener("change", suivre);
  }, []);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargeurCarte(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // ≥ 1200 px de carte : panneaux de 26rem ; en dessous, 22rem. Sous 900 px,
  // un seul panneau ouvert à la fois : les résultats ouverts replient la
  // portée (elle reste à un clic, sur sa languette).
  const remPanneau = largeurCarte >= 1200 ? 26 : 22;
  const etroit = largeurCarte > 0 && largeurCarte < 900;
  const resultatsOuverts = infoLieux !== null || infoHiver !== null;
  const droiteVisible = ecranLarge && resultatsOuverts && !pliD;
  const gaucheVisible = !ecranLarge || (!pliG && !(etroit && droiteVisible));

  /**
   * Touches [ et ] : replier / déplier le panneau de gauche, de droite.
   * Écran étroit : déplier l'un replie l'autre. Mêmes garde-fous que H.
   */
  useEffect(() => {
    if (!lab.reach?.places) return;
    const touche = (e: KeyboardEvent) => {
      if ((e.key !== "[" && e.key !== "]") || e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      if (e.key === "[") {
        if (gaucheVisible) setPliG(true);
        else {
          setPliG(false);
          if (etroit) setPliD(true);
        }
      } else if (resultatsOuverts) {
        if (droiteVisible) setPliD(true);
        else setPliD(false);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [lab.reach?.places, gaucheVisible, droiteVisible, etroit, resultatsOuverts]);

  /**
   * Les boutons de MapLibre (zoom, boussole) et le plein écran sont en haut à
   * droite : le panneau de résultats ouvert les pousserait sous lui. Ils
   * glissent à sa gauche, au même rythme que lui.
   */
  const decalageDroite = droiteVisible ? `calc(${remPanneau}rem + 1.25rem)` : "";
  useEffect(() => {
    const coin = containerRef.current?.querySelector<HTMLElement>(".maplibregl-ctrl-top-right");
    if (!coin) return;
    coin.style.transition = "right 300ms ease-out";
    coin.style.right = decalageDroite;
  }, [decalageDroite]);
  /** Marges des panneaux ouverts, en px : les zooms centrent dans le reste. */
  // `cadrage` : les marges QUAND les résultats sont ouverts — le cadrage sur
  // la tache se calcule au clic, avant que le panneau de droite ne sorte.
  const margesRef = useRef({ left: 0, right: 0, cadrage: { left: 0, right: 0 } });
  useEffect(() => {
    const px = remPanneau * 16 + 24;
    margesRef.current = {
      left: ecranLarge && gaucheVisible ? px : 0,
      right: droiteVisible ? px : 0,
      cadrage: {
        left: ecranLarge && !pliG && !etroit ? px : 0,
        right: ecranLarge ? px : 0,
      },
    };
  }, [remPanneau, ecranLarge, gaucheVisible, droiteVisible, pliG, etroit]);
  const basculerHiver = (v: boolean) => {
    hiverRef.current = v;
    setHiver(v);
    teteSaisonRef.current();
    redessinerRef.current();
  };
  const basculerCvc = (v: boolean) => {
    avecCvcRef.current = v;
    setAvecCvc(v);
    redessinerRef.current();
  };

  /**
   * Touche H : bascule été / hiver SANS bouger la souris. Le curseur reste sur
   * son départ, seule la saison change — c'est ce qui rend l'écart visible.
   *
   * Ignorée dans un champ de saisie et avec un modificateur (Ctrl, Alt, Cmd) :
   * un raccourci ne doit voler ni une lettre tapée ni un raccourci du
   * navigateur.
   */
  useEffect(() => {
    if (!lab.reach?.places) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") echapRef.current();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [lab.reach?.places]);

  /**
   * Touche N : la carte revient au NORD, à plat. Un glissement au clic droit
   * la fait tourner (MapLibre) ; ce raccourci la remet droite sans chercher
   * de bouton. Mêmes garde-fous que H : pas dans un champ, pas avec un
   * modificateur.
   */
  const aPortee = Boolean(lab.reach);
  useEffect(() => {
    if (!aPortee) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true']")) return;
      const map = mapRef.current;
      if (!map) return;
      e.preventDefault();
      const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.resetNorthPitch({ duration: reduit ? 0 : 500 });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [aPortee]);

  /**
   * FLÈCHES et + / − : déplacer et zoomer d'où que soit le focus (MapLibre ne
   * les écoute que si la carte l'a), en CONTINU tant que la touche est tenue :
   * glissement de 600 px/s, zoom d'un niveau par seconde (calme) — plutôt que
   * des sauts. Une pression brève donne un petit pas, adouci. Maj : plus vite.
   * Écoutées en capture et arrêtées là : MapLibre ne les traite pas une
   * seconde fois. Pas dans un champ, pas avec Ctrl / Alt / Cmd (Ctrl + / −
   * reste le zoom du navigateur).
   */
  useEffect(() => {
    if (!aPortee) return;
    const DIRECTIONS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    // + et − du clavier principal (= / _ avec ou sans Maj) et du pavé.
    const ZOOMS: Record<string, number> = { "+": 1, "=": 1, "-": -1, _: -1 };
    const tenues = new Set<string>();
    const zooms = new Set<string>();
    let rapide = false;
    let image = 0;
    let precedent = 0;
    // Élan : la vitesse monte et retombe en douceur (pas d'à-coup au départ
    // ni à l'arrêt) ; une pression brève laisse donc un petit pas fluide.
    let elanZoom = 0;
    let appuiZoom = 0;
    const boucle = (t: number) => {
      const map = mapRef.current;
      const dt = precedent ? Math.min(0.05, (t - precedent) / 1000) : 1 / 60;
      precedent = t;
      let sensZoom = 0;
      for (const k of zooms) sensZoom += ZOOMS[k];
      // Deux niveaux par seconde (un seul semblait trop lent), toujours : Maj
      // sert à taper « + » sur bien des claviers, il ne peut pas accélérer.
      const cibleZoom = Math.sign(sensZoom) * 2;
      elanZoom += (cibleZoom - elanZoom) * Math.min(1, dt * 6);
      if (!cibleZoom && Math.abs(elanZoom) < 0.02) elanZoom = 0;
      if (!map || (!tenues.size && !elanZoom)) {
        image = 0;
        precedent = 0;
        return;
      }
      if (tenues.size) {
        let dx = 0;
        let dy = 0;
        for (const k of tenues) {
          dx += DIRECTIONS[k][0];
          dy += DIRECTIONS[k][1];
        }
        const n = Math.hypot(dx, dy) || 1;
        const vitesse = (rapide ? 1500 : 600) * dt; // pixels par image
        map.panBy([(dx / n) * vitesse, (dy / n) * vitesse], { animate: false });
      }
      if (elanZoom) map.setZoom(map.getZoom() + elanZoom * dt);
      image = requestAnimationFrame(boucle);
    };
    const bas = (e: KeyboardEvent) => {
      const direction = e.key in DIRECTIONS;
      const zoom = e.key in ZOOMS;
      if ((!direction && !zoom) || e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!mapRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (direction) {
        rapide = e.shiftKey;
        tenues.add(e.key);
      } else {
        if (!e.repeat) appuiZoom = performance.now();
        zooms.add(e.key);
      }
      if (!image) image = requestAnimationFrame(boucle);
    };
    const relacherZoom = (k: string) => {
      // Maj change le caractère (= / +, - / _) : on relâche les deux.
      const paire = k === "+" || k === "=" ? ["+", "="] : ["-", "_"];
      paire.forEach((x) => zooms.delete(x));
    };
    const haut = (e: KeyboardEvent) => {
      if (e.key in DIRECTIONS) {
        tenues.delete(e.key);
        rapide = e.shiftKey;
      } else if (e.key in ZOOMS) {
        // Pression brève : le zoom continue jusqu'à 0,3 s, pour un petit pas
        // perceptible (≈ ¼ de niveau) plutôt qu'un frémissement.
        const reste = 300 - (performance.now() - appuiZoom);
        if (reste > 0) window.setTimeout(() => relacherZoom(e.key), reste);
        else relacherZoom(e.key);
      }
    };
    const lacher = () => {
      tenues.clear();
      zooms.clear();
    };
    window.addEventListener("keydown", bas, true);
    window.addEventListener("keyup", haut, true);
    window.addEventListener("blur", lacher);
    return () => {
      window.removeEventListener("keydown", bas, true);
      window.removeEventListener("keyup", haut, true);
      window.removeEventListener("blur", lacher);
      cancelAnimationFrame(image);
    };
  }, [aPortee]);

  const aHiver = Boolean(lab.reach?.winter);
  useEffect(() => {
    if (!aHiver) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "h" || e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      hiverRef.current = !hiverRef.current;
      setHiver(hiverRef.current);
      teteSaisonRef.current();
      redessinerRef.current();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [aHiver]);
  /**
   * Entité choisie d'un clic, et palier du curseur.
   *
   * Distincte du survol : celui-ci s'efface dès que le curseur bouge, alors
   * qu'une sélection reste tant qu'on ne la ferme pas.
   */
  const [choisi, setChoisi] = useState<Record<string, unknown> | null>(null);
  const [palier, setPalier] = useState<number | null>(null);
  /**
   * Les chiffres de l'aire révélée au palier courant.
   *
   * Ils ne sont pas sur l'entité cliquée : une station ne porte que son nom,
   * alors que les mesures — superficie, population, part du disque — changent
   * à chaque cran du curseur et vivent donc sur l'aire.
   *
   * Lus dans la source plutôt que par `queryRenderedFeatures` : cette dernière
   * ne voit que les tuiles déjà traitées, et renvoyait un panneau vide quand on
   * l'interrogeait dans le même tour que le filtre.
   */
  const [mesures, setMesures] = useState<Record<string, unknown> | null>(null);
  /**
   * La valeur de `key` dont les données à la demande sont ARRIVÉES.
   *
   * Entre le clic et l'arrivée du fichier, la station est choisie mais son
   * voile n'existe pas encore. Les rues du fond, si elles s'allumaient à ce
   * moment, couvriraient la ville entière le temps du téléchargement.
   */
  const [chargee, setChargee] = useState<unknown>(null);
  /**
   * Pour le tableau de bord : la SÉRIE de l'entité choisie (ses mesures à
   * chaque palier, pour les courbes) et l'ENSEMBLE des entités comparables
   * (pour le rang et la moyenne).
   */
  const [serie, setSerie] = useState<Record<string, unknown>[]>([]);
  const [ensemble, setEnsemble] = useState<Record<string, unknown>[]>([]);
  const scenes = lab.scenes ?? [];
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";

  const curseur = lab.select?.slider;
  const palierCourant =
    palier ?? curseur?.start ?? curseur?.steps[curseur.steps.length - 1] ?? null;

  /**
   * Plein écran natif du navigateur.
   *
   * L'API n'est pas un état qu'on impose : l'utilisateur peut en sortir par
   * Échap sans passer par notre bouton. On écoute donc l'événement plutôt que
   * de tenir un booléen de notre côté — sinon le bouton ment.
   */
  useEffect(() => {
    const suivre = () => {
      const actif = document.fullscreenElement === wrapperRef.current;
      setPleinEcran(actif);
      // La carte doit recalculer sa taille : MapLibre ne le fait pas seul
      // quand son conteneur change de dimensions sans que la fenêtre bouge.
      requestAnimationFrame(() => mapRef.current?.resize());
    };
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  const basculerPleinEcran = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current?.requestFullscreen().catch(() => {
        // Certains navigateurs refusent hors interaction directe, ou en
        // iframe sans `allowfullscreen`. Ce n'est pas une panne : la carte
        // reste utilisable à sa taille normale.
      });
    }
  };

  // Le lecteur change de scène : on rejoue le cadrage. L'animation est coupée
  // si le système demande moins de mouvement.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sceneRef.current?.(scene, !reduced);
  }, [scene]);

  /**
   * Les couches révélées ne montrent que l'entité choisie, au palier courant.
   *
   * Sans ce filtre, les aires de toutes les stations se superposeraient : une
   * tache uniforme où plus rien ne se lit.
   *
   * `["==", ["literal", false], true]` est un faux constant — c'est ainsi qu'on
   * éteint une couche par filtre, sans toucher à sa visibilité.
   */
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    if (!map || !select?.revealLayers?.length) return;

    const parOpacite = new Set(select.revealByOpacity ?? []);

    const appliquer = () => {
      for (const index of select.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) continue;

        // Une couche révélée par opacité n'a pas de champ à filtrer : c'est
        // le fond de carte, dont les entités ignorent `station`/`minutes`.
        //
        // Elle ne s'allume QUE si une aire existe au palier courant — c'est-à-
        // dire une station choisie ET un palier au-dessus de zéro. Le palier
        // zéro n'a pas de voile : y allumer les rues les montrerait sur toute
        // la ville, sans rien pour les masquer hors de l'aire.
        if (parOpacite.has(index)) {
          const definition = lab.layers[index];
          const plafond =
            definition && "opacity" in definition
              ? definition.opacity ?? 1
              : 1;
          const actif =
            Boolean(choisi) &&
            (!select.slider || (palierCourant !== null && palierCourant > 0)) &&
            // Données à la demande : pas avant que le voile soit arrivé.
            (!select.onDemand || chargee === choisi?.[select.key]);
          const prop = couche.type === "fill" ? "fill-opacity" : "line-opacity";
          // `.bind(map)` est indispensable : rangée dans une variable, la
          // méthode perd son `this`, chaque appel lève, et le `try` qui suit
          // avalait l'erreur — les rues ne s'allumaient jamais.
          const poser = map.setPaintProperty.bind(map) as (
            id: string,
            nom: string,
            valeur: unknown,
          ) => void;
          try {
            // L'ordre d'apparition compte. En s'allumant, les rues ATTENDENT
            // la fin du fondu du voile : allumées en même temps, elles
            // traverseraient un voile encore transparent et toute la ville
            // clignoterait une fraction de seconde. En s'éteignant, elles
            // partent sans délai — le voile, lui, disparaît d'un coup.
            const fondu = select.slider?.fade ?? 0;
            poser(
              id,
              `${prop}-transition`,
              actif ? { duration: 220, delay: fondu } : { duration: 0, delay: 0 },
            );
            poser(id, prop, actif ? plafond : 0);
          } catch {
            // Couche sans opacité déclarée : rien à ajuster.
          }
          continue;
        }

        // Les données chargées à la demande se filtrent comme les autres : le
        // fichier d'une station porte ses quatorze paliers, et seul le palier
        // courant doit se voir.
        if (!choisi) {
          map.setFilter(id, ["==", ["literal", false], true]);
          continue;
        }

        // Le filtre DÉCLARÉ par la couche est conservé et complété, jamais
        // remplacé. Quand l'aire et son voile voyagent dans la même source,
        // c'est lui seul qui dit « je suis le voile » ou « je suis l'aire » :
        // le remplacer faisait dessiner l'aire dans la couleur du voile, par-
        // dessus le trou — l'intérieur de la carte disparaissait.
        const declare = lab.layers[index]?.filter;
        const conditions: unknown[] = [
          "all",
          ...(declare ? [declare] : []),
          ["==", ["get", select.key], choisi[select.key] as string],
        ];
        if (select.slider && palierCourant !== null) {
          conditions.push(["==", ["get", select.slider.field], palierCourant]);
        }
        map.setFilter(id, conditions as never);
      }
    };

    // Appliqué TOUT DE SUITE, jamais différé.
    //
    // `mapRef` n'est renseigné qu'à la fin du chargement, une fois toutes les
    // couches posées : filtres et peintures peuvent donc être modifiés dès
    // maintenant. `isStyleLoaded()` répondait « non » dès qu'une tuile était
    // en route, et l'application partait alors sur `once("idle")` — avec
    // l'état de CE rendu, jamais annulée. Le tram anime la carte en continu,
    // `idle` arrivait tard ou pas du tout, et un état périmé pouvait écraser
    // le bon : les rues restaient éteintes à six minutes.
    appliquer();
  }, [choisi, palierCourant, chargee, lab.select, lab.layers]);

  /**
   * Les chiffres à afficher, relevés sur l'aire du palier courant.
   *
   * `querySourceFeatures` lit la source chargée, pas l'image rendue : elle
   * répond même si l'aire est hors de l'écran, ce qui arrive dès qu'on a zoomé
   * sur un bout du quartier. `queryRenderedFeatures` renvoyait alors un panneau
   * vide alors que la donnée était là.
   *
   * Elle ne voit cependant que les tuiles déjà découpées : on réessaie sur
   * `sourcedata` tant que rien n'est trouvé, plutôt que de conclure trop tôt à
   * l'absence.
   */
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    if (!map || !select) return;

    if (!choisi) {
      setMesures(null);
      return;
    }

    // Les sources des couches révélées, hors fond de carte (ses entités n'ont
    // pas ces champs). Plusieurs entités y portent la station et le palier —
    // l'aire ET son voile — mais seule l'aire porte les chiffres : on retient
    // donc l'entité qui a au moins un des champs du panneau. Prendre la
    // première venue tombait sur le voile, et le panneau s'ouvrait en tirets.
    const parOpacite = new Set(select.revealByOpacity ?? []);
    const sources = [
      ...new Set(
        (select.revealLayers ?? [])
          .filter((i) => !parOpacite.has(i))
          .map((i) => map.getLayer(`lab-layer-${i}`)?.source)
          .filter((s): s is string => Boolean(s)),
      ),
    ];
    if (!sources.length) return;

    const valeur = choisi[select.key];
    const champ = select.slider?.field;
    // Les champs que le panneau affiche : lignes, chiffre principal, courbe.
    // L'entité qui en porte au moins un est l'aire ; le voile n'en porte aucun.
    const champsPanneau = [
      ...(select.rows ?? []).map((r) => r.field),
      ...(select.panel?.headline ? [select.panel.headline.field] : []),
      ...(select.panel?.curve ? [select.panel.curve.value.field] : []),
    ];

    const relever = () => {
      const trouve = sources
        .flatMap((s) => map.querySourceFeatures(s, { sourceLayer: undefined }))
        .find((f) => {
          const p = f.properties ?? {};
          if (p[select.key] !== valeur) return false;
          if (champ && palierCourant !== null && p[champ] !== palierCourant) return false;
          return !champsPanneau.length || champsPanneau.some((c) => c in p);
        });
      if (trouve) {
        setMesures(trouve.properties ?? {});
        return true;
      }
      return false;
    };

    if (relever()) return;

    // Au palier zéro, aucune aire n'existe : c'est voulu, et le panneau
    // affichera des tirets plutôt que d'attendre une donnée qui ne viendra pas.
    setMesures(null);
    const reessayer = () => {
      if (relever()) map.off("sourcedata", reessayer);
    };
    map.on("sourcedata", reessayer);
    return () => {
      map.off("sourcedata", reessayer);
    };
  }, [choisi, palierCourant, lab.select]);

  /**
   * Les données propres à l'entité choisie, chargées au clic.
   *
   * Les aires et les voiles des 29 stations pèsent 5 Mo : les servir à
   * l'ouverture ferait attendre, sur un téléphone surtout, un lecteur qui ne
   * regardera qu'une ou deux stations. Chacune arrive au clic (15–25 ko
   * compressés) et reste ensuite en mémoire.
   */
  useEffect(() => {
    const map = mapRef.current;
    const aLaDemande = lab.select?.onDemand;
    if (!map || !aLaDemande || !lab.select) return;

    const source = () =>
      map.getSource(aLaDemande.source) as
        | { setData: (d: unknown) => void }
        | undefined;

    const valeur = choisi?.[lab.select.key];
    if (valeur === undefined || valeur === null) {
      source()?.setData({ type: "FeatureCollection", features: [] });
      setChargee(null);
      setSerie([]);
      return;
    }

    // L'identifiant du fichier : minuscules, sans accents ni apostrophes — la
    // même règle que celle du script qui les écrit.
    const cle = String(valeur)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/\s+/g, "-");
    const url = aLaDemande.url.replace("{clé}", cle);

    // Les mesures de l'entité, une par palier, triées : ce sont les entités
    // qui portent le champ de la courbe (le voile, lui, n'en porte pas).
    const extraire = (data: unknown) => {
      const champ = lab.select?.slider?.field;
      const marque =
        lab.select?.panel?.curve?.value.field ?? lab.select?.panel?.headline?.field;
      const entites = (data as { features?: { properties?: Record<string, unknown> }[] })
        .features ?? [];
      return entites
        .map((f) => f.properties ?? {})
        .filter((p) => p[lab.select!.key] === valeur && (!marque || marque in p))
        .sort((a, b) => (champ ? Number(a[champ]) - Number(b[champ]) : 0));
    };

    const dejaLu = cacheDemande.get(url);
    if (dejaLu) {
      source()?.setData(dejaLu);
      setSerie(extraire(dejaLu));
      setChargee(valeur);
      return;
    }

    let annule = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (annule || !data) return;
        cacheDemande.set(url, data);
        source()?.setData(data);
        setSerie(extraire(data));
        setChargee(valeur);
      })
      .catch(() => {
        // Un fichier absent n'est pas une panne : l'entité n'a simplement pas
        // encore ses données. La carte garde tout le reste.
      });

    return () => {
      annule = true;
    };
  }, [choisi, lab.select]);

  /**
   * L'ensemble des entités comparables, lu une fois.
   *
   * Le fichier est celui que la carte a déjà chargé pour dessiner les
   * stations : servi en cache immuable, la requête ne retouche pas le réseau.
   * On le relit ici plutôt que de le demander à MapLibre, qui ne rend que les
   * entités des tuiles visibles — un rang calculé sur l'écran serait faux.
   */
  useEffect(() => {
    const cle = lab.select?.panel?.headline?.compareSource;
    const url = cle ? lab.sources[cle] : undefined;
    if (!url) return;
    let annule = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (annule || !data) return;
        setEnsemble(
          (data.features ?? []).map(
            (f: { properties?: Record<string, unknown> }) => f.properties ?? {},
          ),
        );
      })
      .catch(() => {
        // Sans l'ensemble, le panneau affiche le chiffre sans rang ni moyenne.
      });
    return () => {
      annule = true;
    };
  }, [lab.select, lab.sources]);

  /**
   * Le fondu ENCHAÎNÉ entre deux paliers.
   *
   * Les formes sont précalculées et discrètes, et on ne peut pas interpoler
   * leurs sommets — deux polygones successifs n'ont ni le même nombre de
   * sommets ni la même topologie. On fait donc coexister les deux paliers le
   * temps du passage, chacun avec sa propre opacité.
   *
   * L'ORDRE est ce qui supprime le clignotement. Une version précédente
   * remplaçait la forme d'un coup et faisait monter la nouvelle depuis zéro :
   * acceptable pour une tache, désastreux pour le voile, qui couvre toute la
   * ville. Mesuré : le voile tombait de 0,92 à 0,03 en une image, et toutes les
   * rues de la ville s'allumaient puis s'éteignaient à chaque cran.
   *
   * Désormais, première moitié : le nouveau palier MONTE par-dessus l'ancien,
   * qui reste plein. Seconde moitié : l'ancien s'EFFACE. À aucun instant la
   * ville n'est découverte — hors des deux aires, le voile ne fait que
   * s'épaissir un peu puis revenir. Seul change l'anneau entre les deux
   * bords, qui se révèle ou se recouvre en douceur, dans un sens comme dans
   * l'autre.
   */
  const palierPrecedent = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    const duree = select?.slider?.fade;
    const champ = select?.slider?.field;
    const reveles = select?.revealLayers;
    if (!map || !select || !duree || !champ || !reveles?.length) return;
    if (palierCourant === null) return;

    const avant = palierPrecedent.current;
    palierPrecedent.current = palierCourant;
    if (avant === null || avant === palierCourant || !choisi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const apres = palierCourant;
    const valeurCle = choisi[select.key] as string;

    // Les couches qui fondent : l'aire, son contour et le voile — qu'ils
    // arrivent au chargement ou au clic. Pas les rues du fond : elles ne
    // changent pas d'un palier à l'autre, et les faire varier serait un
    // défaut, pas un effet.
    //
    // L'opacité de repos vient de la DÉFINITION du lab, pas de la carte : lue
    // sur la carte pendant un fondu interrompu, elle aurait pu valoir une
    // expression à mi-chemin.
    const parOpacite = new Set(select.revealByOpacity ?? []);
    const couches: Array<{
      id: string;
      prop: string;
      plein: number;
      declare?: unknown[];
    }> = [];
    for (const index of reveles) {
      if (parOpacite.has(index)) continue;
      const id = `lab-layer-${index}`;
      const couche = map.getLayer(id);
      if (!couche) continue;
      const definition = lab.layers[index];
      const plein =
        definition && "opacity" in definition && definition.opacity !== undefined
          ? definition.opacity
          : couche.type === "fill"
            ? 0.5
            : 1;
      couches.push({
        id,
        prop: couche.type === "fill" ? "fill-opacity" : "line-opacity",
        plein,
        // Le filtre déclaré par la couche (« je suis le voile ») : complété,
        // jamais remplacé — voir l'effet qui applique les filtres.
        declare: definition?.filter,
      });
    }
    if (!couches.length) return;

    // Même échappatoire que pour le `fade` du fond : le nom de la propriété
    // est une variable, la signature typée de MapLibre attend un littéral.
    // `.bind(map)` : sans lui, la méthode rangée dans une variable perd son
    // `this`, chaque appel lève en silence dans le `try`, et le fondu ne se
    // voit jamais.
    const peindre = map.setPaintProperty.bind(map) as (
      id: string,
      nom: string,
      valeur: unknown,
    ) => void;

    const filtre = (declare: unknown[] | undefined, paliers: number[]) =>
      [
        "all",
        ...(declare ? [declare] : []),
        ["==", ["get", select.key], valeurCle],
        ["in", ["get", champ], ["literal", paliers]],
      ] as never;

    // Les deux paliers visibles pendant le passage. Le palier zéro n'a pas de
    // forme : il ne coûte rien de le demander.
    for (const { id, declare } of couches) {
      try {
        map.setFilter(id, filtre(declare, [avant, apres]));
      } catch {
        // Couche disparue : rien à fondre.
      }
    }

    // Fin du passage : retour à un seul palier et à une opacité constante —
    // une expression par entité coûte plus cher qu'un nombre au rendu.
    const conclure = () => {
      for (const { id, prop, plein, declare } of couches) {
        try {
          map.setFilter(id, filtre(declare, [apres]));
          peindre(id, prop, plein);
        } catch {
          // Idem.
        }
      }
    };

    // Courbe douce aux deux bouts : le mouvement démarre et s'arrête sans
    // à-coup, ce qu'une progression linéaire ne fait pas.
    const doux = (x: number) => x * x * (3 - 2 * x);

    // `performance.now()` lu DANS le rappel, et borné à [0, 1]. L'horodatage
    // passé par `requestAnimationFrame` date du début de l'image : il peut
    // précéder l'instant où le fondu a été lancé, et donnait alors une
    // opacité négative que MapLibre refusait — avec, en prime, le bandeau
    // d'erreur.
    const debut = performance.now();
    let image = 0;
    const animer = () => {
      const t = Math.min(1, Math.max(0, (performance.now() - debut) / duree));
      const monte = doux(Math.min(1, t * 2));
      const efface = 1 - doux(Math.max(0, t * 2 - 1));
      for (const { id, prop, plein } of couches) {
        try {
          peindre(id, prop, [
            "case",
            ["==", ["get", champ], apres],
            plein * monte,
            plein * efface,
          ]);
        } catch {
          // Idem.
        }
      }
      if (t < 1) image = requestAnimationFrame(animer);
      else conclure();
    };
    image = requestAnimationFrame(animer);

    // Interrompu par un nouveau cran (curseur glissé vite) : on fige l'état
    // d'arrivée. Le fondu suivant repart de lui, sans saut.
    return () => {
      cancelAnimationFrame(image);
      conclure();
    };
  }, [palierCourant, choisi, lab.select, lab.layers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const basemap = lab.basemap ?? { kind: "none" };

    // Le fond suit le thème du site : on lit le jeton CSS plutôt que de figer
    // une couleur, sinon la carte reste blanche en thème sombre.
    const readBackground = () =>
      getComputedStyle(container).getPropertyValue("--surface-muted").trim() ||
      "#f4f8f5";

    const map = new MapLibreMap({
      container,
      // Tolérance du clic, en pixels : au-delà, MapLibre prend le geste pour
      // un glissement de carte et n'émet pas `click`. Le défaut (3 px) est trop
      // strict pour une vraie main — mesuré : un appui qui dérive de 4 px entre
      // la pression et le relâchement ne sélectionnait plus la station. Huit
      // pixels laissent le clic passer sans gêner le déplacement volontaire.
      clickTolerance: 8,
      style:
        basemap.kind === "style"
          ? basemap.url
          : {
              version: 8,
              // Sans `glyphs`, aucune étiquette ne peut être dessinée : le
              // moteur n'a pas de police à poser. Un lab sans fond qui déclare
              // une couche `label` afficherait donc une carte muette, sans
              // erreur. On pointe le serveur de polices de MapLibre — c'est la
              // seule requête extérieure que fait un lab sans fond, et elle
              // n'intervient que si des étiquettes existent.
              glyphs:
                "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
              sources: {},
              layers: [
                {
                  id: BACKGROUND_LAYER,
                  type: "background",
                  paint: { "background-color": readBackground() },
                },
              ],
            },
      ...("bounds" in lab.view
        ? {
            bounds: boundsPair(lab.view.bounds),
            fitBoundsOptions: fitOptions(lab.view),
          }
        : { center: lab.view.center, zoom: lab.view.zoom }),
      ...cameraFor(lab.view, container.clientWidth < 640),
      minZoom: lab.minZoom,
      maxZoom: lab.maxZoom,
      // La molette zoome directement, sans Ctrl.
      //
      // La contrainte inverse — exiger Ctrl — protège le défilement d'un
      // article quand une carte est posée au milieu du texte. Ici la carte
      // occupe la page entière : il n'y a rien derrière elle à faire défiler,
      // donc rien à protéger, et l'exigence ne faisait que gêner.
      //
      // Le jour où un lab revient s'insérer dans une colonne de lecture, la
      // question se reposera — mais elle se posera pour ce lab-là, pas ici.
      cooperativeGestures: false,
      attributionControl: {
        compact: true,
        // L'attribution d'un fond n'est pas une politesse : la plupart des
        // fournisseurs l'exigent par licence. Elle est déclarée dans le lab
        // plutôt que devinée du style — tous ne la portent pas.
        ...(basemap.kind === "style" && basemap.attribution
          ? { customAttribution: basemap.attribution[lang] }
          : {}),
      },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    /**
     * L'ORDRE des couches de portée, du bas vers le haut. Appliqué chaque fois
     * qu'une couche est posée ou déplacée : la tache était redescendue sous les
     * couches du lab après coup, et passait alors AU-DESSUS des lieux.
     * Chaque couche est glissée juste sous la première couche du lab, dans
     * l'ordre : elles s'empilent donc comme la liste.
     */
    const ORDRE_PORTEE = [
      "lab-reach",
      "lab-hex",
      "lab-hex-coupure",
      "lab-cvc-liseret",
      "lab-cvc",
      "lab-cvc-realise",
      "lab-blanc-liseret",
      "lab-blanc",
      "lab-blanc-dame",
      "lab-corridors-ete-liseret",
      "lab-corridors-ete",
      "lab-acces-liseret",
      "lab-acces",
      "lab-acces-arrivee",
      "lab-reach-lignes",
      "lab-route-lisere",
      "lab-route",
      "lab-route-marque",
      "lab-lieux-halo",
      "lab-lieux-bord",
      "lab-lieux",
      "lab-lieu-choisi",
      "lab-epingle",
      "lab-route-tete",
      "lab-route-tete-velo",
      "lab-route-points",
      "lab-route-lettres",
    ];
    const ordonnerPortee = () => {
      const sous = map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined;
      for (const id of ORDRE_PORTEE) {
        if (map.getLayer(id)) map.moveLayer(id, sous);
      }
    };

    // Le curseur « au repos » de la carte : celui du lab s'il en déclare un,
    // sinon celui de MapLibre. Le gestionnaire de survol y revient chaque fois
    // qu'il quitte une entité, au lieu de forcer la flèche.
    // Couleur forte de la saison (le palier le plus foncé de la tache) : la
    // tête du trajet la porte, comme les boutons.
    const couleurSaison = () =>
      ((hiverRef.current && lab.reach?.winter?.bands ? lab.reach.winter.bands : lab.reach?.bands) ?? [])[0]?.color ??
      "#14261f";
    teteSaisonRef.current = () => {
      if (map.getLayer("lab-route-tete")) map.setPaintProperty("lab-route-tete", "circle-color", couleurSaison());
    };
    const curseurCarte = lab.cursor ?? "";
    map.getCanvas().style.cursor = curseurCarte;
    if (lab.cursor) {
      // MapLibre pose son propre curseur (main ouverte) sur le conteneur du
      // canevas pendant le glissement : on garde le nôtre au repos.
      map.getCanvasContainer().style.cursor = curseurCarte;
    }

    /**
     * Portée sous le curseur (`lab.reach`).
     *
     * La tache est peinte dans un canevas — une cellule de ≈ 100 m par pixel —
     * que MapLibre affiche comme une image calée sur la grille du graphe. Pas
     * de GeoJSON régénéré à chaque mouvement : redessiner quelques milliers de
     * polygones par image figerait la carte, remplir un tableau de pixels ne
     * coûte rien.
     *
     * Le graphe est demandé dès la création de la carte, en parallèle du fond ;
     * la couche n'est posée qu'une fois les deux prêts.
     */
    const reach = lab.reach;
    const sceneCourante = { index: 0 };
    /** `complet` faux : simple mouvement du curseur (voir `toutRecalculer`). */
    let redessinerPortee: (complet?: boolean) => void = () => {};
    if (reach) {
      const canevas = document.createElement("canvas");
      const contexte = canevas.getContext("2d");
      const versRgba = (liste: typeof reach.bands): ReachBand[] =>
        liste.map((b) => {
          const hex = b.color.replace("#", "");
          return {
            max: b.max,
            rgba: [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(2, 4), 16),
              parseInt(hex.slice(4, 6), 16),
              Math.round(b.opacity * 255),
            ],
          };
        });
      // Une palette par saison : la couleur dit la saison avant l'interrupteur.
      const bandesEte = versRgba(reach.bands);
      const bandesHiver = versRgba(reach.winter?.bands ?? reach.bands);
      let moteur: ReachEngine | null = null;
      let noms: ReachNames | null = null;
      /**
       * Tronçons (coordonnées et attributs), demandés au PREMIER passage dans
       * la vue « rues exposées » : la tache seule n'en a pas besoin, et ils
       * pèsent 1,6 Mo.
       */
      type Troncons = {
        lon: Float64Array;
        lat: Float64Array;
        l: number[];
        c: number[];
        va: number[];
        dpa: number[];
        dpr: number[];
        pm: number[];
        /** Altitude des nœuds (m), pour le profil ; absente du v1. */
        z: Float64Array | null;
        /** Entretien d'hiver par arête (0 rien, 1 damé, 2 déneigé) ; v3. */
        h: number[] | null;
        /** Corridor VivaCité par arête (0 non, 1 réalisé, 2 projeté) ; v3. */
        cvc: number[] | null;
      };
      let troncons: Troncons | null = null;
      let tronconsDemandes = false;
      const chargerTroncons = () => {
        if (tronconsDemandes || !reach.exposure) return;
        tronconsDemandes = true;
        fetch(reach.exposure.segments)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((t: Omit<Troncons, "lon" | "lat" | "z" | "h" | "cvc"> & { dlon: number[]; dlat: number[]; z?: number[]; h?: number[]; cvc?: number[] }) => {
            // Coordonnées en écarts × 1e5, altitudes en écarts de décimètres :
            // on les cumule une fois.
            const n = t.dlon.length;
            const lon = new Float64Array(n);
            const lat = new Float64Array(n);
            const z = t.z ? new Float64Array(n) : null;
            let x = 0;
            let y = 0;
            let h = 0;
            for (let i = 0; i < n; i++) {
              x += t.dlon[i];
              y += t.dlat[i];
              lon[i] = x / 1e5;
              lat[i] = y / 1e5;
              if (z && t.z) {
                h += t.z[i];
                z[i] = h / 10;
              }
            }
            troncons = { lon, lat, l: t.l, c: t.c, va: t.va, dpa: t.dpa, dpr: t.dpr, pm: t.pm, z, h: t.h ?? null, cvc: t.cvc ?? null };
            redessinerPortee();
          })
          .catch((err) => console.error("[lab]", lab.id, "tronçons introuvables :", err));
      };
      const bandeNeutre: ReachBand[] = reach.exposure
        ? (() => {
            const hex = reach.exposure.patch.color.replace("#", "");
            return [
              {
                max: reach.bands[reach.bands.length - 1].max,
                rgba: [
                  parseInt(hex.slice(0, 2), 16),
                  parseInt(hex.slice(2, 4), 16),
                  parseInt(hex.slice(4, 6), 16),
                  Math.round(reach.exposure.patch.opacity * 255),
                ],
              },
            ];
          })()
        : [];
      // ── Colmena de confort (vue « confort à vélo ») ──────────────────────
      const budgetTache = reach.bands[reach.bands.length - 1].max;
      const hex = reach.exposure?.hex ? grilleHex(reach.exposure.hex.size) : null;
      /**
       * Nœuds où une PISTE s'ARRÊTE sur une rue exposée : une seule arête
       * de piste ou de sentier, et c'est une vraie piste d'au moins 100 m ;
       * aucune rue calme ; au moins une rue exposée. Les sentiers de parc
       * et les bouts de raccord sont écartés : avec eux, 806 coupures sur la
       * zone (39 % des alvéoles rouges à Lévis), sans eux 104 — le rouge
       * redevient un signal. Calculés une fois, tronçons et graphe chargés.
       */
      let coupures: Int32Array | null = null;
      const trouverCoupures = () => {
        if (coupures || !troncons || !moteur) return coupures;
        const e = moteur.g.e;
        const n = moteur.n;
        const piste = new Uint8Array(n);
        const vraie = new Uint8Array(n);
        const calme = new Uint8Array(n);
        const expo = new Uint8Array(n);
        for (let a = 0; a < e.length / 5; a++) {
          const c = troncons.c[a];
          for (const x of [e[5 * a], e[5 * a + 1]]) {
            if (c === 0 || c === 3) {
              piste[x]++;
              if (c === 0 && troncons.l[a] >= 100) vraie[x]++;
            } else if (c === 1) calme[x]++;
            else if (c === 2) expo[x]++;
          }
        }
        const liste: number[] = [];
        for (let x = 0; x < n; x++) if (piste[x] === 1 && vraie[x] === 1 && calme[x] === 0 && expo[x] > 0) liste.push(x);
        coupures = Int32Array.from(liste);
        return coupures;
      };
      /**
       * Les hexagones de la tache qu'on vient de peindre : pour chacun, les
       * km parcourus et leur confort pondéré ; en rouge s'il porte une
       * coupure atteinte. À appeler JUSTE après `peindre` (on relit son
       * parcours). Renvoie aussi le confort moyen et le nombre de coupures.
       */
      /** Nœuds touchés par un corridor (réalisé ou projeté) : leurs coupures se referment. */
      let noeudsCvc: Uint8Array | null = null;
      const colmena = (enHiver: boolean, avecCorridors: boolean) => {
        if (!hex || !troncons || !moteur || !reach.exposure?.hex) return null;
        const t = troncons;
        const conf = reach.exposure.hex;
        const poids = conf.weights;
        const hv = conf.winter;
        const e = moteur.g.e;
        /**
         * Poids de confort d'une arête selon la saison et le scénario :
         * - avec les corridors, toute voie d'un corridor compte 1, été comme
         *   hiver (réseau quatre saisons) ;
         * - l'hiver, une piste ne compte que déneigée (poids d'été) ou damée
         *   (`packed`) ; une rue calme compte `calm` ; le reste comme l'été.
         */
        const poidsArete = (a: number, hiverIci: boolean, cvcIci: boolean) => {
          if (cvcIci && t.cvc && t.cvc[a] > 0) return 1;
          const c = t.c[a];
          if (!hiverIci || !hv) return poids[c] ?? 0;
          if (c === 0 || c === 3) {
            const h = t.h?.[a] ?? 0;
            return h === 2 ? (poids[c] ?? 0) : h === 1 ? hv.packed : 0;
          }
          if (c === 1) return hv.calm;
          return poids[c] ?? 0;
        };
        /*
         * Un hexagone que TOUCHE une piste monte d'un coup (demande de
         * l'auteur) : c'est elle qui rend le quartier praticable. ≥ 80 m de
         * piste dans l'hexagone → confort au moins 0,85 (cran le plus foncé).
         * L'ÉTÉ, toute piste ou sentier compte ; l'HIVER, seulement une piste
         * déneigée (0,85) ou damée (au moins 0,65). La même règle aux deux
         * saisons : appliquée à l'hiver seul, elle mettait l'hiver AU-DESSUS
         * de l'été (Saint-Roch 55 contre 52). La piste est parcourue tous les
         * 50 m, pour compter chaque hexagone qu'elle traverse.
         */
        const SEUIL_PISTE = 80;
        const PLANCHER_DENEIGE = 0.85;
        const PLANCHER_DAME = 0.65;
        const cellules = new Map<string, { l: number; w: number; coupe: boolean; dn: number; dm: number }>();
        let lTot = 0;
        let wTot = 0;
        // Les quatre lectures (été / hiver × aujourd'hui / corridors), pour
        // les chiffres du panneau ; la colmena dessine celle qui est choisie.
        const sommes = { ete: 0, hiver: 0, eteCvc: 0, hiverCvc: 0 };
        for (const { arete, partU, partV } of moteur.parcourues(budgetTache)) {
          const u = e[5 * arete];
          const v = e[5 * arete + 1];
          const couvert = Math.min(1, partU + partV);
          const l = couvert * t.l[arete];
          if (l <= 0) continue;
          // Milieu de la part atteinte : depuis u si c'est par là qu'on entre.
          const [a, b, f] = partU >= partV ? [u, v, Math.min(1, partU) / 2] : [v, u, Math.min(1, partV) / 2];
          const lon = t.lon[a] + (t.lon[b] - t.lon[a]) * f;
          const lat = t.lat[a] + (t.lat[b] - t.lat[a]) * f;
          const k = hex.cle(lon, lat);
          const w = poidsArete(arete, enHiver, avecCorridors) * l;
          sommes.ete += poidsArete(arete, false, false) * l;
          sommes.hiver += poidsArete(arete, true, false) * l;
          sommes.eteCvc += poidsArete(arete, false, true) * l;
          sommes.hiverCvc += poidsArete(arete, true, true) * l;
          const cell = cellules.get(k) ?? { l: 0, w: 0, coupe: false, dn: 0, dm: 0 };
          cell.l += l;
          cell.w += w;
          cellules.set(k, cell);
          lTot += l;
          wTot += w;
          // Piste praticable (l'été toute piste, l'hiver si entretenue) : sa
          // longueur atteinte, répartie sur chaque hexagone qu'elle traverse
          // (un point tous les 50 m). L'été, elle compte comme « déneigée ».
          const hEntretien = enHiver ? (t.h?.[arete] ?? 0) : 2;
          if (hEntretien && (t.c[arete] === 0 || t.c[arete] === 3)) {
            const [a0, b0, f0] = partU >= partV ? [u, v, Math.min(1, partU)] : [v, u, Math.min(1, partV)];
            const n = Math.max(1, Math.ceil(l / 50));
            for (let s = 0; s < n; s++) {
              const fs = (f0 * (s + 0.5)) / n;
              const ks = hex.cle(t.lon[a0] + (t.lon[b0] - t.lon[a0]) * fs, t.lat[a0] + (t.lat[b0] - t.lat[a0]) * fs);
              const cs = cellules.get(ks) ?? { l: 0, w: 0, coupe: false, dn: 0, dm: 0 };
              if (hEntretien === 2) cs.dn += l / n;
              else cs.dm += l / n;
              cellules.set(ks, cs);
            }
          }
        }
        /** Confort d'un hexagone : pondéré, relevé l'hiver par une piste entretenue. */
        const confortCellule = (c: { l: number; w: number; dn: number; dm: number }) => {
          let i = c.l > 0 ? c.w / c.l : 0;
          if (c.dn >= SEUIL_PISTE) i = Math.max(i, PLANCHER_DENEIGE);
          else if (c.dn + c.dm >= SEUIL_PISTE) i = Math.max(i, PLANCHER_DAME);
          return i;
        };
        const cp = trouverCoupures();
        // Avec les corridors, une coupure posée sur un corridor se referme.
        if (avecCorridors && t.cvc && !noeudsCvc) {
          noeudsCvc = new Uint8Array(moteur.n);
          for (let a = 0; a < t.cvc.length; a++) {
            if (t.cvc[a] > 0) {
              noeudsCvc[e[5 * a]] = 1;
              noeudsCvc[e[5 * a + 1]] = 1;
            }
          }
        }
        let nCoupures = 0;
        if (cp && cp.length) {
          const temps = moteur.tempsVers(cp);
          for (let i = 0; i < cp.length; i++) {
            if (Number.isNaN(temps[i])) continue;
            if (avecCorridors && noeudsCvc?.[cp[i]]) continue;
            const cell = cellules.get(hex.cle(t.lon[cp[i]], t.lat[cp[i]]));
            if (!cell) continue;
            if (!cell.coupe) nCoupures++;
            cell.coupe = true;
          }
        }
        const features: unknown[] = [];
        // Confort moyen de la tache, avec les mêmes valeurs que les
        // hexagones (l'hiver, relevés par les pistes entretenues).
        let lMoy = 0;
        let iMoy = 0;
        for (const [k, c] of cellules) {
          const touchePiste = c.dn + c.dm >= SEUIL_PISTE;
          // Moins de 60 m de voies : trop peu pour juger un hexagone — sauf
          // s'il porte une coupure, ou une piste praticable.
          if (c.l < 60 && !c.coupe && !touchePiste) continue;
          const i = confortCellule(c);
          lMoy += c.l;
          iMoy += i * c.l;
          features.push({
            type: "Feature",
            properties: { i, c: c.coupe ? 1 : 0 },
            geometry: { type: "Polygon", coordinates: [hex.anneau(k)] },
          });
        }
        return {
          donnees: { type: "FeatureCollection", features },
          confort: {
            indice: lMoy > 0 ? iMoy / lMoy : lTot > 0 ? wTot / lTot : 0,
            coupures: nCoupures,
            hexagones: features.length,
            lectures:
              lTot > 0
                ? {
                    ete: sommes.ete / lTot,
                    hiver: sommes.hiver / lTot,
                    eteCvc: sommes.eteCvc / lTot,
                    hiverCvc: sommes.hiverCvc / lTot,
                  }
                : undefined,
          },
        };
      };
      let hexPeints = false;
      let cvcPeints = false;
      /**
       * Nœuds des pistes déneigées / damées (classes piste, sentier), et les
       * PISTES DÉNEIGÉES en morceaux continus : chaque morceau (composante
       * connexe du réseau déneigé) est « une piste » pour le panneau ; ceux
       * de moins de 300 m sont ignorés. Calculés une fois.
       */
      type NoeudsHiver = {
        deneige: Int32Array;
        dame: Int32Array;
        /** Pour chaque nœud de `deneige` : son morceau (-1 si trop court). */
        morceau: Int32Array;
        /** Arêtes de chaque morceau, pour le nommer. */
        aretes: Map<number, number[]>;
      };
      /**
       * Les corridors VivaCité RÉALISÉS (tronçons `cvc` = 1, couche officielle
       * de la Ville), en morceaux continus d'au moins 200 m : l'été, le clic
       * trace un chemin vers chacun. Les corridors projetés (tracé indicatif)
       * ne sont pas utilisés ici. Calculés une fois.
       */
      type NoeudsCorridors = { noeuds: Int32Array; morceau: Int32Array; aretes: Map<number, number[]> };
      let corridorsNoeuds: NoeudsCorridors | null = null;
      const noeudsCorridors = (): NoeudsCorridors => {
        if (corridorsNoeuds) return corridorsNoeuds;
        const vide = { noeuds: new Int32Array(0), morceau: new Int32Array(0), aretes: new Map<number, number[]>() };
        if (!troncons?.cvc || !moteur) return vide;
        const e = moteur.g.e;
        const parent = new Map<number, number>();
        const racine = (x: number): number => {
          let r = x;
          while (parent.get(r) !== r) r = parent.get(r)!;
          return r;
        };
        const liste: number[] = [];
        for (let a = 0; a < troncons.cvc.length; a++) {
          if (troncons.cvc[a] !== 1) continue;
          const u = e[5 * a];
          const v = e[5 * a + 1];
          for (const x of [u, v]) if (!parent.has(x)) parent.set(x, x);
          const ru = racine(u);
          const rv = racine(v);
          if (ru !== rv) parent.set(ru, rv);
          liste.push(a);
        }
        const longueur = new Map<number, number>();
        const aretes = new Map<number, number[]>();
        for (const a of liste) {
          const r = racine(e[5 * a]);
          longueur.set(r, (longueur.get(r) ?? 0) + troncons.l[a]);
          const l = aretes.get(r);
          if (l) l.push(a);
          else aretes.set(r, [a]);
        }
        const noeuds = Int32Array.from(parent.keys());
        const morceau = new Int32Array(noeuds.length);
        for (let k = 0; k < noeuds.length; k++) {
          const r = racine(noeuds[k]);
          morceau[k] = (longueur.get(r) ?? 0) >= 200 ? r : -1;
        }
        corridorsNoeuds = { noeuds, morceau, aretes };
        return corridorsNoeuds;
      };
      /**
       * Nom d'une piste déneigée (un morceau) : le nom qui y court sur le plus
       * de mètres, hors génériques (« Trottoir… », « Rue sans nom »). Le nom
       * du seul nœud d'arrivée donnait souvent le trottoir qui le touche.
       */
      const GENERIQUES_PISTE = new Set(["Trottoir ou passage piéton", "Rue sans nom", "Piste cyclable", "Sentier"]);
      const nomsMorceaux = new Map<string, string>();
      const nomMorceau = (mc: number, aretes: number[], espace = "h") => {
        const deja = nomsMorceaux.get(`${espace}${mc}`);
        if (deja) return deja;
        if (!noms || !troncons) return lang === "fr" ? "Piste cyclable" : "Bike path";
        const parNom = new Map<string, number>();
        for (const a of aretes) {
          const n = noms.noms[noms.arete[a]];
          if (!n || GENERIQUES_PISTE.has(n)) continue;
          parNom.set(n, (parNom.get(n) ?? 0) + troncons.l[a]);
        }
        let meilleur = lang === "fr" ? "Piste cyclable" : "Bike path";
        let lmax = 0;
        for (const [n, l] of parNom) {
          if (l > lmax) {
            lmax = l;
            meilleur = n;
          }
        }
        nomsMorceaux.set(`${espace}${mc}`, meilleur);
        return meilleur;
      };
      let hiverNoeuds: NoeudsHiver | null = null;
      const noeudsHiver = (): NoeudsHiver => {
        if (hiverNoeuds) return hiverNoeuds;
        const vide = { deneige: new Int32Array(0), dame: new Int32Array(0), morceau: new Int32Array(0), aretes: new Map<number, number[]>() };
        if (!troncons?.h || !moteur) return vide;
        const e = moteur.g.e;
        const d = new Set<number>();
        const m = new Set<number>();
        // Union-find sur les nœuds des pistes déneigées.
        const parent = new Map<number, number>();
        const racine = (x: number): number => {
          let r = x;
          while (parent.get(r) !== r) r = parent.get(r)!;
          let y = x;
          while (y !== r) {
            const p = parent.get(y)!;
            parent.set(y, r);
            y = p;
          }
          return r;
        };
        const longueur = new Map<number, number>();
        const aretesDeneigees: number[] = [];
        for (let a = 0; a < troncons.h.length; a++) {
          const c = troncons.c[a];
          if (c !== 0 && c !== 3) continue;
          const u = e[5 * a];
          const v = e[5 * a + 1];
          if (troncons.h[a] === 1) {
            m.add(u);
            m.add(v);
          } else if (troncons.h[a] === 2) {
            d.add(u);
            d.add(v);
            for (const x of [u, v]) if (!parent.has(x)) parent.set(x, x);
            const ru = racine(u);
            const rv = racine(v);
            if (ru !== rv) parent.set(ru, rv);
            aretesDeneigees.push(a);
          }
        }
        const aretes = new Map<number, number[]>();
        for (const a of aretesDeneigees) {
          const r = racine(e[5 * a]);
          longueur.set(r, (longueur.get(r) ?? 0) + troncons.l[a]);
          const liste = aretes.get(r);
          if (liste) liste.push(a);
          else aretes.set(r, [a]);
        }
        const deneige = Int32Array.from(d);
        const morceau = new Int32Array(deneige.length);
        for (let k = 0; k < deneige.length; k++) {
          const r = racine(deneige[k]);
          morceau[k] = (longueur.get(r) ?? 0) >= 300 ? r : -1;
        }
        hiverNoeuds = { deneige, dame: Int32Array.from(m), morceau, aretes };
        return hiverNoeuds;
      };
      let blancPeint = false;
      /**
       * Le réseau d'hiver : les PISTES et sentiers entretenus (`h` 1 damé,
       * 2 déneigé), une ligne par arête ; calculé une fois. Les rues et
       * trottoirs parallèles qui ont pris l'attribut au rattachement
       * (script 11) ne sont pas dessinés.
       */
      /** Les corridors VivaCité réalisés (tracé complet, script 14), chargés au premier été en vue confort. */
      let etePeint = false;
      let eteGeo: unknown = null;
      let eteDemande = false;
      const lignesEte = () => {
        if (eteGeo) return eteGeo;
        const url = reach.exposure?.hex?.winter?.summerPaths;
        if (url && !eteDemande) {
          eteDemande = true;
          fetch(url)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((g: unknown) => {
              eteGeo = g;
              etePeint = false; // force le dessin au prochain passage
              redessinerPortee();
            })
            .catch((err) => console.error("[lab]", lab.id, "corridors introuvables :", err));
        }
        return lignesVides;
      };
      let blancGeo: unknown = null;
      let blancDemande = false;
      const lignesBlanches = () => {
        if (blancGeo) return blancGeo;
        // Le tracé COMPLET (géométrie OpenStreetMap, script 14), chargé une
        // fois : de nœud à nœud, les pistes coupaient les courbes et ne se
        // posaient pas sur les voies du fond de carte.
        const url = reach.exposure?.hex?.winter?.paths;
        if (url) {
          if (!blancDemande) {
            blancDemande = true;
            fetch(url)
              .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
              .then((g: unknown) => {
                blancGeo = g;
                blancPeint = false; // force le dessin au prochain passage
                redessinerPortee();
              })
              .catch((err) => console.error("[lab]", lab.id, "pistes d'hiver introuvables :", err));
          }
          return lignesVides;
        }
        if (!troncons?.h || !moteur) return lignesVides;
        const t = troncons;
        const hv = troncons.h;
        const e = moteur.g.e;
        const features: unknown[] = [];
        for (let a = 0; a < hv.length; a++) {
          if (!hv[a] || (t.c[a] !== 0 && t.c[a] !== 3)) continue;
          const u = e[5 * a];
          const v = e[5 * a + 1];
          features.push({
            type: "Feature",
            properties: { h: hv[a] },
            geometry: { type: "LineString", coordinates: [[t.lon[u], t.lat[u]], [t.lon[v], t.lat[v]]] },
          });
        }
        blancGeo = { type: "FeatureCollection", features };
        return blancGeo;
      };
      /** Les arêtes des corridors, une ligne chacune (`p` : 1 réalisé, 2 projeté) ; calculées une fois. */
      let corridorsGeo: unknown = null;
      const lignesCorridors = () => {
        if (corridorsGeo || !troncons?.cvc || !moteur) return corridorsGeo ?? lignesVides;
        const t = troncons;
        const cvc = troncons.cvc;
        const e = moteur.g.e;
        const features: unknown[] = [];
        for (let a = 0; a < cvc.length; a++) {
          if (!cvc[a]) continue;
          const u = e[5 * a];
          const v = e[5 * a + 1];
          features.push({
            type: "Feature",
            properties: { p: cvc[a] },
            geometry: { type: "LineString", coordinates: [[t.lon[u], t.lat[u]], [t.lon[v], t.lat[v]]] },
          });
        }
        corridorsGeo = { type: "FeatureCollection", features };
        return corridorsGeo;
      };
      const lignesVides = { type: "FeatureCollection" as const, features: [] };
      let lignesPeintes = false;

      // ── Ville des 15 minutes ──────────────────────────────────────────
      /**
       * Un clic en vue « temps de parcours » ÉPINGLE la tache : elle cesse de
       * suivre la souris, et les lieux qu'elle touche apparaissent. Un autre
       * clic l'épingle ailleurs ; Échap ou « Libérer » la rend au curseur.
       */
      let epingle: { lng: number; lat: number } | null = null;
      let animerChute = false;
      /**
       * Tache tout juste fixée : la carte se cadre d'abord sur elle, PUIS les
       * lieux tombent. Pendant le vol, les lieux calculés attendent.
       */
      let cadrerEpingle = false;
      let cadrageEnCours = false;
      let jetonCadrage = 0;
      let pointsEnAttente: PointLieu[] | null = null;
      /** À lancer au bout du vol (les chemins jaunes de « l'hiver ici »). */
      let apresCadrage: (() => void) | null = null;
      const finCadrage = () => {
        if (!cadrageEnCours) return;
        cadrageEnCours = false;
        if (apresCadrage) {
          const f = apresCadrage;
          apresCadrage = null;
          f();
        }
        if (pointsEnAttente) {
          const p = pointsEnAttente;
          pointsEnAttente = null;
          poserLieux(p);
        }
      };
      /**
       * Lieux et leurs ACCÈS : un lieu ponctuel en a un, un lieu étendu (parc,
       * campus, parc linéaire) plusieurs, le long de son contour.
       */
      type Lieux = {
        f: number[];
        g: number[];
        genres: string[];
        n: number[];
        noms: string[];
        aLieu: Int32Array;
        aNoeud: Int32Array;
        aLon: Float64Array;
        aLat: Float64Array;
      };
      let lieux: Lieux | null = null;
      let lieuxDemandes = false;
      const chargerLieux = () => {
        if (lieuxDemandes || !reach.places) return;
        lieuxDemandes = true;
        fetch(reach.places.url)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((l: {
            f: number[];
            g: number[];
            genres: string[];
            n: number[];
            noms: string[];
            a_lieu: number[];
            a_noeud: number[];
            a_lon: number[];
            a_lat: number[];
          }) => {
            lieux = {
              f: l.f,
              g: l.g,
              genres: l.genres,
              n: l.n,
              noms: l.noms,
              aLieu: Int32Array.from(l.a_lieu),
              aNoeud: Int32Array.from(l.a_noeud),
              aLon: Float64Array.from(l.a_lon, (v) => v / 1e5),
              aLat: Float64Array.from(l.a_lat, (v) => v / 1e5),
            };
            redessinerPortee();
          })
          .catch((err) => console.error("[lab]", lab.id, "lieux introuvables :", err));
      };
      let chute = 0;
      /**
       * Les lieux TOMBENT sur la carte : chacun part 70 px au-dessus de sa
       * place et s'y pose avec un rebond. Ils tombent dans l'ordre du temps
       * d'accès — les plus proches d'abord — : l'onde part du point épinglé et
       * s'étend comme la tache. Sans animation si le système le demande.
       */
      /** `p` = 1 : le lieu le plus proche de sa fonction (mis en avant). */
      type PointLieu = { lon: number; lat: number; f: number; nom: string; t: number; noeud: number; genre: string; p: number };
      const poserLieux = (points: PointLieu[]) => {
        const src = map.getSource("lab-lieux") as { setData: (d: unknown) => void } | undefined;
        if (!src) return;
        cancelAnimationFrame(chute);
        // La carte vole vers la tache : les lieux tomberont à l'arrivée.
        if (cadrageEnCours) {
          pointsEnAttente = points;
          src.setData(lignesVides);
          return;
        }
        const entite = (p: (typeof points)[number], dLat: number, o: number) => ({
          type: "Feature",
          properties: { f: p.f, nom: p.nom, t: p.t, o, noeud: p.noeud, genre: p.genre, lon: p.lon, lat: p.lat, p: p.p },
          geometry: { type: "Point", coordinates: [p.lon, p.lat + dLat] },
        });
        const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!animerChute || reduit) {
          src.setData({ type: "FeatureCollection", features: points.map((p) => entite(p, 0, 1)) });
          return;
        }
        animerChute = false;
        const budget = reach.bands[reach.bands.length - 1].max;
        const debut = performance.now();
        const DUREE = 520;
        const ETALEMENT = 900;
        // Rebond « ease-out bounce » : la chute, puis deux petits rebonds.
        const rebond = (x: number) => {
          const n = 7.5625;
          const d = 2.75;
          if (x < 1 / d) return n * x * x;
          if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
          if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
          return n * (x -= 2.625 / d) * x + 0.984375;
        };
        const image = () => {
          // Mètres par pixel au zoom courant : le décalage est en pixels
          // d'écran, la coordonnée en degrés.
          const zoom = map.getZoom();
          const maintenant = performance.now() - debut;
          let fini = true;
          const features = points.map((p) => {
            const retard = (p.t / budget) * ETALEMENT;
            const x = Math.min(1, Math.max(0, (maintenant - retard) / DUREE));
            if (x < 1) fini = false;
            const mpp = (40075016.686 * Math.cos((p.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
            const px = (1 - rebond(x)) * 70;
            return entite(p, (px * mpp) / 111320, Math.min(1, x * 3));
          });
          src.setData({ type: "FeatureCollection", features });
          if (!fini) chute = requestAnimationFrame(image);
        };
        chute = requestAnimationFrame(image);
      };
      // Clic droit : libère la tache épinglée. Le menu du navigateur n'est
      // retenu QUE s'il y a une tache à libérer ; sinon le clic droit reste
      // celui du navigateur.
      map.on("contextmenu", (e) => {
        if (!epingle) return;
        e.originalEvent.preventDefault();
        libererRef.current();
      });
      zoomLieuRef.current = (lon: number, lat: number) => {
        lieuCerne = [lon, lat];
        cerner(lieuCerne);
        const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        map.flyTo({
          center: [lon, lat],
          zoom: Math.max(map.getZoom(), 15.5),
          duration: reduit ? 0 : 900,
          // Les panneaux ouverts flottent sur la carte : le lieu se centre
          // dans ce qui reste visible entre eux. Un DÉCALAGE, pas un
          // `padding` : celui-ci resterait collé à la caméra et s'ajouterait
          // à celui de `fitBounds` (cadrage impossible, rien ne bouge).
          offset: [(margesRef.current.left - margesRef.current.right) / 2, 0],
        });
      };
      // Le lieu cerné par le zoom (ou aucun) : le survol de la liste le
      // remplace un instant, puis lui rend la main.
      let lieuCerne: [number, number] | null = null;
      const cerner = (c: [number, number] | null) =>
        (map.getSource("lab-lieu-choisi") as { setData: (d: unknown) => void } | undefined)?.setData(
          c
            ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }] }
            : lignesVides,
        );
      surlignerRef.current = (l) => cerner(l ? [l.lon, l.lat] : lieuCerne);
      // Fiche d'un lieu : ouverte au clic sur un point, suit la carte quand
      // elle bouge, se referme au prochain épinglage.
      let ficheLieu: (Lieu & { nom: string }) | null = null;
      let enChoix = false;
      const placerFiche = () => {
        if (!ficheLieu) return;
        const p = map.project([ficheLieu.lng, ficheLieu.lat]);
        setFichePos({ x: p.x, y: p.y });
      };
      map.on("move", placerFiche);
      fermerFicheRef.current = () => {
        ficheLieu = null;
        enChoix = false;
        setFiche(null);
        setFichePos(null);
      };
      choisirDestinationRef.current = (v: boolean) => {
        enChoix = v;
        setFiche((f) => (f ? { ...f, choix: v } : f));
      };
      echapRef.current = () => {
        if (enChoix) choisirDestinationRef.current(false);
        else if (ficheLieu) fermerFicheRef.current();
        else libererRef.current();
      };
      libererRef.current = () => {
        fermerFicheRef.current();
        reinitItineraireRef.current();
        // Les chemins vers les pistes d'hiver sont effacés avec le reste : la
        // prochaine tache les redessinera, même au même endroit.
        effacerAcces();
        setRouteNoms(null);
        epingle = null;
        lieuCerne = null;
        cadrerEpingle = false;
        cadrageEnCours = false;
        pointsEnAttente = null;
        (map.getSource("lab-lieu-choisi") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
        cancelAnimationFrame(chute);
        setInfoLieux(null);
        setInfoHiver(null);
        setSurvolLieu(null);
        (map.getSource("lab-lieux") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
        (map.getSource("lab-epingle") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
        redessinerPortee();
      };

      // ── Itinéraire ────────────────────────────────────────────────────
      type Lieu = { noeud: number; lng: number; lat: number };
      let routeA: Lieu | null = null;
      let routeB: Lieu | null = null;
      reinitItineraireRef.current = () => {
        cancelAnimationFrame(animRoute);
        animRoute = 0;
        setMinutesAnim(null);
        sourceTete()?.setData(lignesVides);
        (map.getSource("lab-route-marque") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
        routeA = null;
        routeB = null;
        setInfoItineraire(null);
        (map.getSource("lab-route") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
        (map.getSource("lab-route-points") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
      };
      /** Second lieu choisi (carte ou liste) : l'itinéraire du premier vers lui. */
      const routerVers = (lieu: Lieu, nom: string) => {
        if (!ficheLieu || lieu.noeud === ficheLieu.noeud) return;
        routeA = { noeud: ficheLieu.noeud, lng: ficheLieu.lng, lat: ficheLieu.lat };
        routeB = lieu;
        setRouteNoms({ a: ficheLieu.nom, b: nom });
        setPliD(false);
        // Le cercle d'un lieu (zoom ou survol de la liste) n'a plus d'objet :
        // la liste se cache d'un coup, sa sortie de survol n'arrive jamais.
        lieuCerne = null;
        cerner(null);
        animerRoute = true;
        fermerFicheRef.current();
        chargerTroncons();
        redessinerPortee();
      };
      lieuListeRef.current = (l) => {
        if (enChoix && ficheLieu) routerVers({ noeud: l.noeud, lng: l.lon, lat: l.lat }, l.nom);
        else zoomLieuRef.current(l.lon, l.lat);
      };
      /**
       * Dessine l'itinéraire le plus rapide de A à B et remplit le panneau :
       * temps, distance, dénivelé, part tranquille, et les étapes — les
       * arêtes consécutives d'une même voie et d'une même difficulté réunies.
       */
      let animerRoute = false;
      let animRoute = 0;
      /** Emprise de la tache peinte en dernier, pour cadrer le trajet. */
      let empriseTache: [number, number, number, number] | null = null;
      const sourceTete = () => map.getSource("lab-route-tete") as { setData: (d: unknown) => void } | undefined;
      // Couleurs du trajet : vert tranquille, rouge exposé (validées : écart
      // daltonien 8,0, contraste ≥ 3:1 sur le fond). La marque blanche
      // discontinue sur l'exposé double le code couleur.
      const VERT_TRAJET = "#0f8a5f";
      const ROUGE_TRAJET = "#c81e1e";
      const TRANSPARENT = "rgba(0,0,0,0)";
      // 60 m : à l'échelle du quartier, 20 m ne faisaient que 2 ou 3 pixels et
      // l'angle restait droit à l'œil. Toujours borné à la moitié du tronçon.
      const RAYON_VIRAGE = 60; // m

      type Segment = { a: number[]; b: number[]; debut: number; minutes: number; expose: boolean };
      type Trajet = { c: number[][]; t: number[]; d: number[]; exp: boolean[]; total: number; long: number };

      /**
       * Le trajet en UNE ligne, virages arrondis : à chaque angle, la ligne
       * quitte la droite jusqu'à 60 m avant le sommet et rejoint la suivante
       * autant après, par une courbe de Bézier. Rayon FIXE (moins si le tronçon est
       * court) : un lissage global couperait à travers les îlots. Chaque
       * sommet garde son heure de passage — l'animation suit le temps, pas la
       * distance — et chaque morceau sa difficulté.
       */
      const lisserTrajet = (segments: Segment[]): Trajet => {
        const lat0 = segments[0]?.a[1] ?? 46.8;
        const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
        const ky = 110540;
        const m = (p: number[], q: number[]) => Math.hypot((q[0] - p[0]) * kx, (q[1] - p[1]) * ky);
        // Sommets bruts, heures, difficulté du morceau qui y arrive.
        const V: number[][] = [];
        const T: number[] = [];
        const E: boolean[] = [];
        for (const sg of segments) {
          if (!V.length) {
            V.push(sg.a);
            T.push(sg.debut);
            E.push(sg.expose);
          }
          if (m(V[V.length - 1], sg.b) < 0.5) {
            T[T.length - 1] = sg.debut + sg.minutes;
            continue;
          }
          V.push(sg.b);
          T.push(sg.debut + sg.minutes);
          E.push(sg.expose);
        }
        const c: number[][] = [V[0]];
        const t: number[] = [T[0]];
        const exp: boolean[] = [E[0]];
        for (let k = 1; k < V.length - 1; k++) {
          const lp = m(V[k - 1], V[k]);
          const ln = m(V[k], V[k + 1]);
          const r = Math.min(RAYON_VIRAGE, lp / 2, ln / 2);
          // Angle presque plat : on garde le sommet tel quel.
          const ux = (V[k][0] - V[k - 1][0]) * kx, uy = (V[k][1] - V[k - 1][1]) * ky;
          const vx = (V[k + 1][0] - V[k][0]) * kx, vy = (V[k + 1][1] - V[k][1]) * ky;
          const cos = (ux * vx + uy * vy) / Math.max(lp * ln, 1e-9);
          if (r < 1 || cos > 0.996) {
            c.push(V[k]);
            t.push(T[k]);
            exp.push(E[k]);
            continue;
          }
          const pa = [V[k][0] + (V[k - 1][0] - V[k][0]) * (r / lp), V[k][1] + (V[k - 1][1] - V[k][1]) * (r / lp)];
          const pb = [V[k][0] + (V[k + 1][0] - V[k][0]) * (r / ln), V[k][1] + (V[k + 1][1] - V[k][1]) * (r / ln)];
          const ta = T[k] - (r / lp) * (T[k] - T[k - 1]);
          const tb = T[k] + (r / ln) * (T[k + 1] - T[k]);
          const PAS = 10;
          for (let i = 0; i <= PAS; i++) {
            const u = i / PAS;
            const w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
            c.push([w0 * pa[0] + w1 * V[k][0] + w2 * pb[0], w0 * pa[1] + w1 * V[k][1] + w2 * pb[1]]);
            t.push(ta + (tb - ta) * u);
            exp.push(i === 0 ? E[k] : u <= 0.5 ? E[k] : E[k + 1]);
          }
        }
        if (V.length > 1) {
          c.push(V[V.length - 1]);
          t.push(T[T.length - 1]);
          exp.push(E[E.length - 1]);
        }
        const d: number[] = [0];
        for (let i = 1; i < c.length; i++) d.push(d[i - 1] + m(c[i - 1], c[i]));
        return { c, t, d, exp, total: t[t.length - 1] - t[0], long: d[d.length - 1] };
      };

      /** Dégradé le long de la ligne : couleurs par morceau, transparent après `p`. */
      const degrade = (tr: Trajet, p: number) => {
        const expr: unknown[] = ["step", ["line-progress"], tr.exp[1] ? ROUGE_TRAJET : VERT_TRAJET];
        let derniere = expr[2];
        let dernierPas = 0;
        for (let i = 2; i < tr.c.length; i++) {
          const couleur = tr.exp[i] ? ROUGE_TRAJET : VERT_TRAJET;
          const f = tr.long > 0 ? tr.d[i - 1] / tr.long : 0;
          if (couleur === derniere || f <= dernierPas || f >= p) continue;
          expr.push(f, couleur);
          derniere = couleur;
          dernierPas = f;
        }
        if (p < 1) expr.push(Math.max(p, dernierPas + 1e-6), TRANSPARENT);
        if (expr.length === 3) expr.push(1, expr[2]);
        return expr;
      };
      const lisere = (p: number) =>
        p < 1 ? ["step", ["line-progress"], "#ffffff", Math.max(p, 1e-6), TRANSPARENT] : ["step", ["line-progress"], "#ffffff", 1, "#ffffff"];

      /** Position, distance parcourue, à l'heure `tau` depuis A. */
      const aLHeure = (tr: Trajet, tau: number) => {
        const cible = tr.t[0] + tau;
        let i = 1;
        while (i < tr.t.length - 1 && tr.t[i] < cible) i++;
        const span = tr.t[i] - tr.t[i - 1];
        const f = span > 0 ? Math.min(1, Math.max(0, (cible - tr.t[i - 1]) / span)) : 1;
        return {
          i,
          pos: [tr.c[i - 1][0] + (tr.c[i][0] - tr.c[i - 1][0]) * f, tr.c[i - 1][1] + (tr.c[i][1] - tr.c[i - 1][1]) * f],
          dist: tr.d[i - 1] + (tr.d[i] - tr.d[i - 1]) * f,
        };
      };

      /** Les morceaux exposés jusqu'à `i`/`pos`, pour la marque blanche. */
      const marquesExposees = (tr: Trajet, jusqua: { i: number; pos: number[] } | null) => {
        const lignes: number[][][] = [];
        let courante: number[][] | null = null;
        const n = jusqua ? jusqua.i : tr.c.length - 1;
        for (let i = 1; i <= n; i++) {
          const fin = jusqua && i === jusqua.i ? jusqua.pos : tr.c[i];
          if (tr.exp[i]) {
            if (!courante) {
              courante = [tr.c[i - 1]];
              lignes.push(courante);
            }
            courante.push(fin);
          } else {
            courante = null;
          }
        }
        return { type: "FeatureCollection", features: lignes.map((l) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: l } })) };
      };

      const peindreTrajet = (tr: Trajet, p: number, jusqua: { i: number; pos: number[] } | null) => {
        const peindre = map.setPaintProperty.bind(map) as (id: string, nom: string, v: unknown) => void;
        if (map.getLayer("lab-route")) peindre("lab-route", "line-gradient", degrade(tr, p));
        if (map.getLayer("lab-route-lisere")) peindre("lab-route-lisere", "line-gradient", lisere(p));
        (map.getSource("lab-route-marque") as { setData: (d: unknown) => void } | undefined)?.setData(marquesExposees(tr, jusqua));
      };

      /**
       * Pose le trajet : la ligne une fois, puis — s'il s'anime — le dégradé
       * qui avance au rythme du TEMPS de la route (la tête ralentit dans les
       * côtes et sur le trottoir du pont). Échelle : 0,15 s par minute de
       * route, bornée à 1,2–6 s ; l'hiver (×1,27) dure donc plus longtemps.
       */
      const lancerTrajet = (tr: Trajet, anime: boolean) => {
        cancelAnimationFrame(animRoute);
        animRoute = 0;
        const src = map.getSource("lab-route") as { setData: (d: unknown) => void } | undefined;
        if (!src || tr.c.length < 2) return;
        src.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: tr.c } }],
        });
        if (!anime) {
          peindreTrajet(tr, 1, null);
          sourceTete()?.setData(lignesVides);
          setMinutesAnim(null);
          return;
        }
        const duree = Math.min(6000, Math.max(1200, tr.total * 150));
        const t0 = performance.now();
        const image = () => {
          const x = Math.min(1, (performance.now() - t0) / duree);
          const ici = aLHeure(tr, x * tr.total);
          const p = tr.long > 0 ? ici.dist / tr.long : 1;
          peindreTrajet(tr, x < 1 ? p : 1, x < 1 ? ici : null);
          sourceTete()?.setData(
            x < 1
              ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: ici.pos } }] }
              : lignesVides,
          );
          setMinutesAnim(x < 1 ? x * tr.total : null);
          animRoute = x < 1 ? requestAnimationFrame(image) : 0;
        };
        animRoute = requestAnimationFrame(image);
      };

      /**
       * Cadre la carte sur la tache fixée (son emprise au dernier palier,
       * étendue au trajet s'il en sort), centrée dans l'espace que laissent
       * les panneaux ouverts. Sous 1 024 px, la feuille des résultats couvre
       * le bas : on garde une marge basse à proportion.
       */
      const cadrerTache = (trajet: number[][], reduit: boolean) => {
        const b = empriseTache ? [...empriseTache] : [Infinity, Infinity, -Infinity, -Infinity];
        for (const [x, y] of trajet) {
          b[0] = Math.min(b[0], x);
          b[1] = Math.min(b[1], y);
          b[2] = Math.max(b[2], x);
          b[3] = Math.max(b[3], y);
        }
        if (!Number.isFinite(b[0])) return;
        // `fitBounds` AJOUTE ses marges à celles déjà collées à la caméra :
        // on repart de zéro (sans effet si aucune n'y est).
        const p = map.getPadding();
        if (p.left || p.right || p.top || p.bottom) map.setPadding({ left: 0, right: 0, top: 0, bottom: 0 });
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        const large = window.matchMedia("(min-width: 1024px)").matches;
        let { left, right } = margesRef.current.cadrage;
        // Jamais plus de marges que de carte : on garde au moins 160 px.
        const exces = left + right + 160 - w;
        if (exces > 0) {
          const k = Math.max(0, (w - 160) / (left + right));
          left *= k;
          right *= k;
        }
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          {
            padding: { left: left + 24, right: right + 24, top: 32, bottom: large ? 32 : Math.round(h * 0.45) },
            duration: reduit ? 0 : 900,
            maxZoom: 15,
          },
        );
      };

      /**
       * « L'hiver ici » : un chemin, le plus rapide en hiver, du départ fixé
       * vers CHAQUE piste déneigée atteinte en 15 min — en jaune, pour
       * ressortir sur la colmena et le bleu des pistes. Les chemins
       * partagent souvent leurs premières rues : ils dessinent un arbre.
       * Recalculés seulement si le départ change (`cleHiver`) : la tache se
       * repeint à chaque mouvement de souris.
       */
      let cleHiver = "";
      let animAcces = 0;
      const tracerAcces = (depart: number, cibles: number[], s: string, facteur: number, saison: "h" | "e") => {
        // La saison fait partie de la clé : passer de l'une à l'autre retrace.
        const cle = `${depart}${saison}`;
        const src = map.getSource("lab-acces") as { setData: (d: unknown) => void } | undefined;
        if (cle === cleHiver || !moteur || !troncons || !src) return;
        cleHiver = cle;
        cancelAnimationFrame(animAcces);
        const t = troncons;
        const e = moteur.g.e;
        const trajets: Trajet[] = [];
        for (const cible of cibles) {
          if (cible === depart) continue;
          const trajet = moteur.itineraire(depart, cible, s, facteur);
          if (!trajet || !trajet.length) continue;
          const segments: Segment[] = [];
          let minutes = 0;
          for (const { arete, depuisU, minutes: m } of trajet) {
            const [de, vers] = depuisU ? [e[5 * arete], e[5 * arete + 1]] : [e[5 * arete + 1], e[5 * arete]];
            segments.push({ a: [t.lon[de], t.lat[de]], b: [t.lon[vers], t.lat[vers]], debut: minutes, minutes: m, expose: t.c[arete] === 2 });
            minutes += m;
          }
          trajets.push(lisserTrajet(segments));
        }
        /**
         * Les chemins à l'heure `tau` (minutes depuis le départ) : chacun
         * coupé là où il en est, une pointe jaune au bout ; arrivé, le
         * point d'arrivée. Même horloge pour tous : les courts arrivent
         * d'abord — comme une onde qui gagne chaque piste à son tour.
         */
        const aLheure = (tau: number) => {
          const features: unknown[] = [];
          for (const tr of trajets) {
            const fini = tau >= tr.t[tr.t.length - 1];
            let coords = tr.c;
            if (!fini) {
              const ici = aLHeure(tr, tau);
              coords = [...tr.c.slice(0, ici.i), ici.pos];
            }
            if (coords.length >= 2) {
              features.push({ type: "Feature", properties: { s: saison }, geometry: { type: "LineString", coordinates: coords } });
            }
            features.push({
              type: "Feature",
              properties: { arrivee: fini ? 1 : 0, s: saison },
              geometry: { type: "Point", coordinates: coords[coords.length - 1] },
            });
          }
          return { type: "FeatureCollection", features };
        };
        const total = Math.max(0, ...trajets.map((tr) => tr.t[tr.t.length - 1]));
        const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduit || total <= 0) {
          src.setData(aLheure(Infinity));
          return;
        }
        // Même échelle que l'itinéraire : 0,15 s par minute, 1,2 à 6 s.
        const duree = Math.min(6000, Math.max(1200, total * 150));
        const lancer = () => {
          const t0 = performance.now();
          const image = () => {
            const x = Math.min(1, (performance.now() - t0) / duree);
            src.setData(aLheure(x * total));
            // Le cycliste de l'en-tête accélère pendant le tracé.
            setMinutesAnim(x < 1 ? x * total : null);
            animAcces = x < 1 ? requestAnimationFrame(image) : 0;
          };
          animAcces = requestAnimationFrame(image);
        };
        // La carte vole vers la tache : les chemins partent à l'arrivée.
        src.setData(lignesVides);
        if (cadrageEnCours) apresCadrage = lancer;
        else lancer();
      };
      const effacerAcces = () => {
        // Rien de tracé (l'été, la tache se repeint à chaque mouvement) : rien à vider.
        if (!cleHiver) return;
        cleHiver = "";
        apresCadrage = null;
        if (animAcces) {
          cancelAnimationFrame(animAcces);
          animAcces = 0;
          setMinutesAnim(null);
        }
        (map.getSource("lab-acces") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
      };

      const tracerItineraire = (s: string, facteur: number) => {
        const srcRoute = map.getSource("lab-route") as { setData: (d: unknown) => void } | undefined;
        const srcPoints = map.getSource("lab-route-points") as { setData: (d: unknown) => void } | undefined;
        if (!moteur || !srcRoute || !srcPoints) return;
        const lieux = [routeA, routeB].filter((l): l is Lieu => l !== null);
        srcPoints.setData({
          type: "FeatureCollection",
          features: lieux.map((l, i) => ({
            type: "Feature",
            properties: { lettre: i === 0 ? "A" : "B" },
            geometry: { type: "Point", coordinates: [l.lng, l.lat] },
          })),
        });
        if (!routeA) {
          srcRoute.setData(lignesVides);
          setInfoItineraire({ etat: "depart" });
          return;
        }
        if (!routeB) {
          srcRoute.setData(lignesVides);
          setInfoItineraire({ etat: routeA.noeud < 0 ? "hors-reseau" : "arrivee" });
          return;
        }
        if (routeA.noeud < 0 || routeB.noeud < 0) {
          srcRoute.setData(lignesVides);
          setInfoItineraire({ etat: "hors-reseau" });
          return;
        }
        if (!troncons) {
          setInfoItineraire({ etat: "chargement" });
          return;
        }
        const trajet = moteur.itineraire(routeA.noeud, routeB.noeud, s, facteur);
        if (!trajet) {
          srcRoute.setData(lignesVides);
          setInfoItineraire({ etat: "introuvable" });
          return;
        }
        const t = troncons;
        const e = moteur.g.e;
        const etapes: NonNullable<InfoItineraire["etapes"]> = [];
        let km = 0;
        let minutes = 0;
        let dPlus = 0;
        let dMoins = 0;
        let kmTranquille = 0;
        // Les mêmes arêtes, orientées dans le sens du trajet, avec l'heure à
        // laquelle on y entre : c'est ce que suit l'animation.
        const segments: Segment[] = [];
        // Profil en long : un point par nœud — distance, altitude, heure, et
        // la nature de l'arête qui y MÈNE (le premier point n'en a pas).
        const profil: NonNullable<InfoItineraire["profil"]> | null = t.z ? { km: [0], z: [], t: [0], expose: [false] } : null;
        for (const { arete, depuisU, minutes: m } of trajet) {
          const u = e[5 * arete];
          const v = e[5 * arete + 1];
          const [de, vers] = depuisU ? [u, v] : [v, u];
          if (profil && t.z) {
            if (!profil.z.length) profil.z.push(t.z[de]);
            profil.km.push(profil.km[profil.km.length - 1] + t.l[arete] / 1000);
            profil.z.push(t.z[vers]);
            profil.t.push(minutes + m);
            profil.expose.push(t.c[arete] === 2);
          }
          segments.push({
            a: [t.lon[de], t.lat[de]],
            b: [t.lon[vers], t.lat[vers]],
            debut: minutes,
            minutes: m,
            expose: t.c[arete] === 2,
          });
          const longueur = t.l[arete] / 1000;
          const exposee = t.c[arete] === 2;
          const aPied = t.c[arete] === 4;
          const montee = depuisU ? t.dpa[arete] : t.dpr[arete];
          km += longueur;
          minutes += m;
          dPlus += montee;
          dMoins += depuisU ? t.dpr[arete] : t.dpa[arete];
          if (!exposee) kmTranquille += longueur;
          const nom = noms?.noms[noms.arete[arete]] ?? "—";
          const derniere = etapes[etapes.length - 1];
          if (derniere && derniere.nom === nom && derniere.expose === exposee && derniere.aPied === aPied) {
            derniere.km += longueur;
            derniere.minutes += m;
            derniere.penteMax = Math.max(derniere.penteMax, t.pm[arete]);
          } else {
            etapes.push({ nom, km: longueur, minutes: m, expose: exposee, aPied, penteMax: t.pm[arete] });
          }
        }
        const lisse = lisserTrajet(segments);
        const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Trajet NOUVEAU (destination tout juste choisie) : la carte se cadre
        // sur la tache entière, trajet compris. Un simple redessin (saison,
        // survol) ne touche pas à la vue.
        const nouveau = animerRoute;
        animerRoute = false;
        if (nouveau) cadrerTache(lisse.c, reduit);
        if (nouveau && !reduit) {
          lancerTrajet(lisse, true);
        } else if (!animRoute) {
          lancerTrajet(lisse, false);
        }
        // Les étapes de moins de 30 m (un bout de trottoir, un raccord de
        // carrefour) encombrent la liste : elles rejoignent la précédente.
        const lisibles: typeof etapes = [];
        for (const etape of etapes) {
          const prec = lisibles[lisibles.length - 1];
          if (prec && etape.km < 0.03) {
            prec.km += etape.km;
            prec.minutes += etape.minutes;
          } else {
            lisibles.push(etape);
          }
        }
        setInfoItineraire({
          etat: "pret",
          minutes,
          km,
          dPlus,
          dMoins,
          partTranquille: km > 0 ? kmTranquille / km : 1,
          etapes: lisibles,
          profil: profil ?? undefined,
        });
      };
      const seuilsSurface = reach.panel?.thresholds ?? [];
      let image: ImageData | null = null;
      let point: { lng: number; lat: number } | null = null;
      let attente = 0;
      let carteChargee = false;
      /**
       * FLUIDITÉ — un mouvement du curseur qui reste sur le même nœud de départ
       * ne change rien à la tache : on ne recalcule pas. Toute autre demande
       * de dessin (saison, vue, clic, données arrivées…) recalcule tout.
       */
      let toutRecalculer = true;
      let dernierDepart = -2;
      /** Rectangle (cellules) de la tache précédente : on n'envoie que ce qui change. */
      let zonePrecedente: { c0: number; c1: number; l0: number; l1: number } | null = null;

      const scenario = () =>
        reach.sceneScenario?.[sceneCourante.index] ??
        Object.keys(moteur?.g.scenarios ?? { A: 0 })[0];

      const peindre = () => {
        attente = 0;
        if (!moteur || !image || !contexte) return;
        const s = scenario();
        const enItineraire = modeRef.current === "itineraire";
        const ici = epingle ?? point;
        const depart = ici && !enItineraire ? moteur.depart(ici.lng, ici.lat, s) : -1;
        // Même nœud, simple mouvement du curseur : la tache n'a pas changé.
        if (!toutRecalculer && depart === dernierDepart) return;
        toutRecalculer = false;
        dernierDepart = depart;
        const enHiver = Boolean(reach.winter) && hiverRef.current;
        // En hiver, l'été est mesuré d'abord, sans peindre : le panneau le
        // montre derrière l'hiver pour lire l'écart.
        const enExpose = Boolean(reach.exposure) && vueRef.current === "expose";
        const km2Ete =
          enHiver && reach.panel ? moteur.mesurer(depart, s, seuilsSurface) : undefined;
        const km2 = moteur.peindre(
          depart,
          s,
          enExpose ? bandeNeutre : enHiver ? bandesHiver : bandesEte,
          image.data,
          seuilsSurface,
          enHiver ? 1 / reach.winter!.speedRatio : 1,
        );
        // Vue « confort à vélo » : la colmena, tirée du parcours qui vient de
        // peindre la tache grise (avant tout autre appel au moteur).
        let confort: InfoPortee["confort"];
        const sourceHex = map.getSource("lab-hex") as { setData: (d: unknown) => void } | undefined;
        const sourceCvc = map.getSource("lab-cvc") as { setData: (d: unknown) => void } | undefined;
        if (enExpose && depart >= 0) {
          chargerTroncons();
          const c = colmena(enHiver, avecCvcRef.current);
          if (c && sourceHex) {
            sourceHex.setData(c.donnees);
            hexPeints = true;
            confort = c.confort;
          }
        } else if (hexPeints && sourceHex) {
          sourceHex.setData(lignesVides);
          hexPeints = false;
        }
        // Les corridors (réalisés et projetés), dessinés seulement quand on
        // les demande, dans la vue confort.
        const voirCvc = enExpose && avecCvcRef.current && Boolean(troncons?.cvc);
        if (sourceCvc && voirCvc !== cvcPeints) {
          sourceCvc.setData(voirCvc ? lignesCorridors() : lignesVides);
          cvcPeints = voirCvc;
        }
        // L'hiver, dans la vue confort : les pistes que la Ville déneige ou dame.
        const sourceBlanc = map.getSource("lab-blanc") as { setData: (d: unknown) => void } | undefined;
        const voirBlanc =
          enExpose && enHiver && (Boolean(reach.exposure?.hex?.winter?.paths) || Boolean(troncons?.h));
        if (sourceBlanc && voirBlanc !== blancPeint) {
          sourceBlanc.setData(voirBlanc ? lignesBlanches() : lignesVides);
          blancPeint = voirBlanc;
        }
        // L'été, dans la vue confort : les corridors VivaCité réalisés.
        const sourceEte = map.getSource("lab-corridors-ete") as { setData: (d: unknown) => void } | undefined;
        const voirEte = enExpose && !enHiver && Boolean(reach.exposure?.hex?.winter?.summerPaths);
        if (sourceEte && voirEte !== etePeint) {
          sourceEte.setData(voirEte ? lignesEte() : lignesVides);
          etePeint = voirEte;
        }
        // N'envoyer que le rectangle qui change : l'ancienne tache (à effacer)
        // et la nouvelle. Puis UNE mise à jour de la texture (source statique).
        const zone = depart >= 0 ? moteur.zonePeinte() : null;
        const rect = [zonePrecedente, zone].reduce<{ c0: number; c1: number; l0: number; l1: number } | null>(
          (acc, z) =>
            !z ? acc : !acc ? { ...z } : { c0: Math.min(acc.c0, z.c0), c1: Math.max(acc.c1, z.c1), l0: Math.min(acc.l0, z.l0), l1: Math.max(acc.l1, z.l1) },
          null,
        );
        zonePrecedente = zone ? { ...zone } : null;
        if (rect) {
          contexte.putImageData(image, 0, 0, rect.c0, rect.l0, rect.c1 - rect.c0 + 1, rect.l1 - rect.l0 + 1);
          const src = map.getSource("lab-reach") as { play?: () => void; pause?: () => void } | undefined;
          src?.play?.();
          src?.pause?.();
        }
        setPorteeActive(depart >= 0);
        // Emprise de la tache affichée (dernier palier), lue tant que le
        // moteur la garde : le trajet s'y cadrera.
        empriseTache = depart >= 0 ? moteur.emprise(reach.bands[reach.bands.length - 1].max) : null;
        // Tache tout juste fixée : la carte se cadre sur elle ; les lieux
        // attendront la fin du vol (ou 1,4 s au plus, si rien ne bouge).
        if (cadrerEpingle && epingle) {
          cadrerEpingle = false;
          if (depart >= 0 && empriseTache) {
            const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (!reduit) cadrageEnCours = true;
            cadrerTache([], reduit);
            // Écouté APRÈS le départ du vol : un vol précédent interrompu
            // émet son propre `moveend`, qui ne doit pas lâcher les lieux.
            if (!reduit) {
              // Un jeton par cadrage : la fin d'un cadrage ancien (nouveau
              // clic pendant le vol) ne lâche pas les lieux du suivant.
              const j = ++jetonCadrage;
              const fin = () => {
                if (j === jetonCadrage) finCadrage();
              };
              map.once("moveend", fin);
              window.setTimeout(fin, 1400);
            }
          }
        }

        // Vue confort, tache fixée : « l'hiver ici ». Toujours aux vitesses
        // d'HIVER, quelle que soit la saison affichée : on reparcourt le
        // graphe (après l'emprise, que ce parcours écraserait).
        if (enExpose && epingle && depart >= 0 && troncons?.h && reach.winter && ici) {
          moteur.mesurer(depart, s, [budgetTache], 1 / reach.winter.speedRatio);
          const nh = noeudsHiver();
          const t = troncons;
          // Chaque piste déneigée (morceau continu ≥ 300 m) atteinte en 15 min
          // d'hiver : son nœud le plus proche et son temps.
          const parMorceau = new Map<number, { noeud: number; minutes: number; morceau: number }>();
          const tpsDeneige = moteur.tempsVers(nh.deneige);
          for (let k = 0; k < tpsDeneige.length; k++) {
            const mc = nh.morceau[k];
            if (mc < 0 || Number.isNaN(tpsDeneige[k])) continue;
            const avant = parMorceau.get(mc);
            if (!avant || tpsDeneige[k] < avant.minutes) parMorceau.set(mc, { noeud: nh.deneige[k], minutes: tpsDeneige[k], morceau: mc });
          }
          const cibles = [...parMorceau.values()].sort((a, b) => a.minutes - b.minutes).slice(0, 12);
          const plusProche = (noeuds: Int32Array) => {
            if (!noeuds.length) return null;
            const tps = moteur!.tempsVers(noeuds);
            let minutes = Infinity;
            for (let k = 0; k < tps.length; k++) if (!Number.isNaN(tps[k]) && tps[k] < minutes) minutes = tps[k];
            // Distance à vol d'oiseau, pour dire « à plus de 15 min (x km) ».
            const kx = 111320 * Math.cos((ici.lat * Math.PI) / 180);
            let metres = Infinity;
            for (let k = 0; k < noeuds.length; k++) {
              const d = Math.hypot((t.lon[noeuds[k]] - ici.lng) * kx, (t.lat[noeuds[k]] - ici.lat) * 111320);
              if (d < metres) metres = d;
            }
            return { minutes: Number.isFinite(minutes) ? minutes : null, metres };
          };
          const deneigee = plusProche(nh.deneige);
          const damee = plusProche(nh.dame);
          let kmDeneige = 0;
          let kmDame = 0;
          for (const { arete, partU, partV } of moteur.parcourues(budgetTache)) {
            if (t.c[arete] !== 0 && t.c[arete] !== 3) continue;
            const km = (Math.min(1, partU + partV) * t.l[arete]) / 1000;
            if (t.h![arete] === 2) kmDeneige += km;
            else if (t.h![arete] === 1) kmDame += km;
          }
          const acces = cibles.map((c) => ({
            nom: nomMorceau(c.morceau, nh.aretes.get(c.morceau) ?? []),
            minutes: c.minutes,
          }));
          // L'ÉTÉ : chaque corridor VivaCité RÉALISÉ atteint en 15 min (aux
          // vitesses d'été — on reparcourt), son nœud le plus proche.
          let ciblesEte: Array<{ noeud: number; minutes: number; morceau: number }> = [];
          if (!enHiver) {
            moteur.mesurer(depart, s, [budgetTache], 1);
            const nc = noeudsCorridors();
            const tpsC = moteur.tempsVers(nc.noeuds);
            const parCorridor = new Map<number, { noeud: number; minutes: number; morceau: number }>();
            for (let k = 0; k < tpsC.length; k++) {
              const mc = nc.morceau[k];
              if (mc < 0 || Number.isNaN(tpsC[k])) continue;
              const avant = parCorridor.get(mc);
              if (!avant || tpsC[k] < avant.minutes) parCorridor.set(mc, { noeud: nc.noeuds[k], minutes: tpsC[k], morceau: mc });
            }
            ciblesEte = [...parCorridor.values()].sort((a, b) => a.minutes - b.minutes).slice(0, 12);
          }
          const nc = noeudsCorridors();
          // L'hiver : les pistes déneigées en jaune ; l'été : les corridors en
          // orange. Chaque liste ne sort que dans sa saison.
          setInfoHiver({
            nom: moteur.nomDepart(depart, s, noms),
            deneigee,
            damee,
            kmDeneige,
            kmDame,
            acces: enHiver ? acces : undefined,
            corridors: enHiver
              ? undefined
              : ciblesEte.map((c) => ({ nom: nomMorceau(c.morceau, nc.aretes.get(c.morceau) ?? [], "c"), minutes: c.minutes })),
          });
          // Les chemins : EN DERNIER, les itinéraires écrasent le parcours du moteur.
          if (enHiver) tracerAcces(depart, cibles.map((c) => c.noeud), s, 1 / reach.winter.speedRatio, "h");
          else tracerAcces(depart, ciblesEte.map((c) => c.noeud), s, 1, "e");
        }

        // Les traits rouges des rues exposées (version précédente de la vue)
        // ne sont plus dessinés : on efface ceux qui resteraient.
        const sourceLignes = map.getSource("lab-reach-lignes") as
          | { setData: (d: unknown) => void }
          | undefined;
        if (lignesPeintes && sourceLignes) {
          sourceLignes.setData(lignesVides);
          lignesPeintes = false;
        }

        if (reach.panel) {
          setInfoPortee(
            depart >= 0
              ? { nom: moteur.nomDepart(depart, s, noms), km2, km2Ete, confort }
              : null,
          );
        }
        if (routeA && routeB) tracerItineraire(s, enHiver ? 1 / reach.winter!.speedRatio : 1);

        // Ville des 15 minutes : les lieux touchés par la tache épinglée, avec
        // leur temps d'accès — lu dans le parcours qui vient de peindre la tache.
        if (reach.places && epingle && !enItineraire && !enExpose && depart >= 0) {
          chargerLieux();
          if (lieux) {
            const l = lieux;
            const temps = moteur.tempsVers(l.aNoeud);
            // Pour chaque lieu, son accès le plus rapide : c'est son temps, et
            // c'est là qu'il se dessine — où la tache le touche.
            const meilleur = new Int32Array(l.f.length).fill(-1);
            for (let k = 0; k < temps.length; k++) {
              if (Number.isNaN(temps[k])) continue;
              const i = l.aLieu[k];
              if (meilleur[i] < 0 || temps[k] < temps[meilleur[i]]) meilleur[i] = k;
            }
            const points: PointLieu[] = [];
            const parFonction = reach.places.functions.map(() => [] as LieuListe[]);
            for (let i = 0; i < l.f.length; i++) {
              const k = meilleur[i];
              if (k < 0) continue;
              const nom = l.noms[l.n[i]];
              points.push({
                lon: l.aLon[k],
                lat: l.aLat[k],
                f: l.f[i],
                nom,
                t: temps[k],
                noeud: l.aNoeud[k],
                genre: l.genres[l.g[i]] ?? "",
                p: 0,
              });
              parFonction[l.f[i]]?.push({ nom, minutes: temps[k], lon: l.aLon[k], lat: l.aLat[k], noeud: l.aNoeud[k] });
            }
            for (const liste of parFonction) liste.sort((a, b) => a.minutes - b.minutes);
            // Le plus proche de chaque fonction : celui que la liste met en tête.
            const premier = new Map<number, PointLieu>();
            for (const pt of points) {
              const avant = premier.get(pt.f);
              if (!avant || pt.t < avant.t) premier.set(pt.f, pt);
            }
            for (const pt of premier.values()) pt.p = 1;
            poserLieux(points);
            setInfoLieux({ etat: "pret", parFonction });
          } else {
            setInfoLieux({ etat: "chargement" });
          }
        }
      };
      redessinerPortee = (complet = true) => {
        if (complet) toutRecalculer = true;
        if (!attente) attente = requestAnimationFrame(peindre);
      };
      redessinerRef.current = () => redessinerPortee();

      const poser = () => {
        if (!moteur || !carteChargee || map.getSource("lab-reach")) return;
        const { colonnes, lignes, coins } = moteur.g.grille;
        canevas.width = colonnes;
        canevas.height = lignes;
        image = contexte?.createImageData(colonnes, lignes) ?? null;
        map.addSource("lab-reach", {
          type: "canvas",
          canvas: canevas,
          coordinates: coins as [[number, number], [number, number], [number, number], [number, number]],
          // STATIQUE : la texture n'est relue que quand la tache change
          // (play + pause après chaque dessin, voir `peindre`). Animée, elle
          // faisait redessiner la carte 60 fois par seconde même au repos.
          animate: false,
        });
        // Sous les couches du lab : les rues exposées et les pistes restent
        // lisibles par-dessus la tache.
        map.addLayer(
          {
            id: "lab-reach",
            type: "raster",
            source: "lab-reach",
            paint: {
              // Interpolée : la tache est déjà adoucie dans le canevas, et des
              // cellules de 100 m agrandies au plus proche redonneraient
              // l'escalier que le flou vient d'effacer.
              "raster-resampling": "linear",
              "raster-fade-duration": 0,
              // Plus on s'approche, plus la tache s'efface : à l'échelle de la
              // ville elle EST le propos, à l'échelle de la rue (zoom sur un
              // lieu de la liste) elle couvrirait les noms et les bâtiments du
              // fond qu'on vient justement regarder.
              "raster-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 1, 15, 0.25],
            },
          },
          map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
        );
        if (reach.places) {
          map.addSource("lab-lieux", { type: "geojson", data: lignesVides });
          map.addSource("lab-epingle", { type: "geojson", data: lignesVides });
          const devant = map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined;
          /*
           * Les lieux, en trois couches (de dessous à dessus) :
           *   halo  — le PLUS PROCHE de chaque fonction, un halo doux de sa
           *           couleur : la réponse « où est ma pharmacie la plus
           *           proche ? » se lit d'un coup d'œil ;
           *   bord  — un fin liseré d'encre autour de l'anneau blanc, pour
           *           le garder net sur les tons clairs de la tache ;
           *   point — la couleur de la fonction, cerclée de BLANC (2 px).
           * Pourquoi l'anneau : aucune couleur de point n'atteint 3:1 sur
           * toute la tache (1,06 à 2,8 mesurés, été comme hiver), et deux
           * couleurs saturées de même clarté qui se touchent « vibrent ».
           * Le blanc sépare la figure du fond par la clarté, pas la teinte ;
           * les quatre couleurs validées (daltonisme) restent les mêmes.
           * Le plus proche (`p` = 1) est 1,5 fois plus grand.
           */
          const proche = ["==", ["get", "p"], 1];
          const rayon = (normal: number, grand: number) => ["case", proche, grand, normal];
          const couleurFonction = [
            "match",
            ["get", "f"],
            ...reach.places.functions.flatMap((fn, i) => [i, fn.color]),
            "#888888",
          ] as unknown as string;
          map.addLayer(
            {
              id: "lab-lieux-halo",
              type: "circle",
              source: "lab-lieux",
              filter: proche as unknown as boolean,
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 17] as unknown as number,
                "circle-color": couleurFonction,
                "circle-opacity": ["*", ["get", "o"], 0.3] as unknown as number,
                "circle-blur": 0.6,
              },
            },
            devant,
          );
          map.addLayer(
            {
              id: "lab-lieux-bord",
              type: "circle",
              source: "lab-lieux",
              layout: { "circle-sort-key": ["get", "p"] as unknown as number },
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, rayon(6.3, 8.05), 14, rayon(8.8, 11.8)] as unknown as number,
                "circle-color": "#14261f",
                "circle-opacity": ["*", ["get", "o"], 0.55] as unknown as number,
              },
            },
            devant,
          );
          map.addLayer(
            {
              id: "lab-lieux",
              type: "circle",
              source: "lab-lieux",
              // Le plus proche passe devant ses voisins.
              layout: { "circle-sort-key": ["get", "p"] as unknown as number },
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, rayon(3.5, 5.25), 14, rayon(6, 9)] as unknown as number,
                "circle-color": couleurFonction,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
                "circle-opacity": ["get", "o"],
                "circle-stroke-opacity": ["get", "o"],
              },
            },
            devant,
          );
          // L'anneau du lieu choisi dans la liste : on y zoome, il faut le
          // retrouver parmi ses voisins.
          map.addSource("lab-lieu-choisi", { type: "geojson", data: lignesVides });
          map.addLayer(
            {
              id: "lab-lieu-choisi",
              type: "circle",
              source: "lab-lieu-choisi",
              paint: {
                "circle-radius": 13,
                "circle-color": "rgba(0,0,0,0)",
                "circle-stroke-color": "#14261f",
                "circle-stroke-width": 2.5,
              },
            },
            devant,
          );
          map.addLayer(
            {
              id: "lab-epingle",
              type: "circle",
              source: "lab-epingle",
              paint: {
                "circle-radius": 7,
                "circle-color": "#ffffff",
                "circle-stroke-color": "#14261f",
                "circle-stroke-width": 3,
              },
            },
            devant,
          );
        }
        map.addSource("lab-route-tete", { type: "geojson", data: lignesVides });
        map.addLayer(
          {
            id: "lab-route-tete",
            type: "circle",
            source: "lab-route-tete",
            paint: {
              "circle-radius": 11,
              "circle-color": couleurSaison(),
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          },
          map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
        );
        // La bicyclette, en SVG blanc chargé comme image de la carte.
        const velo = new Image(48, 48);
        velo.onload = () => {
          if (!map.hasImage("lab-velo-blanc")) map.addImage("lab-velo-blanc", velo, { pixelRatio: 2 });
          if (!map.getLayer("lab-route-tete-velo")) {
            map.addLayer(
              {
                id: "lab-route-tete-velo",
                type: "symbol",
                source: "lab-route-tete",
                layout: { "icon-image": "lab-velo-blanc", "icon-allow-overlap": true, "icon-ignore-placement": true },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            ordonnerPortee();
          }
        };
        velo.src =
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 32 32"><g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="19" r="4"/><circle cx="21.5" cy="19" r="4"/><path d="M10.5 19 L14 12.5 L16 19 Z M16 19 L20 12.5 L14 12.5 M20 12.5 L21.5 19 M18.8 10.6 L21.4 10.6 M12.8 11 L15.2 11"/></g></svg>',
          );
        // `lineMetrics` : indispensable au dégradé le long de la ligne.
        map.addSource("lab-route", { type: "geojson", data: lignesVides, lineMetrics: true });
        map.addSource("lab-route-marque", { type: "geojson", data: lignesVides });
        map.addSource("lab-route-points", { type: "geojson", data: lignesVides });
        const dessus = map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined;
        // Liseré blanc sous le trait : l'itinéraire se détache du fond et de
        // la tache, quelle que soit leur couleur.
        map.addLayer(
          {
            id: "lab-route-lisere",
            type: "line",
            source: "lab-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-gradient": ["step", ["line-progress"], TRANSPARENT, 1, TRANSPARENT], "line-width": 8, "line-opacity": 0.95 },
          },
          dessus,
        );
        map.addLayer(
          {
            id: "lab-route",
            type: "line",
            source: "lab-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              // Vert tranquille, rouge exposé : posé en DÉGRADÉ le long de la
              // ligne unique (voir `degrade`), mis à jour à chaque image.
              "line-gradient": ["step", ["line-progress"], TRANSPARENT, 1, TRANSPARENT],
              "line-width": 4.5,
            },
          },
          dessus,
        );
        // Marque blanche discontinue au centre des tronçons exposés, comme
        // une ligne de chaussée : le second code, indépendant de la couleur.
        map.addLayer(
          {
            id: "lab-route-marque",
            type: "line",
            source: "lab-route-marque",
            layout: { "line-cap": "butt", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 1.4, "line-dasharray": [2, 2] },
          },
          dessus,
        );
        map.addLayer(
          {
            id: "lab-route-points",
            type: "circle",
            source: "lab-route-points",
            paint: {
              "circle-radius": 9,
              "circle-color": "#ffffff",
              "circle-stroke-color": "#14261f",
              "circle-stroke-width": 2.5,
            },
          },
          dessus,
        );
        map.addLayer(
          {
            id: "lab-route-lettres",
            type: "symbol",
            source: "lab-route-points",
            layout: {
              "text-field": ["get", "lettre"],
              "text-font": ["Noto Sans Bold"],
              "text-size": 12,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: { "text-color": "#14261f" },
          },
          dessus,
        );
        if (reach.exposure?.hex) {
          // La colmena : un hexagone par cellule de la tache, couleur selon le
          // confort (5 crans) ; rouge, avec un contour épais, s'il porte une
          // coupure de piste. Liseré blanc fin : l'effet « alvéoles ».
          const h = reach.exposure.hex;
          map.addSource("lab-hex", { type: "geojson", data: lignesVides });
          map.addLayer(
            {
              id: "lab-hex",
              type: "fill",
              source: "lab-hex",
              paint: {
                "fill-color": [
                  "case",
                  ["==", ["get", "c"], 1],
                  h.cut.color,
                  ["step", ["get", "i"], h.ramp[0], 0.2, h.ramp[1], 0.4, h.ramp[2], 0.6, h.ramp[3], 0.8, h.ramp[4]],
                ] as unknown as string,
                "fill-opacity": 0.78,
                "fill-outline-color": "#ffffff",
              },
            },
            map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
          );
          map.addLayer(
            {
              id: "lab-hex-coupure",
              type: "line",
              source: "lab-hex",
              filter: ["==", ["get", "c"], 1] as unknown as boolean,
              paint: { "line-color": h.cut.outline, "line-width": 2.2 },
            },
            map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
          );
          if (h.winter?.line) {
            // L'hiver : les pistes entretenues par la Ville, par-dessus la
            // colmena — trait plein déneigée, tirets damée, cerclées de blanc.
            map.addSource("lab-blanc", { type: "geojson", data: lignesVides });
            map.addLayer(
              {
                id: "lab-blanc-liseret",
                type: "line",
                source: "lab-blanc",
                layout: { "line-cap": "round", "line-join": "round" },
                // Un peu plus épais que la v1 (3 px, liseré 6) et qui
                // s'affine en vue d'ensemble pour ne pas boucher la colmena.
                paint: {
                  "line-color": "#ffffff",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 14, 6.5] as unknown as number,
                  "line-opacity": 0.9,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-blanc",
                type: "line",
                source: "lab-blanc",
                filter: ["==", ["get", "h"], 2] as unknown as boolean,
                layout: { "line-cap": "round", "line-join": "round" },
                paint: {
                  "line-color": h.winter.line,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 14, 3.4] as unknown as number,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-blanc-dame",
                type: "line",
                source: "lab-blanc",
                filter: ["==", ["get", "h"], 1] as unknown as boolean,
                layout: { "line-cap": "butt", "line-join": "round" },
                paint: {
                  "line-color": h.winter.line,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 14, 3.4] as unknown as number,
                  "line-dasharray": [2, 1.2],
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
          }
          if (h.winter?.summerPaths) {
            // L'été : les corridors VivaCité réalisés, MÊMES spécifications
            // que les pistes déneigées l'hiver (liseré blanc, épaisseurs
            // selon le zoom), dans l'orange foncé de l'été.
            map.addSource("lab-corridors-ete", { type: "geojson", data: lignesVides });
            map.addLayer(
              {
                id: "lab-corridors-ete-liseret",
                type: "line",
                source: "lab-corridors-ete",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: {
                  "line-color": "#ffffff",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 14, 6.5] as unknown as number,
                  "line-opacity": 0.9,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-corridors-ete",
                type: "line",
                source: "lab-corridors-ete",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: {
                  "line-color": h.winter.summerLine ?? "#a63c0e",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 14, 3.4] as unknown as number,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
          }
          if (h.winter) {
            // « L'hiver ici » : les chemins vers chaque piste déneigée, en
            // JAUNE cerclé d'encre (le jaune seul n'a pas 3:1 sur la colmena
            // claire : le liseré le lui donne), et un point à l'arrivée.
            map.addSource("lab-acces", { type: "geojson", data: lignesVides });
            map.addLayer(
              {
                id: "lab-acces-liseret",
                type: "line",
                source: "lab-acces",
                filter: ["==", ["geometry-type"], "LineString"] as unknown as boolean,
                layout: { "line-cap": "round", "line-join": "round" },
                paint: {
                  "line-color": "#14261f",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4.5, 14, 8] as unknown as number,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-acces",
                type: "line",
                source: "lab-acces",
                filter: ["==", ["geometry-type"], "LineString"] as unknown as boolean,
                layout: { "line-cap": "round", "line-join": "round" },
                paint: {
                  // Jaune l'hiver (vers les pistes déneigées), orange l'été
                  // (vers les corridors VivaCité).
                  "line-color": ["match", ["get", "s"], "e", "#ff8a1f", "#ffd23f"] as unknown as string,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 4.5] as unknown as number,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-acces-arrivee",
                type: "circle",
                source: "lab-acces",
                filter: ["==", ["geometry-type"], "Point"] as unknown as boolean,
                paint: {
                  // Point d'arrivée (`arrivee` 1) plus gros que la pointe qui avance.
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    ["case", ["==", ["get", "arrivee"], 1], 4, 3],
                    14,
                    ["case", ["==", ["get", "arrivee"], 1], 7, 5],
                  ] as unknown as number,
                  "circle-color": ["match", ["get", "s"], "e", "#ff8a1f", "#ffd23f"] as unknown as string,
                  "circle-stroke-color": "#14261f",
                  "circle-stroke-width": 2,
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
          }
          if (h.corridors) {
            // Les corridors par-dessus les alvéoles : réalisés en trait plein,
            // projetés en tirets (tracé indicatif), cerclés de blanc.
            map.addSource("lab-cvc", { type: "geojson", data: lignesVides });
            map.addLayer(
              {
                id: "lab-cvc-liseret",
                type: "line",
                source: "lab-cvc",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.85 },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            // Les tirets ne se règlent pas par entité : deux couches filtrées.
            map.addLayer(
              {
                id: "lab-cvc",
                type: "line",
                source: "lab-cvc",
                filter: ["==", ["get", "p"], 2] as unknown as boolean,
                layout: { "line-join": "round" },
                paint: {
                  "line-color": h.corridors.line,
                  "line-width": 2.5,
                  "line-dasharray": [2, 1.2],
                },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
            map.addLayer(
              {
                id: "lab-cvc-realise",
                type: "line",
                source: "lab-cvc",
                filter: ["==", ["get", "p"], 1] as unknown as boolean,
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": h.corridors.line, "line-width": 2.5 },
              },
              map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
            );
          }
        }
        if (reach.exposure) {
          map.addSource("lab-reach-lignes", { type: "geojson", data: lignesVides });
          map.addLayer(
            {
              id: "lab-reach-lignes",
              type: "line",
              source: "lab-reach-lignes",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": reach.exposure.line.color,
                // Plus la circulation est rapide, plus le trait est épais :
                // 50 km/h se lit, 90 km/h s'impose.
                "line-width": ["interpolate", ["linear"], ["get", "va"], 40, 1.5, 50, 2, 70, 3, 90, 4],
                "line-opacity": 0.9,
              },
            },
            map.getLayer("lab-layer-0") ? "lab-layer-0" : undefined,
          );
        }
        ordonnerPortee();
        redessinerPortee();
      };

      fetch(reach.url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((g: ReachGraph) => {
          moteur = new ReachEngine(g);
          poser();
          // Les noms viennent après : la tache n'en a pas besoin, et le graphe
          // seul frôle déjà les 2 Mo. Sans eux, le panneau n'a que les chiffres.
          if (reach.names) {
            fetch(reach.names)
              .then((r) => (r.ok ? r.json() : null))
              .then((n: ReachNames | null) => {
                noms = n;
                redessinerPortee();
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.error("[lab]", lab.id, "graphe de portée introuvable :", err);
          setFailed(true);
        });

      map.on("load", () => {
        carteChargee = true;
        poser();
      });

      // `complet` faux pour un simple mouvement du curseur : s'il reste sur
      // le même nœud, rien n'est recalculé (fluidité). Un clic recalcule tout.
      const suivre = (e: { lngLat: { lng: number; lat: number } }, complet = true) => {
        point = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        redessinerPortee(complet);
      };
      map.on("mousemove", (e) => {
        if (modeRef.current !== "portee") return;
        if (!epingle) {
          suivre(e, false);
          return;
        }
        if (!map.getLayer("lab-lieux") || !reach.places) return;
        const touche = map.queryRenderedFeatures(
          [
            [e.point.x - 6, e.point.y - 6],
            [e.point.x + 6, e.point.y + 6],
          ],
          { layers: ["lab-lieux"] },
        );
        const p = touche[0]?.properties as { f: number; nom: string; t: number } | undefined;
        const fn = p ? reach.places.functions[p.f] : undefined;
        setSurvolLieu(
          p && fn
            ? { x: e.point.x, y: e.point.y, nom: p.nom, fonction: fn.label[lang], couleur: fn.color, minutes: p.t }
            : null,
        );
      });
      // Au doigt, pas de survol : un appui pose le point de départ. En mode
      // itinéraire, un clic pose A, le suivant B, le troisième recommence.
      map.on("click", (e) => {
        if (modeRef.current === "portee") {
          // En vue « temps de parcours », le clic épingle la tache et fait
          // tomber les lieux. Ailleurs (vue « rues exposées »), il pose le
          // départ comme au doigt.
          if (reach.places && vueRef.current === "temps" && epingle && map.getLayer("lab-lieux")) {
            const touche = map.queryRenderedFeatures(
              [
                [e.point.x - 7, e.point.y - 7],
                [e.point.x + 7, e.point.y + 7],
              ],
              { layers: ["lab-lieux"] },
            );
            const p = touche[0]?.properties as
              | { f: number; nom: string; t: number; noeud: number; genre: string; lon: number; lat: number }
              | undefined;
            if (p) {
              const lieu = { noeud: Number(p.noeud), lng: Number(p.lon), lat: Number(p.lat) };
              if (enChoix && ficheLieu) {
                routerVers(lieu, p.nom);
                return;
              }
              const fn = reach.places.functions[Number(p.f)];
              ficheLieu = { ...lieu, nom: p.nom };
              enChoix = false;
              setSurvolLieu(null);
              setFiche({
                nom: p.nom,
                fonction: fn?.label[lang] ?? "",
                couleur: fn?.color ?? "#888888",
                genre: reach.places.genres?.[p.genre]?.[lang] ?? "",
                minutes: Number(p.t),
                choix: false,
              });
              placerFiche();
              return;
            }
            // Clic à côté pendant le choix : on annule le choix, sans épingler.
            if (enChoix) {
              choisirDestinationRef.current(false);
              return;
            }
          }
          if (reach.places && vueRef.current === "temps") {
            fermerFicheRef.current();
            reinitItineraireRef.current();
            setRouteNoms(null);
            epingle = { lng: e.lngLat.lng, lat: e.lngLat.lat };
            animerChute = true;
            cadrerEpingle = true;
            lieuCerne = null;
            // Nouvelle tache : le panneau de résultats sort déplié, et sa
            // liste avec toutes les fonctions repliées.
            setPliD(false);
            setNumTache((n) => n + 1);
            (map.getSource("lab-lieu-choisi") as { setData: (d: unknown) => void } | undefined)?.setData(lignesVides);
            setSurvolLieu(null);
            (map.getSource("lab-epingle") as { setData: (d: unknown) => void } | undefined)?.setData({
              type: "FeatureCollection",
              features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [epingle.lng, epingle.lat] } }],
            });
          } else if (reach.exposure?.hex?.winter && vueRef.current === "expose") {
            // Vue confort : le clic fixe la tache, la carte s'y cadre, et le
            // panneau de droite dit « l'hiver ici ».
            epingle = { lng: e.lngLat.lng, lat: e.lngLat.lat };
            cadrerEpingle = true;
            setPliD(false);
            (map.getSource("lab-epingle") as { setData: (d: unknown) => void } | undefined)?.setData({
              type: "FeatureCollection",
              features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [epingle.lng, epingle.lat] } }],
            });
          }
          suivre(e);
          return;
        }
        if (!moteur) return;
        chargerTroncons();
        const s = scenario();
        const n = moteur.depart(e.lngLat.lng, e.lngLat.lat, s);
        const lieu = { noeud: n, lng: e.lngLat.lng, lat: e.lngLat.lat };
        if (!routeA || routeB) {
          routeA = lieu;
          routeB = null;
        } else {
          routeB = lieu;
        }
        redessinerPortee();
      });
      map.on("mouseout", () => {
        point = null;
        redessinerPortee();
      });
    }

    /**
     * UN SEUL gestionnaire de survol, pour l'infobulle et pour le curseur.
     *
     * `queryRenderedFeatures` est l'opération la plus chère de MapLibre côté
     * processeur. En appeler deux — une pour l'infobulle, une pour le curseur —
     * à chaque pixel parcouru par la souris rend le déplacement pâteux, bien
     * plus que le volume des données. Une seule passe les sert tous les deux,
     * et un garde-fou d'une image évite les centaines de requêtes qu'une
     * traversée rapide déclencherait pour rien.
     */
    if (lab.hover || lab.select) {
      const cibles = (lab.hover?.layers ?? []).map((i) => `lab-layer-${i}`);
      const cliquables = (lab.select?.layers ?? []).map((i) => `lab-layer-${i}`);

      /**
       * Tolérance de visée, en pixels.
       *
       * `queryRenderedFeatures` sur un point n'interroge que ce pixel-là. Une
       * station fait sept pixels de rayon : viser juste devient un exercice
       * d'adresse, impossible au doigt.
       */
      const TOLERANCE = 12;

      // Les couches existantes ne sont filtrées qu'une fois : `getLayer` à
      // chaque mouvement sur chaque identifiant était du travail répété.
      let couchesPretes: { survol: string[]; clic: string[] } | null = null;
      // Mémorisé SEULEMENT une fois toutes les couches posées. Un survol
      // pendant le chargement — le geste naturel de qui voit la carte
      // apparaître — figeait sinon une liste vide pour toute la session : plus
      // de main au survol, plus de clic sur les stations.
      const couches = () => {
        if (couchesPretes) return couchesPretes;
        const survol = cibles.filter((id) => map.getLayer(id));
        const clic = cliquables.filter((id) => map.getLayer(id));
        const completes =
          survol.length === cibles.length && clic.length === cliquables.length;
        if (completes) couchesPretes = { survol, clic };
        return { survol, clic };
      };

      const boite = (p: { x: number; y: number }) =>
        [
          [p.x - TOLERANCE, p.y - TOLERANCE],
          [p.x + TOLERANCE, p.y + TOLERANCE],
        ] as [[number, number], [number, number]];

      let enAttente = 0;
      let dernierPoint: { x: number; y: number } | null = null;

      const examiner = () => {
        enAttente = 0;
        const point = dernierPoint;
        if (!point) return;
        const { survol, clic } = couches();

        // Le clic d'abord : s'il y a une entité cliquable sous le pointeur,
        // c'est elle qui décide du curseur.
        if (clic.length && map.queryRenderedFeatures(boite(point), { layers: clic }).length) {
          map.getCanvas().style.cursor = "pointer";
          setSurvol(null);
          return;
        }

        if (!survol.length) {
          map.getCanvas().style.cursor = curseurCarte;
          setSurvol(null);
          return;
        }

        const trouve = map.queryRenderedFeatures([point.x, point.y], {
          layers: survol,
        });
        if (!trouve.length) {
          map.getCanvas().style.cursor = curseurCarte;
          setSurvol(null);
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        setSurvol({
          x: point.x,
          y: point.y,
          props: trouve[0].properties ?? {},
        });
      };

      map.on("mousemove", (e) => {
        dernierPoint = { x: e.point.x, y: e.point.y };
        if (!enAttente) enAttente = requestAnimationFrame(examiner);
      });

      map.on("mouseout", () => {
        if (enAttente) cancelAnimationFrame(enAttente);
        enAttente = 0;
        dernierPoint = null;
        map.getCanvas().style.cursor = curseurCarte;
        setSurvol(null);
      });

      // Sélection au clic. Fonctionne aussi au doigt : MapLibre émet `click`
      // sur un appui, là où `mousemove` n'existe pas.
      if (lab.select) {
        map.on("click", (e) => {
          const trouve = map.queryRenderedFeatures(boite(e.point), {
            layers: couches().clic,
          });
          // Un clic à côté referme : c'est le geste attendu, et il évite
          // d'avoir à viser une croix.
          setChoisi(trouve.length ? (trouve[0].properties ?? {}) : null);
        });
      }
    }

    map.on("load", () => {
      // Le fond est un repère, pas le sujet. On masque ce qu'il redit
      // autrement, et on atténue le reste, avant d'ajouter nos couches.
      if (basemap.kind === "style") {
        for (const id of basemap.hideLayers ?? []) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        }

        // Les couches repeintes sont exclues de l'atténuation : `fade` parcourt
        // tout le style, et écraserait l'opacité qu'on vient de poser.
        const preservees = new Set(
          (basemap.restyleLayers ?? [])
            .filter((c) => c.keepOpacity)
            .map((c) => c.id),
        );

        if (basemap.fade !== undefined) {
          // Chaque type de couche a sa propre propriété d'opacité : il n'en
          // existe pas de globale dans la spécification de style.
          const proprietes: Record<string, string[]> = {
            background: ["background-opacity"],
            fill: ["fill-opacity"],
            line: ["line-opacity"],
            symbol: ["icon-opacity", "text-opacity"],
            raster: ["raster-opacity"],
            circle: ["circle-opacity"],
            // Les bâtiments 3D d'un fond : sans cette entrée ils restaient
            // pleinement opaques pendant que tout le reste reculait, et
            // ressortaient donc PLUS que la carte thématique posée dessus.
            "fill-extrusion": ["fill-extrusion-opacity"],
          };
          for (const couche of map.getStyle().layers ?? []) {
            if (preservees.has(couche.id)) continue;
            for (const prop of proprietes[couche.type] ?? []) {
              try {
                // Le nom de la propriété est choisi d'après le type de la
                // couche, ce que la signature typée de MapLibre ne peut pas
                // suivre : elle attend un littéral, on lui passe une variable.
                (
                  map.setPaintProperty as (
                    id: string,
                    nom: string,
                    valeur: unknown,
                  ) => void
                )(couche.id, prop, basemap.fade);
              } catch {
                // Une couche peut refuser la propriété si elle la dérive d'une
                // expression. Ce n'est pas une panne : elle garde son opacité.
              }
            }
          }
        }

        // Repeindre après l'atténuation : le lab a le dernier mot sur les
        // couches qu'il réclame.
        for (const consigne of basemap.restyleLayers ?? []) {
          // Une couche absente du style n'est pas une erreur : un fond qui ne
          // la porte pas ne doit pas empêcher la carte de s'afficher.
          if (!map.getLayer(consigne.id)) continue;

          if (consigne.minzoom !== undefined) {
            // La borne haute du fond est conservée : l'abaisser ne servirait à
            // rien, et la relever ferait disparaître la couche en zoomant.
            const actuel = map.getLayer(consigne.id)?.maxzoom;
            map.setLayerZoomRange(consigne.id, consigne.minzoom, actuel ?? 24);
          }

          for (const [nom, valeur] of Object.entries(consigne.layout ?? {})) {
            try {
              (
                map.setLayoutProperty as (
                  id: string,
                  nom: string,
                  valeur: unknown,
                ) => void
              )(consigne.id, nom, valeur);
            } catch {
              // Propriété inconnue de ce type de couche : on continue.
            }
          }

          for (const [nom, valeur] of Object.entries(consigne.paint ?? {})) {
            try {
              (
                map.setPaintProperty as (
                  id: string,
                  nom: string,
                  valeur: unknown,
                ) => void
              )(consigne.id, nom, valeur);
            } catch {
              // Idem : une consigne qui ne s'applique pas est ignorée plutôt
              // que de faire tomber la carte entière.
            }
          }
        }
      }

      // La lumière n'a d'effet que sur les volumes. Posée après le fond, pour
      // qu'elle vaille aussi pour ses extrusions repeintes.
      if (lab.light) {
        map.setLight({
          anchor: "map",
          ...(lab.light.color ? { color: lab.light.color } : {}),
          ...(lab.light.intensity !== undefined
            ? { intensity: lab.light.intensity }
            : {}),
          ...(lab.light.position ? { position: lab.light.position } : {}),
        });
      }

      for (const [id, url] of Object.entries(lab.sources)) {
        map.addSource(id, { type: "geojson", data: url });
      }

      // La source alimentée au clic naît vide : ses couches existent dès le
      // départ, sinon leur ordre de peinture dépendrait du moment du premier
      // clic.
      if (lab.select?.onDemand) {
        map.addSource(lab.select.onDemand.source, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // L'ordre du tableau est l'ordre de peinture : la dernière couche
      // déclarée est celle qui reste au-dessus.
      //
      // Chaque couche est posée dans son propre `try` : une erreur sur l'une
      // — une source du fond pas encore prête, un filtre mal formé — ne doit
      // pas empêcher les suivantes d'exister. Sans cela, une capa 0 en échec
      // aurait aussi emporté les stations de la capa 8, et le clic n'aurait
      // plus rien trouvé sans qu'aucun message n'explique pourquoi.
      lab.layers.forEach((layer, index) => {
        try {
          poserCouche(layer, index);
        } catch (err) {
          console.error("[lab]", lab.id, `lab-layer-${index}`, "n'a pas pu être posée :", err);
        }
      });

      function poserCouche(layer: typeof lab.layers[number], index: number) {
        const id = `lab-layer-${index}`;

        // Une source partagée par plusieurs couches : le filtre dit laquelle
        // prend quelles entités.
        const filter = layer.filter
          ? { filter: layer.filter as never }
          : {};

        /**
         * Ce qui se déclare pareil quel que soit le type de rendu.
         *
         * `source-layer` nomme la couche interne d'une source en tuiles : sans
         * elle, une couche branchée sur le fond de carte ne dessine rien, et
         * MapLibre ne s'en plaint pas.
         */
        const commun = {
          ...filter,
          ...(layer.sourceLayer ? { "source-layer": layer.sourceLayer } : {}),
          ...(layer.minZoom !== undefined ? { minzoom: layer.minZoom } : {}),
          ...(layer.maxZoom !== undefined ? { maxzoom: layer.maxZoom } : {}),
        };

        switch (layer.kind) {
          case "fill":
            map.addLayer({
              id,
              type: "fill",
              source: layer.source,
              ...commun,
              paint: {
                "fill-color": colorValue(layer.color, container),
                "fill-opacity": layer.opacity ?? 0.5,
                ...(layer.outlineColor
                  ? { "fill-outline-color": layer.outlineColor }
                  : {}),
              },
            });
            break;

          case "extrusion":
            map.addLayer({
              id,
              type: "fill-extrusion",
              source: layer.source,
              ...commun,
              paint: {
                "fill-extrusion-color": colorValue(layer.color, container),
                "fill-extrusion-height": heightValue(layer.height),
                "fill-extrusion-opacity": layer.opacity ?? 0.85,
                // Les blocs montent depuis le sol : une base flottante
                // donnerait une impression d'épaisseur qui ne veut rien dire.
                "fill-extrusion-base": 0,
              },
            });
            break;

          case "line":
            map.addLayer({
              id,
              type: "line",
              source: layer.source,
              ...commun,
              layout: {
                ...(layer.cap ? { "line-cap": layer.cap } : {}),
                ...(layer.join ? { "line-join": layer.join } : {}),
              },
              paint: {
                "line-color": colorValue(layer.color, container),
                // Un nombre ou une expression de zoom : MapLibre accepte les
                // deux, sa signature typée n'en connaît qu'un.
                "line-width": (layer.width ?? 1) as number,
                "line-opacity": layer.opacity ?? 1,
                ...(layer.dash ? { "line-dasharray": layer.dash } : {}),
                ...(layer.gapWidth !== undefined
                  ? { "line-gap-width": layer.gapWidth as number }
                  : {}),
              },
            });
            break;

          case "label":
            map.addLayer({
              id,
              type: "symbol",
              source: layer.source,
              ...commun,
              layout: {
                "text-field": layer.text as never,
                "text-size": layer.size ?? 12,
                // « Noto Sans Regular » est la seule police servie à la fois
                // par le fond de CARTO et par le serveur de repli. Demander une
                // police absente ne lève pas d'erreur : le texte ne s'affiche
                // simplement pas.
                "text-font": [layer.font ?? "Noto Sans Regular"],
                "text-offset": [layer.offsetX ?? 0, layer.offsetY ?? 0],
                "text-anchor": layer.anchor ?? "center",
                // Les étiquettes ne se masquent pas entre elles : sur cinq
                // entités, mieux vaut un chevauchement qu'un nom manquant.
                "text-allow-overlap": layer.allowOverlap ?? true,
                "text-line-height": 1.2,
              },
              paint: {
                "text-color": layer.color ?? "#1a1a1a",
                "text-halo-color": layer.haloColor ?? "#ffffff",
                "text-halo-width": layer.haloWidth ?? 1.5,
              },
            });
            break;

          case "circle":
            map.addLayer({
              id,
              type: "circle",
              source: layer.source,
              ...commun,
              paint: {
                "circle-color": colorValue(layer.color, container),
                "circle-radius": layer.radius ?? 4,
                "circle-opacity": layer.opacity ?? 1,
                ...(layer.strokeColor
                  ? { "circle-stroke-color": layer.strokeColor }
                  : {}),
                "circle-stroke-width": layer.strokeWidth ?? 0,
              },
            });
            break;
        }
      }

      // Les couches révélées naissent éteintes : rien n'est encore choisi, et
      // vingt-neuf aires superposées ne seraient qu'une tache.
      const parOpacite = new Set(lab.select?.revealByOpacity ?? []);
      for (const index of lab.select?.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) continue;

        // Une couche branchée sur le fond de carte n'a pas les champs du
        // GeoJSON du lab : le filtre habituel ne la toucherait jamais. On
        // l'éteint donc par opacité, à zéro, plutôt que par un filtre qui ne
        // la concerne pas.
        if (parOpacite.has(index)) {
          const prop = couche.type === "fill" ? "fill-opacity" : "line-opacity";
          try {
            (
              map.setPaintProperty as (
                id: string,
                nom: string,
                valeur: unknown,
              ) => void
            )(id, prop, 0);
          } catch {
            // Couche sans opacité déclarée : rien à éteindre.
          }
          continue;
        }

        map.setFilter(id, ["==", ["literal", false], true]);
      }

      // La tache de portée a pu être posée avant nos couches, si le graphe est
      // arrivé avant le fond : on la redescend sous elles.
      ordonnerPortee();

      // La première scène est appliquée dès le chargement — sinon les couches
      // qu'elle masque apparaissent une fraction de seconde.
      applyScene(0, false);
      mapRef.current = map;
    });

    /**
     * Passe à une scène : visibilité des couches, puis déplacement de caméra.
     *
     * `animate` est faux au chargement et quand le lecteur a demandé moins
     * d'animation : la scène est alors atteinte d'un coup. Le contenu est le
     * même dans les deux cas — l'animation n'est jamais porteuse
     * d'information, seulement de confort.
     */
    function applyScene(index: number, animate: boolean) {
      const target = lab.scenes?.[index];
      if (!target) return;

      // Chaque scène peut changer le scénario du graphe : la tache sous le
      // curseur se recalcule sans attendre que la souris bouge.
      sceneCourante.index = index;
      redessinerPortee();

      lab.layers.forEach((_, i) => {
        const id = `lab-layer-${i}`;
        if (!map.getLayer(id)) return;
        const visible = !target.layers || target.layers.includes(i);
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      });

      const view = target.view;
      if (!view) return;

      const camera = cameraFor(view, container!.clientWidth < 640);
      const duration = animate ? target.duration ?? 1600 : 0;

      if ("bounds" in view) {
        map.fitBounds(boundsPair(view.bounds), {
          ...fitOptions(view),
          ...camera,
          duration,
        });
      } else {
        map.easeTo({ center: view.center, zoom: view.zoom, ...camera, duration });
      }
    }

    sceneRef.current = applyScene;

    // Toute erreur est signalée au lecteur, pas seulement les requêtes en
    // échec. Une carte muette est le pire des cas : on cherche dans la console
    // ce que la page aurait pu dire. Le message reste générique — l'auteur a le
    // détail en console.
    map.on("error", (event) => {
      console.error("[lab]", lab.id, event.error);
      // Le bandeau dit « données introuvables » : il ne s'affiche que si l'une
      // de NOS sources n'a pas pu être chargée. Toute erreur l'affichait — une
      // opacité refusée pendant un fondu suffisait à annoncer des données
      // absentes, ce qui était faux et alarmant.
      const source = (event as { sourceId?: string }).sourceId;
      if (source && source in lab.sources) setFailed(true);
    });

    // Un style invalide lève pendant `addLayer`, à l'intérieur du gestionnaire
    // `load` : l'exception n'y est captée ni par `map.on("error")`, ni par un
    // périmètre d'erreur React, qui ne voit pas les rappels asynchrones.
    // Sans ce filet, les couches suivantes disparaissent en silence.
    map.on("load", () => {
      if (!lab.layers.every((_, i) => map.getLayer(`lab-layer-${i}`))) {
        console.error("[lab]", lab.id, "couches manquantes — style invalide ?");
        setFailed(true);
      }
    });

    // Compte rendu de ce que la carte contient réellement, une seconde après
    // le chargement. Sur une carte muette, c'est la seule façon de distinguer
    // « la couche n'existe pas » de « la couche est vide » et de « la couche
    // est là mais hors champ » — trois pannes qui se ressemblent à l'écran.
    map.on("idle", function rapport() {
      map.off("idle", rapport);
      const lignes = lab.layers.map((_, i) => {
        const id = `lab-layer-${i}`;
        if (!map.getLayer(id)) return `${i}:absente`;
        const n = map.queryRenderedFeatures({ layers: [id] }).length;
        return `${i}:${n}`;
      });
      const source = map.getSource(Object.keys(lab.sources)[0]);
      const resume =
        `couches ${lignes.join(" ")} · source ${source ? "ok" : "ABSENTE"} · ` +
        `centre ${map.getCenter().toArray().map((v) => v.toFixed(3)).join(",")} · ` +
        `zoom ${map.getZoom().toFixed(2)} · pitch ${map.getPitch().toFixed(0)}°`;
      // En console seulement : sous la carte, ce relevé prenait la place de
      // ce qu'on vient regarder.
      console.info("[lab]", lab.id, resume);

      // Les couches réclamées au fond : un lab qui en repeint une veut savoir
      // si elle a été trouvée, si elle est dans sa plage de zoom, et si elle
      // dessine quelque chose. Trois pannes qui se ressemblent à l'écran — et
      // qu'un identifiant changé chez le fournisseur du fond suffit à causer.
      if (basemap.kind === "style" && basemap.restyleLayers?.length) {
        const zoom = map.getZoom();
        const etat = basemap.restyleLayers.map((consigne) => {
          const couche = map.getLayer(consigne.id);
          if (!couche) return `${consigne.id}:ABSENTE`;
          const min = couche.minzoom ?? 0;
          const max = couche.maxzoom ?? 24;
          if (zoom < min || zoom > max) {
            return `${consigne.id}:hors-zoom(${min}–${max})`;
          }
          const n = map.queryRenderedFeatures({ layers: [consigne.id] }).length;
          return `${consigne.id}:${n}`;
        });
        console.info("[lab]", lab.id, "fond", etat.join(" "));
      }
    });

    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncBackground = () => {
      if (basemap.kind !== "none" || !map.getLayer(BACKGROUND_LAYER)) return;
      map.setPaintProperty(BACKGROUND_LAYER, "background-color", readBackground());
    };

    /**
     * Les couches dont la couleur est un jeton CSS se relisent au changement
     * de thème.
     *
     * Sans cela, un voile calculé en thème clair resterait clair sur une page
     * devenue sombre — et comme il couvre tout l'écran, l'erreur ne serait pas
     * un détail : la carte deviendrait illisible d'un coup.
     */
    const syncCouleurs = () => {
      lab.layers.forEach((layer, index) => {
        const couleur = layer.color;
        if (
          !couleur ||
          typeof couleur === "string" ||
          Array.isArray(couleur) ||
          !("cssVar" in couleur)
        ) {
          return;
        }
        const id = `lab-layer-${index}`;
        const couche = map.getLayer(id);
        if (!couche) return;
        const prop =
          couche.type === "fill"
            ? "fill-color"
            : couche.type === "line"
              ? "line-color"
              : couche.type === "circle"
                ? "circle-color"
                : "fill-extrusion-color";
        try {
          map.setPaintProperty(id, prop, colorValue(couleur, container));
        } catch {
          // Couche disparue entre-temps : rien à repeindre.
        }
      });
    };

    const suivreTheme = () => {
      syncBackground();
      syncCouleurs();
    };
    theme.addEventListener("change", suivreTheme);

    /**
     * La carte suit la taille de SON conteneur, pas celle de la fenêtre.
     *
     * MapLibre ne se redimensionne seul que sur `resize` de la fenêtre. Or le
     * conteneur change aussi quand la grille se recalcule — panneau à côté
     * ou dessous, police chargée en retard, barre de défilement qui apparaît.
     * Sans cet observateur, le canevas garde sa première mesure et les clics
     * tombent à côté de ce qui est dessiné.
     */
    const observateur = new ResizeObserver(() => map.resize());
    observateur.observe(container);

    return () => {
      observateur.disconnect();
      theme.removeEventListener("change", suivreTheme);
      sceneRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [lab, lang, fill]);

  const current = scenes[scene];

  /**
   * Le panneau n'existe que pour un lab qui déclare une sélection.
   *
   * Les labs sans clic — une carte qu'on lit sans la manipuler — gardent leur
   * pleine largeur : une colonne vide à côté d'eux ne dirait rien.
   *
   * EN PLEIN ÉCRAN, il n'apparaît qu'une fois une entité choisie : on y entre
   * pour regarder la carte, qui prend alors tout l'écran. Le clic sur une
   * station ouvre le panneau ; le fermer rend l'écran entier à la carte.
   * L'observateur de taille redimensionne MapLibre à chaque bascule.
   */
  // Le panneau de portée, lui, est toujours là : il se remplit au survol.
  const panneauPortee = Boolean(lab.reach?.panel);
  const panneau =
    panneauPortee || (Boolean(lab.select) && (!pleinEcran || Boolean(choisi)));

  // Le titre du panneau : le champ déclaré, sinon la clé elle-même.
  const titrePanneau = choisi
    ? String(choisi[lab.select?.titleField ?? lab.select?.key ?? ""] ?? "")
    : "";

  // Ville des 15 minutes : la consigne dans le panneau de portée, la liste
  // dans le panneau qui sort à côté.
  const lieuxPanneau =
    lab.reach?.places && vue === "temps" && mode === "portee"
      ? {
          info: infoLieux,
          title: lab.reach.places.title,
          functions: lab.reach.places.functions,
          prompt: lab.reach.places.prompt,
          promptShort: lab.reach.places.promptShort,
          note: lab.reach.places.note,
          onLiberer: () => libererRef.current(),
          onLieu: (l: LieuListe) => lieuListeRef.current(l),
          onSurvol: (l: LieuListe | null) => surlignerRef.current(l),
          survolNom: survolLieu?.nom ?? null,
        }
      : undefined;
  const haloSaison = lab.reach
    ? (hiver && lab.reach.winter?.bands ? lab.reach.winter.bands : lab.reach.bands)[1]?.color
    : undefined;

  return (
    <div
      ref={wrapperRef}
      style={
        lab.reach
          ? ({
              // Saison des boutons : relief plein = le palier le plus foncé
              // de la tache (texte blanc : 4,7:1 l'été, 9,9:1 l'hiver) ;
              // texte sur fond clair = un cran plus foncé l'été (6,0:1).
              "--s-fort": hiver ? "#104281" : "#c84a12",
              "--s-texte": hiver ? "#104281" : "#a63c0e",
              "--s-teinte": hiver ? "rgb(16 66 129 / 0.10)" : "rgb(200 74 18 / 0.10)",
              "--s-bord": hiver ? "rgb(16 66 129 / 0.45)" : "rgb(200 74 18 / 0.45)",
              // Largeur des deux panneaux, selon la largeur réelle de la carte.
              "--w-panneau": `${remPanneau}rem`,
            } as React.CSSProperties)
          : undefined
      }
      // En plein écran, le conteneur devient la page : il prend toute la
      // hauteur et reçoit un fond, sinon le navigateur peint du noir autour
      // des boutons et de la légende.
      className={
        pleinEcran
          ? "flex h-full flex-col bg-surface p-4"
          : fill
            ? "relative flex h-full flex-col"
            : "relative"
      }
    >
      {/*
        Carte et panneau côte à côte.

        Le panneau est DEHORS, jamais posé sur la carte : un panneau en
        surimpression masque le territoire au moment précis où le lecteur veut
        le regarder, et il masque le plus souvent ce qui entoure l'entité
        choisie — c'est-à-dire ce qu'on vient d'ouvrir.

        La colonne garde sa largeur même sans sélection : sans cela la carte
        s'élargirait et se rétrécirait à chaque clic, et MapLibre redessinerait
        tout à chaque fois. Sous 1024 px le panneau passe SOUS la carte — à
        cette largeur, deux colonnes donnent deux bandes trop étroites pour
        l'une comme pour l'autre.
      */}
      {/*
        Les rangées sont DÉCLARÉES, et c'est vital : sans elles, la rangée de
        la carte prend la hauteur de son contenu — or un conteneur MapLibre
        n'a pas de contenu, il a une taille. La carte s'initialisait alors dans
        41 px de haut, le cadrage échouait, et elle s'ouvrait centrée sur
        0° / 0° : aucune station à l'écran, donc aucun clic possible.
        `minmax(0, 1fr)` donne à la carte toute la hauteur restante, et le `0`
        l'autorise à rétrécir au lieu de pousser la page.

        Sous 1024 px, le panneau passe dessous, et la hauteur est PARTAGÉE :
        trois cinquièmes pour la carte, deux pour le panneau, qui défile en
        interne. Une rangée `auto` laissait le panneau prendre ce qu'il voulait
        — la carte tombait à une bande de 41 px, stations hors champ.

        Hors plein cadre (`fill` absent), la carte a sa hauteur fixe : des
        rangées automatiques suffisent.
      */}
      {/*
        Le panneau de portée FLOTTE sur la carte en écran large, en haut à
        gauche (demande de l'auteur) : la carte prend toute la largeur, le
        panneau s'y pose avec une ombre. C'est l'exception à la règle des
        autres labs, dont le panneau reste à côté : ici la tache se lit autour
        du curseur, au centre et à droite, rarement sous le panneau.
        Sous 1024 px, il reste sous la carte — flottant, il la couvrirait.
        Classes écrites en entier : Tailwind ne voit pas une classe assemblée
        à l'exécution.
      */}
      <div
        className={`relative grid min-h-0 gap-3 ${
          !(pleinEcran || fill)
            ? panneau
              ? panneauPortee
                ? ""
                : "lg:grid-cols-[1fr_20rem]"
              : ""
            : panneau
              ? panneauPortee
                ? "grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)]"
                : "grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-[1fr_20rem] lg:grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[minmax(0,1fr)]"
        } ${pleinEcran || fill ? "flex-1" : ""}`}
      >
        {/*
          Le conteneur de la carte porte son propre `relative` : le bouton de
          plein écran s'ancre à LA CARTE. Ancré à la grille entière, il
          tombait sur le panneau et masquait la borne du curseur.
        */}
        <div
          // `overflow-hidden` : un panneau rangé hors du cadre (résultats
          // glissés à droite, feuille glissée en bas) ne doit JAMAIS faire
          // naître une barre de défilement sur la page.
          className={`relative min-h-0 overflow-hidden rounded-xl ${pleinEcran || fill ? "h-full" : ""}`}
        >
          <div
            ref={containerRef}
            role="region"
            aria-label={label}
            className={`w-full overflow-hidden rounded-xl border border-line ${
              pleinEcran || fill ? "h-full" : "h-[420px] sm:h-[520px]"
            }`}
          />

          {/*
            Mode d'emploi de la portée, tant qu'aucune tache n'est peinte. Il
            s'efface dès que le curseur trouve le réseau : une consigne qui
            resterait affichée masquerait ce qu'elle annonce.
          */}
          {fiche && fichePos && (
            <div
              className="absolute z-30 w-[16rem] -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface/95 p-3 text-xs shadow-xl backdrop-blur-sm"
              style={{ left: fichePos.x, top: fichePos.y - 14 }}
              role="dialog"
              aria-label={fiche.nom}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="m-0 text-[13px] font-semibold leading-snug text-fg">{fiche.nom}</p>
                <button
                  type="button"
                  onClick={() => fermerFicheRef.current()}
                  className="-mr-1 -mt-1 rounded p-1 text-fg-muted transition-colors hover:bg-[var(--s-teinte)] hover:text-[var(--s-texte)]"
                  aria-label={lang === "fr" ? "Fermer" : "Close"}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <p className="m-0 mt-1 flex items-center gap-1.5 text-fg-muted">
                <span aria-hidden="true" className="h-2 w-2 rounded-full border border-[#14261f]" style={{ backgroundColor: fiche.couleur }} />
                {fiche.fonction}
                {fiche.genre ? ` · ${fiche.genre}` : ""}
              </p>
              <p className="m-0 mt-1 text-fg-muted">
                {lang === "fr"
                  ? `À ${Math.round(fiche.minutes)} min à vélo du départ`
                  : `${Math.round(fiche.minutes)} min by bike from the start`}
              </p>
              {fiche.choix ? (
                <div className="mt-2 grid gap-1.5">
                  {/* La consigne est dans le bandeau du panneau de résultats. */}
                  <button
                    type="button"
                    onClick={() => choisirDestinationRef.current(false)}
                    className="justify-self-start rounded-md border border-[var(--s-bord)] px-2 py-0.5 text-[11px] text-[var(--s-texte)] transition-colors duration-700 hover:bg-[var(--s-teinte)]"
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => choisirDestinationRef.current(true)}
                  className="mt-2 w-full rounded-md bg-[var(--s-fort)] px-2 py-1.5 text-[12px] font-medium text-white transition-colors duration-700 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--s-fort)]"
                >
                  {lang === "fr" ? "Itinéraire vers un autre lieu →" : "Route to another place →"}
                </button>
              )}
            </div>
          )}

          {survolLieu && (
            <div
              className="pointer-events-none absolute z-20 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-sm"
              style={{ left: survolLieu.x, top: survolLieu.y - 12 }}
            >
              <p className="m-0 font-semibold text-fg">{survolLieu.nom}</p>
              <p className="m-0 flex items-center gap-1.5 text-fg-muted">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: survolLieu.couleur }} />
                {survolLieu.fonction} · {Math.round(survolLieu.minutes)} min
              </p>
            </div>
          )}

          {/*
            Panneau des RÉSULTATS (lieux, choix de la destination, itinéraire),
            à droite en écran large, en feuille au bas de la carte sinon. Il
            n'existe qu'une fois la tache fixée.
          */}
          {lieuxPanneau && lab.reach && (
            <PanneauResultats
              lieux={lieuxPanneau}
              itineraire={
                routeNoms && infoItineraire
                  ? {
                      info: infoItineraire,
                      depart: routeNoms.a,
                      arrivee: routeNoms.b,
                      minutesAnim,
                      onRetour: () => {
                        reinitItineraireRef.current();
                        setRouteNoms(null);
                      },
                    }
                  : null
              }
              choix={fiche?.choix ? { onAnnuler: () => choisirDestinationRef.current(false) } : null}
              bandeau={lab.reach.places?.routeHeader}
              hiver={hiver}
              halo={haloSaison}
              lang={lang}
              plie={pliD}
              onPlier={setPliD}
              cleTache={numTache}
              className="absolute inset-x-2 bottom-2 z-10 max-h-[60%] lg:inset-x-auto lg:bottom-auto lg:right-3 lg:top-3 lg:max-h-[calc(100%-1.5rem)] lg:w-[var(--w-panneau)]"
            />
          )}

          {/* Vue confort : « l'hiver ici », au même endroit que les résultats. */}
          {lab.reach?.exposure?.hex?.winter && vue === "expose" && (
            <PanneauHiver
              info={infoHiver}
              contexte={lab.reach.exposure.hex.winter.context}
              contexteEte={lab.reach.exposure.hex.winter.summerContext}
              bandeau={lab.reach.places?.routeHeader}
              hiver={hiver}
              rapide={minutesAnim !== null}
              couleur={lab.reach.exposure.hex.winter.line ?? "#104281"}
              lang={lang}
              plie={pliD}
              onPlier={setPliD}
              onLiberer={() => libererRef.current()}
              halo={haloSaison}
              className="absolute inset-x-2 bottom-2 z-10 max-h-[60%] lg:inset-x-auto lg:bottom-auto lg:right-3 lg:top-3 lg:max-h-[calc(100%-1.5rem)] lg:w-[var(--w-panneau)]"
            />
          )}

          {/*
            Languettes des panneaux repliés : le panneau reste à un clic, avec
            son chiffre clé — rien n'est perdu, tout est compacté.
          */}
          {ecranLarge && lab.reach?.panel && !gaucheVisible && (
            <button
              type="button"
              onClick={() => {
                setPliG(false);
                if (etroit) setPliD(true);
              }}
              className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-surface/95 px-3 py-1.5 text-xs text-fg shadow-md backdrop-blur-sm transition-colors hover:border-[var(--s-bord)]"
              title={lang === "fr" ? "Déplier la portée (touche [)" : "Expand reach ([ key)"}
            >
              <span className="font-semibold">{lang === "fr" ? "Portée" : "Reach"}</span>
              {infoPortee && (
                <span className="tabular-nums text-fg-muted">
                  {lab.reach.panel.thresholds[lab.reach.panel.thresholds.length - 1]} min ·{" "}
                  {Math.round(infoPortee.km2[infoPortee.km2.length - 1] ?? 0)} km²
                </span>
              )}
              <span aria-hidden="true" className="text-[var(--s-texte)]">»</span>
            </button>
          )}
          {ecranLarge && resultatsOuverts && pliD && (
            <button
              type="button"
              onClick={() => {
                setPliD(false);
                if (etroit) setPliG(true);
              }}
              className="absolute right-14 top-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-surface/95 px-3 py-1.5 text-xs text-fg shadow-md backdrop-blur-sm transition-colors hover:border-[var(--s-bord)]"
              title={lang === "fr" ? "Déplier les résultats (touche ])" : "Expand results (] key)"}
            >
              <span aria-hidden="true" className="text-[var(--s-texte)]">«</span>
              <span className="font-semibold">
                {vue === "expose"
                  ? hiver
                    ? lang === "fr" ? "L'hiver ici" : "Winter here"
                    : lang === "fr" ? "L'été ici" : "Summer here"
                  : routeNoms && infoItineraire
                    ? lang === "fr" ? "Itinéraire" : "Route"
                    : lab.reach?.places?.title[lang]}
              </span>
              {routeNoms && infoItineraire?.minutes !== undefined && (
                <span className="tabular-nums text-fg-muted">{Math.round(infoItineraire.minutes)} min</span>
              )}
            </button>
          )}

          {/*
            Légende de la tache, SUR la carte en bas à gauche (l'usage des
            géoportails), sous le panneau de portée dont la hauteur est bornée
            pour la laisser voir.
          */}
          {lab.reach?.panel && (
            <ul className="pointer-events-none absolute bottom-2 left-3 z-[5] m-0 flex max-w-[calc(100%-1.5rem)] list-none flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-[11px] leading-snug text-fg-muted shadow-sm backdrop-blur-sm lg:max-w-[var(--w-panneau)]">
              {/* Colmena : la rampe du confort (faible → élevé), puis la coupure. */}
              {vue === "expose" && lab.reach.exposure?.hex && (
                <>
                  <li className="flex items-center gap-1.5">
                    <span className="text-fg-subtle">{lang === "fr" ? "Peu sécuritaire" : "Not very safe"}</span>
                    <span aria-hidden="true" className="flex">
                      {lab.reach.exposure.hex.ramp.map((c) => (
                        <span key={c} className="h-2.5 w-3" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    <span className="text-fg-subtle">{lang === "fr" ? "Sécuritaire" : "Safe"}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-sm border-2"
                      style={{ backgroundColor: lab.reach.exposure.hex.cut.color, borderColor: lab.reach.exposure.hex.cut.outline }}
                    />
                    {lab.reach.exposure.hex.cut.label[lang]}
                  </li>
                  {avecCvc && lab.reach.exposure.hex.corridors && (
                    <li className="flex items-center gap-1.5">
                      <svg aria-hidden="true" width="18" height="6" className="shrink-0">
                        <line x1="0" y1="3" x2="18" y2="3" stroke={lab.reach.exposure.hex.corridors.line} strokeWidth="2.5" strokeDasharray="5 3" />
                      </svg>
                      {lab.reach.exposure.hex.corridors.label[lang]}
                    </li>
                  )}
                  {hiver && lab.reach.exposure.hex.winter && (
                    <li className="w-full text-fg-subtle">{lab.reach.exposure.hex.winter.note[lang]}</li>
                  )}
                </>
              )}
              {(vue === "expose" && lab.reach.exposure
                ? lab.reach.exposure.hex
                  ? []
                  : [lab.reach.exposure.patch]
                : hiver && lab.reach.winter?.bands
                  ? lab.reach.winter.bands
                  : lab.reach.bands
              ).map((b) => (
                <li key={b.label.en} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label[lang]}
                </li>
              ))}
            </ul>
          )}

          {lab.reach?.hint && !porteeActive && mode === "portee" && (
            <p className="pointer-events-none absolute bottom-8 right-3 z-10 max-w-[18rem] rounded-lg border border-line bg-surface/90 px-3 py-2 text-xs leading-snug text-fg-muted shadow-sm backdrop-blur-sm">
              {lab.reach.hint[lang]}
            </p>
          )}

          {/*
            Plein écran. Placé dans le flux plutôt qu'en surimpression sur la
            carte : un bouton posé sur la carte masque une partie des données, et
            se retrouve sous le curseur au moment où l'on explore.
          */}
          <button
            type="button"
            onClick={basculerPleinEcran}
            aria-pressed={pleinEcran}
            // Sous la pile de zoom de MapLibre, pas à côté : ses deux boutons
            // s'ancrent eux aussi en haut à droite, et se recouvraient. `top-24`
            // laisse passer les deux (29 px chacun) plus leur marge.
            className={`absolute right-[10px] top-24 z-10 rounded-lg border border-line bg-surface/90 p-2 text-fg-muted shadow-sm backdrop-blur-sm transition-[color,right] duration-300 ease-out ${lab.reach ? "hover:text-[var(--s-texte)]" : "hover:text-fg"}`}
            // Glisse avec les boutons de zoom quand le panneau de résultats s'ouvre.
            style={decalageDroite ? { right: `calc(${decalageDroite} + 10px)` } : undefined}
            title={
              pleinEcran
                ? lang === "fr" ? "Quitter le plein écran" : "Exit full screen"
                : lang === "fr" ? "Plein écran" : "Full screen"
            }
          >
            <span className="sr-only">
              {pleinEcran
                ? lang === "fr" ? "Quitter le plein écran" : "Exit full screen"
                : lang === "fr" ? "Plein écran" : "Full screen"}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {pleinEcran ? (
                <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
              ) : (
                <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
              )}
            </svg>
          </button>
        </div>

        {panneauPortee && lab.reach?.panel && (
          <ReachPanel
            info={infoPortee}
            title={lab.reach.panel.title}
            thresholds={lab.reach.panel.thresholds}
            discSpeed={lab.reach.panel.discSpeed}
            // Chaque barre prend la couleur de son palier sur la carte quand
            // les deux coïncident : le panneau et la tache se lisent ensemble.
            barColors={lab.reach.panel.thresholds.map(
              (t) =>
                (vue === "expose" ? lab.reach?.exposure?.patch.color : undefined) ??
                (hiver && lab.reach?.winter?.bands
                  ? lab.reach.winter.bands
                  : lab.reach?.bands
                )?.find((b) => b.max === t)?.color ??
                lab.reach?.panel?.barColor ??
                "#2a78d6",
            )}
            // Replié (languette, ou écran étroit avec les résultats ouverts) :
            // il glisse hors de la carte par la gauche.
            // Hauteur bornée pour laisser la légende visible dessous.
            className={`lg:absolute lg:left-3 lg:top-3 lg:z-10 lg:max-h-[calc(100%-4.25rem)] lg:w-[var(--w-panneau)] lg:bg-surface/95 lg:backdrop-blur-sm ${
              gaucheVisible ? "" : "lg:pointer-events-none lg:-translate-x-[calc(100%+1rem)] lg:opacity-0"
            }`}
            // Le palier du milieu de la tache (10 min), de la saison affichée.
            halo={(hiver && lab.reach.winter?.bands ? lab.reach.winter.bands : lab.reach.bands)[1]?.color}
            note={lab.reach.panel.note}
            empty={lab.reach.panel.empty}
            // La légende est sur la carte (en bas à gauche), plus ici.
            bandeau={lab.reach.panel.header}
            lieux={lieuxPanneau}
            itineraire={infoItineraire}
            vues={
              lab.reach.exposure
                ? {
                    actuelle: vue,
                    options: [
                      { id: "temps", label: lab.reach.exposure.timeLabel },
                      { id: "expose", label: lab.reach.exposure.label },
                    ],
                    onChange: changerVue,
                    noteExpose: lab.reach.exposure.note,
                    rampe: lab.reach.exposure.hex
                      ? {
                          couleurs: lab.reach.exposure.hex.ramp,
                          coupure: lab.reach.exposure.hex.cut.color,
                          contour: lab.reach.exposure.hex.cut.outline,
                          hiver:
                            lab.reach.exposure.hex.winter?.line &&
                            lab.reach.exposure.hex.winter.cleared &&
                            lab.reach.exposure.hex.winter.packedLabel
                              ? {
                                  couleur: lab.reach.exposure.hex.winter.line,
                                  deneige: lab.reach.exposure.hex.winter.cleared,
                                  dame: lab.reach.exposure.hex.winter.packedLabel,
                                  note: lab.reach.exposure.hex.winter.note,
                                }
                              : undefined,
                          ete:
                            lab.reach.exposure.hex.winter?.summerLine && lab.reach.exposure.hex.winter.summerLabel
                              ? { couleur: lab.reach.exposure.hex.winter.summerLine, label: lab.reach.exposure.hex.winter.summerLabel }
                              : undefined,
                        }
                      : undefined,
                    corridors: lab.reach.exposure.hex?.corridors
                      ? {
                          actif: avecCvc,
                          onChange: basculerCvc,
                          aujourdhui: lab.reach.exposure.hex.corridors.today,
                          avec: lab.reach.exposure.hex.corridors.planned,
                        }
                      : undefined,
                  }
                : undefined
            }
            lang={lang}
            hiver={
              lab.reach.winter
                ? { actif: hiver, onChange: basculerHiver, note: lab.reach.winter.note }
                : undefined
            }
          />
        )}

        {panneau && !panneauPortee && (
          <LabPanel
            titre={titrePanneau}
            lignes={lab.select?.rows ?? []}
            donnees={mesures ?? {}}
            curseur={curseur}
            palier={palierCourant}
            onPalier={setPalier}
            onFermer={() => setChoisi(null)}
            config={lab.select?.panel}
            entite={choisi}
            serie={serie}
            ensemble={ensemble}
            lang={lang}
            vide={lab.select?.empty}
            legende={lab.legend}
          />
        )}
      </div>


      {/*
        Des boutons, pas un défilement détourné : le défilement narratif se
        bat avec celui de l'article, casse sur mobile et ne se pilote pas au
        clavier. Trois boutons marchent partout.
      */}
      {scenes.length > 1 && (
        <div className="mt-3">
          <div
            role="tablist"
            aria-label={label}
            className="flex flex-wrap gap-2"
          >
            {scenes.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={i === scene}
                onClick={() => setScene(i)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  i === scene
                    ? "border-fg bg-fg text-surface"
                    : "border-line text-fg-muted hover:text-fg"
                }`}
              >
                <span aria-hidden="true" className="mr-1.5 tabular-nums opacity-60">
                  {i + 1}
                </span>
                {s.label[lang]}
              </button>
            ))}
          </div>

          {current?.caption && (
            <p
              // `aria-live` : le texte change sans que la page bouge, donc un
              // lecteur d'écran ne le verrait jamais sans annonce.
              aria-live="polite"
              className="mt-3 text-sm leading-relaxed text-fg-muted"
            >
              {current.caption[lang]}
            </p>
          )}
        </div>
      )}

      {survol && lab.hover && (
        <div
          // `pointer-events-none` : sans cela l'infobulle passe sous le
          // curseur et déclenche un clignotement sans fin.
          // Teinte d'eau plutôt que la surface neutre du site : l'infobulle
          // appartient à une carte dont l'eau est le sujet. Le bleu reste très
          // dilué — assez pour situer, pas assez pour concurrencer les marques.
          className="pointer-events-none absolute z-10 max-w-64 rounded-lg border border-sky-200/70 bg-sky-50/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm dark:border-sky-900/60 dark:bg-slate-900/95 dark:text-slate-200"
          style={{
            left: Math.min(survol.x + 14, (containerRef.current?.clientWidth ?? 0) - 220),
            top: survol.y + 14,
          }}
        >
          {lab.hover.rows.map((row) => {
            // Une ligne conditionnelle ne s'écrit que pour l'entité qu'elle
            // concerne : un lac n'a pas de population, une municipalité
            // desservie n'a pas de part de bassin.
            if (row.when) {
              const brut = survol.props[row.when.field];
              const attendu = row.when.equals;
              const valeur =
                typeof brut === "string" && typeof attendu === "boolean"
                  ? brut === "true"
                  : brut;
              if (valeur !== attendu) return null;
            }

            const v = survol.props[row.field];
            if (v === undefined || v === null || v === "") return null;

            if (row.title) {
              return (
                <p key={row.field} className="font-semibold text-sky-950 dark:text-sky-100">
                  {String(v)}
                  {row.suffix ?? ""}
                </p>
              );
            }

            // Une série temporelle arrive en texte : MapLibre sérialise les
            // propriétés imbriquées d'une entité GeoJSON.
            if (row.spark) {
              const serie: Record<string, number> | null =
                typeof v === "string"
                  ? (JSON.parse(v) as Record<string, number>)
                  : (v as Record<string, number>);
              if (!serie || typeof serie !== "object") return null;
              const annees = Object.keys(serie).sort();
              return (
                <div key={row.field} className="mt-2 border-t border-sky-200/70 pt-2 dark:border-sky-900/60">
                  <p className="text-slate-500 dark:text-slate-400">
                    {row.label ? row.label[lang] : ""}
                  </p>
                  <Courbe
                    serie={serie}
                    color={row.spark.color}
                    hauteur={row.spark.height}
                  />
                  <p className="flex justify-between tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {annees[0]} · {serie[annees[0]].toLocaleString(lang)}
                    </span>
                    <span>
                      {annees[annees.length - 1]} ·{" "}
                      {serie[annees[annees.length - 1]].toLocaleString(lang)}
                    </span>
                  </p>
                </div>
              );
            }

            if (row.bar) {
              return (
                <div key={row.field} className="mt-1">
                  <p className="text-slate-500 dark:text-slate-400">
                    {row.label ? `${row.label[lang]} : ` : ""}
                    <span className="tabular-nums font-medium text-sky-950 dark:text-sky-100">{String(v)}</span>
                    {row.suffix ?? ""}
                  </p>
                  <Barre
                    valeur={Number(v)}
                    max={row.bar.max}
                    color={row.bar.color}
                  />
                </div>
              );
            }

            return (
              <p key={row.field} className="text-slate-500 dark:text-slate-400">
                {row.label ? `${row.label[lang]} : ` : ""}
                <span className="tabular-nums font-medium text-sky-950 dark:text-sky-100">
                  {String(v)}
                </span>
                {row.suffix ?? ""}
              </p>
            );
          })}
        </div>
      )}

      {/*
        En plein écran, la légende est reprise ici : celle de l'entrée vit
        dans `LabEmbed`, hors du conteneur agrandi, et disparaîtrait donc au
        moment précis où la carte occupe tout l'écran.
      */}
      {pleinEcran && lab.legend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {lab.legend.map((item) => (
            <li key={item.label.en} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm border border-line"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-fg-muted">{item.label[lang]}</span>
            </li>
          ))}
        </ul>
      )}

      {failed && (
        <p
          role="status"
          className="absolute inset-x-3 bottom-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg-muted"
        >
          {errorLabel}
        </p>
      )}
    </div>
  );
}
