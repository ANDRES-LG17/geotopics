import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import StoryMapEmbed from "@/components/StoryMapEmbed";
import ShareOnLinkedIn from "@/components/ShareOnLinkedIn";
import { getEntry, getAllEntryParams } from "@/lib/content";
import { formatDate } from "@/lib/entries";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

/** Génère au build une page par entrée et par langue. */
export function generateStaticParams() {
  return getAllEntryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = await getEntry(locale, slug);

  if (!entry) return { title: "404" };

  const base = createPageMetadata({
    locale,
    path: `/blog/${slug}`,
    title: entry.title,
    description: entry.description,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: entry.date,
      authors: [siteConfig.author],
      tags: entry.tools,
    },
  };
}

export default async function EntryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const entry = await getEntry(locale, slug);
  if (!entry) notFound();

  const t = await getTranslations("entry");
  const shareUrl = `${siteConfig.url}/${locale}/blog/${slug}`;

  return (
    <Container className="py-16 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-brand"
        >
          <span aria-hidden="true">←</span>
          {t("backToList")}
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold uppercase tracking-wide text-brand-ink">
              {t(`filters.${entry.category}`)}
            </span>
            <time dateTime={entry.date} className="text-fg-subtle">
              {formatDate(entry.date, locale)}
            </time>
            <span aria-hidden="true" className="text-fg-subtle">
              ·
            </span>
            <span className="text-fg-subtle">
              {t("readingTime", { minutes: entry.readingMinutes })}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
            {entry.title}
          </h1>

          {entry.description && (
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              {entry.description}
            </p>
          )}
        </header>

        {/* Une entrée « Story Map » porte sa carte juste sous l'introduction :
            c'est le sujet de l'article, elle doit venir avant le texte long. */}
        {entry.category === "storymap" && (
          <div className="mt-10">
            <StoryMapEmbed embedUrl={entry.storyMapUrl} title={entry.title} />
          </div>
        )}

        {/* Le HTML provient de nos propres fichiers markdown, versionnés dans
            le dépôt — il n'y a aucune entrée utilisateur ici. */}
        <div
          className="prose-article mt-10"
          dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
        />

        <footer className="mt-12 border-t border-line pt-6">
          {entry.tools.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {t("toolsUsed")}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {entry.tools.map((tool) => (
                  <li
                    key={tool}
                    className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-fg-subtle"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-8">
            <ShareOnLinkedIn url={shareUrl} />
          </div>
        </footer>
      </article>
    </Container>
  );
}
