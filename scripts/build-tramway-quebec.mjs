/**
 * Tracé du futur tramway de Québec — de l'export Overpass au GeoJSON du site.
 *
 *   node scripts/build-tramway-quebec.mjs
 *
 * Lit l'export brut d'OpenStreetMap conservé dans l'atelier, chaîne les sept
 * tronçons dans l'ordre géographique, et écrit un GeoJSON unique dans
 * `public/data/`.
 *
 * POURQUOI CE SCRIPT EXISTE — l'export brut pèse 17 ko de JSON Overpass, avec
 * des tronçons dans un ordre arbitraire et une structure propre à l'API. Le
 * site a besoin de l'inverse : un fichier léger, ordonné, aux propriétés
 * nommées pour les couches du lab. La transformation est ici, versionnée, pour
 * que quelqu'un qui n'a pas les fichiers puisse la refaire.
 *
 * CE QUE LA DONNÉE N'EST PAS — le tracé officiel. OSM n'héberge aucune relation
 * `route=tram` pour ce tramway : il n'est pas construit. Sept `way` isolés,
 * étiquetés `railway=proposed`, nommés « Futur Tramway de Québec », portent une
 * reconstitution par des contributeurs de l'avis au marché du 19 décembre 2024.
 * OSM le dit lui-même : « Sujet à modification. » Le lab doit le dire aussi.
 *
 * LES SEPT TRONÇONS font 18,35 km, là où l'annonce officielle dit 19,3 km. Le
 * kilomètre manquant est probablement l'antenne de Charlesbourg, incomplète dans
 * OSM. À signaler dans la note du lab : une carte qui annonce 19 km en
 * dessinant 18 mentirait.
 *
 * Détail de la provenance dans `geodata/2026-10-tramway-quebec/SOURCES.md`.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const ENTREE = path.join(
  RACINE,
  "geodata/2026-10-tramway-quebec/00-brut/osm",
  "overpass-futur-tramway-2026-10-01.json",
);
const SORTIE = path.join(RACINE, "public/data/tramway-quebec-v1.geojson");

/** Millésime du tracé lui-même — pas celui du téléchargement. */
const MILLESIME_TRACE = "2024-12-19";
/** Date de la base OSM interrogée. */
const BASE_OSM = "2026-06-01";

// --- lecture ---------------------------------------------------------------

const brut = JSON.parse(readFileSync(ENTREE, "utf8"));
const troncons = brut.elements.filter(
  (e) => e.type === "way" && Array.isArray(e.geometry) && e.geometry.length > 1,
);

if (troncons.length === 0) {
  throw new Error(`Aucun tronçon avec géométrie dans ${ENTREE}`);
}

// --- outils ----------------------------------------------------------------

const RAYON_TERRE_KM = 6371;
const RAD = Math.PI / 180;

/**
 * Distance entre deux points en kilomètres.
 *
 * Approximation équirectangulaire : on corrige la longitude par le cosinus de
 * la latitude moyenne. Sur les quelques kilomètres d'un tronçon et à 46,8° N,
 * l'écart avec la formule de haversine est négligeable — et ce qu'on mesure
 * sert à ordonner et à annoncer une longueur, pas à implanter des rails.
 */
function distanceKm(a, b) {
  const dx = (b.lon - a.lon) * RAD * Math.cos(((a.lat + b.lat) / 2) * RAD);
  const dy = (b.lat - a.lat) * RAD;
  return RAYON_TERRE_KM * Math.sqrt(dx * dx + dy * dy);
}

/** Longueur cumulée d'une suite de points, en kilomètres. */
function longueurKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distanceKm(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Arrondi à quatre décimales — environ 11 m à cette latitude.
 *
 * C'est la règle de `public/data/README.md` : au-delà, on transporte des
 * chiffres que la donnée source ne garantit pas, et le fichier grossit pour
 * rien.
 */
const arrondi = (n) => Math.round(n * 1e4) / 1e4;

// --- chaînage --------------------------------------------------------------

/** Écart admis entre deux extrémités pour les considérer jointes, en mètres. */
const RACCORD_TOLERE_M = 80;

/**
 * Chaîne les tronçons bout à bout par leurs extrémités.
 *
 * POURQUOI UN VRAI CHAÎNAGE — une première version rangeait les tronçons par
 * longitude, en supposant que la ligne allait d'ouest en est. Elle annonçait
 * 24,1 km au lieu de 18,3 et trois ruptures, dont une de 4,3 km. La cause est
 * dans le tracé lui-même : après le tunnel, la ligne **remonte vers le nord**
 * jusqu'à Charlesbourg. Un tri par longitude plaçait donc ce tronçon-là au
 * milieu, et la ligne repartait en arrière.
 *
 * On suit donc les extrémités. Chaque tronçon se raccorde au suivant à moins de
 * quelques dizaines de mètres ; on part d'une extrémité libre et on avance.
 * Les tronçons qu'on n'atteint pas sont signalés plutôt que raccrochés de
 * force — c'est le cas d'un tronçon isolé à l'ouest (montée Mendel), séparé du
 * reste par 709 m de tracé absent d'OSM.
 */
function chainer(segments) {
  const restants = segments.map((s) => ({
    id: s.id,
    tags: s.tags ?? {},
    points: s.geometry,
  }));

  const joints = (a, b) => distanceKm(a, b) * 1000 <= RACCORD_TOLERE_M;

  /** Nombre de voisins d'une extrémité : 0 = extrémité libre de la ligne. */
  const voisins = (point, saufId) =>
    restants.filter(
      (s) =>
        s.id !== saufId &&
        (joints(point, s.points[0]) ||
          joints(point, s.points[s.points.length - 1])),
    ).length;

  // Un départ de ligne est une extrémité sans voisin. À défaut — une boucle,
  // ou un tracé entièrement disjoint — on prend le tronçon le plus long.
  let depart = null;
  for (const s of restants) {
    if (voisins(s.points[0], s.id) === 0) {
      depart = { segment: s, inverser: false };
      break;
    }
    if (voisins(s.points[s.points.length - 1], s.id) === 0) {
      depart = { segment: s, inverser: true };
      break;
    }
  }
  if (!depart) {
    const plusLong = restants.reduce((a, b) =>
      longueurKm(a.points) >= longueurKm(b.points) ? a : b,
    );
    depart = { segment: plusLong, inverser: false };
  }

  const premier = depart.segment;
  restants.splice(restants.indexOf(premier), 1);

  const chaine = [
    {
      id: premier.id,
      tags: premier.tags,
      points: depart.inverser ? [...premier.points].reverse() : premier.points,
    },
  ];

  /**
   * La chaîne grandit par ses DEUX bouts.
   *
   * Croître seulement par la fin suffirait si l'on partait toujours d'une vraie
   * extrémité de ligne. Mais le départ est choisi sur la première extrémité
   * libre rencontrée, et un court tronçon — ici le viaduc de 40 m — peut n'avoir
   * de voisin que d'un côté sans être pour autant le bout de la ligne. On
   * étendait alors dans une seule direction et deux tronçons restaient orphelins.
   */
  const etendre = (versLaFin) => {
    for (;;) {
      const bout = versLaFin
        ? chaine[chaine.length - 1].points.at(-1)
        : chaine[0].points[0];

      let trouve = null;
      let inverser = false;

      for (const s of restants) {
        if (joints(bout, s.points[0])) {
          trouve = s;
          // Rattaché par son début : on le garde tel quel en avançant vers la
          // fin, on le retourne en remontant vers le début.
          inverser = !versLaFin;
          break;
        }
        if (joints(bout, s.points.at(-1))) {
          trouve = s;
          inverser = versLaFin;
          break;
        }
      }

      if (!trouve) return;

      restants.splice(restants.indexOf(trouve), 1);
      const points = inverser ? [...trouve.points].reverse() : trouve.points;
      const maillon = { id: trouve.id, tags: trouve.tags, points };

      if (versLaFin) chaine.push(maillon);
      else chaine.unshift(maillon);
    }
  };

  etendre(true);
  etendre(false);

  return { chaine, isoles: restants };
}

const { chaine, isoles } = chainer(troncons);
const ordonnes = chaine;

// --- entités ---------------------------------------------------------------

const entites = [];

ordonnes.forEach((troncon, index) => {
  const tags = troncon.tags ?? {};
  const enTunnel = tags.tunnel === "yes";
  const surViaduc = Boolean(tags.bridge);

  entites.push({
    type: "Feature",
    properties: {
      // `couche` discrimine les entités d'une source partagée : c'est le patron
      // du lab Lac Saint-Charles — un seul fichier, un aller-retour réseau.
      couche: enTunnel ? "tronçon_tunnel" : "tronçon",
      ordre: index + 1,
      osm_id: troncon.id,
      // `proposed` ou `construction` : l'état déclaré du tronçon dans OSM.
      etat: tags.railway ?? "proposed",
      en_tunnel: enTunnel,
      sur_viaduc: surViaduc,
      longueur_km: Math.round(longueurKm(troncon.points) * 100) / 100,
      mise_en_service: tags.start_date ?? null,
    },
    geometry: {
      type: "LineString",
      coordinates: troncon.points.map((p) => [arrondi(p.lon), arrondi(p.lat)]),
    },
  });
});

/**
 * Les tronçons que le chaînage n'a pas retenus.
 *
 * Ils sont écrits quand même, sous une couche à part : un tronçon qu'OSM porte
 * mais que la chaîne n'a pas pris reste une information. Le lab peut le
 * dessiner autrement — ou pas du tout — mais le fichier ne le perd pas en
 * silence.
 *
 * DEUX CAS, DE NATURE DIFFÉRENTE, vérifiés sur l'export du 2026-10-01 :
 *
 *   - `1554915809` (0,86 km, montée Mendel) est un **vrai trou** : il est à
 *     709 m du reste du tracé, et le tronçon intermédiaire est absent d'OSM.
 *     C'est la principale raison de l'écart avec les 19 km annoncés ;
 *
 *   - `1558354781` (0,07 km) est un **doublon de parcours** : ce court
 *     connecteur relie `1012496032` à `778997313`, deux tronçons qui se
 *     touchent déjà directement à 67 m. Le prendre ajouterait 70 m de tracé en
 *     double. Le laisser de côté est le bon choix, pas un défaut du chaînage.
 *
 * La distinction compte pour la note du lab : l'un signale une donnée
 * incomplète, l'autre une donnée redondante.
 */
isoles.forEach((troncon) => {
  const tags = troncon.tags ?? {};
  entites.push({
    type: "Feature",
    properties: {
      couche: "tronçon_isolé",
      osm_id: troncon.id,
      etat: tags.railway ?? "proposed",
      longueur_km: Math.round(longueurKm(troncon.points) * 100) / 100,
      note: "Non raccordé au tracé principal dans OSM.",
    },
    geometry: {
      type: "LineString",
      coordinates: troncon.points.map((p) => [arrondi(p.lon), arrondi(p.lat)]),
    },
  });
});

/**
 * Le tracé complet, en une seule entité.
 *
 * Les tronçons servent à distinguer le tunnel du reste ; cette ligne-ci sert à
 * dessiner la ligne d'un trait, sans les coutures qui apparaissent quand sept
 * segments se superposent aux raccords.
 */
const tousLesPoints = ordonnes.flatMap((t, i) =>
  i === 0 ? t.points : t.points.slice(1),
);

entites.push({
  type: "Feature",
  properties: {
    couche: "ligne",
    nom: "Tramway de Québec",
    longueur_km: Math.round(longueurKm(tousLesPoints) * 100) / 100,
    mise_en_service: 2033,
  },
  geometry: {
    type: "LineString",
    coordinates: tousLesPoints.map((p) => [arrondi(p.lon), arrondi(p.lat)]),
  },
});

// --- emprise ---------------------------------------------------------------

const lons = tousLesPoints.map((p) => p.lon);
const lats = tousLesPoints.map((p) => p.lat);
const emprise = [
  arrondi(Math.min(...lons)),
  arrondi(Math.min(...lats)),
  arrondi(Math.max(...lons)),
  arrondi(Math.max(...lats)),
];

// --- écriture --------------------------------------------------------------

const longueurTotale = Math.round(longueurKm(tousLesPoints) * 100) / 100;

const geojson = {
  type: "FeatureCollection",
  // Bloc de provenance, imposé par `public/data/README.md` : un fichier servi
  // au navigateur doit dire d'où il vient sans qu'on remonte au dépôt.
  metadata: {
    titre: "Tracé du futur tramway de Québec (TramCité)",
    script: "scripts/build-tramway-quebec.mjs",
    genere_le: new Date().toISOString().slice(0, 10),
    source: "OpenStreetMap, via l'API Overpass",
    licence: "ODbL 1.0",
    attribution: "© les contributeurs d'OpenStreetMap",
    base_osm: BASE_OSM,
    millesime_trace: MILLESIME_TRACE,
    avertissement:
      "Tracé provisoire. OSM le décrit comme « sujet à modification » : " +
      "reconstitution par des contributeurs de l'avis au marché du " +
      "19 décembre 2024. Le vectoriel officiel n'est pas en données ouvertes.",
    longueur_mesuree_km: longueurTotale,
    // tramcite.info, consulté le 2026-10-01 : « 19 km de ligne », 29 stations,
    // 5 pôles d'échanges, « 2 km de tunnel ».
    longueur_annoncee_km: 19,
    ecart:
      "Le tracé d'OSM est incomplet : un tronçon de l'ouest n'est pas " +
      "raccordé, et environ 700 m de tracé manquent entre les deux. " +
      "La longueur mesurée est donc inférieure aux 19 km annoncés.",
    emprise,
    stations:
      "Les 29 stations ne sont pas cartographiées dans OSM. À saisir " +
      "séparément — voir SOURCES.md.",
  },
  features: entites,
};

mkdirSync(path.dirname(SORTIE), { recursive: true });
writeFileSync(SORTIE, `${JSON.stringify(geojson)}\n`, "utf8");

// --- rapport ---------------------------------------------------------------

const poidsKo = Math.round(JSON.stringify(geojson).length / 102.4) / 10;
const tunnel = entites.find((f) => f.properties.couche === "tronçon_tunnel");

console.log(`\n  ${path.relative(RACINE, SORTIE)}`);
console.log(`  ${entites.length} entités · ${poidsKo} ko`);
console.log(`  ${ordonnes.length} tronçons chaînés · ${longueurTotale} km`);
if (tunnel) {
  console.log(`  tunnel : ${tunnel.properties.longueur_km} km`);
}
console.log(`  emprise : ${emprise.join(", ")}`);

console.log(`  ordre : ${ordonnes.map((t) => t.id).join(" → ")}`);

if (isoles.length > 0) {
  console.log(`\n  ${isoles.length} tronçon(s) hors chaîne :`);
  for (const t of isoles) {
    const km = Math.round(longueurKm(t.points) * 100) / 100;
    // Un connecteur très court entre deux tronçons déjà joints est un doublon
    // de parcours, pas un trou dans la donnée. Le seuil sépare les deux cas.
    const doublon = km < 0.2;
    console.log(
      `    ${t.id} — ${km} km — ${doublon ? "doublon de parcours" : "⚠ TROU dans le tracé d'OSM"}`,
    );
  }
  console.log("  Écrits sous la couche « tronçon_isolé ».");
}

const ANNONCE_KM = 19;
const ecartKm = Math.round((ANNONCE_KM - longueurTotale) * 100) / 100;
console.log(
  `\n  annoncé ${ANNONCE_KM} km · mesuré ${longueurTotale} km · écart ${ecartKm} km`,
);
console.log();
