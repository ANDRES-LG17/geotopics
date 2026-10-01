import type { LabDefinition } from "./types";

/**
 * TramCité — parcourir la ligne avant qu'elle existe.
 *
 * Le tramway de Québec est annoncé depuis des années, débattu, financé — et
 * presque personne ne saurait dire par où il passe. Ce lab le fait parcourir, sur
 * la ville en volume.
 *
 * CE QUE LA CARTE MONTRE — la ligne, les tronçons, et le moment où elle plonge
 * sous la colline parlementaire. La pente entre basse-ville et haute-ville
 * atteint 12 % ; un tramway sur rail en franchit 6 à 9. La topographie a imposé
 * le tunnel, et c'est un fait géomatique que la 3D montre d'un coup.
 *
 * LES BÂTIMENTS NE VIENNENT PAS DU SITE. Le style Liberty d'OpenFreeMap porte
 * déjà une couche `building-3d` en extrusion, dont la hauteur sort du champ
 * `render_height` des tuiles OpenMapTiles. On la repeint plutôt que de
 * télécharger des mégaoctets d'empreintes pour redessiner ce qui existe. Le
 * fichier du lab fait 10 ko.
 *
 * ÉTAT — première version. Le tracé seul, pour valider le rendu avant d'investir
 * dans la saisie des 29 stations. Ce qui manque :
 *
 *   - les stations, absentes d'OSM, à saisir à la main ;
 *   - la population desservie à 800 m, qui est la mesure du travail ;
 *   - les scènes du parcours ;
 *   - le relief, bloqué tant que `LabMap` ne sait pas déclarer de source
 *     `raster-dem`.
 *
 * LE TRACÉ EST PROVISOIRE, et OSM le dit : « Sujet à modification. Trajet de
 * l'avis au marché du 19 décembre 2024. » Il n'existe aucun vectoriel officiel
 * en données ouvertes — vérifié sur tramcite.info, qui n'offre qu'une image.
 * C'est la limite principale de ce lab, et elle est dans la note.
 *
 * Données produites par `scripts/build-tramway-quebec.mjs` depuis l'atelier
 * `geodata/2026-10-tramway-quebec/`.
 */

/**
 * Palette « jour ».
 *
 * Neuf rôles plutôt que neuf couleurs choisies une à une : le sol, l'eau, le
 * bâti et la lumière se répondent, et une teinte changée seule casse l'accord.
 * Deux autres jeux — soir et nuit — suivront sur les mêmes rôles.
 */
const JOUR = {
  bati: "#e0dfce",
  lumiere: "#fff9e8",
};

/** Le rouge du tramway. Une seule couleur saturée sur une carte sourde : elle
 * porte le sujet sans qu'on ait besoin de l'épaissir. */
const TRAM = "#c2410c";
const TRAM_SOMBRE = "#7c2d12";

/**
 * Cadrage d'ouverture : la traversée du centre, pas le corridor entier.
 *
 * POURQUOI PAS TOUTE LA LIGNE — cadrer les 17,5 km place la vue au zoom 11,4,
 * et les tuiles d'OpenMapTiles ne portent de bâtiments qu'à partir du zoom 13.
 * La carte s'ouvrait donc sur un tracé posé à plat, sans un seul volume : tout
 * le sujet du lab manquait au premier regard. Vérifié en console — la couche du
 * fond répondait `building-3d:0`.
 *
 * On ouvre donc sur le segment qui porte le propos : Saint-Roch, la colline
 * parlementaire et son tunnel. Le lecteur y voit du bâti dense, le dénivelé, et
 * la ligne qui s'enfonce. Le reste du tracé se parcourt en dézoomant — et c'est
 * ce que les scènes feront, une fois les stations saisies.
 */
const CENTRE: [number, number, number, number] = [
  -71.2415, 46.8020, -71.2125, 46.8185,
];

// L'emprise complète du tracé (-71,346 / 46,750 → -71,205 / 46,852) est écrite
// par le script d'export dans le bloc `metadata` du GeoJSON. Elle servira aux
// scènes du parcours, pas au cadrage d'ouverture.

/**
 * Largeur du trait selon le zoom.
 *
 * Une largeur fixe ne convient pas à une ligne qu'on parcourt : lisible sur
 * l'ensemble du tracé, elle écrase tout une fois posée sur un quartier. Le trait
 * grossit donc avec le zoom, en restant mince à l'échelle de la ville.
 */
const LARGEUR_TRAM = [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  10,
  2,
  13,
  4,
  16,
  7,
  18,
  11,
];

const tramwayQuebec: LabDefinition = {
  id: "tramway-quebec",

  sources: {
    tramway: "/data/tramway-quebec-v1.geojson",
  },

  layers: [
    // 0 — Le tracé à l'air libre, en halo clair.
    //
    // Un trait seul se perd dès qu'il croise une route du fond de la même
    // épaisseur. Le halo le détache sans l'épaissir : c'est le procédé des
    // cartes de transport, où une ligne doit rester lisible par-dessus un plan
    // de ville.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon"],
      color: "#ffffff",
      width: [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        10,
        5,
        13,
        8,
        16,
        12,
        18,
        17,
      ],
      opacity: 0.85,
      cap: "round",
      join: "round",
    },

    // 1 — Le tracé à l'air libre.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon"],
      color: TRAM,
      width: LARGEUR_TRAM,
      cap: "round",
      join: "round",
    },

    // 2 — Le tunnel, en tireté.
    //
    // Sous terre, la ligne n'est pas visible depuis la surface : le tireté dit
    // qu'on devine un tracé plutôt qu'on ne le voit. Teinte plus sombre, comme
    // une chose enfouie.
    //
    // Le geste reste imparfait : un tireté dit « incertain » autant que
    // « souterrain ». La version suivante devra faire descendre la ligne sous
    // la surface du terrain — ce qui demande le relief, donc le support des
    // sources `raster-dem`.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon_tunnel"],
      color: TRAM_SOMBRE,
      width: LARGEUR_TRAM,
      dash: [2, 1.6],
      cap: "butt",
      join: "round",
    },

    // 3 — Les tronçons que le chaînage n'a pas retenus.
    //
    // Deux entités, de nature différente : un trou réel dans la donnée d'OSM
    // (montée Mendel, à 709 m du reste) et un connecteur de 70 m en doublon.
    // Dessinés en gris pâle et pointillé serré — présents, mais visiblement
    // pas du même statut que le tracé. Les cacher serait plus propre à l'œil
    // et moins honnête.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon_isolé"],
      color: "#9ca3af",
      width: 2.5,
      opacity: 0.8,
      dash: [1, 1.5],
      cap: "butt",
    },
  ],

  /**
   * Vue inclinée, et c'est le propos.
   *
   * Lac Saint-Charles regardait ses données à plat parce qu'il mesurait des
   * surfaces, que la perspective déforme. Ici l'objet est une ligne dans une
   * ville bâtie : à la verticale, les volumes s'aplatissent et la côte de la
   * colline disparaît — c'est-à-dire la raison d'être du tunnel.
   *
   * `pitch: 50` est au-dessus du seuil où `LabMap` redescend l'angle sur écran
   * étroit (40). Assumé : sur téléphone, une vue moins rasante se lit mieux.
   */
  view: { bounds: CENTRE, pitch: 55, bearing: -24 },

  /**
   * Bornes de zoom, dictées par la donnée du fond.
   *
   * Les hauteurs de bâtiment (`render_height`) n'existent dans les tuiles
   * d'OpenMapTiles qu'**à partir du zoom 14** — vérifié sur les tuiles de
   * Québec : au zoom 13 la couche `building` est là, le champ de hauteur non.
   * En dessous de 14, il n'y a donc pas de volume possible.
   *
   * `minZoom: 13` laisse reculer d'un cran pour se repérer — le lecteur perd
   * alors les volumes, mais garde le tracé et la trame des rues. En dessous, la
   * carte cesserait de parler de son sujet.
   *
   * Au-delà de 14, le moteur agrandit la dernière tuile : les contours
   * s'adoucissent, les volumes restent justes. 17,5 est la limite où cela reste
   * net.
   */
  minZoom: 13,
  maxZoom: 17.5,

  light: {
    color: JOUR.lumiere,
    // Au-delà de 0,5, les façades claires se brûlent et les volumes se
    // confondent.
    intensity: 0.32,
    // Soleil de sud-ouest à mi-hauteur : les façades nord-est passent dans
    // l'ombre, ce qui donne aux blocs leur épaisseur.
    position: [1.5, 210, 35],
  },

  basemap: {
    kind: "style",
    // Liberty plutôt que Positron : il peint les bois, l'eau et les routes, et
    // surtout il porte `building-3d`. Positron est un gris pensé pour
    // disparaître — ici la ville doit se voir.
    url: "https://tiles.openfreemap.org/styles/liberty",

    // Les étiquettes du fond partent : elles se disputeraient la place avec les
    // noms de stations, et une carte de ligne n'a pas besoin de tous les noms
    // de rue.
    hideLayers: [
      "water_name_point_label",
      "water_name_line_label",
      "waterway_line_label",
    ],

    // Le fond recule, mais pas les bâtiments : ils sont le décor du parcours.
    fade: 0.78,

    restyleLayers: [
      {
        // La couche d'extrusion du style Liberty. Sa hauteur vient déjà de
        // `render_height` ; on ne touche qu'à la couleur et à l'opacité, pour
        // l'accorder à la palette du lab.
        id: "building-3d",
        // Laissé au seuil du fond : 14.
        //
        // L'abaisser était tentant pour cadrer plus large, et c'est une impasse
        // vérifiée sur les tuiles de Québec : au zoom 13 la couche `building`
        // existe, mais **sans le champ `render_height`**. Les hauteurs
        // n'apparaissent qu'au zoom 14. Extruder plus tôt donnerait des
        // bâtiments d'épaisseur nulle — un sol colorié qui coûte le même temps
        // de calcul.
        //
        // C'est donc le cadrage qui s'adapte à la donnée, pas l'inverse.
        minzoom: 14,
        paint: {
          "fill-extrusion-color": JOUR.bati,
          "fill-extrusion-opacity": 1,
          // Le dégradé sur les façades. Sans lui, un bloc est un aplat et la
          // ville ressemble à un plan colorié.
          "fill-extrusion-vertical-gradient": true,
        },
        // Sans cela, `fade` ramènerait l'opacité à 0,78 juste après.
        keepOpacity: true,
      },
      {
        // L'empreinte à plat, sous les volumes : elle porte les bâtiments des
        // zooms inférieurs à 14, où l'extrusion ne s'affiche pas encore.
        id: "building",
        paint: { "fill-color": JOUR.bati },
      },
    ],

    attribution: {
      fr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      en: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
    },
  },

  legend: [
    {
      color: TRAM,
      label: {
        fr: "Tracé en surface — 17,5 km relevés",
        en: "Surface route — 17.5 km surveyed",
      },
    },
    {
      color: TRAM_SOMBRE,
      label: {
        fr: "En tunnel sous la colline — 1,7 km",
        en: "Tunnelled under the hill — 1.7 km",
      },
    },
    {
      color: "#9ca3af",
      label: {
        fr: "Tronçon incomplet dans OpenStreetMap",
        en: "Segment incomplete in OpenStreetMap",
      },
    },
  ],

  attribution: {
    fr: "Tracé : contributeurs d'OpenStreetMap (ODbL) — relevé le 1ᵉʳ octobre 2026",
    en: "Route: OpenStreetMap contributors (ODbL) — retrieved 1 October 2026",
  },

  hover: {
    // Indices : 1 = tracé en surface, 2 = tunnel, 3 = tronçons isolés.
    layers: [1, 2, 3],
    rows: [
      {
        field: "nom",
        title: true,
      },
      {
        field: "longueur_km",
        label: { fr: "Longueur du tronçon", en: "Segment length" },
        suffix: " km",
      },
      {
        field: "etat",
        label: { fr: "État déclaré", en: "Declared status" },
      },
      {
        field: "mise_en_service",
        label: { fr: "Mise en service visée", en: "Target opening" },
      },
      {
        field: "note",
        label: { fr: "Remarque", en: "Note" },
      },
    ],
  },

  note: {
    fr: "Tracé provisoire, reconstitué par les contributeurs d'OpenStreetMap d'après l'avis au marché du 19 décembre 2024 ; OSM le signale « sujet à modification ». Le vectoriel officiel n'est pas diffusé en données ouvertes. La géométrie relevée mesure 17,5 km, là où le projet en annonce 19 : un tronçon de l'ouest n'est pas raccordé et environ 700 m de tracé manquent dans OSM. Les 29 stations ne sont pas encore cartographiées — elles viendront dans une version suivante, avec la population desservie à 800 m. La pente de 12 % entre basse-ville et haute-ville, qui impose le tunnel, provient de la documentation du projet et non de cette géométrie.",
    en: "Provisional route, reconstructed by OpenStreetMap contributors from the 19 December 2024 call for tenders; OSM flags it as \"subject to change\". No official vector file is published as open data. The surveyed geometry measures 17.5 km against the project's announced 19: one western segment is disconnected and roughly 700 m of route is missing from OSM. The 29 stations are not yet mapped — they will come in a later version, along with population within 800 m. The 12% grade between lower and upper town, which forces the tunnel, comes from project documentation rather than this geometry.",
  },

  download: "/data/tramway-quebec-v1.geojson",
};

export default tramwayQuebec;
