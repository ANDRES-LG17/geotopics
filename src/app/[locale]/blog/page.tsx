import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import EntryFilters, {
  CATEGORY_PARAM,
  SEARCH_PARAM,
} from "@/components/EntryFilters";
import EntryGrid from "@/components/EntryGrid";
import FiltersAutoSubmit from "@/components/FiltersAutoSubmit";
import { BlogJsonLd } from "@/components/JsonLd";
import { getEntriesByLocale } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import {
  filterEntries,
  readCategories,
  readSearch,
  type SearchParams,
} from "@/lib/entry-query";
import type { Locale } from "@/i18n/routing";

/**
 * Le carnet : toutes les entrées, filtrables par famille de travaux et par
 * recherche libre.
 *
 * L'état de la vue vit dans l'URL — `?category=gis&q=python` — et nulle part
 * ailleurs. La page est donc rendue sur le serveur à chaque combinaison, ce
 * qui la rend partageable, indexable, et utilisable sans JavaScript. Le seul
 * script de la page ne fait qu'éviter un clic sur « Filtrer » ; il n'y a pas
 * de second chemin de filtrage côté client.
 */

type Props = {
  params: Promise<{ locale: Locale }>;
  // `searchParams` est une Promise depuis Next.js 15.
  searchParams: Promise<SearchParams>;
};

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

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const t = await getTranslations("blog");
  const tf = await getTranslations("filters");

  const entries = getEntriesByLocale(locale);
  const categories = readCategories(query, CATEGORY_PARAM);
  const search = readSearch(query, SEARCH_PARAM);

  const visible = filterEntries(entries, categories, search);

  return (
    <Container className="py-16 sm:py-20">
      <BlogJsonLd
        locale={locale}
        name={t("heading")}
        description={t("metaDescription")}
      />
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />

      <EntryFilters entries={entries} selected={categories} search={search} />
      <FiltersAutoSubmit />

      {/* `aria-live` fait annoncer le nouveau total après un filtrage, sans
          quoi le changement passerait inaperçu pour qui n'a pas la grille sous
          les yeux. */}
      <div className="mt-8 border-t border-line pt-5">
        <p aria-live="polite" className="text-sm text-fg-muted">
          {tf("results", { count: visible.length })}
        </p>
      </div>

      <EntryGrid entries={visible} locale={locale} />
    </Container>
  );
}
