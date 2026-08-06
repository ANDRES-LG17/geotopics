import type { Locale } from "@/i18n/routing";

type Localized = Record<Locale, string>;

export type TimelineEntry = {
  /** Ex. « 2023 » — `end` vaut null pour un poste en cours. */
  start: string;
  end: string | null;
  role: Localized;
  organization: string;
  location: string;
  /** Deux ou trois réalisations concrètes, avec chiffres si possible. */
  highlights: Localized[];
};

/* ============================================================================
   ⚠️ CONTENU D'EXEMPLE — REMPLACEZ PAR VOTRE PARCOURS RÉEL.
   Votre CV existant se trouve dans /public/cv/ : reprenez-en les entrées.
   Conseil recruteur québécois : commencez chaque puce par un verbe d'action
   et chiffrez le résultat (volume traité, temps gagné, précision atteinte).
   ============================================================================ */
export const experience: TimelineEntry[] = [
  {
    start: "2023",
    end: null,
    role: {
      fr: "Géomaticien — SIG et CAO",
      en: "Geomatics Specialist — GIS and CAD",
    },
    organization: "Nom de l'employeur",
    location: "Ville, Pays",
    highlights: [
      {
        fr: "Conception et maintenance de géodatabases pour des réseaux d'infrastructure municipaux.",
        en: "Design and maintenance of geodatabases for municipal infrastructure networks.",
      },
      {
        fr: "Automatisation des contrôles qualité en Python, réduisant le temps de validation de plusieurs jours à quelques minutes.",
        en: "Python automation of quality control, cutting validation time from days to minutes.",
      },
      {
        fr: "Production de plans techniques et de livrables cartographiques pour des équipes d'ingénierie.",
        en: "Production of technical drawings and cartographic deliverables for engineering teams.",
      },
    ],
  },
  {
    start: "2020",
    end: "2023",
    role: {
      fr: "Technicien en géomatique",
      en: "Geomatics Technician",
    },
    organization: "Nom de l'employeur",
    location: "Ville, Pays",
    highlights: [
      {
        fr: "Traitement de levés topographiques et production de modèles numériques de terrain.",
        en: "Processing of topographic surveys and production of digital terrain models.",
      },
      {
        fr: "Numérisation et structuration de plans CAO d'archive vers un environnement SIG.",
        en: "Digitization and structuring of archived CAD drawings into a GIS environment.",
      },
    ],
  },
];

export const education: TimelineEntry[] = [
  {
    start: "2016",
    end: "2020",
    role: {
      fr: "Diplôme en géomatique / génie topographique",
      en: "Degree in Geomatics / Surveying Engineering",
    },
    organization: "Nom de l'établissement",
    location: "Ville, Pays",
    highlights: [
      {
        fr: "Spécialisation en systèmes d'information géographique et télédétection.",
        en: "Specialization in geographic information systems and remote sensing.",
      },
    ],
  },
];

/** Groupes de compétences affichés sur la page « À propos ». */
export const skills: Record<"gis" | "cad" | "dev" | "web", string[]> = {
  gis: ["ArcGIS Pro", "QGIS", "PostGIS", "FME", "Spatial Analyst", "ArcPy"],
  cad: ["AutoCAD", "Civil 3D", "AutoCAD Map 3D", "MicroStation", "Topographie"],
  dev: ["Python", "SQL", "Git", "R", "GDAL/OGR"],
  web: ["ArcGIS Online", "Story Maps", "Leaflet", "Mapbox GL", "Next.js"],
};
