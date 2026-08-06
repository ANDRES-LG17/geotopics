import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

/**
 * Construit les balises `alternates` d'une page : URL canonique + hreflang.
 *
 * C'est le cœur du SEO bilingue. Google a besoin de savoir que
 * /fr/portfolio et /en/portfolio sont deux versions de la MÊME page,
 * sinon il les traite comme du contenu dupliqué.
 *
 * @param locale Langue de la page courante
 * @param path   Chemin sans préfixe de langue, ex. "/portfolio" ou "/"
 */
export function buildAlternates(locale: Locale, path: string) {
  const suffix = path === "/" ? "" : path;

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${siteConfig.url}/${l}${suffix}`]),
  ) as Record<Locale, string>;

  return {
    canonical: `${siteConfig.url}/${locale}${suffix}`,
    languages: {
      ...languages,
      // Version servie aux visiteurs dont la langue ne correspond à aucune des nôtres.
      "x-default": `${siteConfig.url}/${routing.defaultLocale}${suffix}`,
    },
  };
}

type PageMetaInput = {
  locale: Locale;
  path: string;
  title: string;
  description: string;
};

/**
 * Métadonnées complètes d'une page : titre, description, hreflang,
 * Open Graph (LinkedIn, Facebook) et Twitter Card.
 */
export function createPageMetadata({
  locale,
  path,
  title,
  description,
}: PageMetaInput): Metadata {
  const alternates = buildAlternates(locale, path);

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: `${title} · ${siteConfig.name}`,
      description,
      url: alternates.canonical,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      alternateLocale: locale === "fr" ? "en_CA" : "fr_CA",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${siteConfig.name}`,
      description,
    },
  };
}
