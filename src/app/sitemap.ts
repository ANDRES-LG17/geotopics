import type { MetadataRoute } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { getEntriesByLocale } from "@/lib/content";

/** Pages fixes du site (chemin sans préfixe de langue). */
const STATIC_PATHS = [
  { path: "", priority: 1.0 },
  { path: "/blog", priority: 0.9 },
  { path: "/about", priority: 0.7 },
];

function urlFor(locale: Locale, path: string) {
  return `${siteConfig.url}/${locale}${path}`;
}

/** Bloc `alternates` : déclare les deux versions linguistiques d'une URL. */
function alternatesFor(path: string) {
  return {
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, urlFor(l, path)])),
      // Recommandé par Google : version servie quand aucune langue ne correspond.
      "x-default": urlFor(routing.defaultLocale, path),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const { path, priority } of STATIC_PATHS) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency: "weekly",
        priority,
        alternates: alternatesFor(path),
      });
    }

    for (const entry of getEntriesByLocale(locale)) {
      const path = `/blog/${entry.slug}`;
      entries.push({
        url: urlFor(locale, path),
        lastModified: new Date(`${entry.date}T00:00:00Z`),
        changeFrequency: "yearly",
        priority: 0.8,
        alternates: alternatesFor(path),
      });
    }
  }

  return entries;
}
