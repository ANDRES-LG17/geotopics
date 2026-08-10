"use client";

import { useEffect, useRef, useState } from "react";
import { AJAXError, MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { boundsPair, type LabColor, type LabDefinition } from "@/labs/types";

/**
 * Le moteur cartographique — le seul fichier du site qui importe MapLibre.
 *
 * Il n'est jamais importé directement : `LabEmbed` le charge par import
 * dynamique après un clic du lecteur. C'est ce qui garde les 250 ko de
 * MapLibre (plus son CSS) hors du bundle de tous ceux qui viennent seulement
 * lire un article.
 *
 * Aucune requête réseau n'est faite en dehors des fichiers du site, tant qu'un
 * lab ne déclare pas de fond de carte : pas de jeton, pas de fournisseur de
 * tuiles, pas de serveur de polices. Un lab sans fond ne peut donc pas cesser
 * de fonctionner parce qu'un compte tiers a expiré.
 */

const BACKGROUND_LAYER = "lab-background";

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

export default function LabMap({
  lab,
  label,
  errorLabel,
}: {
  lab: LabDefinition;
  /** Nom du lab pour les lecteurs d'écran — le titre de l'entrée. */
  label: string;
  errorLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

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
      minZoom: lab.minZoom,
      maxZoom: lab.maxZoom,
      // La molette ne détourne pas le défilement de l'article : il faut
      // Ctrl (ou deux doigts) pour zoomer. Une carte au milieu d'un texte
      // qui capture le défilement est une carte qu'on déteste.
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      for (const [id, url] of Object.entries(lab.sources)) {
        map.addSource(id, { type: "geojson", data: url });
      }

      // L'ordre du tableau est l'ordre de peinture : la dernière couche
      // déclarée est celle qui reste au-dessus.
      lab.layers.forEach((layer, index) => {
        const id = `lab-layer-${index}`;

        switch (layer.kind) {
          case "fill":
            map.addLayer({
              id,
              type: "fill",
              source: layer.source,
              paint: {
                "fill-color": colorValue(layer.color),
                "fill-opacity": layer.opacity ?? 0.5,
                ...(layer.outlineColor
                  ? { "fill-outline-color": layer.outlineColor }
                  : {}),
              },
            });
            break;

          case "line":
            map.addLayer({
              id,
              type: "line",
              source: layer.source,
              paint: {
                "line-color": colorValue(layer.color),
                "line-width": layer.width ?? 1,
                "line-opacity": layer.opacity ?? 1,
                ...(layer.dash ? { "line-dasharray": layer.dash } : {}),
              },
            });
            break;

          case "circle":
            map.addLayer({
              id,
              type: "circle",
              source: layer.source,
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
    });

    // On ne signale au lecteur que l'échec d'une requête — fichier renommé,
    // `-v2` oublié dans la définition. C'est la panne qui arrive vraiment, et
    // une carte vide sans explication est pire qu'un message. Le reste des
    // erreurs de MapLibre part en console, à l'attention de l'auteur.
    map.on("error", (event) => {
      console.error("[lab]", lab.id, event.error);
      if (event.error instanceof AJAXError) setFailed(true);
    });

    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncBackground = () => {
      if (basemap.kind !== "none" || !map.getLayer(BACKGROUND_LAYER)) return;
      map.setPaintProperty(BACKGROUND_LAYER, "background-color", readBackground());
    };
    theme.addEventListener("change", syncBackground);

    return () => {
      theme.removeEventListener("change", syncBackground);
      map.remove();
    };
  }, [lab]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        className="h-[420px] w-full overflow-hidden rounded-xl border border-line sm:h-[520px]"
      />
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
