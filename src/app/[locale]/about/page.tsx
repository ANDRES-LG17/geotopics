import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import { PersonJsonLd } from "@/components/JsonLd";
import { toolbox } from "@/data/toolbox";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return createPageMetadata({
    locale,
    path: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const TOOL_KEYS = ["gis", "cad", "dev", "web"] as const;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");

  const elsewhere = [
    { label: "LinkedIn", href: siteConfig.social.linkedin },
    { label: "GitHub", href: siteConfig.social.github },
    { label: "ArcGIS Online", href: siteConfig.social.arcgis },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <Container className="py-16 sm:py-20">
      <PersonJsonLd jobTitle={t("role")} />

      <div className="max-w-2xl">
        <SectionHeading as="h1" title={t("heading")} />
        <p className="mt-3 text-lg font-medium text-brand">{t("role")}</p>

        <div className="mt-8 space-y-5 text-lg leading-relaxed text-fg-muted">
          <p>{t("bio1")}</p>
          <p>{t("bio2")}</p>
          <p>{t("bio3")}</p>
        </div>

        {/* LinkedIn tient lieu de CV : un seul endroit à tenir à jour,
            et aucun PDF personnel qui traîne sur le web. */}
        {siteConfig.social.linkedin && (
          <a
            href={siteConfig.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z" />
            </svg>
            {t("linkedinCta")}
          </a>
        )}
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.toolbox")}
        </h2>
        <p className="mt-2 text-fg-muted">{t("toolboxNote")}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {TOOL_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-surface-raised p-6"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
                {t(`toolGroups.${key}`)}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {toolbox[key].map((tool) => (
                  <li
                    key={tool}
                    className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-xs text-fg-muted"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.languages")}
        </h2>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {(["french", "english", "spanish"] as const).map((lang) => (
            <div
              key={lang}
              className="rounded-xl border border-line bg-surface-raised p-5"
            >
              <dt className="font-semibold text-fg">
                {t(`languageLevels.${lang}`)}
              </dt>
              <dd className="mt-1 text-sm text-fg-muted">
                {t(`languageLevels.${lang}Level`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20 max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.elsewhere")}
        </h2>

        <ul className="mt-6 flex flex-wrap gap-3">
          {elsewhere.map(({ label, href }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg border border-line px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:border-brand/50 hover:text-brand"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-fg-muted">
          {t("writeMe")}{" "}
          <a
            href={`mailto:${siteConfig.email}`}
            className="font-medium text-brand hover:underline"
          >
            {siteConfig.email}
          </a>
        </p>
      </section>
    </Container>
  );
}
