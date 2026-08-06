import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import EntryCard from "@/components/EntryCard";
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
    <Container className="py-16 sm:py-24">
      {/* Présentation : qui écrit et pourquoi. Pas de promesse commerciale. */}
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {t("greeting")}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-fg-muted">{t("lead")}</p>
        <p className="mt-4 text-sm text-fg-subtle">{t("note")}</p>
      </section>

      {latest.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            {t("latest")}
          </h2>

          <div className="mt-8 space-y-8">
            {latest.map((entry) => (
              <EntryCard key={entry.slug} entry={entry} locale={locale} />
            ))}
          </div>

          {entries.length > LATEST_COUNT && (
            <Link
              href="/blog"
              className="mt-10 inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
            >
              {t("viewAll")}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      )}
    </Container>
  );
}
