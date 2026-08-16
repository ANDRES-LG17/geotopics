import type { Locale } from "@/i18n/routing";
import type { LabId } from "@/labs";

/**
 * Types et utilitaires du carnet — SANS accès au système de fichiers.
 *
 * Pourquoi ce fichier existe séparément de `content.ts` : les composants
 * clients (la liste filtrable, les cartes) ont besoin des types et des
 * catégories, mais importer `content.ts` ferait entrer `node:fs` dans le
 * bundle du navigateur, ce qui casse le build.
 *
 *   Client  →  entries.ts   (types, catégories, formatage)
 *   Serveur →  content.ts   (lecture des fichiers markdown)
 */

/** Les familles de travaux présentées sur le site. */
export const CATEGORIES = ["storymap", "gis", "cad", "web", "lab"] as const;
export type Category = (typeof CATEGORIES)[number];

export type EntryMeta = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  /** Format ISO : « 2026-02-14 ». */
  date: string;
  category: Category;
  /** Logiciels et langages mis en œuvre. */
  tools: string[];
  /**
   * URL publique d'une Story Map ArcGIS, intégrée dans l'article.
   * `null` tant que la story n'est pas publiée : l'espace affiche alors
   * un état d'attente propre au lieu d'un cadre vide.
   */
  storyMapUrl: string | null;
  /**
   * Identifiant d'une carte interactive de `src/labs/`, affichée sous
   * l'introduction. `null` quand l'entrée n'en porte pas.
   *
   * Indépendant de `category` : une entrée « SIG » peut très bien porter une
   * carte, la catégorie dit de quoi parle le travail, pas ce qu'il embarque.
   */
  lab: LabId | null;
  /**
   * Visuel de couverture, affiché en fond de la diapositive du carrousel.
   * `null` quand l'entrée n'en porte pas : le carrousel retombe alors sur le
   * dégradé de sa famille de travaux, qui reste un fond acceptable.
   *
   * Chemin servi depuis `public/` — « /covers/bassin-versant.jpg ». Une image
   * fixe, un GIF animé ou une vidéo : le type est déduit de l'extension, voir
   * `coverKind`.
   */
  cover: string | null;
  /**
   * Brouillon : visible en développement, absent du site publié — ni page, ni
   * liste, ni flux, ni sitemap. Sert à préparer une entrée, et à garder un
   * gabarit de travail dans le dépôt sans le publier.
   */
  draft: boolean;
  readingMinutes: number;
};

export type Entry = EntryMeta & {
  /** HTML déjà rendu depuis le markdown. */
  contentHtml: string;
};

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

/**
 * Nature d'un visuel de couverture, déduite de son extension.
 *
 * Déduite plutôt que déclarée : un deuxième champ à tenir dans l'en-tête,
 * qu'on oublierait de corriger en changeant de fichier, pour une information
 * que le nom porte déjà.
 *
 * Un GIF est renvoyé comme `image` : il s'affiche dans une balise `<img>` et
 * s'anime tout seul. La distinction utile n'est pas fixe/animé mais quel
 * élément HTML sait le lire.
 */
export function coverKind(cover: string): "image" | "video" {
  return /\.(mp4|webm|mov|m4v)$/i.test(cover) ? "video" : "image";
}

/** Date localisée, ex. « 14 février 2026 » / « February 14, 2026 ». */
export function formatDate(date: string, locale: Locale): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );
}
