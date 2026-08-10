import type { LabDefinition } from "./types";
import demoIsochrones from "./demo-isochrones";

/**
 * Registre des labs — les cartes interactives que le carnet sait afficher.
 *
 * Une entrée du carnet appelle un lab par son identifiant, dans son
 * front matter :
 *
 *     lab: "demo-isochrones"
 *
 * Ajouter un lab = un fichier dans `src/labs/`, une ligne ici. Le type de
 * `LAB_IDS` s'élargit tout seul, et `isLabId` accepte le nouveau nom : rien
 * d'autre à brancher.
 *
 * Un lab n'est PAS une page. Il vit à l'intérieur d'une entrée, sous
 * l'introduction, à la place qu'occupe une Story Map dans une entrée
 * « storymap ». C'est la règle du carnet : un projet est une entrée, jamais un
 * second site à côté du premier.
 */
export const LABS = {
  "demo-isochrones": demoIsochrones,
} as const satisfies Record<string, LabDefinition>;

export type LabId = keyof typeof LABS;

export function isLabId(value: unknown): value is LabId {
  return typeof value === "string" && value in LABS;
}

export function getLab(id: LabId): LabDefinition {
  return LABS[id];
}

export type { LabDefinition, LabLayer, LabColor, LabView, Bilingual } from "./types";
