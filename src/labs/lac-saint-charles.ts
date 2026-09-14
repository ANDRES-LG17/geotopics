import type { LabDefinition } from "./types";

/**
 * Lac Saint-Charles — gouvernance partagée.
 *
 * Le bassin versant d'une source d'eau potable déborde largement la ville qui
 * la boit. La carte le montre à plat, en trois scènes.
 *
 * POURQUOI À PLAT — une première version extrudait les municipalités, hauteur
 * proportionnelle à leur part du bassin. Sur écran, cela ne se lisait pas : la
 * perspective écrase les hauteurs, les blocs se masquent, et aucun axe ne
 * permet de comparer. Trois municipalités sur cinq devenaient invisibles, et la
 * carte contredisait son propre propos.
 *
 * CE QUI PORTE LA CARTE — le survol. Chaque entité y dit son rôle en un mot
 * (« boit sans décider »), sa part du bassin en barre, et sa population de 2001
 * à 2025 en courbe. Les étiquettes posées à demeure encombraient sans rien
 * ajouter ; une seule reste, celle du lac.
 *
 * LES HUIT MUNICIPALITÉS — cinq se partagent le bassin, quatre boivent son eau,
 * et Québec seule figure dans les deux listes. Aucune autre n'est dessinée :
 * une municipalité sans rapport à cette eau n'aurait pas de raison d'être là.
 * Le fond de carte situe les voisines.
 *
 * Toutes les données viennent d'un seul GeoJSON — un aller-retour réseau au
 * lieu de trois — que `scripts/analysis/lac-saint-charles.py` produit depuis
 * l'atelier `geodata/2026-09-lac-saint-charles/`. Le champ `couche` de chaque
 * entité dit à quelle couche elle appartient.
 */

const ORANGE = "#c2410c";
const VERT_EAU = "#15803d";
const BLEU_EAU = "#2563eb";
const BLEU_FONCE = "#1e40af";
const ENCRE = "#14261f";

/** Vert pour qui boit cette eau, rouge pour qui décide sans la boire. */
const COULEUR_SELON_USAGE = ["case", ["get", "boit"], VERT_EAU, ORANGE];

/** Emprise mesurée sur les données exportées, élargie de 3 %. */
const BASSIN: [number, number, number, number] = [
  -71.8331, 46.6851, -71.1134, 47.325,
];

const lacSaintCharles: LabDefinition = {
  id: "lac-saint-charles",

  sources: {
    bassin: "/data/lac-st-charles-v5.geojson",
  },

  layers: [
    // 0 — Les municipalités ENTIÈRES, en lavis très pâle.
    //
    // Toutes, pas seulement les desservies. Deux raisons. La première est de
    // lecture : le lavis désigne le territoire municipal complet, là où le
    // bassin n'en découpe qu'un morceau. La seconde est d'usage : un trait ne
    // se survole pratiquement pas — il faut une surface pour que l'infobulle
    // s'ouvre. Sans elle, Stoneham hors bassin ne répondait pas au curseur.
    //
    // Bleu pour qui boit, ocre pour qui décide sans boire : la teinte dit déjà
    // le rôle, avant même l'infobulle.
    {
      kind: "fill",
      source: "bassin",
      filter: ["==", ["get", "couche"], "municipalite_entiere"],
      color: ["case", ["get", "boit"], BLEU_EAU, ORANGE],
      opacity: 0.1,
    },

    // 1 — ÉTAPE 5 : les municipalités ENTIÈRES, en pointillé et sans
    // remplissage.
    //
    // C'est ce que le découpage au bassin cachait. Stoneham contrôle 79 % du
    // bassin, mais le bassin n'est qu'un coin de Stoneham (686 km²). Et surtout :
    // trois des quatre municipalités desservies — L'Ancienne-Lorette, Wendake,
    // Saint-Augustin-de-Desmaures — sont ENTIÈREMENT hors du bassin. Elles
    // boivent une eau dont elles n'administrent pas un mètre carré.
    {
      kind: "line",
      source: "bassin",
      filter: ["==", ["get", "couche"], "municipalite_entiere"],
      // Pointillé : une limite administrative n'est pas une limite physique.
      // Le bassin, lui, est plein — l'un se décrète, l'autre s'observe.
      color: ["case", ["get", "boit"], VERT_EAU, ORANGE],
      // Trait fin : une limite administrative est un repère, pas le sujet.
      // Le contour du bassin, lui, reste épais — c'est le cadre du propos.
      width: 0.9,
      opacity: 0.75,
      dash: [4, 3],
    },

    // 2 — ÉTAPE 3 : les cinq municipalités, en aplat. EN PREMIER, donc tout au
    // fond : c'est le territoire, pas le sujet.
    {
      kind: "fill",
      source: "bassin",
      filter: ["==", ["get", "couche"], "bassin_municipalite"],
      color: COULEUR_SELON_USAGE,
      opacity: 0.45,
    },

    // 3 — Les limites entre elles : sans trait, deux voisines de même couleur
    // fusionnent et cinq acteurs en paraissent deux.
    {
      kind: "line",
      source: "bassin",
      filter: ["==", ["get", "couche"], "bassin_municipalite"],
      color: "#ffffff",
      width: 1.5,
      opacity: 0.9,
    },

    // 4 — ÉTAPE 2 : le contour du bassin.
    {
      kind: "line",
      source: "bassin",
      filter: ["==", ["get", "couche"], "bassin"],
      color: ENCRE,
      width: 2.6,
      opacity: 0.95,
    },

    // 5 — ÉTAPE 1 : les lacs, au-dessus de l'aplat municipal.
    {
      kind: "fill",
      source: "bassin",
      filter: ["==", ["get", "couche"], "lac"],
      color: BLEU_EAU,
      opacity: 1,
    },

    // 6 — ÉTAPE 4 : le nom du lac principal. Une seule étiquette posée à
    // demeure — le reste se lit au survol, ce qui garde la carte respirable.
    {
      kind: "label",
      source: "bassin",
      filter: ["==", ["get", "couche"], "etiquette_lac"],
      text: ["get", "nom"],
      size: 13,
      color: BLEU_FONCE,
      haloColor: "#ffffff",
      haloWidth: 2,
      offsetY: 1.8,
    },
  ],

  // Vue verticale. Une carte de proportions se lit de face : l'inclinaison
  // déforme les surfaces, et c'est la surface qui est le sujet.
  //
  // Pas de scènes : tout est montré d'emblée. Un découpage en étapes obligeait
  // le lecteur à cliquer pour voir le rapport entre les deux moitiés du
  // propos — qui décide, qui boit — alors que c'est précisément leur
  // coexistence sur une même image qui le porte.
  view: { bounds: BASSIN, pitch: 0, bearing: 0 },
  maxZoom: 14,

  /**
   * Exception assumée à la règle du carnet.
   *
   * Les autres labs ne demandent rien à l'extérieur : c'est ce qui les rend
   * increvables. Celui-ci fait exception parce que son propos est
   * territorial — « qui décide de ce territoire » ne se lit pas sur un fond
   * vide. Il faut voir les routes, les villages, les limites voisines.
   *
   * Le fond fournit aussi les polices des étiquettes.
   *
   * Aucun jeton requis. Le risque assumé est la dépendance : si le fournisseur
   * disparaît, le fond s'en va — les données du bassin viennent du site et
   * restent.
   */
  basemap: {
    kind: "style",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    // Positron dessine ses propres lacs : deux figurés pour la même eau, à deux
    // échelles et deux dates. Les lacs de cette carte sont ceux du décompte.
    hideLayers: ["water", "water_shadow", "waterway", "waterway_label",
                 "watername_lake", "watername_lake_line"],
    // Le fond situe, il ne raconte pas.
    fade: 0.5,
    attribution: {
      fr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
      en: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },

  legend: [
    { color: VERT_EAU, label: { fr: "Boit cette eau", en: "Drinks this water" } },
    { color: ORANGE, label: { fr: "Décide sans boire", en: "Decides without drinking" } },
    { color: BLEU_EAU, label: { fr: "Lacs · territoire desservi", en: "Lakes · served territory" } },
  ],

  attribution: {
    fr: "MELCCFP, MRNF et ISQ — Données Québec (CC-BY 4.0)",
    en: "MELCCFP, MRNF and ISQ — Données Québec (CC-BY 4.0)",
  },

  hover: {
    // L'ordre compte : la première couche qui répond gagne. Les parts du
    // bassin d'abord (le propos principal), les lacs ensuite, le territoire
    // municipal complet en dernier — c'est le fond de la lecture.
    layers: [2, 5, 0],
    rows: [
      { field: "nom", title: true },
      // Le rôle en un mot, en tête : c'est la réponse à la question que pose
      // la carte. « Boit sans décider » dit tout d'un coup.
      {
        field: "role",
        label: { fr: "Rôle", en: "Role" },
      },
      {
        field: "pct",
        label: { fr: "Part du bassin", en: "Share of watershed" },
        suffix: " %",
        // Une part se lit mieux comme une part : la barre dit d'un coup ce que
        // « 79,3 % » demande de se représenter.
        bar: { color: ORANGE, max: 100 },
      },
      { field: "part_km2", label: { fr: "Superficie", en: "Area" }, suffix: " km²" },
      { field: "mrc", label: { fr: "MRC", en: "RCM" } },
      {
        field: "pop_fin",
        label: { fr: "Consommateurs d'eau", en: "Water consumers" },
        when: { field: "boit", equals: true },
      },
      {
        field: "pop_fin",
        label: { fr: "Population 2025", en: "Population 2025" },
        when: { field: "boit", equals: false },
      },
      { field: "croissance_pct", label: { fr: "Croissance depuis 2001", en: "Growth since 2001" }, suffix: " %" },
      {
        // 25 points, de 2001 à 2025. La forme de la courbe dit ce que deux
        // chiffres laissent deviner.
        field: "population",
        label: { fr: "Population 2001-2025", en: "Population 2001-2025" },
        spark: { color: VERT_EAU, height: 34 },
      },
      // Un lac seul ne dit rien : c'est sa place dans l'ensemble qui parle.
      // Le rang situe, la part montre l'asymétrie — 65 % pour le premier, le
      // tiers restant pour les dix-sept autres.
      {
        field: "rang",
        label: { fr: "Rang parmi les 18 lacs", en: "Rank among the 18 lakes" },
        suffix: " / 18",
      },
      {
        field: "superficie_ha",
        label: { fr: "Superficie", en: "Area" },
        suffix: " ha",
      },
      {
        field: "part_lacs_pct",
        label: { fr: "Part de la surface lacustre", en: "Share of lake surface" },
        suffix: " %",
        bar: { color: BLEU_EAU, max: 65.1 },
      },
      // Qui décide de ses rives. Le lac Saint-Charles lui-même est partagé
      // entre Québec et Stoneham : le plan d'eau de la prise d'eau est déjà,
      // à lui seul, une frontière administrative.
      {
        field: "rives",
        label: { fr: "Rives administrées par", en: "Shores governed by" },
      },
      {
        field: "suivi",
        label: { fr: "Suivi documenté", en: "Documented monitoring" },
      },
      {
        field: "superficie_km2",
        label: { fr: "Territoire total", en: "Total territory" },
        suffix: " km²",
      },
    ],
  },

  note: {
    fr: "Les pourcentages sont la part de chaque municipalité dans le bassin versant, calculée en projection conique (EPSG:2949). Les taux de croissance sont municipaux, pas « dans le bassin » : une municipalité n'est pas entièrement comprise dans le bassin versant. Bassin retenu : aire de drainage 05090041 (170,01 km²) ; deux aires candidates contenaient le lac, séparées par 1,18 ha. Palette vérifiée pour les déficiences de vision des couleurs.",
    en: "Percentages are each municipality's share of the watershed, computed in a conic projection (EPSG:2949). Growth rates are municipal, not \"within the watershed\": a municipality is not entirely contained in it. Watershed used: drainage area 05090041 (170.01 km²); two candidate areas contained the lake, 1.18 ha apart. Palette verified for colour-vision deficiency.",
  },

  download: "/data/lac-st-charles-v5.geojson",
};

export default lacSaintCharles;
