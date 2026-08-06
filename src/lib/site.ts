/**
 * Configuration globale du site.
 *
 * ⚠️ À PERSONNALISER : remplacez les valeurs marquées TODO par les vôtres.
 */
export const siteConfig = {
  name: "GeoTopics",
  author: "Andrés Lozada",

  /**
   * URL canonique de production. Utilisée pour les balises hreflang,
   * le sitemap et les métadonnées Open Graph.
   * Sur Vercel, définissez NEXT_PUBLIC_SITE_URL dans les variables
   * d'environnement une fois votre domaine final connu.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://geotopics.vercel.app",

  email: "inczoand@gmail.com",

  /**
   * LinkedIn tient lieu de CV : c'est le profil professionnel canonique,
   * tenu à jour à un seul endroit. Aucun PDF n'est hébergé sur ce site.
   */
  social: {
    // TODO : remplacez par vos vraies URL (ou mettez `null` pour masquer le lien).
    linkedin: "https://www.linkedin.com/in/andres-lozada/",
    github: "https://github.com/andreslozada" as string | null,
    arcgis: null as string | null,
  },
} as const;
