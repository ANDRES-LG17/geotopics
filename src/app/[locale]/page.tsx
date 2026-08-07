import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import EntryCard from "@/components/EntryCard";
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
      {/* Ouverture : on lui donne de la présence par l'échelle et le vide,
          pas par un argumentaire. Le motif topographique reste très en
          retrait — il situe le sujet sans décorer. */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="topo-pattern absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          aria-hidden="true"
        />
        <Container className="relative py-24 sm:py-36">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-6xl">
              {t("greeting")}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl">
              {t("lead")}
            </p>
            <p className="mt-6 text-sm text-fg-subtle">{t("note")}</p>
          </div>
        </Container>
      </section>

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
