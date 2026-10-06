/**
 * Vocabulaire des « labs » — les cartes interactives du carnet.
 *
 * Pourquoi un vocabulaire maison plutôt que la spécification MapLibre brute :
 * une définition de lab doit se lire comme une intention cartographique
 * (« remplissage bleu par durée »), pas comme une feuille de style. Le
 * composant `LabMap` traduit ce vocabulaire en couches MapLibre.
 *
 * Ce fichier ne contient QUE des types et des données — aucun import de
 * `maplibre-gl`. Il reste donc importable depuis le serveur comme depuis le
 * client sans faire entrer 250 ko de moteur cartographique dans le bundle.
 *
 * L'échappatoire existe : partout où une couleur est attendue, on peut passer
 * une expression MapLibre brute (un tableau). Le vocabulaire couvre le cas
 * courant, l'expression couvre le reste.
 */

/** Un texte du lab dans les deux langues du carnet. */
export type Bilingual = { fr: string; en: string };

/**
 * Couleur d'une couche :
 *   - une chaîne          → couleur fixe, ex. `"#0e6f52"`
 *   - un objet `byProperty` → couleur dérivée d'un champ des données
 *   - un tableau          → expression MapLibre brute, passée telle quelle
 */
export type LabColor =
  | string
  | {
      /** Champ des propriétés GeoJSON à lire, ex. `"duration"`. */
      byProperty: string;
      /** Valeurs exactes → couleur. Ex. `[[60, "#0e6f52"], [120, "#4fc78d"]]`. */
      match: Array<[string | number, string]>;
      /** Couleur des entités qui ne correspondent à aucune valeur. */
      fallback: string;
    }
  | {
      /**
       * Jeton CSS du site, ex. `"--surface-muted"`, avec une couleur de repli.
       *
       * À préférer à deux valeurs écrites en dur quand la couche doit se
       * confondre avec la page : le jeton suit le thème clair ou sombre, et
       * continue de suivre la charte si elle change. Une paire de hexadécimaux
       * figée, elle, se décale dès que la page bouge — et c'est invisible
       * jusqu'à ce qu'on regarde la carte dans l'autre thème.
       */
      cssVar: string;
      fallback: string;
    }
  | unknown[];

/**
 * Hauteur d'une couche extrudée.
 *
 * Un nombre fige la hauteur ; `byProperty` la dérive d'un champ, multiplié par
 * `scale` pour passer de l'unité de la donnée (km², habitants) à des mètres
 * lisibles à l'écran. La hauteur PORTE une information : c'est ce qui sépare
 * une extrusion utile d'un effet de manche.
 */
export type LabHeight =
  | number
  | {
      byProperty: string;
      scale: number;
      base?: number;
      /**
       * Racine carrée de la valeur avant mise à l'échelle.
       *
       * Sur une série très étalée, une hauteur proportionnelle écrase les
       * petits : à 135 km² contre 2 km², le plus petit bloc fait 1,6 % du plus
       * grand — invisible. La racine ramène ce rapport à 12 %, et conserve
       * l'ordre.
       *
       * Le prix est réel : les hauteurs cessent d'être comparables entre elles.
       * Un bloc deux fois plus haut ne vaut plus deux fois plus. À ne poser que
       * lorsque le lab affiche les valeurs par ailleurs — l'infobulle, la
       * légende — et à dire dans la note de méthode.
       */
      sqrt?: boolean;
    };

/**
 * Champs communs à toutes les couches.
 *
 * `filter` permet à plusieurs couches de partager une même source : un seul
 * GeoJSON, une propriété qui dit à quoi appartient chaque entité, et autant de
 * couches que de rendus. Une requête réseau au lieu de trois.
 */
type LabLayerBase = {
  /**
   * Clé d'une entrée de `sources`.
   *
   * Peut aussi nommer une source du FOND DE CARTE — `openmaptiles` pour un
   * style OpenMapTiles. On repeint alors une donnée déjà téléchargée, ce qui ne
   * coûte aucun octet de plus : le fond porte déjà toutes les rues de la ville,
   * là où un GeoJSON à nous n'en porterait que ce qu'on a calculé.
   */
  source: string;
  /**
   * Couche interne d'une source vectorielle, ex. `"transportation"`.
   *
   * Obligatoire pour une source en tuiles, interdite pour un GeoJSON : une
   * source GeoJSON n'a qu'un seul jeu d'entités, une source vectorielle en a
   * plusieurs et il faut dire lequel.
   */
  sourceLayer?: string;
  /**
   * Bornes de zoom de la couche.
   *
   * Utile quand la donnée du fond n'existe pas partout : les chemins piétons
   * d'OpenMapTiles n'apparaissent qu'à partir du zoom 14, et une couche qui
   * les demande plus tôt dessine du vide.
   */
  minZoom?: number;
  maxZoom?: number;
  /** Expression MapLibre, ex. `["==", ["get", "couche"], "lac"]`. */
  filter?: unknown[];
};

/** Une couche dessinée sur la carte. L'ordre du tableau est l'ordre de peinture. */
export type LabLayer = LabLayerBase &
  (
  | {
      kind: "fill";
      color: LabColor;
      opacity?: number;
      outlineColor?: string;
    }
  | {
      /**
       * Polygone extrudé. Demande une vue inclinée (`pitch`) pour se voir :
       * à la verticale, une extrusion ressemble à un aplat.
       */
      kind: "extrusion";
      color: LabColor;
      height: LabHeight;
      opacity?: number;
    }
  | {
      kind: "line";
      color: LabColor;
      /**
       * Largeur en pixels, ou expression MapLibre pour la faire varier avec le
       * zoom.
       *
       * Une largeur fixe convient à une limite administrative, qu'on regarde à
       * une seule échelle. Elle convient mal à une ligne qu'on parcourt : trop
       * épaisse sur une station, trop fine sur l'ensemble du tracé. Dans ce
       * cas, une interpolation sur le zoom.
       */
      width?: number | unknown[];
      opacity?: number;
      /** Motif de tirets, en multiples de la largeur du trait. */
      dash?: number[];
      /**
       * Bouts et coins du trait. Par défaut MapLibre coupe net et pointe les
       * angles, ce qui hache une ligne sinueuse ; `"round"` la rend continue.
       */
      cap?: "butt" | "round" | "square";
      join?: "bevel" | "round" | "miter";
      /**
       * Trait CREUX : deux bords de largeur `width`, séparés par un vide de
       * `gapWidth`. C'est le tunnel des plans de transport — un contour de la
       * couleur de la ligne autour d'un intérieur clair.
       */
      gapWidth?: number | unknown[];
    }
  | {
      kind: "circle";
      color: LabColor;
      radius?: number;
      opacity?: number;
      strokeColor?: string;
      strokeWidth?: number;
    }
  | {
      /**
       * Étiquette posée sur chaque entité.
       *
       * Une carte thématique sans étiquettes demande au lecteur de faire des
       * allers-retours avec la légende. Écrire la valeur sur la forme supprime
       * ce trajet — c'est ce qui sépare une carte qu'on lit d'une carte qu'on
       * déchiffre.
       *
       * Demande des polices : sans fond de carte qui en fournisse (`glyphs`),
       * le texte ne s'affiche pas.
       */
      kind: "label";
      /** Expression MapLibre produisant le texte, ex. `["get", "nom"]`. */
      text: unknown[];
      size?: number;
      color?: string;
      /** Halo clair derrière le texte : ce qui le rend lisible sur un aplat. */
      haloColor?: string;
      haloWidth?: number;
      /** Décalage vertical, en multiples de la taille du texte. */
      offsetY?: number;
      /** Décalage horizontal, en multiples de la taille du texte. */
      offsetX?: number;
      /**
       * Point du texte accroché à l'entité. `"left"` pose le texte À DROITE du
       * point, comme sur un plan de ligne ; `"center"` (défaut) le centre dessus.
       */
      anchor?: "center" | "left" | "right" | "top" | "bottom";
      /** Police, ex. `"Noto Sans Bold"`. Défaut : `"Noto Sans Regular"`. */
      font?: string;
      /**
       * Laisse les étiquettes se chevaucher. Défaut : `true` — sur cinq
       * entités, mieux vaut un chevauchement qu'un nom manquant. À `false`
       * pour une série dense (les 29 stations d'une ligne) : au dézoom, le
       * moteur masque les noms qui se toucheraient au lieu de les empiler.
       */
      allowOverlap?: boolean;
    }
  );

/**
 * Orientation de la caméra.
 *
 * `pitch` 0 = vue verticale, 60 = très rasante. Au-delà de 45 sur un écran
 * étroit, les polygones lointains s'écrasent : le lab redescend l'angle en
 * dessous de 640 px (voir `LabMap`).
 */
export type LabCamera = {
  /** Inclinaison en degrés, 0–60. */
  pitch?: number;
  /** Rotation en degrés ; 0 = nord en haut. */
  bearing?: number;
};

/** Cadrage initial : soit une emprise, soit un point et un niveau de zoom. */
export type LabView =
  | ({
      /** `[ouest, sud, est, nord]` en degrés décimaux (WGS 84). */
      bounds: [number, number, number, number];
      /**
       * Zoom en deçà duquel on refuse de descendre, même si l'emprise ne tient
       * pas dans le conteneur.
       *
       * POURQUOI — cadrer une emprise donne un zoom qui dépend de la taille de
       * la fenêtre : la même carte ouvre au zoom 15 sur un grand écran et au
       * 13,9 sur un téléphone. C'est sans conséquence quand les données sont
       * les nôtres, puisqu'elles s'affichent à toutes les échelles. Ça en a
       * quand une couche du fond a un seuil : les hauteurs de bâtiment
       * d'OpenMapTiles n'existent qu'à partir du zoom 14, et en dessous la
       * ville s'aplatit — le lab perd son sujet sur les petits écrans sans
       * qu'aucune erreur ne le signale.
       *
       * Le prix est assumé : au-delà de ce plancher, l'emprise déborde du
       * cadre. Mieux vaut voir une partie de la scène en volume que la scène
       * entière à plat.
       */
      minZoom?: number;
    } & LabCamera)
  | ({ center: [number, number]; zoom: number } & LabCamera);

/**
 * Une étape du récit : ce que la caméra regarde, et quelles couches sont
 * visibles.
 *
 * Les scènes ne changent JAMAIS les données — seulement le cadrage et la
 * visibilité. Un lecteur qui coupe le JavaScript des scènes voit toujours la
 * carte complète, et un lecteur qui demande moins d'animation
 * (`prefers-reduced-motion`) y saute sans transition.
 */
export type LabScene = {
  /** Identifiant court, repris dans l'URL et les boutons. */
  id: string;
  /** Titre du bouton, dans les deux langues. */
  label: Bilingual;
  /** Phrase affichée sous la carte pendant la scène. */
  caption?: Bilingual;
  /** Cadrage de la scène. Absent = on garde celui de la scène précédente. */
  view?: LabView;
  /**
   * Indices des couches de `layers` visibles pendant la scène.
   * Absent = toutes.
   */
  layers?: number[];
  /** Durée du déplacement de caméra, en millisecondes. */
  duration?: number;
};

/**
 * Fond de carte.
 *
 * `none` est le défaut assumé : les données se lisent mieux sans le bruit d'un
 * fond, et surtout aucun jeton d'API n'entre dans le site. Le jour où un fond
 * est nécessaire, `style` accepte l'URL d'un style MapLibre — vérifier alors
 * les conditions d'usage du fournisseur, c'est là que la facturation revient.
 */
export type LabBasemap =
  | { kind: "none" }
  | {
      kind: "style";
      url: string;
      attribution?: Bilingual;
      /**
       * Couches du fond à masquer, par identifiant.
       *
       * Un fond généraliste dessine des choses que le lab redit autrement —
       * ses propres lacs sous les nôtres, ses étiquettes par-dessus nos
       * couleurs. Les masquer n'est pas de la coquetterie : deux figurés pour
       * la même réalité, à deux échelles et deux dates, se contredisent.
       */
      hideLayers?: string[];
      /**
       * Opacité appliquée au fond entier, de 0 à 1.
       *
       * Un fond sert de repère, pas de sujet. L'atténuer laisse les données du
       * lab porter la lecture.
       */
      fade?: number;
      /**
       * Repeint des couches que le fond porte déjà, au lieu de les masquer.
       *
       * POURQUOI — `hideLayers` ne sait qu'éteindre. Or un fond vectoriel
       * transporte parfois exactement ce qu'un lab veut montrer : le style
       * Liberty d'OpenFreeMap contient une couche `building-3d` en
       * `fill-extrusion`, dont la hauteur vient du champ `render_height` des
       * tuiles OpenMapTiles. Ces volumes existent pour toute la ville, à toutes
       * les échelles, et ne coûtent **aucun octet** au site.
       *
       * L'alternative serait de télécharger les empreintes de bâtiments et de
       * les servir nous-mêmes : des mégaoctets de géométrie pour redessiner ce
       * que le fond dessine déjà.
       *
       * Le prix est la dépendance. Si le fournisseur change son style, la
       * couche visée peut disparaître ou changer de nom — la carte perd alors
       * son décor, jamais ses données, qui viennent du site. Les clés de
       * `paint` ne sont pas validées à la compilation : MapLibre lève une
       * erreur explicite au premier affichage si l'une est inconnue.
       *
       * Les couches absentes du style sont ignorées en silence : un fond qui ne
       * porte pas la couche visée ne doit pas casser le lab.
       */
      restyleLayers?: Array<{
        /** Identifiant de la couche dans le style du fond, ex. `"building-3d"`. */
        id: string;
        /** Propriétés de peinture à écraser, ex. `{ "fill-extrusion-color": "#e0dfce" }`. */
        paint?: Record<string, unknown>;
        /** Propriétés de mise en page, ex. `{ visibility: "visible" }`. */
        layout?: Record<string, unknown>;
        /**
         * Zoom à partir duquel la couche s'affiche.
         *
         * Un fond généraliste choisit ses seuils pour un usage généraliste :
         * Liberty n'extrude ses bâtiments qu'à partir du zoom 14, parce qu'on
         * ne regarde pas une ville en volume depuis le ciel. Un lab dont le
         * sujet EST le volume cadre plus large, et se retrouverait sans
         * bâtiments à l'ouverture.
         *
         * Le prix est réel : les tuiles d'OpenMapTiles s'arrêtent au zoom 14,
         * donc en dessous le moteur agrandit des géométries prévues pour plus
         * petit. Les bâtiments y paraissent lourds, et les plus fins
         * disparaissent. À n'abaisser que de deux ou trois niveaux.
         */
        minzoom?: number;
        /**
         * Soustrait cette couche à l'atténuation de `fade`.
         *
         * Nécessaire quand la couche repeinte EST le sujet : `fade` parcourt
         * tout le style, y compris les extrusions, et écraserait l'opacité
         * qu'on vient de poser.
         */
        keepOpacity?: boolean;
      }>;
    };

/**
 * Une ligne de chiffre, dans l'infobulle comme dans le panneau.
 *
 * `field` nomme une propriété de l'entité ; la ligne disparaît si elle est
 * absente, ce qui évite d'écrire « undefined » dans une carte.
 *
 * Le même type sert les deux parce que la façon de rendre un chiffre ne dépend
 * pas de l'endroit où on le lit : un pourcentage se lit en barre dans une
 * infobulle comme dans un panneau, et une série de vingt-cinq ans se lit en
 * courbe dans les deux.
 */
export type LabHoverRow = {
  field: string;
  label?: Bilingual;
  /** Texte ajouté après la valeur, ex. « % » ou « ha ». */
  suffix?: string;
  /** Ligne de titre : affichée en gras, sans étiquette. */
  title?: boolean;
  /**
   * Rend le champ comme une courbe plutôt qu'un nombre.
   *
   * Le champ doit contenir un objet `{ année: valeur }`. Une série de 25
   * points ne se lit pas comme deux chiffres : la forme de la courbe dit ce
   * qu'un « +89,8 % » laisse deviner.
   */
  spark?: {
    /** Couleur de la courbe. */
    color: string;
    /** Hauteur en pixels. */
    height?: number;
  };
  /**
   * Rend le champ comme une part d'un tout, en barre.
   *
   * `max` est la valeur qui remplit la barre — 100 pour un pourcentage.
   */
  bar?: { color: string; max: number };
  /**
   * N'affiche la ligne que si une autre propriété vaut cette valeur.
   *
   * Une même infobulle sert des entités de nature différente : une
   * municipalité du bassin n'a pas les mêmes champs qu'un lac, ni le même
   * propos qu'une municipalité desservie. La condition évite d'écrire des
   * lignes qui n'ont pas de sens pour ce qui est survolé.
   */
  when?: { field: string; equals: string | number | boolean };
};

/**
 * Tableau de bord d'une entité choisie.
 *
 * PRINCIPE — toute valeur s'accompagne d'une comparaison : un chiffre isolé ne
 * dit pas s'il est élevé ou faible. Le registre est celui d'un rapport, formel
 * et exact, mais chaque terme technique porte sa définition.
 *
 * Les champs se lisent sur trois objets :
 * - « mesures » : l'entité révélée au palier courant (l'aire de marche) ;
 * - « série » : toutes les entités révélées de l'entité choisie, une par
 *   palier — pour les courbes ;
 * - « ensemble » : toutes les entités cliquables (les 29 stations), lues dans
 *   la source `headline.compareSource` — pour le rang et la moyenne.
 */
export type LabPanelConfig = {
  /** Statut sous le titre, selon un champ booléen de l'entité choisie. */
  status?: { field: string; yes: Bilingual; no: Bilingual; color?: string };
  /** Rang dans la série, ex. « 23 / 29 », depuis un champ de l'entité choisie. */
  order?: { field: string; total: number };
  /** Préfixe du titre quand `status.field` est vrai, ex. « Pôle ». */
  titlePrefix?: Bilingual;
  /** Le chiffre principal, en grand, avec son rang et la moyenne. */
  headline?: {
    /** Champ des mesures, ex. `"population"`. */
    field: string;
    label: Bilingual;
    unit: Bilingual;
    /**
     * Source (clé de `sources`) des entités à comparer, et champ qui y porte
     * la valeur par palier, sous forme de tableau aligné sur `slider.steps`
     * (sans le palier zéro). Sans eux, ni rang ni moyenne.
     */
    compareSource?: string;
    compareSeries?: string;
    /**
     * Phrase de comparaison. Jetons remplacés : `{rang}`, `{total}`,
     * `{moyenne}` — ex. « {rang}ᵉ sur {total} stations · moyenne de la ligne :
     * {moyenne} ».
     */
    compareText?: Bilingual;
  };
  /** Deux courbes par palier : une référence et la valeur mesurée. */
  curve?: {
    title: Bilingual;
    help?: Bilingual;
    unit: string;
    /**
     * Sans graduations : seulement la forme des deux courbes et les bornes de
     * l'axe du temps. Pour un public large, l'écart entre les courbes dit
     * l'essentiel ; les valeurs exactes restent dans les indicateurs.
     */
    simple?: boolean;
    reference: { field: string; label: Bilingual; color: string };
    value: { field: string; label: Bilingual; color: string };
  };
  /**
   * Phrase de synthèse, au registre d'un rapport. Une fonction, parce que la
   * formulation dépend du profil de l'entité : un obstacle nommé, un seuil.
   */
  summary?: (
    mesures: Record<string, unknown>,
    entite: Record<string, unknown>,
    lang: "fr" | "en",
  ) => string;
  /** Anneau de parts (en %), la première au centre. */
  donut?: {
    title: Bilingual;
    help?: Bilingual;
    note?: Bilingual;
    segments: Array<{ field: string; label: Bilingual; color: string }>;
  };
  /** Titre du bloc des indicateurs (`select.rows`). */
  indicatorsTitle?: Bilingual;
  /** Méthode et sources, repliées en pied de panneau. */
  method?: { title: Bilingual; text: Bilingual };
};

export type LabDefinition = {
  /** Identifiant stable, repris dans le champ `lab` d'une entrée. */
  id: string;
  /** Sources de données : clé → chemin public versionné, ex. `/data/x-v1.geojson`. */
  sources: Record<string, string>;
  layers: LabLayer[];
  view: LabView;
  /**
   * Récit en étapes. Sans lui, la carte s'affiche d'un coup — c'est le cas de
   * la plupart des labs. Avec, le lecteur avance par boutons : jamais par
   * défilement détourné, qui casse le défilement de l'article et ne se pilote
   * pas au clavier.
   */
  scenes?: LabScene[];
  minZoom?: number;
  maxZoom?: number;
  basemap?: LabBasemap;
  /**
   * Lumière de la scène 3D.
   *
   * Ne sert qu'aux labs qui portent des volumes : sans extrusion, une lumière
   * n'éclaire rien. Elle décide de quel côté tombent les ombres des façades, et
   * donc de la lisibilité du relief bâti — une lumière verticale aplatit tout.
   *
   * `color` et `intensity` se lisent ensemble : une lumière crème peu intense
   * donne un plein jour calme, une lumière orangée un soleil bas.
   */
  light?: {
    /** Teinte de la lumière, ex. `"#fff9e8"`. */
    color?: string;
    /** De 0 à 1. Au-delà de 0,5 les façades claires se brûlent. */
    intensity?: number;
    /**
     * `[rayon, azimut, élévation]` — azimut en degrés depuis le nord, élévation
     * en degrés au-dessus de l'horizon. `[1.5, 210, 35]` donne un soleil de
     * sud-ouest à mi-hauteur : les façades nord-est passent dans l'ombre, ce
     * qui fait ressortir les volumes.
     */
    position?: [number, number, number];
  };
  /** Légende affichée sous la carte. Sans elle, les couleurs ne disent rien. */
  legend?: Array<{ color: string; label: Bilingual }>;
  /**
   * Provenance des données. Obligatoire : une carte sans source citée n'a
   * aucune valeur professionnelle, et la plupart des jeux de données ouverts
   * l'exigent par licence.
   */
  attribution: Bilingual;
  /** Note de méthode sous la carte — hypothèses, limites, ce qui est approximé. */
  note?: Bilingual;
  /**
   * Entités que le lecteur choisit d'un clic, et ce qui s'affiche alors.
   *
   * POURQUOI UNE SÉLECTION ET PAS UN SURVOL — le survol s'efface dès que le
   * curseur bouge, et il n'existe pas au doigt. Dès que le lecteur doit AGIR
   * sur ce qu'il a choisi — faire varier une durée, lire plusieurs chiffres —
   * il faut que son choix persiste.
   */
  select?: {
    /** Indices des couches de `layers` qui répondent au clic. */
    layers: number[];
    /**
     * Propriété qui identifie l'entité choisie, ex. `"station"`.
     *
     * Sa valeur filtre les couches révélées : c'est ainsi qu'un clic sur une
     * station fait apparaître SON aire et pas les autres.
     */
    key: string;
    /**
     * Couches qui ne se dessinent que pour l'entité choisie.
     *
     * Elles restent vides tant que rien n'est sélectionné — vingt-neuf aires
     * superposées ne se liraient pas.
     */
    revealLayers?: number[];
    /**
     * Parmi `revealLayers`, celles qui se révèlent par OPACITÉ plutôt que par
     * filtre sur `key`/`minutes`.
     *
     * Nécessaire pour une couche branchée sur le fond de carte (`sourceLayer`
     * déclaré) : ses entités n'ont pas les champs du GeoJSON du lab, donc le
     * filtre habituel — `["==", ["get", key], valeur]` — ne les sélectionnerait
     * jamais, qu'une entité soit choisie ou non. L'opacité, elle, s'applique à
     * la couche entière sans regarder ses entités.
     */
    revealByOpacity?: number[];
    /**
     * Données chargées seulement pour l'entité choisie.
     *
     * Les rues parcourues depuis une station pèsent quelques centaines de
     * kilooctets : les servir pour vingt-neuf stations ferait télécharger
     * plusieurs mégaoctets à qui n'en regarde qu'une.
     *
     * `url` porte un gabarit où `{clé}` est remplacé par la valeur de `key`,
     * en minuscules et sans accents. Le fichier est gardé en mémoire après son
     * premier chargement.
     */
    onDemand?: { source: string; url: string };
    /**
     * Curseur qui fait varier un palier.
     *
     * Les paliers sont PRÉCALCULÉS : le curseur choisit parmi des formes déjà
     * écrites, il ne calcule rien. Le travail lourd se fait une fois, dans un
     * script, et le site sert du statique.
     */
    slider?: {
      /** Propriété qui porte la valeur du palier, ex. `"minutes"`. */
      field: string;
      /** Paliers disponibles, dans l'ordre. */
      steps: number[];
      /** Palier affiché à l'ouverture. Absent = le dernier. */
      start?: number;
      /** Libellé du curseur. */
      label: Bilingual;
      /** Unité affichée après la valeur, ex. « min ». */
      suffix?: string;
      /**
       * Fondu entre deux paliers, en millisecondes.
       *
       * Les formes sont discrètes : passer de l'une à l'autre se voit comme un
       * saut. On ne peut pas interpoler leurs sommets — deux polygones
       * successifs n'ont ni le même nombre de sommets ni la même topologie —
       * mais faire monter l'opacité de la nouvelle depuis zéro suffit, surtout
       * quand les paliers sont rapprochés.
       *
       * Ignoré quand le système demande moins de mouvement.
       */
      fade?: number;
    };
    /**
     * Propriété qui titre le panneau. Absente = la valeur de `key`.
     *
     * Les deux diffèrent quand l'identifiant n'est pas lisible — un code de
     * station plutôt que son nom.
     */
    titleField?: string;
    /**
     * Chiffres affichés dans le panneau, pour l'entité choisie au palier
     * courant.
     *
     * Volontairement distincts de ceux de `hover` : l'infobulle parle de ce
     * qu'on survole — ici des tronçons de tracé — alors que le panneau parle
     * de ce qu'on a choisi, et n'a donc pas les mêmes champs à montrer.
     *
     * Les champs sont lus sur l'entité révélée au palier courant, pas sur
     * l'entité cliquée : c'est l'aire de marche qui porte les mesures, et
     * elles changent à chaque cran du curseur.
     */
    rows?: LabHoverRow[];
    /** Phrase affichée tant que rien n'est choisi. */
    empty?: Bilingual;
    /**
     * Le tableau de bord de l'entité choisie — voir `LabPanel`.
     *
     * Tout est facultatif : un lab qui n'en déclare rien garde le panneau
     * simple (curseur et lignes). Chaque bloc déclaré s'ajoute dans l'ordre de
     * lecture : statut, chiffre principal, courbe, synthèse, anneau,
     * indicateurs, méthode.
     */
    panel?: LabPanelConfig;
  };
  /**
   * Infobulle affichée au survol d'une entité.
   *
   * Préférable à des étiquettes posées à demeure : la carte reste lisible, et
   * chaque entité peut en dire bien plus qu'un nom — une part, une population,
   * une croissance. Au doigt, le survol devient un appui.
   */
  hover?: {
    /** Indices des couches de `layers` qui réagissent au survol. */
    layers: number[];
    /** Lignes de l'infobulle. */
    rows: LabHoverRow[];
  };
  /**
   * Fichier proposé au téléchargement sous la carte. Reste accessible sans
   * JavaScript, et montre que les données sont ouvertes.
   */
  download?: string;
};

/** Emprise MapLibre `[[ouest, sud], [est, nord]]` à partir d'une vue à emprise. */
export function boundsPair(
  bounds: [number, number, number, number],
): [[number, number], [number, number]] {
  const [west, south, east, north] = bounds;
  return [
    [west, south],
    [east, north],
  ];
}
