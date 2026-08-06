import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import type { Locale } from "@/i18n/routing";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/**
 * Convention de nommage des fichiers : `<slug>.<langue>.md`
 *   content/blog/interoperabilite-cao-sig.fr.md
 *   content/blog/interoperabilite-cao-sig.en.md
 *
 * Le slug reste identique dans les deux langues : c'est ce qui permet au
 * sélecteur de langue de basculer d'un article à sa traduction sans se perdre.
 */
const FILENAME_RE = /^(.+)\.(fr|en)\.md$/;

export type PostMeta = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  /** Format ISO : « 2026-02-14 ». */
  date: string;
  tags: string[];
  readingMinutes: number;
};

export type Post = PostMeta & {
  /** HTML déjà rendu depuis le markdown. */
  contentHtml: string;
};

type FrontMatter = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
};

/** Estimation de lecture : ~200 mots/minute, minimum 1 minute. */
function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function listFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR).filter((f) => FILENAME_RE.test(f));
}

function parseFile(filename: string): { meta: PostMeta; body: string } | null {
  const match = filename.match(FILENAME_RE);
  if (!match) return null;

  const [, slug, locale] = match;
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const front = data as FrontMatter;

  return {
    meta: {
      slug,
      locale: locale as Locale,
      title: front.title ?? slug,
      description: front.description ?? "",
      date: front.date ?? "1970-01-01",
      tags: front.tags ?? [],
      readingMinutes: readingMinutes(content),
    },
    body: content,
  };
}

/** Tous les articles d'une langue, du plus récent au plus ancien. */
export function getPostsByLocale(locale: Locale): PostMeta[] {
  return listFiles()
    .map(parseFile)
    .filter((p): p is { meta: PostMeta; body: string } => p !== null)
    .filter((p) => p.meta.locale === locale)
    .map((p) => p.meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Tous les couples (slug, langue) — sert à `generateStaticParams`. */
export function getAllPostParams(): { locale: Locale; slug: string }[] {
  return listFiles()
    .map(parseFile)
    .filter((p): p is { meta: PostMeta; body: string } => p !== null)
    .map(({ meta }) => ({ locale: meta.locale, slug: meta.slug }));
}

/** Un article complet, markdown converti en HTML. `null` s'il n'existe pas. */
export async function getPost(
  locale: Locale,
  slug: string,
): Promise<Post | null> {
  const parsed = parseFile(`${slug}.${locale}.md`);
  if (!parsed) return null;

  const processed = await remark().use(remarkHtml).process(parsed.body);

  return { ...parsed.meta, contentHtml: processed.toString() };
}

/** Date localisée, ex. « 14 février 2026 » / « February 14, 2026 ». */
export function formatDate(date: string, locale: Locale): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );
}
