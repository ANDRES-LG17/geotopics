import { siteConfig } from "@/lib/site";
import type { EntryMeta } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

/**
 * Données structurées schema.org.
 *
 * Ce que ça change en pratique : LinkedIn et Google ne lisent pas la mise en
 * page, ils lisent les métadonnées. Le JSON-LD leur dit explicitement « ceci
 * est un article, écrit par cette personne, publié à cette date » plutôt que
 * de les laisser le deviner à partir du HTML.
 *
 * `dangerouslySetInnerHTML` est ici la façon normale d'injecter du JSON-LD :
 * le contenu vient de nos propres données, jamais d'une saisie extérieure.
 */
function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Identité de l'auteur, réutilisée par les autres schémas. */
function person() {
  return {
    "@type": "Person",
    name: siteConfig.author,
    email: siteConfig.email,
    url: `${siteConfig.url}`,
    sameAs: [
      siteConfig.social.linkedin,
      siteConfig.social.github,
      siteConfig.social.arcgis,
    ].filter(Boolean),
  };
}

/** À poser sur une page d'entrée. */
export function ArticleJsonLd({
  entry,
  locale,
}: {
  entry: EntryMeta;
  locale: Locale;
}) {
  const url = `${siteConfig.url}/${locale}/blog/${entry.slug}`;

  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: entry.title,
        description: entry.description,
        datePublished: entry.date,
        dateModified: entry.date,
        inLanguage: locale === "fr" ? "fr-CA" : "en-CA",
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: `${url}/opengraph-image`,
        keywords: entry.tools.join(", "),
        author: person(),
        publisher: person(),
      }}
    />
  );
}

/** À poser sur la page « À propos ». */
export function PersonJsonLd({ jobTitle }: { jobTitle: string }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        ...person(),
        jobTitle,
        knowsLanguage: ["fr-CA", "en-CA", "es"],
      }}
    />
  );
}

/** À poser sur l'index du carnet. */
export function BlogJsonLd({
  locale,
  name,
  description,
}: {
  locale: Locale;
  name: string;
  description: string;
}) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Blog",
        name,
        description,
        url: `${siteConfig.url}/${locale}/blog`,
        inLanguage: locale === "fr" ? "fr-CA" : "en-CA",
        author: person(),
      }}
    />
  );
}
