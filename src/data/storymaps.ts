import type { Locale } from "@/i18n/routing";

type Localized = Record<Locale, string>;

export type StoryMap = {
  slug: string;
  year: string;
  title: Localized;
  summary: Localized;
  /**
   * URL d'intégration de la Story Map ArcGIS.
   * Format attendu : https://storymaps.arcgis.com/stories/<identifiant>
   *
   * Tant que la valeur vaut `null`, la carte affiche un état
   * « bientôt disponible » propre plutôt qu'un cadre vide.
   */
  embedUrl: string | null;
  /** Vignette optionnelle dans /public/storymaps/. */
  image?: string;
};

/* ============================================================================
   ⚠️ À COMPLÉTER — collez ici l'URL de vos Story Maps publiées.

   Comment récupérer l'URL :
   1. Ouvrez votre story sur storymaps.arcgis.com
   2. Publiez-la en accès « Tout le monde (public) »
   3. Copiez l'URL de la barre d'adresse dans `embedUrl`

   Sans URL publique, l'iframe restera vide : la story DOIT être publique.
   ============================================================================ */
export const storyMaps: StoryMap[] = [
  {
    slug: "hydrographie-bassin-versant",
    year: "2025",
    title: {
      fr: "Lire un bassin versant",
      en: "Reading a watershed",
    },
    summary: {
      fr: "Comment la topographie commande l'écoulement de l'eau, et ce que cela implique pour l'aménagement du territoire.",
      en: "How topography drives water flow, and what that means for land-use planning.",
    },
    embedUrl: null,
  },
  {
    slug: "etalement-urbain",
    year: "2025",
    title: {
      fr: "Trente ans d'étalement urbain",
      en: "Thirty years of urban sprawl",
    },
    summary: {
      fr: "Analyse diachronique de l'occupation du sol à partir d'imagerie satellitaire et de données cadastrales.",
      en: "Diachronic land-cover analysis based on satellite imagery and cadastral data.",
    },
    embedUrl: null,
  },
  {
    slug: "infrastructure-souterraine",
    year: "2024",
    title: {
      fr: "Ce qu'il y a sous la rue",
      en: "What lies beneath the street",
    },
    summary: {
      fr: "Cartographier les réseaux souterrains : des plans CAO d'archive à un modèle géospatial exploitable.",
      en: "Mapping underground utilities: from archived CAD drawings to a usable geospatial model.",
    },
    embedUrl: null,
  },
];
