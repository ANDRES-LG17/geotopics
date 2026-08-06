/**
 * Outils que j'utilise au quotidien, affichés sur la page « À propos ».
 *
 * Volontairement présenté comme une boîte à outils et non comme une grille
 * de compétences : ce site est un carnet, pas un CV. Le parcours détaillé
 * vit sur LinkedIn, à un seul endroit, tenu à jour une seule fois.
 */
export const toolbox: Record<"gis" | "cad" | "dev" | "web", string[]> = {
  gis: ["ArcGIS Pro", "QGIS", "PostGIS", "FME", "Spatial Analyst", "ArcPy"],
  cad: ["AutoCAD", "Civil 3D", "AutoCAD Map 3D", "MicroStation", "Topographie"],
  dev: ["Python", "SQL", "Git", "R", "GDAL/OGR"],
  web: ["ArcGIS Online", "Story Maps", "Leaflet", "Mapbox GL", "Next.js"],
};
