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
  /** Clé d'une entrée de `sources`. */
  source: string;
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
      width?: number;
      opacity?: number;
      /** Motif de tirets, en multiples de la largeur du trait. */
      dash?: number[];
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
  | ({ /** `[ouest, sud, est, nord]` en degrés décimaux (WGS 84). */ bounds: [number, number, number, number] } & LabCamera)
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
   * Infobulle affichée au survol d'une entité.
   *
   * Préférable à des étiquettes posées à demeure : la carte reste lisible, et
   * chaque entité peut en dire bien plus qu'un nom — une part, une population,
   * une croissance. Au doigt, le survol devient un appui.
   */
  hover?: {
    /** Indices des couches de `layers` qui réagissent au survol. */
    layers: number[];
    /**
     * Lignes de l'infobulle. `field` nomme une propriété de l'entité ; la
     * ligne disparaît si elle est absente, ce qui évite les « undefined ».
     */
    rows: Array<{
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
       * points ne se lit pas comme deux chiffres : la forme de la courbe dit
       * ce qu'un « +89,8 % » laisse deviner.
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
    }>;
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
