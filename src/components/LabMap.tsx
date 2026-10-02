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
function colorValue(color: LabColor): string {
  if (typeof color === "string") return color;
  if (Array.isArray(color)) return color as unknown as string;

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
 * Une couleur hexadécimale rendue translucide.
 *
 * Sert aux dégradés animés, où la même teinte doit s'éteindre par degrés le
 * long de la ligne. Une couleur non hexadécimale est renvoyée telle quelle :
 * mieux vaut une traînée à bord net qu'une couche qui disparaît.
 */
function teinte(hex: string, alpha: number): string {
  const n = hex.replace("#", "");
  const court = n.length === 3;
  const r = parseInt(court ? n[0] + n[0] : n.slice(0, 2), 16);
  const v = parseInt(court ? n[1] + n[1] : n.slice(2, 4), 16);
  const b = parseInt(court ? n[2] + n[2] : n.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${v},${b},${a.toFixed(3)})`;
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
  onSelection,
  palierExterne,
}: {
  lab: LabDefinition;
  /** Nom du lab pour les lecteurs d'écran — le titre de l'entrée. */
  label: string;
  errorLabel: string;
  /** Langue courante, pour les libellés de scènes. */
  locale?: string;
  /**
   * Remonte l'entité choisie et ses chiffres au palier courant.
   *
   * Le panneau vit HORS de la carte — une carte qu'on vient regarder ne doit
   * pas être couverte par ce qu'on y lit. L'état de sélection, lui, reste ici :
   * c'est la carte qui sait ce qui a été cliqué.
   */
  onSelection?: (
    choisi: Record<string, unknown> | null,
    donnees: Record<string, unknown> | null,
  ) => void;
  /** Palier imposé par le curseur du panneau, qui vit à l'extérieur. */
  palierExterne?: number | null;
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
  /**
   * Entité choisie d'un clic, et palier du curseur.
   *
   * Distincte du survol : celui-ci s'efface dès que le curseur bouge, alors
   * qu'une sélection reste tant qu'on ne la ferme pas — c'est ce qu'il faut
   * pour qu'un panneau soit lisible et qu'un curseur serve à quelque chose.
   */
  const [choisi, setChoisi] = useState<Record<string, unknown> | null>(null);
  const scenes = lab.scenes ?? [];
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";

  const curseur = lab.select?.slider;
  // Le palier courant : celui que pose le curseur du panneau, sinon celui
  // d'ouverture, sinon le dernier — montrer l'aire complète d'emblée vaut mieux
  // que de l'exiger d'un geste que rien n'annonce.
  const palierCourant =
    palierExterne ??
    curseur?.start ??
    curseur?.steps[curseur.steps.length - 1] ??
    null;

  /**
   * Les chiffres affichés au palier courant.
   *
   * C'est ce qui fait la différence entre un curseur décoratif et un curseur
   * qui mesure : en bougeant, le lecteur ne voit pas seulement la tache
   * changer, il voit la superficie et la population changer avec elle.
   *
   * Les valeurs viennent de l'entité révélée — celle qui porte le palier — et
   * non de l'entité cliquée, qui n'en a qu'un jeu. Lue sur la carte plutôt que
   * tenue dans un état : les données sont déjà là, et les dupliquer
   * garantirait qu'elles divergent.
   */
  const [donneesPanneau, setDonneesPanneau] = useState<Record<
    string,
    unknown
  > | null>(null);

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
   * Les couches révélées ne montrent que ce qui est choisi, au palier courant.
   *
   * Sans ce filtre, les vingt-neuf aires de marche se superposeraient : une
   * tache uniforme où plus rien ne se lit. Le filtre les éteint toutes tant
   * qu'aucune station n'est choisie, puis n'en laisse qu'une.
   *
   * `["==", ["literal", false], true]` est un faux constant : c'est ainsi qu'on
   * éteint une couche par filtre, sans toucher à sa visibilité — qu'une scène
   * pourrait vouloir piloter par ailleurs.
   */
  useEffect(() => {
    const map = mapRef.current;
    const select = lab.select;
    if (!map || !select?.revealLayers?.length) return;

    const appliquer = () => {
      for (const index of select.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        if (!map.getLayer(id)) continue;

        if (!choisi) {
          map.setFilter(id, ["==", ["literal", false], true]);
          continue;
        }

        const conditions: unknown[] = [
          "all",
          ["==", ["get", select.key], choisi[select.key] as string],
        ];
        if (select.slider && palierCourant !== null) {
          conditions.push(["==", ["get", select.slider.field], palierCourant]);
        }
        map.setFilter(id, conditions as never);
      }

      if (!choisi) {
        setDonneesPanneau(null);
        return;
      }

      /**
       * Relire les chiffres du palier courant parmi les entités de la source.
       *
       * APRÈS que la carte a fini de redessiner, et c'est tout l'objet du
       * `idle`. Interroger juste après `setFilter` renvoyait zéro entité :
       * MapLibre n'avait pas encore retraité ses tuiles. Le panneau s'ouvrait
       * donc avec son titre et son curseur, mais sans aucun chiffre — ils
       * n'apparaissaient qu'au premier mouvement du curseur, qui déclenchait un
       * second passage.
       *
       * `querySourceFeatures` interroge les tuiles chargées et non l'écran :
       * une aire reste trouvable même si le lecteur a fait glisser la carte à
       * côté.
       */
      const relire = () => {
        for (const index of select.revealLayers ?? []) {
          const id = `lab-layer-${index}`;
          const couche = map.getLayer(id);
          if (!couche) continue;
          const trouve = map.querySourceFeatures(couche.source as string, {
            filter: map.getFilter(id) as never,
          });
          if (trouve.length) {
            setDonneesPanneau(trouve[0].properties ?? null);
            return;
          }
        }
        // Rien trouvé : on garde les chiffres précédents plutôt que de vider le
        // panneau, qui clignoterait à chaque mouvement de carte.
      };

      relire();
      map.once("idle", relire);
    };

    // Les couches n'existent qu'une fois le style chargé : au premier rendu,
    // l'effet passe avant `load`.
    if (map.isStyleLoaded()) appliquer();
    else map.once("idle", appliquer);
  }, [choisi, palierCourant, lab.select, lab.sources]);

  // Remonter la sélection au parent, qui rend le panneau à côté de la carte.
  useEffect(() => {
    onSelection?.(choisi, donneesPanneau);
  }, [choisi, donneesPanneau, onSelection]);

  /**
   * La lueur qui parcourt la ligne.
   *
   * Rien ne bouge côté données : on repeint à chaque image le dégradé de la
   * couche, en déplaçant la position de la tache claire. Le GPU fait le reste.
   *
   * ARRÊTÉE QUAND ELLE NE SERT À RIEN — hors de l'écran (`IntersectionObserver`)
   * et sur un onglet caché (`visibilitychange`). Une animation qui tourne dans
   * un onglet qu'on ne regarde pas vide la batterie sans que personne n'en
   * profite.
   *
   * `prefers-reduced-motion` la supprime : la ligne reste alors dessinée par
   * ses autres couches, et rien ne manque à la lecture.
   */
  useEffect(() => {
    const index = lab.layers.findIndex((c) => c.kind === "pulse");
    if (index < 0) return;
    const couche = lab.layers[index] as Extract<
      (typeof lab.layers)[number],
      { kind: "pulse" }
    >;
    const id = `lab-layer-${index}`;
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duree = couche.duration ?? 9000;
    const longueur = couche.length ?? 0.06;
    let image = 0;
    let visible = true;
    let debut: number | null = null;

    const peindre = (temps: number) => {
      const map = mapRef.current;
      if (!map || !map.getLayer(id)) {
        image = requestAnimationFrame(peindre);
        return;
      }
      if (debut === null) debut = temps;

      // Position de la tête de la lueur, de 0 à 1 le long de la ligne.
      const tete = ((temps - debut) % duree) / duree;
      const queue = tete - longueur;

      // Le dégradé doit être écrit par positions CROISSANTES, sans doublon :
      // MapLibre rejette l'expression sinon, et la couche disparaît en silence.
      const bornes = new Map<number, string>();
      const poser = (p: number, couleur: string) => {
        const borne = Math.min(1, Math.max(0, p));
        if (!bornes.has(borne)) bornes.set(borne, couleur);
      };

      /**
       * La traînée s'éteint par degrés, et non d'un coup.
       *
       * Une première version passait de la couleur pleine au transparent en un
       * millième de la ligne : la rame avait un bord net à l'avant comme à
       * l'arrière, ce qui donnait un trait qui saute plutôt qu'un véhicule qui
       * passe. Trois paliers intermédiaires suffisent à faire une comète —
       * dense en tête, évanouie en queue.
       */
      const transparent = "rgba(0,0,0,0)";
      const fondu = (p: number) =>
        couche.color.startsWith("#")
          ? teinte(couche.color, p)
          : couche.color;

      poser(0, queue <= 0 ? fondu(1 + queue / longueur) : transparent);
      if (queue > 0) poser(queue, transparent);
      // Le corps de la traînée, de la queue vers la tête.
      for (const part of [0.35, 0.65, 0.85]) {
        const p = queue + longueur * part;
        if (p > 0) poser(p, fondu(part));
      }
      poser(tete, fondu(1));
      // L'avant reste franc : c'est lui qui donne le sens de la marche.
      poser(Math.min(1, tete + 0.004), transparent);
      poser(1, transparent);

      const arrets = [...bornes.entries()].sort((a, b) => a[0] - b[0]);
      try {
        map.setPaintProperty(id, "line-gradient", [
          "interpolate",
          ["linear"],
          ["line-progress"],
          ...arrets.flat(),
        ] as never);
      } catch {
        // Une expression refusée ne doit pas tuer la boucle : on réessaiera à
        // l'image suivante, avec d'autres bornes.
      }
      image = requestAnimationFrame(peindre);
    };

    const demarrer = () => {
      if (image) return;
      debut = null;
      image = requestAnimationFrame(peindre);
    };
    const arreter = () => {
      cancelAnimationFrame(image);
      image = 0;
    };

    const observateur = new IntersectionObserver(
      ([entree]) => {
        visible = entree.isIntersecting;
        if (visible && !document.hidden) demarrer();
        else arreter();
      },
      { threshold: 0 },
    );
    observateur.observe(container);

    const surOnglet = () => {
      if (document.hidden || !visible) arreter();
      else demarrer();
    };
    document.addEventListener("visibilitychange", surOnglet);

    return () => {
      arreter();
      observateur.disconnect();
      document.removeEventListener("visibilitychange", surOnglet);
    };
  }, [lab]);

  /**
   * La carte suit la taille de son conteneur.
   *
   * Nécessaire depuis que le panneau vit à l'extérieur : son ouverture rétrécit
   * la carte sans que la fenêtre bouge, et MapLibre ne s'en aperçoit pas seul —
   * le canevas garderait son ancienne largeur, déformant la projection.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observateur = new ResizeObserver(() => mapRef.current?.resize());
    observateur.observe(container);
    return () => observateur.disconnect();
  }, []);

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

    // Infobulle au survol. Rendue en React plutôt qu'en Popup MapLibre : elle
    // suit le thème du site, et le texte reste sélectionnable.
    if (lab.hover) {
      const cibles = lab.hover.layers.map((i) => `lab-layer-${i}`);

      map.on("mousemove", (e) => {
        const trouve = map.queryRenderedFeatures(e.point, {
          layers: cibles.filter((id) => map.getLayer(id)),
        });
        if (!trouve.length) {
          map.getCanvas().style.cursor = "";
          setSurvol(null);
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        setSurvol({
          x: e.point.x,
          y: e.point.y,
          props: trouve[0].properties ?? {},
        });
      });

      map.on("mouseout", () => {
        map.getCanvas().style.cursor = "";
        setSurvol(null);
      });
    }

    // Sélection au clic. Fonctionne aussi au doigt : MapLibre émet `click` sur
    // un appui, là où `mousemove` n'existe pas — c'est donc le même geste qui
    // rend le lab utilisable sur téléphone.
    if (lab.select) {
      const cliquables = lab.select.layers.map((i) => `lab-layer-${i}`);

      /**
       * Tolérance de visée, en pixels.
       *
       * `queryRenderedFeatures` sur un point n'interroge que ce pixel-là. Une
       * station fait sept pixels de rayon : viser juste devient un exercice
       * d'adresse, impossible au doigt, où la pulpe couvre une quarantaine de
       * pixels sans qu'on sache lesquels.
       *
       * On interroge donc un carré autour du point. 12 px est le compromis
       * usuel : assez pour pardonner le geste, assez peu pour ne pas attraper
       * la station d'à côté.
       */
      const TOLERANCE = 12;

      const chercher = (point: { x: number; y: number }) =>
        map.queryRenderedFeatures(
          [
            [point.x - TOLERANCE, point.y - TOLERANCE],
            [point.x + TOLERANCE, point.y + TOLERANCE],
          ],
          { layers: cliquables.filter((id) => map.getLayer(id)) },
        );

      map.on("click", (e) => {
        const trouve = chercher(e.point);
        // Un clic à côté referme le panneau : c'est le geste attendu, et il
        // évite d'avoir à viser une croix.
        setChoisi(trouve.length ? (trouve[0].properties ?? {}) : null);
      });

      // Le curseur annonce ce qui est cliquable. Sans ce signal, rien dans la
      // page ne dit que ces cercles répondent — et le lecteur passe à côté de
      // tout le propos du lab.
      map.on("mousemove", (e) => {
        if (chercher(e.point).length) map.getCanvas().style.cursor = "pointer";
      });
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

      for (const [id, source] of Object.entries(lab.sources)) {
        const config =
          typeof source === "string" ? { url: source } : source;
        map.addSource(id, {
          type: "geojson",
          data: config.url,
          // Mesure la distance parcourue le long de chaque ligne. Nécessaire à
          // `line-gradient`, et calculée seulement sur demande : c'est un
          // travail de plus à chaque tuile.
          ...(config.lineMetrics ? { lineMetrics: true } : {}),
        });
      }

      // L'ordre du tableau est l'ordre de peinture : la dernière couche
      // déclarée est celle qui reste au-dessus.
      lab.layers.forEach((layer, index) => {
        const id = `lab-layer-${index}`;

        // Une source partagée par plusieurs couches : le filtre dit laquelle
        // prend quelles entités.
        const filter = layer.filter
          ? { filter: layer.filter as never }
          : {};

        switch (layer.kind) {
          case "fill":
            map.addLayer({
              id,
              type: "fill",
              source: layer.source,
              ...filter,
              paint: {
                "fill-color": colorValue(layer.color),
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
              ...filter,
              paint: {
                "fill-extrusion-color": colorValue(layer.color),
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
              ...filter,
              layout: {
                ...(layer.cap ? { "line-cap": layer.cap } : {}),
                ...(layer.join ? { "line-join": layer.join } : {}),
              },
              paint: {
                "line-color": colorValue(layer.color),
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

          case "pulse":
            map.addLayer({
              id,
              type: "line",
              source: layer.source,
              ...filter,
              layout: {
                "line-cap": layer.cap ?? "round",
                "line-join": layer.join ?? "round",
              },
              paint: {
                // Une couleur de base est obligatoire même quand le dégradé la
                // remplace : MapLibre refuse une couche de ligne sans elle.
                "line-color": layer.color,
                "line-width": (layer.width ?? 4) as number,
                // Le dégradé initial est entièrement transparent : la lueur
                // n'apparaît qu'au premier passage de l'animation, et une
                // carte dont le JavaScript ne démarre pas ne montre donc rien
                // d'étrange — seulement rien.
                "line-gradient": [
                  "interpolate",
                  ["linear"],
                  ["line-progress"],
                  0,
                  "rgba(0,0,0,0)",
                  1,
                  "rgba(0,0,0,0)",
                ],
              },
            });
            break;

          case "label":
            map.addLayer({
              id,
              type: "symbol",
              source: layer.source,
              ...filter,
              layout: {
                "text-field": layer.text as never,
                "text-size": layer.size ?? 12,
                // « Noto Sans Regular » est la seule police servie à la fois
                // par le fond de CARTO et par le serveur de repli. Demander une
                // police absente ne lève pas d'erreur : le texte ne s'affiche
                // simplement pas.
                "text-font": ["Noto Sans Regular"],
                "text-offset": [0, layer.offsetY ?? 0],
                "text-anchor": "center",
                // Les étiquettes ne se masquent pas entre elles : sur cinq
                // entités, mieux vaut un chevauchement qu'un nom manquant.
                "text-allow-overlap": true,
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
              ...filter,
              paint: {
                "circle-color": colorValue(layer.color),
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
      });

      // Les couches révélées naissent éteintes : rien n'est encore choisi, et
      // vingt-neuf aires superposées ne seraient qu'une tache. L'effet de
      // sélection les rallumera au premier clic.
      for (const index of lab.select?.revealLayers ?? []) {
        const id = `lab-layer-${index}`;
        if (map.getLayer(id)) {
          map.setFilter(id, ["==", ["literal", false], true]);
        }
      }

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
      setFailed(true);
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
    theme.addEventListener("change", syncBackground);

    return () => {
      theme.removeEventListener("change", syncBackground);
      sceneRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [lab, lang, fill]);

  const current = scenes[scene];

  return (
    <div
      ref={wrapperRef}
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
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        className={`w-full overflow-hidden rounded-xl border border-line ${
          pleinEcran || fill ? "min-h-0 flex-1" : "h-[420px] sm:h-[520px]"
        }`}
      />

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
        className="absolute right-[10px] top-24 z-10 rounded-lg border border-line bg-surface/90 p-2 text-fg-muted shadow-sm backdrop-blur-sm transition-colors hover:text-fg"
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
