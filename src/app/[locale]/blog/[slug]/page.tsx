import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import { getPost, getAllPostParams, formatDate } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

/** Génère au build une page par article et par langue. */
export function generateStaticParams() {
  return getAllPostParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);

  if (!post) return { title: "404" };

  return {
    ...createPageMetadata({
      locale,
      path: `/blog/${slug}`,
      title: post.title,
      description: post.description,
    }),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [siteConfig.author],
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations("blog");

  return (
    <Container className="py-16 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-brand"
        >
          <span aria-hidden="true">←</span>
          {t("backToBlog")}
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
            <span aria-hidden="true">·</span>
            <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
          </div>

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
            {post.title}
          </h1>

          {post.description && (
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              {post.description}
            </p>
          )}
        </header>

        {/* Le HTML provient de nos propres fichiers markdown, versionnés
            dans le dépôt — il n'y a pas d'entrée utilisateur ici. */}
        <div
          className="prose-article mt-10"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {post.tags.length > 0 && (
          <ul className="mt-12 flex flex-wrap gap-1.5 border-t border-line pt-6">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-fg-subtle"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </article>
    </Container>
  );
}
