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
  const scenes = lab.scenes ?? [];
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";

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
      // Plein écran : plus d'article derrière, donc plus de défilement à
      // protéger. La molette zoome sans Ctrl, et la contrainte revient en
      // sortant.
      const gestes = mapRef.current?.cooperativeGestures;
      if (gestes) {
        if (actif) gestes.disable();
        else gestes.enable();
      }
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
            fitBoundsOptions: { padding: 24 },
          }
        : { center: lab.view.center, zoom: lab.view.zoom }),
      ...cameraFor(lab.view, container.clientWidth < 640),
      minZoom: lab.minZoom,
      maxZoom: lab.maxZoom,
      // Dans une entrée, la molette ne détourne pas le défilement : il faut
      // Ctrl (ou deux doigts) pour zoomer. Une carte au milieu d'un texte qui
      // capture le défilement est une carte qu'on déteste.
      //
      // En prévisualisation (`fill`) il n'y a pas d'article autour, donc rien
      // à protéger : la molette zoome directement. Le plein écran lève la
      // contrainte de la même façon, plus bas.
      cooperativeGestures: !fill,
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

    map.on("load", () => {
      // Le fond est un repère, pas le sujet. On masque ce qu'il redit
      // autrement, et on atténue le reste, avant d'ajouter nos couches.
      if (basemap.kind === "style") {
        for (const id of basemap.hideLayers ?? []) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        }

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
      }

      for (const [id, url] of Object.entries(lab.sources)) {
        map.addSource(id, { type: "geojson", data: url });
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
              paint: {
                "line-color": colorValue(layer.color),
                "line-width": layer.width ?? 1,
                "line-opacity": layer.opacity ?? 1,
                ...(layer.dash ? { "line-dasharray": layer.dash } : {}),
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
        map.fitBounds(boundsPair(view.bounds), { padding: 24, ...camera, duration });
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
        `zoom ${map.getZoom().toFixed(2)}`;
      // En console seulement : sous la carte, ce relevé prenait la place de
      // ce qu'on vient regarder.
      console.info("[lab]", lab.id, resume);
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
        className="absolute right-3 top-3 z-10 rounded-lg border border-line bg-surface/90 p-2 text-fg-muted shadow-sm backdrop-blur-sm transition-colors hover:text-fg"
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
