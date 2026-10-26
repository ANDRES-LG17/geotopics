import type { LabDefinition } from "./types";

/**
 * Portée vélo Québec–Lévis — les tronçons manquants et le pont de Québec.
 *
 * La question : quels tronçons, une fois aménagés, ouvriraient le plus de
 * territoire à un trajet à vélo tranquille de 15 minutes ? « Tranquille » suit
 * la norme « tous âges et capacités » : une piste en site propre, ou une rue à
 * 40 km/h au plus.
 *
 * CE QUE LA CARTE MONTRE — les BARRIÈRES, pas le réseau entier. Les rues
 * calmes ne sont pas dessinées : le fond les porte déjà, et elles auraient
 * fait passer le GeoJSON au-delà de 2 Mo. Ce qui reste se lit d'un coup : le
 * rouge coupe, le bleu relie, et les traits noirs sont les maillons qui
 * recousent.
 *
 * LA TACHE SOUS LE CURSEUR — c'est le cœur du lab, à la manière d'« À portée
 * de vélo » : tout ce qu'on atteint à vélo par un trajet tranquille depuis le
 * point survolé, en 30 puis 60 minutes. Le navigateur refait le parcours de
 * graphe à chaque mouvement, sur le graphe exporté par
 * `scripts/analysis/velo-quebec-levis-08-exporter-graphe.py`.
 *
 * QUATRE SCÈNES, au même cadrage, parce que le propos compare deux leviers :
 *   - aujourd'hui (A) ;
 *   - construire : le tablier du pont élargi à 2,5 m (C) ;
 *   - réglementer : les rues locales de Lévis passées de 50 à 40 km/h (D) ;
 *   - les deux à la fois.
 * Chaque scène choisit le scénario du graphe ; la tache se recalcule. Les rues
 * de Lévis existent en deux couches, rouges (A, C) et bleu-vert (D), et la
 * scène choisit laquelle.
 *
 * Un seul GeoJSON, produit par `scripts/analysis/velo-quebec-levis-07-exporter.py`
 * depuis l'atelier `geodata/04-velo-quebec-levis/`. Méthode et décisions dans
 * son JOURNAL.md.
 */

const ROUGE = "#dc2626";
const BLEU = "#2563eb";
const CYAN = "#0891b2";
const ENCRE = "#14261f";
const ORANGE = "#c2410c";
/**
 * La tache de portée en trois paliers, une seule teinte du clair au foncé —
 * la rampe bleue séquentielle validée (skill dataviz, mode ordinal, sur le
 * gris de Positron #f2f3f0) : clarté monotone, écarts visibles, palier le
 * plus clair à 2,25:1 du fond. #86b6ef, plus clair, échouait (1,89:1).
 *
 * FONCÉ AU CENTRE : ce qui est encodé, c'est l'accessibilité — plus c'est
 * proche, plus c'est intense, comme une carte de chaleur. Le palier
 * extérieur, le plus clair, se fond dans le fond.
 */
const BLEU_5 = "#104281";
const BLEU_10 = "#2a78d6";
const BLEU_15 = "#6da7ec";

/**
 * La même tache en été : rampe orange, une seule teinte, foncé au centre.
 * C'est la seconde teinte séquentielle de la palette de référence (orange
 * #eb6834) ; trois pas validés au script de la skill dataviz (mode ordinal,
 * fond #f2f3f0) : palier clair à 2,13:1 du fond. Les premiers essais plus
 * clairs (#f5a06e, #f29a5f) échouaient sous 2:1. Les deux pas foncés ont été
 * éclaircis (#9a330f → #c84a12, #dd5a1c → #e46d2e) et l'opacité d'été
 * ramenée à 0,65 : la première version était trop lourde à l'écran.
 *
 * Bleu l'hiver, orange l'été : la saison se lit à la couleur avant même
 * l'interrupteur.
 */
const ORANGE_5 = "#c84a12";
const ORANGE_10 = "#e46d2e";
const ORANGE_15 = "#ef9150";

/**
 * Curseur : un rond blanc cerclé du bleu foncé de la tache, une bicyclette au
 * centre. Le point chaud est le centre du rond (12, 12 sur 24 px) — c'est de là que part
 * le calcul. `crosshair` en repli pour les navigateurs qui refusent le SVG.
 */
const SVG_VELO = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">',
  `<circle cx="16" cy="16" r="14" fill="#ffffff" fill-opacity="0.95" stroke="${BLEU_5}" stroke-width="1.6"/>`,
  `<g fill="none" stroke="${BLEU_5}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`,
  '<circle cx="10.5" cy="19" r="4"/><circle cx="21.5" cy="19" r="4"/>',
  '<path d="M10.5 19 L14 12.5 L16 19 Z M16 19 L20 12.5 L14 12.5 M20 12.5 L21.5 19 M18.8 10.6 L21.4 10.6 M12.8 11 L15.2 11"/>',
  "</g></svg>",
].join("");
const CURSEUR_VELO = `url("data:image/svg+xml,${encodeURIComponent(SVG_VELO)}") 12 12, crosshair`;

/** Emprise mesurée sur les données exportées. */
const AGGLO: [number, number, number, number] = [-71.5923, 46.5819, -70.9839, 46.9857];

/**
 * Épaisseur d'un maillon selon ce qu'il rapporte : paires de résidents
 * nouvellement reliées, en millions. Le premier (avenue De Gaulle) en relie
 * 65 millions ; la plupart moins d'un.
 */
const EPAISSEUR_MAILLON = [
  "interpolate", ["linear"], ["get", "paires_hab_millions"],
  0, 3,
  10, 6,
  65, 11,
];

const veloQuebecLevis: LabDefinition = {
  id: "velo-quebec-levis",

  sources: {
    velo: "/data/velo-quebec-levis-v1.geojson",
  },

  layers: [
    // 0 — Rues locales de Lévis à 50 km/h, peintes EXPOSÉES (scénario A).
    {
      kind: "line",
      source: "velo",
      filter: ["==", ["get", "couche"], "levis_d"],
      color: ROUGE,
      width: 1,
      opacity: 0.45,
    },

    // 1 — Voies exposées (> 40 km/h) : les barrières.
    {
      kind: "line",
      source: "velo",
      filter: ["==", ["get", "couche"], "expose"],
      color: ROUGE,
      width: 1.4,
      opacity: 0.6,
    },

    // 2 — Pistes et sentiers polyvalents.
    {
      kind: "line",
      source: "velo",
      filter: ["==", ["get", "couche"], "piste"],
      color: BLEU,
      width: 1.8,
      opacity: 0.9,
      cap: "round",
      join: "round",
    },

    // 3 — Les mêmes rues de Lévis, devenues TRANQUILLES à 40 km/h (scénario D).
    {
      kind: "line",
      source: "velo",
      filter: ["==", ["get", "couche"], "levis_d"],
      color: CYAN,
      width: 1.3,
      opacity: 0.85,
    },

    // 4 — Maillons manquants, classement A (aujourd'hui).
    {
      kind: "line",
      source: "velo",
      filter: ["all", ["==", ["get", "couche"], "maillon"], ["has", "rang_a"]],
      color: ENCRE,
      width: EPAISSEUR_MAILLON,
      cap: "round",
    },

    // 5 — Maillons manquants, classement D (Lévis à 40 km/h).
    {
      kind: "line",
      source: "velo",
      filter: ["all", ["==", ["get", "couche"], "maillon"], ["has", "rang_d"]],
      color: ENCRE,
      width: EPAISSEUR_MAILLON,
      cap: "round",
    },

    // 6 — Le pont de Québec : trottoir de 1,3 m, vélo à la main.
    {
      kind: "line",
      source: "velo",
      filter: ["all", ["==", ["get", "couche"], "pont"], ["has", "largeur_m"]],
      color: ORANGE,
      width: 5,
      cap: "round",
    },

    // 7 — Le traversier : en tirets, ce n'est pas une voie qu'on parcourt
    // à son rythme — on attend le bateau.
    {
      kind: "line",
      source: "velo",
      filter: ["all", ["==", ["get", "couche"], "pont"], ["has", "minutes_hypothese"]],
      color: ORANGE,
      width: 2.5,
      dash: [2, 2],
    },

    // 8 — Rang des cinq premiers maillons (A), posé sur le trait.
    {
      kind: "label",
      source: "velo",
      filter: ["all", ["==", ["get", "couche"], "maillon"], ["<=", ["coalesce", ["get", "rang_a"], 999], 5]],
      text: ["to-string", ["get", "rang_a"]],
      size: 13,
      font: "Noto Sans Bold",
      color: ENCRE,
      haloColor: "#ffffff",
      haloWidth: 2.5,
      offsetY: -1.2,
    },
  ],

  view: { bounds: AGGLO, pitch: 0, bearing: 0 },
  maxZoom: 16,

  // Une seule scène, donc aucun bouton : la tache est le seul propos, sur le
  // réseau d'aujourd'hui. La scène existe pour masquer les couches du lab
  // (gardées dans la définition, prêtes à revenir).
  scenes: [
    {
      id: "aujourdhui",
      label: { fr: "Aujourd'hui", en: "Today" },
      layers: [],
    },
  ],

  cursor: CURSEUR_VELO,

  reach: {
    url: "/data/velo-quebec-levis-graphe-v4.json",
    bands: [
      { max: 5, color: ORANGE_5, opacity: 0.65, label: { fr: "Atteint à vélo en 5 min", en: "Reached by bike within 5 min" } },
      { max: 10, color: ORANGE_10, opacity: 0.65, label: { fr: "en 10 min", en: "within 10 min" } },
      { max: 15, color: ORANGE_15, opacity: 0.65, label: { fr: "en 15 min (autoroutes exclues)", en: "within 15 min (motorways excluded)" } },
    ],
    // Toutes les voies permises au vélo, autoroutes exclues, pont tel qu'il est.
    sceneScenario: ["tout"],
    names: "/data/velo-quebec-levis-noms-v1.json",
    // Les mêmes paliers que la tache : le panneau chiffre ce que la carte
    // montre, rien de plus.
    panel: {
      title: { fr: "Surface de terre atteinte depuis ce départ", en: "Land area reached from this start" },
      thresholds: [5, 10, 15],
      discSpeed: 20,
      barColor: BLEU_10,
      note: {
        fr: "Barre pleine : le disque qu'on couvrirait à 20 km/h en ligne droite. L'écart, ce sont les détours, les côtes, le fleuve et les autoroutes. Surfaces sans l'eau.",
        en: "Full bar: the disc covered at 20 km/h in a straight line. The gap is detours, hills, the river and motorways. Water excluded.",
      },
      empty: { fr: "Survolez la carte", en: "Hover over the map" },
      // Québec vue de Lévis, l'été et l'hiver : illustration Gemini (Nano
      // Banana), animation Veo, boucle sans couture recalculée (fondu de
      // 1,5 s), recadrée 25:11 et compressée (85–120 Ko par vidéo).
      header: {
        summer: {
          webm: "/data/velo-quebec-levis-ete-v1.webm",
          mp4: "/data/velo-quebec-levis-ete-v1.mp4",
          poster: "/data/velo-quebec-levis-ete-v1.webp",
        },
        winter: {
          webm: "/data/velo-quebec-levis-hiver-v1.webm",
          mp4: "/data/velo-quebec-levis-hiver-v1.mp4",
          poster: "/data/velo-quebec-levis-hiver-v1.webp",
        },
        alt: {
          fr: "Québec vue de Lévis : le Château Frontenac, la Haute-Ville et le traversier sur le fleuve, en été ou sous la neige selon la saison choisie.",
          en: "Québec City seen from Lévis: Château Frontenac, the Upper Town and the ferry on the river, in summer or under snow depending on the chosen season.",
        },
      },
    },
    // Vue « confort à vélo » — une COLMENA : la tache de 15 min découpée en
    // hexagones de 400 m ; chacun prend la couleur de son confort : part
    // pondérée des kilomètres parcourus dedans (piste 1, sentier 0,9, rue
    // calme 0,7, à pied 0,3, rue exposée 0). Rouge : une piste ou un sentier
    // s'y arrête net sur une rue exposée (coupure). Rampe vert d'eau à un seul
    // ton, validée en ordinal (clarté monotone, cran clair 2,02:1 sur le
    // fond) ; le rouge frôle le cran le plus foncé chez les protanopes
    // (ΔE 6,7) : la coupure porte AUSSI un contour épais (second code).
    // (Versions précédentes : traits rouges des rues exposées, puis deux
    // taches « toutes voies / voies tranquilles » — remplacées à la demande.)
    exposure: {
      segments: "/data/velo-quebec-levis-troncons-v3.json",
      label: { fr: "Confort à vélo", en: "Cycling comfort" },
      timeLabel: { fr: "Temps de parcours", en: "Travel time" },
      hex: {
        size: 400,
        weights: [1, 0.7, 0, 0.9, 0.3],
        ramp: ["#45bda9", "#24a592", "#008d7b", "#007465", "#005d50"],
        cut: { color: "#c81e1e", outline: "#7f1010", label: { fr: "Piste coupée", en: "Bike path cut off" } },
        rampLabel: { fr: "Confort", en: "Comfort" },
        // HIVER — d'après le réseau cyclable 4 saisons de la Ville (2025-26) :
        // une piste n'est confortable que déneigée (poids d'été) ou damée
        // (0,6) ; non entretenue, elle compte 0. Une rue calme est déblayée
        // comme chaussée, mais bordée de bancs de neige : 0,5. Lévis : aucun
        // entretien connu, ses pistes comptent 0 l'hiver (dit dans la légende).
        // L'hiver, les pistes entretenues sont DESSINÉES sur la colmena, dans
        // le bleu foncé de l'hiver cerclé de blanc : trait plein déneigée,
        // tirets damée (neige tassée).
        winter: {
          calm: 0.5,
          packed: 0.6,
          note: { fr: "Hiver : entretien connu pour Québec seulement", en: "Winter: maintenance known for Québec City only" },
          line: "#104281",
          // Tracé complet d'OpenStreetMap (script 14) : il se superpose aux
          // voies du fond de carte, tiré lui aussi d'OpenStreetMap.
          paths: "/data/velo-quebec-levis-pistes-hiver-v2.geojson",
          // Panneau « L'hiver ici » : les chiffres des articles et des données
          // (CONTEXTE-CONFORT-VELO.md) — 30 km (2020-21) et 136 km (2024-25)
          // selon Vélo Québec, 175 km pour 2025-26 d'après la couche de la Ville.
          context: {
            fr: "Le réseau blanc de Québec est passé de 30 km (2020-2021) à 136 km (2024-2025), et 175 km cet hiver. Dans le même temps, les cyclistes d'hiver sont passés de 6 000 à 19 000 (Vélo Québec, 2025).",
            en: "Québec City's winter network grew from 30 km (2020-2021) to 136 km (2024-2025), and 175 km this winter. Meanwhile, winter cyclists rose from 6,000 to 19,000 (Vélo Québec, 2025).",
          },
          // L'été : les corridors VivaCité RÉALISÉS (couche officielle de la
          // Ville, SOUS_TYPE_RC = Corridor) ; les projetés ne sont pas montrés.
          // Dessinés comme les pistes déneigées l'hiver (même nettoyage,
          // script 14), dans l'orange foncé de l'été — le pendant du bleu
          // foncé de l'hiver ; les chemins qui y mènent sont orange vif.
          summerPaths: "/data/velo-quebec-levis-corridors-v1.geojson",
          summerLine: "#a63c0e",
          summerLabel: { fr: "Corridor VivaCité réalisé", en: "Built VivaCité corridor" },
          summerContext: {
            fr: "Les corridors VivaCité : 14 corridors sécuritaires, 150 km d'ici 2034, pensés pour « l'enfant de 7 ans comme la personne de 77 ans ». Sur ceux déjà réalisés, les compteurs ont vu passer jusqu'à 32 % de cyclistes de plus (Vélo Québec, 2025).",
            en: "The VivaCité corridors: 14 safe corridors, 150 km by 2034, designed for \"a 7-year-old child as well as a 77-year-old\". On those already built, counters recorded up to 32% more cyclists (Vélo Québec, 2025).",
          },
          cleared: { fr: "Piste déneigée", en: "Snow-cleared bike path" },
          packedLabel: { fr: "Piste damée (neige tassée)", en: "Packed-snow bike path" },
        },
        // (Interrupteur « avec les 14 corridors VivaCité » retiré à la demande
        // de l'auteur : les tracés projetés restent dans les tronçons v3,
        // champ `cvc`, scripts 12 et 13.)
      },
      patch: { color: "#94a3b8", opacity: 0.4, label: { fr: "Atteint en 15 min", en: "Reached within 15 min" } },
      line: { color: "#c81e1e", label: { fr: "Rue exposée parcourue (> 40 km/h)", en: "High-stress street travelled (> 40 km/h)" } },
      note: {
        fr: "Voies où les autos roulent à plus de 40 km/h, parcourues dans les 15 minutes ; la part se compte en kilomètres de voies parcourues. Le trait s'épaissit avec la vitesse des autos.",
        en: "Streets where cars go faster than 40 km/h, travelled within the 15 minutes; the share is counted in kilometres of streets travelled. The line thickens with car speed.",
      },
    },
    // Ville des 15 minutes (Moreno et al., 2021) : quatre des six fonctions.
    // Couleurs : palette catégorielle de référence, validée toutes paires
    // (écart daltonien ≥ 16, vision normale ≥ 19,6). Le rose et le jaune n'ont
    // pas 3:1 sur le fond : contour d'encre sur la carte, et la liste du
    // panneau double le code couleur. Ni rouge (réservé aux rues exposées),
    // ni orange ni bleu (ceux de la tache).
    places: {
      url: "/data/velo-quebec-levis-lieux-v2.json",
      title: { fr: "Ville des 15 minutes", en: "15-minute city" },
      functions: [
        { id: "soigner", label: { fr: "Se soigner", en: "Healthcare" }, color: "#e87ba4" },
        { id: "apprendre", label: { fr: "Apprendre", en: "Learning" }, color: "#6250d6" },
        { id: "approvisionner", label: { fr: "S'approvisionner", en: "Groceries" }, color: "#eda100" },
        { id: "epanouir", label: { fr: "S'épanouir", en: "Leisure" }, color: "#008300" },
      ],
      genres: {
        hospital: { fr: "Hôpital", en: "Hospital" },
        clinic: { fr: "Clinique", en: "Clinic" },
        doctors: { fr: "Cabinet médical", en: "Doctor's office" },
        pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
        healthcare: { fr: "Centre de santé", en: "Health centre" },
        school: { fr: "École", en: "School" },
        college: { fr: "Cégep / collège", en: "College" },
        university: { fr: "Université", en: "University" },
        library: { fr: "Bibliothèque", en: "Library" },
        supermarket: { fr: "Supermarché", en: "Supermarket" },
        greengrocer: { fr: "Fruiterie", en: "Greengrocer" },
        bakery: { fr: "Boulangerie", en: "Bakery" },
        butcher: { fr: "Boucherie", en: "Butcher" },
        marketplace: { fr: "Marché public", en: "Public market" },
        park: { fr: "Parc", en: "Park" },
        sports_centre: { fr: "Centre sportif", en: "Sports centre" },
        community_centre: { fr: "Centre communautaire", en: "Community centre" },
        theatre: { fr: "Salle de spectacle", en: "Theatre" },
        cinema: { fr: "Cinéma", en: "Cinema" },
        arts_centre: { fr: "Centre d'art", en: "Arts centre" },
        museum: { fr: "Musée", en: "Museum" },
      },
      prompt: {
        fr: "Cliquez sur la carte : la tache se fixe, et les lieux de la ville des 15 minutes qu'elle touche tombent sur la carte. Cliquez un lieu pour sa fiche et un itinéraire vers un autre. Clic droit ou Échap pour libérer.",
        en: "Click on the map: the patch is pinned, and the 15-minute-city places it reaches drop onto the map. Click a place for its card and a route to another. Right-click or Esc to release.",
      },
      promptShort: {
        fr: "Cliquez sur la carte : la tache se fixe et les lieux à 15 min apparaissent à droite.",
        en: "Click the map: the patch is pinned and the places within 15 min appear on the right.",
      },
      note: {
        fr: "Quatre des six fonctions de la ville des 15 minutes (Moreno et al., 2021) ; « travailler » n'a pas de donnée ouverte fine, « habiter » est la population. Lieux d'OpenStreetMap : leur présence est comptée, pas leur capacité. Parcs et campus atteints par leur accès le plus proche, le long de leur contour ; dépanneurs exclus.",
        en: "Four of the six functions of the 15-minute city (Moreno et al., 2021); \"working\" has no fine-grained open data, \"living\" is the population. OpenStreetMap places: presence is counted, not capacity. Parks and campuses reached through their nearest access along their edge; convenience stores excluded.",
      },
      // Cycliste à Québec, l'été et l'hiver : illustration Gemini (Nano
      // Banana), animation Veo, recadrée 5:2, boucle par retrait des images
      // finales qui répétaient la première. Le sol de la vidéo d'hiver défile
      // déjà à 0,83 de l'été (mesuré) : lue à 0,96, elle tombe sur 0,79.
      routeHeader: {
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
    // Modèle d'hiver UNIFORME, choisi pour sa simplicité : une seule source,
    // une seule règle. Il ne distingue pas les voies déneigées des sentiers
    // enneigés — la limite est écrite sous les barres.
    winter: {
      speedRatio: 12.45 / 15.73, // 0,79 — Shoman et al., IEEE Access, 2023
      bands: [
        { max: 5, color: BLEU_5, opacity: 0.75, label: { fr: "Atteint à vélo en 5 min", en: "Reached by bike within 5 min" } },
        { max: 10, color: BLEU_10, opacity: 0.75, label: { fr: "en 10 min", en: "within 10 min" } },
        { max: 15, color: BLEU_15, opacity: 0.75, label: { fr: "en 15 min (autoroutes exclues)", en: "within 15 min (motorways excluded)" } },
      ],
      note: {
        fr: "Hiver : toutes les vitesses × 0,79, d'après une mesure sur chaussée enneigée (Shoman et al., 2023 : 15,7 → 12,5 km/h). Le même taux partout : une voie déneigée et un sentier sous la neige comptent pareil.",
        en: "Winter: all speeds × 0.79, from a measurement on snowy pavement (Shoman et al., 2023: 15.7 → 12.5 km/h). The same rate everywhere: a cleared lane and a snow-covered trail count the same.",
      },
    },
    hint: {
      fr: "Passez le curseur sur la carte (ou touchez-la) : la tache montre tout ce qu'on atteint à vélo en 5, 10 et 15 minutes, par toutes les voies où le vélo est permis (autoroutes exclues).",
      en: "Move the cursor over the map (or tap it): the patch shows everything reachable by bike within 5, 10 and 15 minutes, on every road where cycling is allowed (motorways excluded).",
    },
  },

  basemap: {
    kind: "style",
    // Positron, en gris : la tache verte est le seul élément en couleur, le
    // fond ne fait que situer — rues, fleuve, noms de quartiers.
    url: "https://tiles.openfreemap.org/styles/positron",
    attribution: {
      fr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      en: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>',
    },
  },

  legend: [
    { color: ORANGE_5, label: { fr: "Atteint à vélo en 5 min", en: "Reached by bike within 5 min" } },
    { color: ORANGE_10, label: { fr: "en 10 min", en: "within 10 min" } },
    { color: ORANGE_15, label: { fr: "en 15 min (autoroutes exclues)", en: "within 15 min (motorways excluded)" } },
  ],

  attribution: {
    fr: "OpenStreetMap (ODbL) · Villes de Québec et de Lévis, ISQ, MRNF — Données Québec (CC-BY 4.0) · RNCan, HRDEM (Licence du gouvernement ouvert – Canada) · Bandeaux : illustrations et animations générées par IA (Google Gemini, Veo)",
    en: "OpenStreetMap (ODbL) · Cities of Québec and Lévis, ISQ, MRNF — Données Québec (CC-BY 4.0) · NRCan, HRDEM (Open Government Licence – Canada) · Banners: AI-generated illustrations and animations (Google Gemini, Veo)",
  },

  hover: {
    // Les maillons d'abord : c'est le sujet. Le pont ensuite.
    layers: [4, 5, 6, 7],
    rows: [
      { field: "nom", title: true },
      { field: "ville", label: { fr: "Ville", en: "City" } },
      { field: "longueur_m", label: { fr: "Longueur à aménager", en: "Length to build" }, suffix: " m" },
      { field: "rang_a", label: { fr: "Rang aujourd'hui", en: "Rank today" }, suffix: " / 76" },
      { field: "rang_d", label: { fr: "Rang si Lévis à 40 km/h", en: "Rank if Lévis at 40 km/h" }, suffix: " / 96" },
      { field: "habitants", label: { fr: "Résidents qui y gagnent", en: "Residents who gain" } },
      { field: "voisins_moy", label: { fr: "Voisins gagnés, en moyenne", en: "Neighbours gained, on average" } },
      { field: "largeur_m", label: { fr: "Largeur du passage", en: "Path width" }, suffix: " m" },
      { field: "minutes_a_pied", label: { fr: "Traversée à pied", en: "Crossing on foot" }, suffix: " min" },
      { field: "minutes_hypothese", label: { fr: "Traversée + attente (hypothèse)", en: "Crossing + wait (assumption)" }, suffix: " min" },
    ],
  },

  note: {
    fr: "Tranquille : piste en site propre, ou rue à 40 km/h au plus (norme « tous âges et capacités », NACTO). Vitesses automobiles : Ville de Québec (VITESSEMAX) ; à Lévis, 50 km/h, limite du Code de la sécurité routière. Vélo : 20 km/h à plat, modulé par la pente (Parkin et Rotheram, 2010 ; MNT lidar HRDEM à 8 m) ; à pied sur les trottoirs et le pont. Un maillon est un lien exposé de 30 à 300 m entre deux îlots tranquilles ; il est évalué seul, en 15 minutes. Population 2021 répartie des aires de diffusion sur les rues résidentielles : une estimation. Traversier : 12 min + 15 min d'attente, hypothèse à confirmer. Les traversées d'artères ne sont pas pénalisées.",
    en: "Low-stress: a separated bike path, or a street at 40 km/h or less (NACTO \"All Ages & Abilities\"). Car speeds: City of Québec (VITESSEMAX); in Lévis, 50 km/h, the Highway Safety Code default. Bike: 20 km/h on the flat, adjusted for slope (Parkin and Rotheram, 2010; HRDEM lidar DTM at 8 m); walking on sidewalks and the bridge. A missing link is a 30–300 m high-stress connection between two low-stress islands, assessed on its own, within 15 minutes. 2021 population spread from dissemination areas onto residential streets: an estimate. Ferry: 12 min + 15 min wait, an assumption to confirm. Arterial crossings are not penalised.",
  },

  download: "/data/velo-quebec-levis-v1.geojson",
};

export default veloQuebecLevis;
