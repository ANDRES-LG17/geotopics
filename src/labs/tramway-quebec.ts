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

/**
 * Le violet du tramway, celui du plan officiel du réseau — relevé au pixel sur
 * le plan publié (#8c2b7c). Reprendre la charte du projet plutôt qu'en inventer
 * une : le lecteur reconnaît la ligne qu'il a déjà vue sur les affiches.
 *
 * Le tunnel garde le même violet : sur le plan officiel, il ne change pas de
 * couleur, il se dessine CREUX.
 */
const TRAM = "#8c2b7c";
const TRAM_SOMBRE = TRAM;

/** Le noir des pôles d'échange, sur le plan officiel. */
const POLE = "#111111";

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
  -71.2322, 46.8068, -71.2161, 46.8152,
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
// Épaissi pour suivre le plan officiel, où la ligne est le trait le plus fort
// de la carte : ~9 px au zoom d'ouverture, contre ~6 auparavant.
const LARGEUR_TRAM = [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  10,
  3,
  13,
  6,
  16,
  10,
  18,
  15,
];

const tramwayQuebec: LabDefinition = {
  id: "tramway-quebec",

  sources: {
    tramway: "/data/tramway-quebec-v1.geojson",
    // Les 29 stations seules (6 ko) : c'est tout ce qu'on sert à l'ouverture.
    // Aires et voiles arrivent au clic, station par station — voir
    // `select.onDemand`. Un fichier publié ne change jamais : toute
    // régénération incrémente son numéro de version.
    // v2 : population par palier (rang et moyenne du panneau) et obstacles.
    stations: "/data/tramway-stations-v2.geojson",
  },

  layers: [
    /*
      0 — LES RUES, reprises du fond de carte.
      ───────────────────────────────────────────────────────────────────────
      Elles ne viennent pas d'un fichier à nous : elles sont déjà dans les
      tuiles du fond, téléchargées de toute façon. On les repeint simplement
      en contraste fort. Zéro octet de plus, et toute la ville est couverte —
      là où un GeoJSON calculé ne couvrirait que les stations déjà traitées.

      FIXES ET ENTIÈRES, tout au fond. Elles ne bougent jamais.

      ÉTEINTES À L'OUVERTURE — cette couche lit le fond de carte, pas notre
      GeoJSON : ses entités n'ont ni `station` ni `minutes`, et le mécanisme
      habituel de `revealLayers` (un filtre sur ces champs) ne peut donc pas
      s'appliquer à elle. Elle est révélée par OPACITÉ plutôt que par filtre —
      voir `LabMap`, qui la traite à part pour cette raison précise. Tant
      qu'aucune station n'est choisie, le premier regard sur la carte doit
      être nu : seul le tracé du tramway, rien d'autre.
    */
    {
      kind: "line",
      source: "openmaptiles",
      sourceLayer: "transportation",
      // Les classes qui portent la marche. `motorway` est exclue à dessein :
      // on ne longe pas une autoroute à pied, et l'y faire briller dans l'aire
      // dirait le contraire de ce que le lab mesure.
      filter: [
        "match",
        ["get", "class"],
        ["minor", "service", "path", "pedestrian", "track", "secondary", "tertiary", "primary"],
        true,
        false,
      ],
      // Contraste maximal : c'est la révélation elle-même qui porte l'effet,
      // et une rue pâle une fois révélée ferait un geste sans suite visible.
      // Coral : chaud contre le violet froid de la ligne, lumineux contre son
      // sombre, et plus rouge que les avenues jaune-orangé du fond Liberty —
      // il ne se confond pas avec elles.
      color: "#ff5a1f",
      width: [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        12, 0.55,
        14, 1.15,
        16, 1.95,
        18, 2.8,
      ],
      // Pleine opacité : c'est l'OPACITÉ DE LA COUCHE ELLE-MÊME, pilotée par
      // `LabMap`, qui la fait naître à zéro puis monter au clic — pas un
      // réglage à lire ici. Ce chiffre est la valeur plafond une fois révélée.
      opacity: 0.95,
      cap: "round",
      join: "round",
    },

    /*
      1 — LE VOILE, et c'est lui qui porte tout le dispositif.
      ───────────────────────────────────────────────────────────────────────
      Un polygone TROUÉ : son contour couvre la ville, son trou est l'aire de
      marche. Il atténue les rues partout SAUF dans l'aire — donc il les
      révèle à l'intérieur. L'inverse de ce qu'on faisait : la tache
      n'assombrit plus ce qu'elle couvre, elle éclaire ce qu'elle épargne.

      POURQUOI CE DÉTOUR — MapLibre ne sait pas découper une couche de lignes
      avec un polygone ; il n'existe pas de « clip » par géométrie. Le filtre
      `within` le ferait, mais MapLibre le marque comme exigeant la géométrie
      complète : chaque rue de chaque tuile serait décodée et testée sommet
      par sommet, à chaque cran du curseur. Mesuré sur la tuile de Saint-Roch
      au zoom 14 : 382 rues, 4 192 sommets, contre un anneau de 433. Le voile,
      lui, est UN SEUL remplissage — rien à tester.

      La couleur est celle du fond du site, pas un gris neutre : le voile doit
      se lire comme « le fond reprend le dessus », pas comme un calque sale.
      Elle change donc avec le thème.
    */
    {
      kind: "fill",
      source: "station",
      filter: ["==", ["get", "couche"], "voile"],
      // Le jeton de fond du site, pas une couleur figée : le voile doit se
      // lire comme « la page reprend le dessus », et il suit donc le thème.
      color: { cssVar: "--surface-muted", fallback: "#f4f8f5" },
      // 0,60 : un compromis, à l'essai. À 0,92 les rues cian disparaissaient
      // bien hors de l'aire, mais la ville entière aussi — le fond, déjà
      // atténué par `fade`, devenait presque blanc et seule la tache restait
      // lisible. À 0,60 le fond revient ; en contrepartie, les rues cian
      // transparaissent hors de l'aire à 40 % de leur couleur.
      opacity: 0.6,
    },

    /*
      2 — LA TACHE CIAN, conservée par-dessus le voile.
      ───────────────────────────────────────────────────────────────────────
      Le voile seul donnerait une lecture purement lumière/ombre : juste, mais
      muette sur la NATURE de la zone claire. Le cian dit « ceci est l'aire de
      marche », et garde la continuité avec le reste du lab, où c'est déjà la
      couleur du sujet.

      Très dilué — 0,14 contre 0,26 avant : les rues en dessous sont
      maintenant à pleine opacité, et un aplat trop fort les reverdirait au
      lieu de les laisser se lire.
    */
    {
      kind: "fill",
      source: "station",
      filter: ["==", ["get", "couche"], "aire_marche"],
      color: "#0891b2",
      opacity: 0.14,
    },

    // 3 — Le contour de l'aire, qui rend les découpes lisibles.
    //
    // C'est lui qui fait le bord net du trou du voile : les deux coïncident
    // exactement, puisque le trou EST cette géométrie.
    {
      kind: "line",
      source: "station",
      filter: ["==", ["get", "couche"], "aire_marche"],
      color: "#155e75",
      width: [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        12, 1.6,
        14, 2.4,
        16, 3.2,
        18, 4,
      ],
      opacity: 0.85,
      cap: "round",
      join: "round",
    },

    // 4 — L'intérieur BLANC du tunnel.
    //
    // Sur le plan officiel, le tronçon souterrain est creux : un contour violet
    // autour d'un blanc. Cette couche pose le blanc ; la couche 6, au-dessus,
    // n'en dessine que les deux bords. Le tracé en surface, lui, n'a plus de
    // halo — le plan officiel n'en met pas.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon_tunnel"],
      color: "#ffffff",
      width: LARGEUR_TRAM,
      cap: "butt",
      join: "round",
    },

    // 5 — Le tracé à l'air libre.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon"],
      color: TRAM,
      width: LARGEUR_TRAM,
      cap: "round",
      join: "round",
    },

    // 6 — Le tunnel, CREUX, comme sur le plan officiel.
    //
    // Deux bords violets séparés par un vide où transparaît le blanc de la
    // couche 4. Bords + vide = la largeur du tracé en surface : la ligne garde
    // la même épaisseur en passant sous terre, seul son remplissage change.
    {
      kind: "line",
      source: "tramway",
      filter: ["==", ["get", "couche"], "tronçon_tunnel"],
      color: TRAM_SOMBRE,
      width: [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        10, 0.8,
        13, 1.4,
        16, 2.2,
        18, 3,
      ],
      // Bords + vide = LARGEUR_TRAM à chaque palier de zoom.
      gapWidth: [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        10, 1.4,
        13, 3.2,
        16, 5.6,
        18, 9,
      ],
      cap: "butt",
      join: "round",
    },

    // 7 — Les tronçons que le chaînage n'a pas retenus.
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

    // 8 — Les stations : pastille blanche cerclée de violet, comme sur le plan
    // officiel. C'est la couche cliquable — y compris pour les pôles, que les
    // couches 9 et 10 redessinent par-dessus.
    {
      kind: "circle",
      source: "stations",
      filter: ["==", ["get", "couche"], "station"],
      color: "#ffffff",
      radius: 6,
      strokeColor: TRAM,
      strokeWidth: 2.5,
    },

    // 9 et 10 — Les PÔLES d'échange, en cible noire : un anneau, un blanc, un
    // second anneau. Deux cercles concentriques suffisent à la dessiner.
    // Ajoutés APRÈS les stations : aucune couche existante ne change d'indice.
    {
      kind: "circle",
      source: "stations",
      filter: [
        "all",
        ["==", ["get", "couche"], "station"],
        ["==", ["get", "pole"], true],
      ],
      color: "#ffffff",
      radius: 10,
      strokeColor: POLE,
      strokeWidth: 3,
    },
    {
      kind: "circle",
      source: "stations",
      filter: [
        "all",
        ["==", ["get", "couche"], "station"],
        ["==", ["get", "pole"], true],
      ],
      color: "#ffffff",
      radius: 4,
      strokeColor: POLE,
      strokeWidth: 2.5,
    },

    // 11 — Noms des stations, en violet gras, à droite de la pastille.
    //
    // Seulement à partir du zoom 13. Plus loin, les 29 stations se serrent à
    // l'écran et leurs noms s'empilaient : au dézoom, seuls les pôles parlent,
    // comme sur un plan de réseau.
    {
      kind: "label",
      minZoom: 13,
      allowOverlap: false,
      source: "stations",
      filter: [
        "all",
        ["==", ["get", "couche"], "station"],
        ["!=", ["get", "pole"], true],
      ],
      text: ["get", "nom"],
      font: "Noto Sans Bold",
      size: 14,
      color: TRAM,
      haloColor: "#ffffff",
      haloWidth: 2,
      anchor: "left",
      offsetX: 0.9,
    },

    // 12 — Noms des pôles, en noir gras, préfixés comme sur le plan officiel.
    //
    // À tous les zooms. Dessinés en dernier, ils sont placés EN PREMIER par le
    // moteur : quand deux noms se touchent, c'est celui de la station ordinaire
    // qui s'efface, jamais celui du pôle.
    {
      kind: "label",
      allowOverlap: false,
      source: "stations",
      filter: [
        "all",
        ["==", ["get", "couche"], "station"],
        ["==", ["get", "pole"], true],
      ],
      text: ["concat", "Pôle ", ["get", "nom"]],
      font: "Noto Sans Bold",
      size: 15,
      color: POLE,
      haloColor: "#ffffff",
      haloWidth: 2,
      anchor: "left",
      offsetX: 1.2,
    },
  ],

  /**
   * Le clic sur une station, et ce qu'il révèle.
   *
   * Rien n'est montré d'emblée : vingt-neuf voiles superposés rendraient la
   * carte noire, et vingt-neuf aires une tache uniforme.
   *
   * Plus de chargement à la demande — les rues viennent du fond de carte, déjà
   * téléchargé. C'est l'économie du dispositif : auparavant chaque station
   * faisait venir 146 ko de rues, avec une règle de nommage de fichier qui
   * devait s'accorder entre le script Python et le navigateur, et dont le
   * désaccord produisait un 404 silencieux.
   */
  select: {
    // Indice 8 : la couche des stations.
    layers: [8],
    key: "station",
    // 0 = les rues du fond, 1 = le voile, 2 = l'aplat cian de l'aire,
    // 3 = son contour.
    revealLayers: [0, 1, 2, 3],
    // La couche 0 lit le fond de carte : ses entités n'ont pas de `station`,
    // le filtre habituel ne peut pas s'y appliquer. Elle se révèle par
    // opacité — voir sa définition dans `layers`.
    revealByOpacity: [0],
    // L'aire et le voile de la station choisie, chargés au clic (15–25 ko
    // compressés chacun) puis gardés en mémoire.
    onDemand: {
      source: "station",
      // v2 : trous comblés (intérieurs de grands îlots, pas des zones hors
      // d'atteinte). v3 : modes de transport domicile–travail par palier.
      url: "/data/tramway-station/{clé}-v3.geojson",
    },
    slider: {
      field: "minutes",
      // Un cran par minute : avec six paliers espacés, le curseur sautait d'une
      // forme à l'autre et l'expansion se voyait par à-coups.
      steps: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      // Part de zéro : la carte reste nue au clic, et c'est le lecteur qui fait
      // grandir l'aire. Il voit alors la croissance au lieu de la deviner.
      start: 0,
      label: { fr: "Durée de marche", en: "Walking time" },
      suffix: " min",
      // Avec des paliers aussi rapprochés, 280 ms suffisent à combler le saut.
      fade: 280,
    },
    titleField: "nom",

    // Pas de bloc « Indicateurs » : la courbe montre déjà l'aire réelle et le
    // cercle théorique, en mots simples. Le chiffre principal et la courbe
    // suffisent ; les hectares exacts ne servaient qu'aux spécialistes.

    /**
     * Le tableau de bord — concept arrêté dans
     * `geodata/2026-10-tramway-quebec/CONCEPTION.md`, § 10.
     *
     * Public large, registre formel : termes exacts, chacun défini sur place.
     * Toute valeur est comparée. Les couleurs reprennent celles de la carte —
     * violet pour la ligne, cyan pour l'aire — et l'anneau n'emploie jamais le
     * cyan ni l'orange, qui désignent déjà l'aire et les rues.
     */
    panel: {
      titlePrefix: { fr: "Pôle", en: "Hub" },
      status: {
        field: "pole",
        yes: { fr: "Pôle d'échanges", en: "Transit hub" },
        no: { fr: "Station", en: "Station" },
        color: TRAM,
      },
      order: { field: "ordre", total: 29 },
      headline: {
        field: "population",
        label: { fr: "Population desservie", en: "Population served" },
        unit: { fr: "habitants", en: "residents" },
        compareSource: "stations",
        compareSeries: "pop",
        compareText: {
          fr: "{rang}ᵉ sur {total} stations · moyenne de la ligne : {moyenne}",
          en: "Rank {rang} of {total} stations · line average: {moyenne}",
        },
      },
      curve: {
        // Les mots de tous les jours plutôt que les termes de méthode : « en
        // ligne droite » et « par les rues » disent la même chose que « cercle
        // théorique » et « aire de marche », que n'importe qui comprend. Les
        // termes exacts restent dans les indicateurs et la méthode.
        title: { fr: "Par les rues ou en ligne droite", en: "Along the streets or in a straight line" },
        help: {
          fr: "En ligne droite, on marcherait dans toutes les directions sans obstacle. Par les rues, il faut suivre les trottoirs et contourner rivières, autoroutes et voies ferrées. L'écart entre les deux courbes montre ce que la ville fait perdre au piéton.",
          en: "In a straight line, one would walk in every direction with no obstacle. Along the streets, one must follow sidewalks and go around rivers, highways and railways. The gap between the two curves shows what the city costs the pedestrian.",
        },
        unit: "ha",
        simple: true,
        reference: { field: "disque_ha", label: { fr: "en ligne droite", en: "in a straight line" }, color: "#9aa8a1" },
        value: { field: "superficie_ha", label: { fr: "par les rues", en: "along the streets" }, color: "#0891b2" },
      },
      summary: (m, station, lang) => {
        const part = Number(m.part_disque_pct);
        const fr = lang === "fr";
        const constat = fr
          ? `Par les rues, on atteint ${part} % de la surface accessible en ligne droite.`
          : `Along the streets, walkers reach ${part}% of the area reachable in a straight line.`;
        // L'obstacle est stocké avec son verbe (« La rivière Saint-Charles
        // limite ») : on garde le sujet, on change le verbe.
        const obstacle = station[fr ? "obstacle_fr" : "obstacle_en"];
        if (part < 60 && typeof obstacle === "string") {
          const sujet = obstacle
            .replace(/ limitent$/, " bloquent")
            .replace(/ limite$/, " bloque")
            .replace(/ limits$/, " blocks")
            .replace(/ limit$/, " block");
          return `${constat} ${sujet} ${fr ? "le reste." : "the rest."}`;
        }
        if (part >= 60) {
          return fr
            ? `${constat.slice(0, -1)} : peu d'obstacles freinent la marche.`
            : `${constat.slice(0, -1)}: few obstacles slow walkers down.`;
        }
        return constat;
      },
      donut: {
        title: { fr: "Mode de transport domicile–travail", en: "Commuting mode" },
        // La réserve sur la pandémie vit dans l'aide « ? » et dans la méthode,
        // pas sous l'anneau : affichée en permanence, elle faisait déborder le
        // panneau de la hauteur de la carte.
        help: {
          fr: "Mode principal des résidents de l'aire qui travaillent hors du domicile, selon le recensement de 2021 (données-échantillon, 25 %). Recensé en mai 2021, en période de pandémie : le transport collectif y est sous-représenté.",
          en: "Main mode of residents of the walkshed who work outside the home, from the 2021 Census (25% sample data). Collected in May 2021, during the pandemic: public transit is under-represented.",
        },
        segments: [
          { field: "mode_auto_pct", label: { fr: "Automobile", en: "Car" }, color: "#3d4a44" },
          { field: "mode_tc_pct", label: { fr: "Transport collectif", en: "Public transit" }, color: TRAM },
          { field: "mode_actif_pct", label: { fr: "Transport actif", en: "Walking, cycling" }, color: "#2f9e6e" },
          { field: "mode_autre_pct", label: { fr: "Autre", en: "Other" }, color: "#c9d3cd" },
        ],
      },
      method: {
        title: { fr: "Méthode et sources", en: "Method and sources" },
        text: {
          fr: "Aires calculées sur le réseau piéton d'OpenStreetMap à 4,2 km/h, une allure prudente qui tient compte des pentes et de l'hiver. Population et modes de transport : recensement de 2021 de Statistique Canada, répartis par pondération de surface des aires de diffusion (estimation, non décompte) ; recensé en mai 2021, en période de pandémie, il sous-représente le transport collectif. Positions des stations : croisements de rues sur les axes officiels de TramCité (tramcite.info), contrôlés par Wikipédia.",
          en: "Walksheds computed on the OpenStreetMap pedestrian network at 4.2 km/h, a cautious pace that accounts for grades and winter. Population and commuting modes: Statistics Canada 2021 Census, allocated by area weighting of dissemination areas (an estimate, not a count); collected in May 2021, during the pandemic, it under-represents public transit. Station positions: street crossings on TramCité's official axes (tramcite.info), checked against Wikipedia.",
        },
      },
    },

    empty: {
      fr: "Choisissez une station pour voir ce qu'on en atteint à pied.",
      en: "Pick a station to see what it reaches on foot.",
    },
  },

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
  view: {
    bounds: CENTRE,
    // Le plancher, et c'est le réglage le plus important du lab.
    //
    // Cadrer une emprise donne un zoom qui dépend de la fenêtre : la même
    // carte ouvrait au 15,0 sur un grand écran et au 13,9 sur un téléphone.
    // Or les hauteurs de bâtiment n'existent qu'à partir du zoom 14 — en
    // dessous, la ville s'aplatit et il ne reste qu'un trait sur un plan.
    // C'est précisément ce qui se produisait, sans qu'aucune erreur ne le
    // signale.
    //
    // 14,2 plutôt que 14 : une marge, parce que le calcul de cadrage dépend
    // aussi du `padding` et des arrondis.
    minZoom: 14.2,
    pitch: 55,
    bearing: -24,
  },

  /**
   * Bornes de zoom, dictées par la donnée du fond.
   *
   * Les hauteurs de bâtiment (`render_height`) n'existent dans les tuiles
   * d'OpenMapTiles qu'**à partir du zoom 14** — vérifié sur les tuiles de
   * Québec : au zoom 13 la couche `building` est là, le champ de hauteur non.
   * En dessous de 14, il n'y a donc pas de volume possible.
   *
   * `minZoom: 11` — on accepte que la ville s'aplatisse en reculant. Le plancher
   * était à 13,6 tant que le lab ne montrait que deux stations : rester en
   * volume primait. Avec les 29, la ligne fait 19 km et ne tenait plus à
   * l'écran ; or le lecteur doit pouvoir la voir entière, de Le Gendre à
   * Charlesbourg, pour choisir sa station. Le volume revient de lui-même dès
   * qu'il se rapproche (zoom 14). L'ouverture, elle, reste cadrée en volume
   * (`view.minZoom`).
   *
   * Au-delà de 14, le moteur agrandit la dernière tuile : les contours
   * s'adoucissent, les volumes restent justes. 17,5 est la limite où cela reste
   * net.
   */
  minZoom: 11,
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
    {
      // La couleur des rues révélées, pas celle de l'aplat : c'est elle que le
      // lecteur voit apparaître, et donc elle qu'il faut nommer.
      color: "#ff5a1f",
      label: {
        fr: "Rues atteintes à pied depuis la station choisie",
        en: "Streets reached on foot from the selected station",
      },
    },
  ],

  attribution: {
    fr: "Tracé : contributeurs d'OpenStreetMap (ODbL) — relevé le 1ᵉʳ octobre 2026",
    en: "Route: OpenStreetMap contributors (ODbL) — retrieved 1 October 2026",
  },

  hover: {
    // Indices : 5 = tracé en surface, 6 = tunnel, 7 = tronçons isolés.
    // L'ordre compte : la première couche qui répond gagne.
    layers: [5, 6, 7],
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
    fr: "Tracé provisoire, reconstitué par les contributeurs d'OpenStreetMap d'après l'avis au marché du 19 décembre 2024 ; OSM le signale « sujet à modification ». Le vectoriel officiel n'est pas diffusé en données ouvertes. La géométrie relevée mesure 17,5 km, là où le projet en annonce 19 : un tronçon de l'ouest n'est pas raccordé et environ 700 m de tracé manquent dans OSM. Les 29 stations et les 5 pôles suivent le plan officiel de TramCité (tramcite.info). Aucune source ouverte ne publiant leurs coordonnées, chaque station est placée au croisement, dans OpenStreetMap, de la rue qui lui donne son nom et de l'axe officiel de la ligne ; les stations nommées d'après un lieu reprennent les coordonnées de Wikipédia, contrôlées par les croisements (écart de 0 à 70 m). Toutes sont posées sur le tracé. Les aires de marche sont calculées sur le réseau piéton d'OpenStreetMap à 4,2 km/h, une allure plus lente que la norme de 4,8 pour tenir compte des pentes et de l'hiver. Les rues qui s'éclairent dans l'aire sont celles du fond de carte, c'est-à-dire le réseau routier : elles situent la trame du quartier, mais ne sont pas exactement les tronçons empruntés par le calcul. Les kilomètres annoncés, eux, mesurent bien le réseau piéton parcouru. La pente de 12 % entre basse-ville et haute-ville, qui impose le tunnel, provient de la documentation du projet et non de cette géométrie.",
    en: "Provisional route, reconstructed by OpenStreetMap contributors from the 19 December 2024 call for tenders; OSM flags it as \"subject to change\". No official vector file is published as open data. The surveyed geometry measures 17.5 km against the project's announced 19: one western segment is disconnected and roughly 700 m of route is missing from OSM. The 29 stations and 5 hubs follow the official TramCité map (tramcite.info). With no open source publishing their coordinates, each station sits where its namesake street crosses the line's official axis in OpenStreetMap; stations named after a place use Wikipedia's coordinates, checked against those crossings (0–70 m apart). All are snapped onto the route. Walksheds are computed on the OpenStreetMap pedestrian network at 4.2 km/h, slower than the usual 4.8 to account for grades and winter. The streets that light up inside the walkshed come from the basemap, that is the road network: they place the neighbourhood's fabric but are not exactly the segments the computation walked. The stated kilometres do measure the pedestrian network actually travelled. The 12% grade between lower and upper town, which forces the tunnel, comes from project documentation rather than this geometry.",
  },

  download: "/data/tramway-quebec-v1.geojson",
};

export default tramwayQuebec;
