import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/data/projects";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portfolio" });

  return createPageMetadata({
    locale,
    path: "/portfolio",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function PortfolioPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("portfolio");

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />
      <ProjectGrid projects={projects} locale={locale} />
    </Container>
  );
}
