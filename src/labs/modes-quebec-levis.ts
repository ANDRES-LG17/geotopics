import type { LabDefinition } from "./types";

/**
 * 15 minutes à Québec–Lévis : à pied, à vélo, en auto — l'été et l'hiver.
 *
 * Les bases du lab vélo (`velo-quebec-levis`) : même grille de 100 m, même
 * masque de terre, même moteur de portée (`src/lib/reach.ts`). Sous le curseur,
 * TROIS taches de 15 min se superposent, une par mode ; sous la carte, une
 * carte par mode porte son bandeau animé et ses trois barres (5, 10, 15 min).
 *
 * COULEURS — UNE TEINTE PAR MODE (violet à pied, vert à vélo, ambre en auto),
 * pour se distinguer du lab vélo (orange / bleu). Palette catégorielle validée
 * (skill dataviz, script validate_palette) : l'été sur le fond Positron
 * #f2f3f0, l'hiver — tons plus sourds — sur le fond gris bleuté #dde3ea.
 * Écart daltonien ≥ 8,1, vision normale ≥ 17,9. L'ambre n'a pas 3:1 sur le
 * fond : chaque tache porte un BORD EN TIRETS plus foncé, d'un motif propre à
 * son mode (points, tirets courts, tirets longs) — second code, en plus des
 * cartes nommées sous la carte. Remplissage léger (0,32) : les trois taches se
 * superposent sans virer au brun.
 *
 * Graphes : vélo = celui du lab vélo, tel quel ; à pied et en auto =
 * `scripts/analysis/modes-quebec-levis-01-graphes.py`. Méthode et hypothèses
 * dans geodata/07-modes-quebec-levis/JOURNAL.md.
 */

const AGGLO: [number, number, number, number] = [-71.5923, 46.5819, -70.9839, 46.9857];

const modesQuebecLevis: LabDefinition = {
  id: "modes-quebec-levis",
  sources: {},
  layers: [],
  view: { bounds: AGGLO, pitch: 0, bearing: 0 },
  maxZoom: 16,

  modes: {
    thresholds: [5, 10, 15],
    opacity: 0.32,
    winterBasemap: { background: "#dde3ea", water: "#b4c2d0" },
    names: "/data/velo-quebec-levis-noms-v1.json",
    namesMode: "velo",
    title: { fr: "Surface de terre atteinte depuis ce départ", en: "Land area reached from this start" },
    empty: { fr: "Survolez la carte", en: "Hover over the map" },
    hint: {
      fr: "Passez le curseur sur la carte (ou touchez-la) : les trois taches montrent ce qu'on atteint en 15 minutes à pied, à vélo et en auto. Cliquez pour fixer le départ ; Échap pour le libérer.",
      en: "Move the cursor over the map (or tap it): the three patches show what you reach in 15 minutes on foot, by bike and by car. Click to pin the start; Esc to release it.",
    },
    list: [
      {
        id: "pied",
        label: { fr: "À pied", en: "On foot" },
        url: "/data/modes-quebec-levis-pied-v1.json",
        scenario: "tout",
        // NTNU (2021) : +1 min/km sur trottoir d'hiver entretenu, à 12 min/km.
        winterSpeedRatio: 12 / 13,
        color: { summer: "#6d3fc0", winter: "#5a34a8" },
        outline: { summer: "#4b2c83", winter: "#3d2273", dash: [0.6, 1.6] },
        discSpeed: 5,
        // Le même personnage, à pied : image du cycliste éditée (Gemini),
        // animée (Veo), bouclée par fondu d'une seconde
        // (scripts/analysis/modes-quebec-levis-02-bandeaux.sh). Le sol d'hiver
        // défile à 3,5 px/image contre 5,8 l'été : lu à 1,54, il tombe sur
        // 0,92 de l'été, le facteur du modèle.
        media: {
          summer: {
            webm: "/data/modes-quebec-levis-pied-ete-v1.webm",
            mp4: "/data/modes-quebec-levis-pied-ete-v1.mp4",
            poster: "/data/modes-quebec-levis-pied-ete-v1.webp",
          },
          winter: {
            webm: "/data/modes-quebec-levis-pied-hiver-v1.webm",
            mp4: "/data/modes-quebec-levis-pied-hiver-v1.mp4",
            poster: "/data/modes-quebec-levis-pied-hiver-v1.webp",
          },
          winterRate: 1.54,
        },
      },
      {
        id: "velo",
        label: { fr: "À vélo", en: "By bike" },
        url: "/data/velo-quebec-levis-graphe-v4.json",
        scenario: "tout",
        winterSpeedRatio: 12.45 / 15.73, // 0,79 — Shoman et al., IEEE Access, 2023
        color: { summer: "#1f9d6b", winter: "#0a8259" },
        outline: { summer: "#13694a", winter: "#075a3d", dash: [2.5, 2] },
        discSpeed: 20,
        // Le cycliste du panneau d'itinéraire du lab vélo.
        media: {
          summer: {
            webm: "/data/velo-quebec-levis-cycliste-ete-v2.webm",
            mp4: "/data/velo-quebec-levis-cycliste-ete-v2.mp4",
            poster: "/data/velo-quebec-levis-cycliste-ete-v2.webp",
          },
          winter: {
            webm: "/data/velo-quebec-levis-cycliste-hiver-v2.webm",
            mp4: "/data/velo-quebec-levis-cycliste-hiver-v2.mp4",
            poster: "/data/velo-quebec-levis-cycliste-hiver-v2.webp",
          },
          winterRate: 0.96,
        },
      },
      {
        id: "auto",
        label: { fr: "En auto", en: "By car" },
        url: "/data/modes-quebec-levis-auto-v1.json",
        scenario: "tout",
        // FHWA : −35 % sur les artères enneigées, −8 % sur autoroute.
        winterScenario: "hiver",
        color: { summer: "#e0a100", winter: "#b07f00" },
        outline: { summer: "#9c7000", winter: "#7a5800", dash: [6, 3] },
        discSpeed: 50,
        // Le même personnage, au volant. Boucle naturelle (coupée à l'image
        // de raccord). Sol d'hiver à 12,7 px/image contre 11,6 l'été : lu à
        // 0,59, il tombe sur 0,65 de l'été (−35 % sur les artères, FHWA).
        media: {
          summer: {
            webm: "/data/modes-quebec-levis-auto-ete-v1.webm",
            mp4: "/data/modes-quebec-levis-auto-ete-v1.mp4",
            poster: "/data/modes-quebec-levis-auto-ete-v1.webp",
          },
          winter: {
            webm: "/data/modes-quebec-levis-auto-hiver-v1.webm",
            mp4: "/data/modes-quebec-levis-auto-hiver-v1.mp4",
            poster: "/data/modes-quebec-levis-auto-hiver-v1.webp",
          },
          winterRate: 0.59,
        },
      },
    ],
  },

  basemap: {
    kind: "style",
    url: "https://tiles.openfreemap.org/styles/positron",
    attribution: {
      fr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      en: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
    },
  },

  legend: [
    { color: "#6d3fc0", label: { fr: "À pied, 15 min", en: "On foot, 15 min" } },
    { color: "#1f9d6b", label: { fr: "À vélo, 15 min", en: "By bike, 15 min" } },
    { color: "#e0a100", label: { fr: "En auto, 15 min", en: "By car, 15 min" } },
  ],

  attribution: {
    fr: "OpenStreetMap (ODbL) · Ville de Québec, ISQ — Données Québec (CC-BY 4.0) · RNCan, HRDEM (Licence du gouvernement ouvert – Canada) · Bandeau : illustration et animation générées par IA (Google Gemini, Veo)",
    en: "OpenStreetMap (ODbL) · City of Québec, ISQ — Données Québec (CC-BY 4.0) · NRCan, HRDEM (Open Government Licence – Canada) · Banner: AI-generated illustration and animation (Google Gemini, Veo)",
  },

  note: {
    fr: "À pied : fonction de Tobler (5 km/h à plat), relief du MNT lidar HRDEM ; hiver × 0,92 (NTNU, 2021). À vélo : le modèle du lab vélo (20 km/h à plat, Parkin et Rotheram, 2010 ; hiver × 0,79, Shoman et al., 2023). En auto : limite affichée × 0,7 en ville et × 0,85 sur les voies rapides (hypothèse : feux, arrêts, circulation) ; hiver −35 % sur les artères, −8 % sur autoroute (FHWA). Sans attente au départ ni stationnement. Traversier non compté. La tache s'arrête aux limites de Québec et de Lévis (+ 500 m).",
    en: "On foot: Tobler's function (5 km/h on the flat), HRDEM lidar terrain; winter × 0.92 (NTNU, 2021). By bike: the bike lab's model (20 km/h on the flat, Parkin and Rotheram, 2010; winter × 0.79, Shoman et al., 2023). By car: posted limit × 0.7 in town and × 0.85 on expressways (assumption: lights, stops, traffic); winter −35% on arterials, −8% on motorways (FHWA). No waiting or parking time. Ferry not counted. The patch stops at the Québec and Lévis limits (+ 500 m).",
  },
};

export default modesQuebecLevis;
