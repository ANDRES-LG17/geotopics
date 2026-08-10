import type { LabDefinition } from "./types";

/**
 * Lab de démonstration — sert de gabarit et de test de bout en bout.
 *
 * Les données sont synthétiques (voir `scripts/build-demo-isochrones.mjs`) :
 * ce lab n'est rattaché qu'à une entrée en brouillon, il ne paraît donc jamais
 * sur le site publié. Le copier est le point de départ d'un vrai lab.
 *
 * La rampe de couleurs monte en clarté avec la durée. Elle est choisie pour
 * tenir sur les deux thèmes : les tons les plus sombres restent lisibles sur
 * fond clair, les plus clairs sur fond sombre.
 */
const demoIsochrones: LabDefinition = {
  id: "demo-isochrones",

  sources: {
    isochrones: "/data/demo-isochrones-v1.geojson",
  },

  layers: [
    {
      kind: "fill",
      source: "isochrones",
      opacity: 0.45,
      color: {
        byProperty: "duration",
        match: [
          [60, "#a8e6c8"],
          [45, "#4fc78d"],
          [30, "#0e6f52"],
          [15, "#053a2a"],
        ],
        fallback: "#667a70",
      },
    },
    {
      kind: "line",
      source: "isochrones",
      color: "#0e6f52",
      width: 0.8,
      opacity: 0.5,
    },
  ],

  // Emprise imprimée par le script de précalcul.
  view: { bounds: [-72.06, 46.37, -70.39, 47.28] },
  maxZoom: 11,

  // Aucun fond de carte : aucune requête vers un tiers, aucun jeton.
  basemap: { kind: "none" },

  legend: [
    { color: "#053a2a", label: { fr: "15 minutes", en: "15 minutes" } },
    { color: "#0e6f52", label: { fr: "30 minutes", en: "30 minutes" } },
    { color: "#4fc78d", label: { fr: "45 minutes", en: "45 minutes" } },
    { color: "#a8e6c8", label: { fr: "60 minutes", en: "60 minutes" } },
  ],

  attribution: {
    fr: "Données synthétiques — démonstration technique",
    en: "Synthetic data — technical demonstration",
  },

  note: {
    fr: "Temps de parcours inventés. Les zones sont des tampons autour des points desservis, non fusionnés entre eux : ce que la carte montre entre deux points est une extrapolation, pas une accessibilité mesurée.",
    en: "Travel times are made up. The zones are buffers around served points, not merged together: what the map shows between two points is extrapolation, not measured accessibility.",
  },

  download: "/data/demo-isochrones-v1.geojson",
};

export default demoIsochrones;
