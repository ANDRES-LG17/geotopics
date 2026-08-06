import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";
import HeroSection from "@/components/HeroSection";
import ProjectCard from "@/components/ProjectCard";
import SectionHeading from "@/components/SectionHeading";
import { featuredProjects } from "@/data/projects";
import { storyMaps } from "@/data/storymaps";
import { projects } from "@/data/projects";
import { skills } from "@/data/cv";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

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

/** Icônes des quatre domaines d'expertise. */
const EXPERTISE_ICONS: Record<string, React.ReactNode> = {
  gis: <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zm0 0v15m6-12v15" />,
  cad: <path d="M4 20h16M6 20V8l6-4 6 4v12M10 20v-6h4v6" />,
  web: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9zM3.5 9h17M3.5 15h17" />,
  story: <path d="M4 5h16v11H8l-4 4V5zm4 4h8M8 12h5" />,
};

const EXPERTISE_KEYS = ["gis", "cad", "web", "story"] as const;

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  // Statistiques calculées depuis les données réelles : elles restent
  // exactes automatiquement quand vous ajoutez un projet ou une story.
  const toolCount = new Set(Object.values(skills).flat()).size;
  const stats = [
    { value: `${projects.length}`, label: t("stats.projects") },
    { value: `${storyMaps.length}`, label: t("stats.storymaps") },
    { value: `${toolCount}`, label: t("stats.tools") },
    { value: "3", label: t("stats.languages") },
  ];

  return (
    <>
      <HeroSection />

      {/* Bandeau de chiffres clés */}
      <section className="border-b border-line bg-surface-muted">
        <Container>
          <dl className="grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-3xl font-bold tracking-tight text-brand">
                    {value}
                  </span>
                  <span className="mt-1 block text-sm text-fg-muted">
                    {label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Domaines d'expertise */}
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            title={t("expertise.heading")}
            subtitle={t("expertise.subtitle")}
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {EXPERTISE_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-line bg-surface-raised p-6"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5.5 w-5.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {EXPERTISE_ICONS[key]}
                  </svg>
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-fg">
                  {t(`expertise.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {t(`expertise.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Projets en vedette */}
      <section className="border-t border-line bg-surface-muted py-20 sm:py-24">
        <Container>
          <SectionHeading
            title={t("featured.heading")}
            subtitle={t("featured.subtitle")}
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                locale={locale}
              />
            ))}
          </div>

          <Link
            href="/portfolio"
            className="mt-10 inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
          >
            {t("featured.viewAll")}
            <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </section>

      {/* Appel à l'action final */}
      <section className="relative overflow-hidden bg-[#071620] text-white">
        <div className="topo-pattern absolute inset-0" aria-hidden="true" />
        <Container className="relative py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("cta.heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            {t("cta.body")}
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand px-7 py-3.5 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            {t("cta.button")}
          </Link>
        </Container>
      </section>
    </>
  );
}
