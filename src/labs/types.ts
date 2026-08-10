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

/** Une couche dessinée sur la carte. L'ordre du tableau est l'ordre de peinture. */
export type LabLayer =
  | {
      kind: "fill";
      /** Clé d'une entrée de `sources`. */
      source: string;
      color: LabColor;
      opacity?: number;
      outlineColor?: string;
    }
  | {
      kind: "line";
      source: string;
      color: LabColor;
      width?: number;
      opacity?: number;
      /** Motif de tirets, en multiples de la largeur du trait. */
      dash?: number[];
    }
  | {
      kind: "circle";
      source: string;
      color: LabColor;
      radius?: number;
      opacity?: number;
      strokeColor?: string;
      strokeWidth?: number;
    };

/** Cadrage initial : soit une emprise, soit un point et un niveau de zoom. */
export type LabView =
  | { /** `[ouest, sud, est, nord]` en degrés décimaux (WGS 84). */ bounds: [number, number, number, number] }
  | { center: [number, number]; zoom: number };

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
  | { kind: "style"; url: string; attribution?: Bilingual };

export type LabDefinition = {
  /** Identifiant stable, repris dans le champ `lab` d'une entrée. */
  id: string;
  /** Sources de données : clé → chemin public versionné, ex. `/data/x-v1.geojson`. */
  sources: Record<string, string>;
  layers: LabLayer[];
  view: LabView;
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
