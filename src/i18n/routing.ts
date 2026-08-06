import { defineRouting } from "next-intl/routing";

/**
 * Configuration centrale du routage bilingue.
 *
 * `localePrefix: "always"` garantit que chaque URL porte sa langue :
 *   /fr/portfolio  et  /en/portfolio
 * C'est ce qui permet à Google d'indexer les deux versions séparément
 * et de servir les balises hreflang correctes.
 *
 * Le français est la langue par défaut (marché visé : Québec / Montréal).
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
