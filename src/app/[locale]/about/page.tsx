import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import { experience, education, skills, type TimelineEntry } from "@/data/cv";
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

const SKILL_KEYS = ["gis", "cad", "dev", "web"] as const;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");

  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-3xl">
        <SectionHeading as="h1" title={t("heading")} />
        <p className="mt-3 text-lg font-medium text-brand">{t("role")}</p>

        <div className="mt-8 space-y-5 text-lg leading-relaxed text-fg-muted">
          <p>{t("bio1")}</p>
          <p>{t("bio2")}</p>
          <p>{t("bio3")}</p>
        </div>

        {siteConfig.social.linkedin && (
          <a
            href={siteConfig.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            {t("linkedinCta")}
          </a>
        )}
      </div>

      {/* Compétences techniques */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.skills")}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {SKILL_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-surface-raised p-6"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
                {t(`skillGroups.${key}`)}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills[key].map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-xs text-fg-muted"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Expérience */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.experience")}
        </h2>
        <Timeline entries={experience} locale={locale} present={t("present")} />
      </section>

      {/* Formation */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t("sections.education")}
        </h2>
        <Timeline entries={education} locale={locale} present={t("present")} />
      </section>

      {/* Langues */}
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
    </Container>
  );
}

/** Frise verticale partagée par l'expérience et la formation. */
function Timeline({
  entries,
  locale,
  present,
}: {
  entries: TimelineEntry[];
  locale: Locale;
  present: string;
}) {
  return (
    <ol className="mt-8 space-y-10">
      {entries.map((entry, index) => (
        <li
          key={`${entry.organization}-${index}`}
          className="relative border-l-2 border-line pl-6"
        >
          {/* Pastille sur la ligne verticale */}
          <span
            className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-brand"
            aria-hidden="true"
          />

          <p className="font-mono text-xs text-fg-subtle">
            {entry.start} — {entry.end ?? present}
          </p>
          <h3 className="mt-1.5 text-lg font-bold tracking-tight text-fg">
            {entry.role[locale]}
          </h3>
          <p className="text-sm text-fg-muted">
            {entry.organization} · {entry.location}
          </p>

          <ul className="mt-3 space-y-1.5">
            {entry.highlights.map((highlight, i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-relaxed text-fg-muted before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-brand"
              >
                {highlight[locale]}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
