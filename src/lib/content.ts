import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import type { Locale } from "@/i18n/routing";
import { isLabId } from "@/labs";
import { isCategory, type Entry, type EntryMeta } from "./entries";

/**
 * Lecture du carnet depuis le disque. **Serveur uniquement** — l'import
 * `server-only` en tête fait échouer le build tout de suite si un composant
 * client tente d'importer ce fichier, au lieu de laisser Turbopack produire
 * une erreur obscure sur `node:fs`.
 *
 * Les types et les catégories vivent dans `entries.ts`, qui lui est
 * importable des deux côtés.
 *
 * Un seul flux de contenu : un projet N'EST PAS un objet différent d'un
 * article, c'est un article qui parle d'un projet. Story Map, analyse SIG,
 * plan CAO ou carte web — tout vit dans `content/entries/` sous la même
 * forme et ne se distingue que par le champ `category`.
 *
 * Convention de nommage : `<slug>.<langue>.md`
 *   content/entries/lire-un-bassin-versant.fr.md
 *   content/entries/lire-un-bassin-versant.en.md
 *
 * Le slug reste identique dans les deux langues : c'est ce qui permet au
 * sélecteur FR/EN de basculer vers la traduction de la même entrée.
 */
const ENTRIES_DIR = path.join(process.cwd(), "content", "entries");
const FILENAME_RE = /^(.+)\.(fr|en)\.md$/;

/**
 * Les brouillons ne sortent pas du développement. Un seul interrupteur, pour
 * que la règle reste facile à tenir en tête : en production, une entrée
 * `draft: true` n'existe pas — aucune page, aucun lien, aucune URL devinable.
 */
const SHOW_DRAFTS = process.env.NODE_ENV !== "production";

type FrontMatter = {
  title?: string;
  description?: string;
  date?: string;
  category?: string;
  tools?: string[];
  storyMapUrl?: string | null;
  lab?: string | null;
  cover?: string | null;
  draft?: boolean;
};

/** Estimation de lecture : ~200 mots/minute, minimum 1 minute. */
function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function listFiles(): string[] {
  if (!fs.existsSync(ENTRIES_DIR)) return [];
  return fs.readdirSync(ENTRIES_DIR).filter((f) => FILENAME_RE.test(f));
}

function parseFile(filename: string): { meta: EntryMeta; body: string } | null {
  const match = filename.match(FILENAME_RE);
  if (!match) return null;

  const [, slug, locale] = match;
  const raw = fs.readFileSync(path.join(ENTRIES_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const front = data as FrontMatter;

  // Un lab inconnu ne casse pas le build — même parti pris que pour les
  // catégories — mais il se signale : une carte qui disparaît en silence à
  // cause d'une faute de frappe est bien pire qu'un avertissement.
  if (front.lab && !isLabId(front.lab)) {
    console.warn(
      `[contenu] ${filename} : lab « ${front.lab} » introuvable dans src/labs/.`,
    );
  }

  return {
    meta: {
      slug,
      locale: locale as Locale,
      title: front.title ?? slug,
      description: front.description ?? "",
      date: front.date ?? "1970-01-01",
      // Une catégorie inconnue retombe sur « gis » plutôt que de casser le build.
      category: isCategory(front.category) ? front.category : "gis",
      tools: front.tools ?? [],
      storyMapUrl: front.storyMapUrl ?? null,
      lab: isLabId(front.lab) ? front.lab : null,
      cover: front.cover ?? null,
      draft: front.draft === true,
      readingMinutes: readingMinutes(content),
    },
    body: content,
  };
}

function allParsed() {
  return listFiles()
    .map(parseFile)
    .filter((p): p is { meta: EntryMeta; body: string } => p !== null)
    .filter((p) => SHOW_DRAFTS || !p.meta.draft);
}

/** Toutes les entrées d'une langue, de la plus récente à la plus ancienne. */
export function getEntriesByLocale(locale: Locale): EntryMeta[] {
  return allParsed()
    .filter((p) => p.meta.locale === locale)
    .map((p) => p.meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Tous les couples (slug, langue) — sert à `generateStaticParams`. */
export function getAllEntryParams(): { locale: Locale; slug: string }[] {
  return allParsed().map(({ meta }) => ({
    locale: meta.locale,
    slug: meta.slug,
  }));
}

/** Une entrée complète, markdown converti en HTML. `null` si elle n'existe pas. */
export async function getEntry(
  locale: Locale,
  slug: string,
): Promise<Entry | null> {
  const parsed = parseFile(`${slug}.${locale}.md`);
  if (!parsed) return null;
  // Deuxième garde, indispensable : `generateStaticParams` ne fabrique pas la
  // page d'un brouillon, mais une URL devinée serait rendue à la demande.
  if (parsed.meta.draft && !SHOW_DRAFTS) return null;

  const processed = await remark().use(remarkHtml).process(parsed.body);

  return { ...parsed.meta, contentHtml: processed.toString() };
}
