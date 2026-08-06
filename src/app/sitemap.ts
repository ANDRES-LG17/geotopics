import type { MetadataRoute } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { getPostsByLocale } from "@/lib/blog";

/** Pages fixes du site (chemin sans préfixe de langue). */
const STATIC_PATHS = [
  { path: "", priority: 1.0 },
  { path: "/portfolio", priority: 0.9 },
  { path: "/storymaps", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/blog", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
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
        changeFrequency: "monthly",
        priority,
        alternates: alternatesFor(path),
      });
    }

    for (const post of getPostsByLocale(locale)) {
      const path = `/blog/${post.slug}`;
      entries.push({
        url: urlFor(locale, path),
        lastModified: new Date(`${post.date}T00:00:00Z`),
        changeFrequency: "yearly",
        priority: 0.5,
        alternates: alternatesFor(path),
      });
    }
  }

  return entries;
}
