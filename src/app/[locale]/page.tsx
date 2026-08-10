import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import EntryCard from "@/components/EntryCard";
import Opening from "@/components/Opening";
import Reveal from "@/components/Reveal";
import { getEntriesByLocale } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

/** Nombre d'entrées mises en avant sur l'accueil avant le lien « tout voir ». */
const LATEST_COUNT = 4;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return createPageMetadata({
    locale,
    path: "/",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const entries = getEntriesByLocale(locale);
  const latest = entries.slice(0, LATEST_COUNT);

  return (
    <>
      <Opening />

      {latest.length > 0 && (
        <Container className="py-20 sm:py-28">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {t("latest")}
          </h2>

          <div className="mt-10 space-y-10">
            {latest.map((entry, i) => (
              // Cascade légère : chaque entrée arrive juste après la précédente.
              <Reveal key={entry.slug} delay={i * 90}>
                <EntryCard entry={entry} locale={locale} />
              </Reveal>
            ))}
          </div>

          {entries.length > LATEST_COUNT && (
            <Reveal>
              <Link
                href="/blog"
                className="mt-12 inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
              >
                {t("viewAll")}
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          )}
        </Container>
      )}
    </>
  );
}
