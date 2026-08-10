/**
 * Démonstration du précalcul — le seul endroit où le travail lourd a lieu.
 *
 *   node scripts/build-demo-isochrones.mjs
 *
 * Ce script existe pour montrer le patron, pas pour produire une vraie
 * analyse : les temps de parcours ci-dessous sont INVENTÉS. Un projet réel
 * remplace la section « données d'entrée » par une lecture de GTFS, un export
 * QGIS, une requête PostGIS — le reste de la chaîne ne change pas.
 *
 * Le patron, en trois temps :
 *
 *   1. lire les données sources ;
 *   2. calculer (ici : un tampon par seuil de temps) ;
 *   3. écrire un GeoJSON versionné dans `public/data/`.
 *
 * C'est exactement ce que fait Chronotrains, à une différence près : eux
 * rangent le résultat dans Postgres parce qu'ils couvrent toute l'Europe.
 * À l'échelle d'une région, un fichier suffit — et il se versionne dans git.
 *
 * Deux approximations assumées, signalées au lecteur dans la note du lab :
 *
 *   - les cercles ne sont pas fusionnés entre eux (il faudrait `@turf/union`,
 *     voir `scripts/README.md`) : ils se superposent en semi-transparence ;
 *   - le cercle est tracé en degrés avec une correction de latitude, pas sur
 *     l'ellipsoïde. À 47° N et sur 50 km, l'écart est de l'ordre du pixel.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// --- données d'entrée (inventées) ------------------------------------------

/** Point de départ, et temps d'accès depuis ce point, en minutes. */
const ORIGIN = { name: "Québec", lon: -71.208, lat: 46.8139, minutes: 0 };

const DESTINATIONS = [
  ORIGIN,
  { name: "Lévis", lon: -71.1748, lat: 46.8033, minutes: 12 },
  { name: "Shannon", lon: -71.517, lat: 46.889, minutes: 20 },
  { name: "Sainte-Anne-de-Beaupré", lon: -70.93, lat: 47.022, minutes: 25 },
  { name: "Donnacona", lon: -71.727, lat: 46.678, minutes: 30 },
  { name: "Saint-Raymond", lon: -71.842, lat: 46.901, minutes: 40 },
  { name: "Montmagny", lon: -70.554, lat: 46.98, minutes: 45 },
  // Au-delà du dernier seuil : n'apparaîtra dans aucune isochrone.
  { name: "Baie-Saint-Paul", lon: -70.496, lat: 47.44, minutes: 70 },
];

/** Seuils de temps, en minutes. Un polygone par point et par seuil atteint. */
const THRESHOLDS = [15, 30, 45, 60];

/** Vitesse de rabattement autour d'un point desservi : 48 km/h. */
const KM_PER_MINUTE = 0.8;

// --- calcul ----------------------------------------------------------------

const KM_PER_DEGREE_LAT = 110.574;
const VERTICES = 64;

/** Cercle approché de `radiusKm` autour d'un point, en coordonnées WGS 84. */
function circle(lon, lat, radiusKm) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring = [];

  for (let i = 0; i <= VERTICES; i++) {
    const angle = (i / VERTICES) * 2 * Math.PI;
    ring.push([
      round(lon + dLon * Math.cos(angle)),
      round(lat + dLat * Math.sin(angle)),
    ]);
  }

  return ring;
}

/**
 * Quatre décimales ≈ 11 m au Québec. Suffisant pour une carte de lecture, et
 * c'est ce qui fait la différence entre un fichier de 200 ko et un de 900 ko —
 * le poids compte, il voyage jusqu'au navigateur du lecteur.
 */
function round(value) {
  return Math.round(value * 1e4) / 1e4;
}

const features = [];

// Du seuil le plus large au plus étroit : l'ordre d'écriture est l'ordre de
// peinture, les petites isochrones doivent finir au-dessus des grandes.
for (const minutes of [...THRESHOLDS].sort((a, b) => b - a)) {
  for (const place of DESTINATIONS) {
    const remaining = minutes - place.minutes;
    if (remaining <= 0) continue;

    features.push({
      type: "Feature",
      properties: { duration: minutes, from: place.name },
      geometry: {
        type: "Polygon",
        coordinates: [circle(place.lon, place.lat, remaining * KM_PER_MINUTE)],
      },
    });
  }
}

// --- écriture --------------------------------------------------------------

const collection = {
  type: "FeatureCollection",
  // Trace de fabrication : dans six mois, on veut savoir d'où sort ce fichier.
  metadata: {
    generatedBy: "scripts/build-demo-isochrones.mjs",
    generatedAt: new Date().toISOString().slice(0, 10),
    disclaimer:
      "Données synthétiques — démonstration technique, temps de parcours inventés.",
  },
  features,
};

const OUT = path.join(process.cwd(), "public", "data", "demo-isochrones-v1.geojson");
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(collection), "utf8");

// Emprise, à recopier dans la définition du lab (`view.bounds`).
// On arrondit vers l'EXTÉRIEUR : arrondir au plus proche rognerait un liseré
// de données au bord du cadrage, et personne ne remarque un liseré manquant.
const coords = features.flatMap((f) => f.geometry.coordinates[0]);
const lons = coords.map((c) => c[0]);
const lats = coords.map((c) => c[1]);
const bbox = [
  Math.floor(Math.min(...lons) * 100) / 100,
  Math.floor(Math.min(...lats) * 100) / 100,
  Math.ceil(Math.max(...lons) * 100) / 100,
  Math.ceil(Math.max(...lats) * 100) / 100,
];

console.log(`✓ ${features.length} polygones → public/data/demo-isochrones-v1.geojson`);
console.log(`  emprise : [${bbox.join(", ")}]`);
