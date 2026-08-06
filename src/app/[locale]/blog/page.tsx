import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import { getPostsByLocale, formatDate } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return createPageMetadata({
    locale,
    path: "/blog",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("blog");
  const posts = getPostsByLocale(locale);

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />

      {posts.length === 0 ? (
        <p className="mt-12 text-fg-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-12 space-y-8">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="border-b border-line pb-8 last:border-0"
            >
              <article>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  <time dateTime={post.date}>
                    {formatDate(post.date, locale)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
                </div>

                <h2 className="mt-2 text-2xl font-bold leading-snug tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-fg transition-colors hover:text-brand"
                  >
                    {post.title}
                  </Link>
                </h2>

                <p className="mt-2.5 max-w-2xl leading-relaxed text-fg-muted">
                  {post.description}
                </p>

                {post.tags.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
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
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
