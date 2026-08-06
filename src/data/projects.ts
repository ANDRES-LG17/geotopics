import type { Locale } from "@/i18n/routing";

export type ProjectCategory = "gis" | "cad" | "web";

/** Texte traduit : une entrée par langue. */
type Localized = Record<Locale, string>;

export type Project = {
  slug: string;
  category: ProjectCategory;
  year: string;
  /** Affiché en vedette sur la page d'accueil. */
  featured: boolean;
  title: Localized;
  summary: Localized;
  /** Détail méthodologique, affiché dans la carte étendue du portfolio. */
  detail: Localized;
  tools: string[];
  /** Lien externe optionnel (Story Map, dépôt, démo en ligne). */
  href?: string;
  /** Image dans /public/projects/. Laissez vide pour un dégradé généré. */
  image?: string;
};

/* ============================================================================
   ⚠️ CONTENU D'EXEMPLE — À REMPLACER PAR VOS VRAIS PROJETS
   La structure est prête : dupliquez un bloc, changez les textes FR/EN,
   la catégorie, l'année et les outils. Rien d'autre à modifier ailleurs.
   ============================================================================ */
export const projects: Project[] = [
  {
    slug: "reseau-aqueduc-municipal",
    category: "gis",
    year: "2025",
    featured: true,
    title: {
      fr: "Géodatabase du réseau d'aqueduc municipal",
      en: "Municipal water network geodatabase",
    },
    summary: {
      fr: "Modélisation et migration d'un réseau d'aqueduc vers une géodatabase structurée, avec contrôle qualité automatisé.",
      en: "Modelling and migration of a water distribution network into a structured geodatabase, with automated quality control.",
    },
    detail: {
      fr: "Conception du modèle de données, migration depuis des plans CAO hétérogènes, mise en place de règles topologiques et de scripts Python de validation. Réduction des incohérences géométriques de plus de 90 % sur le jeu de données livré.",
      en: "Data model design, migration from heterogeneous CAD drawings, topology rules and Python validation scripts. Geometric inconsistencies reduced by over 90% in the delivered dataset.",
    },
    tools: ["ArcGIS Pro", "PostGIS", "Python", "FME"],
  },
  {
    slug: "leve-topographique-civil3d",
    category: "cad",
    year: "2025",
    featured: true,
    title: {
      fr: "Levé topographique et modèle numérique de terrain",
      en: "Topographic survey and digital terrain model",
    },
    summary: {
      fr: "Traitement d'un levé terrain complet et production du MNT et des plans d'ingénierie associés.",
      en: "Processing of a full field survey and production of the DTM and associated engineering drawings.",
    },
    detail: {
      fr: "Import des données de levé, construction de la surface, génération des courbes de niveau et des profils en long, puis mise en plan normalisée. Livrables compatibles à la fois avec la chaîne CAO et l'environnement SIG du client.",
      en: "Survey data import, surface construction, contour and longitudinal profile generation, then standardized sheet layout. Deliverables compatible with both the CAD chain and the client's GIS environment.",
    },
    tools: ["Civil 3D", "AutoCAD", "QGIS"],
  },
  {
    slug: "visualiseur-cartographique-web",
    category: "web",
    year: "2025",
    featured: true,
    title: {
      fr: "Visualiseur cartographique web interactif",
      en: "Interactive web mapping viewer",
    },
    summary: {
      fr: "Application cartographique légère permettant de consulter et filtrer des couches territoriales sur mobile et poste de travail.",
      en: "Lightweight mapping application to browse and filter territorial layers on both mobile and desktop.",
    },
    detail: {
      fr: "Développement d'un visualiseur à base de tuiles vectorielles, avec filtres dynamiques, recherche d'adresse et fiches attributaires. Optimisé pour un premier rendu sous deux secondes sur connexion mobile.",
      en: "Vector-tile based viewer with dynamic filters, address search and attribute panels. Optimized for a first render under two seconds on a mobile connection.",
    },
    tools: ["Mapbox GL", "Leaflet", "Next.js", "GeoJSON"],
  },
  {
    slug: "analyse-multicritere-territoire",
    category: "gis",
    year: "2024",
    featured: false,
    title: {
      fr: "Analyse multicritère d'aptitude du territoire",
      en: "Multi-criteria land suitability analysis",
    },
    summary: {
      fr: "Identification des secteurs favorables à l'implantation d'infrastructures selon des critères pondérés.",
      en: "Identification of suitable sectors for infrastructure siting based on weighted criteria.",
    },
    detail: {
      fr: "Croisement de couches de pente, d'hydrographie, d'occupation du sol et de contraintes réglementaires. Pondération par méthode AHP et production d'une carte d'aptitude classée, accompagnée d'une analyse de sensibilité.",
      en: "Overlay of slope, hydrography, land cover and regulatory constraint layers. AHP weighting and production of a classified suitability map, with an accompanying sensitivity analysis.",
    },
    tools: ["ArcGIS Pro", "Spatial Analyst", "R"],
  },
  {
    slug: "interoperabilite-cao-sig",
    category: "cad",
    year: "2024",
    featured: false,
    title: {
      fr: "Chaîne d'interopérabilité CAO – SIG",
      en: "CAD – GIS interoperability pipeline",
    },
    summary: {
      fr: "Automatisation des conversions entre plans CAO et couches SIG, avec conservation des attributs.",
      en: "Automated conversion between CAD drawings and GIS layers, preserving attributes.",
    },
    detail: {
      fr: "Mise en place d'un processus reproductible de traduction DWG → géodatabase : correspondance des calques, reprojection, nettoyage géométrique et journalisation des rejets. Temps de traitement ramené de plusieurs jours à quelques minutes.",
      en: "Reproducible DWG → geodatabase translation process: layer mapping, reprojection, geometry cleaning and rejection logging. Processing time cut from several days to a few minutes.",
    },
    tools: ["FME", "AutoCAD Map 3D", "Python"],
  },
  {
    slug: "tableau-bord-territorial",
    category: "web",
    year: "2024",
    featured: false,
    title: {
      fr: "Tableau de bord territorial",
      en: "Territorial dashboard",
    },
    summary: {
      fr: "Tableau de bord cartographique reliant indicateurs statistiques et découpage administratif.",
      en: "Cartographic dashboard linking statistical indicators to administrative boundaries.",
    },
    detail: {
      fr: "Conception des indicateurs, jointure aux entités administratives et mise en page interactive : cartes choroplèthes, graphiques liés et export des données sous-jacentes pour les équipes non techniques.",
      en: "Indicator design, joins to administrative units and interactive layout: choropleth maps, linked charts and underlying data export for non-technical teams.",
    },
    tools: ["ArcGIS Dashboards", "ArcGIS Online", "SQL"],
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
