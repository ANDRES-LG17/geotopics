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

/**
 * Une couleur par municipalité, et non deux camps.
 *
 * La version précédente peignait les quatre « décide sans boire » du même
 * orange : Stoneham (79,3 %) et ses trois voisines se lisaient comme un seul
 * bloc, alors que l'écart entre elles est le sujet — 79,3 % contre 2,9 %.
 *
 * Les cinq teintes passent les contrôles daltoniens en thème clair comme en
 * sombre, et le magenta de Lac-Delage est celui qui s'écarte le plus de
 * l'orange de Stoneham (ΔE 11,7) — c'est-à-dire de la confusion à corriger :
 *
 *   node scripts/validate_palette.js "#15803d,#c2410c,#7c3aed,#0891b2,#be185d"
 *
 * Le vert reste réservé à Québec : lui seul boit cette eau, et la couleur
 * continue donc de porter ce sens.
 */
const VIOLET = "#7c3aed";
const CYAN = "#0891b2";
const MAGENTA = "#be185d";

const COULEUR_PAR_MUNICIPALITE = [
  "match",
  ["get", "code"],
  "23027", VERT_EAU,   // Québec — boit cette eau
  "22035", ORANGE,     // Stoneham-et-Tewkesbury — 79,3 %
  "22040", VIOLET,     // Lac-Beauport — 2,9 %
  "22025", CYAN,       // Saint-Gabriel-de-Valcartier — 1,7 %
  "22030", MAGENTA,    // Lac-Delage — 1,2 %
  ORANGE,
];

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

    // 1 — Les municipalités ENTIÈRES, en pointillé et sans
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

    // 2 — Les cinq municipalités du bassin, en aplat. EN PREMIER, donc tout au
    // fond : c'est le territoire, pas le sujet.
    {
      kind: "fill",
      source: "bassin",
      filter: ["==", ["get", "couche"], "bassin_municipalite"],
      color: COULEUR_PAR_MUNICIPALITE,
      opacity: 0.5,
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

    // 4 — Le contour du bassin.
    {
      kind: "line",
      source: "bassin",
      filter: ["==", ["get", "couche"], "bassin"],
      color: ENCRE,
      width: 2.6,
      opacity: 0.95,
    },

    // 5 — Les 18 lacs du décompte, au-dessus de l'aplat municipal.
    //
    // Le fond peint sa propre eau en bleu pâle (#9ebdff). Nos lacs sont d'un
    // bleu franc : ce ne sont pas « de l'eau » en général, ce sont les dix-huit
    // que l'entrée dénombre.
    {
      kind: "fill",
      source: "bassin",
      filter: ["==", ["get", "couche"], "lac"],
      color: BLEU_EAU,
      opacity: 1,
    },

    // 6 — Leur cerne : ce qui les distingue de l'eau du fond au premier coup
    // d'œil, et rend repérables les plus petits (moins de 5 px de large).
    {
      kind: "line",
      source: "bassin",
      filter: ["==", ["get", "couche"], "lac"],
      color: BLEU_FONCE,
      width: 1.6,
      opacity: 1,
    },

    // 7 — Le nom du lac principal. Une seule étiquette posée à
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
    // Liberty plutôt que Positron : ce dernier est un gris presque blanc,
    // pensé pour disparaître sous une couche thématique. Ici la carte doit
    // aussi se lire comme un territoire — relief boisé, routes, villages — et
    // Positron n'en donnait rien. Liberty peint l'eau en bleu (#9ebdff), les
    // bois en vert, et les routes en jaune : un fond qui ressemble à ce qu'on
    // attend d'une carte.
    url: "https://tiles.openfreemap.org/styles/liberty",

    // L'eau du fond RESTE visible, contrairement à la version précédente.
    //
    // On la masquait pour éviter un doublon avec nos 18 lacs. Mais le fond
    // couvre bien plus large que le bassin : le fleuve, le lac Saint-Joseph,
    // toute l'eau alentour. La masquer laissait un paysage sans eau autour
    // d'une carte dont l'eau est le sujet. Nos lacs se posent par-dessus, en
    // bleu plus soutenu et cerclés : ils restent distincts.
    //
    // Seules partent les étiquettes d'eau du fond, qui se disputaient la place
    // avec le nom du lac Saint-Charles.
    hideLayers: ["water_name_point_label", "water_name_line_label",
                 "waterway_line_label"],

    // 0,82 au lieu de 0,5 : le fond doit se voir. Atténué à moitié, il
    // devenait un gris lavé où plus rien ne se distinguait — ni l'eau, ni les
    // bois, ni les routes. Il recule encore un peu, sans disparaître.
    fade: 0.82,
    attribution: {
      fr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      en: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
    },
  },

  // La légende nomme les cinq municipalités du bassin avec leur part : une
  // entrée « décide sans boire » pour quatre teintes différentes obligeait le
  // lecteur à deviner laquelle est laquelle.
  legend: [
    { color: VERT_EAU, label: { fr: "Québec — 14,9 % · boit cette eau", en: "Québec — 14.9% · drinks this water" } },
    { color: ORANGE, label: { fr: "Stoneham-et-Tewkesbury — 79,3 %", en: "Stoneham-et-Tewkesbury — 79.3%" } },
    { color: VIOLET, label: { fr: "Lac-Beauport — 2,9 %", en: "Lac-Beauport — 2.9%" } },
    { color: CYAN, label: { fr: "Saint-Gabriel-de-Valcartier — 1,7 %", en: "Saint-Gabriel-de-Valcartier — 1.7%" } },
    { color: MAGENTA, label: { fr: "Lac-Delage — 1,2 %", en: "Lac-Delage — 1.2%" } },
    { color: BLEU_EAU, label: { fr: "Les 18 lacs du bassin", en: "The watershed's 18 lakes" } },
  ],

  attribution: {
    fr: "MELCCFP, MRNF et ISQ — Données Québec (CC-BY 4.0)",
    en: "MELCCFP, MRNF and ISQ — Données Québec (CC-BY 4.0)",
  },

  hover: {
    // L'ordre compte : la première couche qui répond gagne. Les parts du
    // bassin d'abord (le propos principal), les lacs ensuite, le territoire
    // municipal complet en dernier — c'est le fond de la lecture.
    //
    // Indices des couches ci-dessus : 2 = parts du bassin, 5 = lacs,
    // 0 = municipalités entières.
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
