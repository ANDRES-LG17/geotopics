import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import StoryMapEmbed from "@/components/StoryMapEmbed";
import { storyMaps } from "@/data/storymaps";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "storymaps" });

  return createPageMetadata({
    locale,
    path: "/storymaps",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function StoryMapsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("storymaps");

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />

      <div className="mt-12 space-y-10">
        {storyMaps.map((story) => (
          <StoryMapEmbed
            key={story.slug}
            embedUrl={story.embedUrl}
            title={story.title[locale]}
            summary={story.summary[locale]}
            year={story.year}
          />
        ))}
      </div>
    </Container>
  );
}
