import type { Locale } from "@/i18n/routing";

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

/** Les quatre familles de travaux présentées sur le site. */
export const CATEGORIES = ["storymap", "gis", "cad", "web"] as const;
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
  readingMinutes: number;
};

export type Entry = EntryMeta & {
  /** HTML déjà rendu depuis le markdown. */
  contentHtml: string;
};

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

/** Date localisée, ex. « 14 février 2026 » / « February 14, 2026 ». */
export function formatDate(date: string, locale: Locale): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );
}
