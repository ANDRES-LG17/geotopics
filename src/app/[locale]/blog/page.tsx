import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import EntryList from "@/components/EntryList";
import { BlogJsonLd } from "@/components/JsonLd";
import { getEntriesByLocale } from "@/lib/content";
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
  const entries = getEntriesByLocale(locale);

  return (
    <Container className="py-16 sm:py-20">
      <BlogJsonLd
        locale={locale}
        name={t("heading")}
        description={t("metaDescription")}
      />
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />
      <EntryList entries={entries} locale={locale} />
    </Container>
  );
}
