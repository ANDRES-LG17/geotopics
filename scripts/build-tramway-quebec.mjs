/**
 * Tracé du futur tramway de Québec — de l'export Overpass au GeoJSON du site.
 *
 *   node scripts/build-tramway-quebec.mjs
 *
 * Lit les deux exports bruts d'OpenStreetMap conservés dans l'atelier, chaîne
 * les tronçons dans l'ordre géographique, et écrit un GeoJSON unique dans
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
 * LA LONGUEUR — huit ways, dont sept chaînés : 19 km mesurés, pour 19,3
 * annoncés. L'un d'eux, le raccord de la montée Mendel, vient d'un second
 * export : il porte un autre nom que les sept autres.
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
/**
 * Le raccord de la montée Mendel, entre Chaudière et le viaduc. Il manquait à
 * l'export principal : ce way-là s'appelle « TramCité », pas « Futur Tramway
 * de Québec », et la requête dépend du nom exact. Téléchargé seul, par son
 * identifiant, le 2026-10-08.
 */
const RACCORD = path.join(
  RACINE,
  "geodata/2026-10-tramway-quebec/00-brut/osm",
  "overpass-tramcite-raccord-2026-10-08.json",
);
// v2 : raccord de la montée Mendel — la ligne est continue de Le Gendre à
// Charlesbourg.
const SORTIE = path.join(RACINE, "public/data/tramway-quebec-v2.geojson");

/** Millésime du tracé lui-même — pas celui du téléchargement. */
const MILLESIME_TRACE = "2024-12-19";
/** Date de la base OSM interrogée. */
const BASE_OSM = "2026-06-01";

// --- lecture ---------------------------------------------------------------

const brut = JSON.parse(readFileSync(ENTREE, "utf8"));
const raccord = JSON.parse(readFileSync(RACCORD, "utf8"));
const troncons = [...brut.elements, ...raccord.elements].filter(
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
 * Arrondi des coordonnées exportées.
 *
 * CINQ DÉCIMALES, PAS QUATRE. La règle de `public/data/README.md` est quatre
 * décimales — environ 11 m — et elle convient à des polygones qu'on regarde de
 * loin. Elle ne convient pas à une ligne lissée : arrondir à 11 m remet des
 * marches d'escalier dans une courbe qu'on vient d'adoucir, et le travail de
 * lissage se perd au moment de l'écriture.
 *
 * Cinq décimales valent environ 1,1 m. Le fichier grossit d'un dixième, ce qui
 * ne pèse rien sur 10 ko.
 */
const arrondi = (n) => Math.round(n * 1e5) / 1e5;

// --- géométrie : nettoyage, redensification, lissage -----------------------

/**
 * Supprime les sommets inutiles d'une polyligne.
 *
 * Deux cas, qui se ressemblent à l'écran et pas dans la donnée :
 *
 *   - les DOUBLONS, deux sommets au même endroit. Invisibles, mais ils cassent
 *     tout algorithme de lissage (une direction ne se calcule pas sur un
 *     segment de longueur nulle) et faussent les métriques de ligne dont
 *     `line-gradient` a besoin. L'export brut d'OSM en contient ;
 *   - les sommets QUASI COLINÉAIRES, qui s'écartent de moins de `toleranceM`
 *     de la droite joignant leurs voisins. Ils n'ajoutent aucune forme et
 *     alourdissent le fichier.
 */
function nettoyer(points, toleranceM = 1) {
  const sansDoublons = points.filter(
    (p, i) => i === 0 || distanceKm(points[i - 1], p) * 1000 > 0.1,
  );
  if (sansDoublons.length < 3) return sansDoublons;

  const garde = [sansDoublons[0]];
  for (let i = 1; i < sansDoublons.length - 1; i += 1) {
    const a = garde[garde.length - 1];
    const b = sansDoublons[i];
    const c = sansDoublons[i + 1];

    // Distance de b à la droite (a,c), en mètres. Produit vectoriel sur la
    // base du segment : l'aire du triangle divisée par sa base.
    const base = distanceKm(a, c) * 1000;
    if (base < 0.1) {
      garde.push(b);
      continue;
    }
    const kx = RAD * RAYON_TERRE_KM * 1000 * Math.cos(a.lat * RAD);
    const ky = RAD * RAYON_TERRE_KM * 1000;
    const aire = Math.abs(
      ((c.lon - a.lon) * kx) * ((b.lat - a.lat) * ky) -
        ((b.lon - a.lon) * kx) * ((c.lat - a.lat) * ky),
    );
    if (aire / base > toleranceM) garde.push(b);
  }
  garde.push(sansDoublons[sansDoublons.length - 1]);
  return garde;
}

/**
 * Insère des sommets pour que plus aucun segment ne dépasse `pasM`.
 *
 * POURQUOI AVANT DE LISSER — le tracé d'OSM mêle des segments de 50 m et des
 * segments de 810 m. Un lissage appliqué tel quel adoucit beaucoup là où les
 * sommets sont serrés et presque pas là où ils sont espacés : la ligne devient
 * inégale, molle par endroits et anguleuse ailleurs. Redensifier d'abord donne
 * au lissage une matière homogène.
 *
 * C'est aussi ce dont `line-gradient` a besoin : une vitesse apparente
 * constante le long de la ligne suppose des sommets régulièrement espacés.
 */
function redensifier(points, pasM = 20) {
  if (points.length < 2) return points;

  // Rééchantillonnage, et non simple découpage : on avance le long de la
  // polyligne en posant un sommet tous les `pasM`, sans tenir compte des
  // sommets d'origine. Un découpage segment par segment ne peut qu'ajouter des
  // points — il laisse intacts ceux qui sont déjà trop serrés, et Chaikin en
  // produit beaucoup. Le pas resterait alors irrégulier.
  const sortie = [points[0]];
  let reste = pasM;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    let longueur = distanceKm(a, b) * 1000;
    if (longueur === 0) continue;

    let parcouru = 0;
    while (longueur - parcouru >= reste) {
      parcouru += reste;
      const t = parcouru / longueur;
      sortie.push({
        lon: a.lon + (b.lon - a.lon) * t,
        lat: a.lat + (b.lat - a.lat) * t,
      });
      reste = pasM;
    }
    reste -= longueur - parcouru;
  }

  // Le dernier sommet est conservé tel quel : une ligne qui ne finit plus à son
  // terminus aurait changé de tracé.
  const fin = points[points.length - 1];
  if (distanceKm(sortie[sortie.length - 1], fin) * 1000 > 1) sortie.push(fin);
  return sortie;
}

/**
 * Lissage de Chaikin — chaque sommet est remplacé par deux points à un quart
 * et trois quarts du segment, et l'opération se répète.
 *
 * POURQUOI CHAIKIN ET NON CATMULL-ROM — une spline de Catmull-Rom passe PAR
 * tous les sommets déclarés et courbe entre eux. Chaikin, lui, coupe les
 * angles : la courbe obtenue ne passe plus par les sommets, elle les frôle.
 *
 * C'est exactement ce que fait une voie ferrée. Un tramway ne pivote pas sur
 * un point, il décrit une courbe de raccordement — et le tracé d'OSM, relevé
 * sommet par sommet, contient trente-neuf angles de plus de 25° dont un de 95°,
 * qui sont des artefacts de numérisation et non des virages réels.
 *
 * Les extrémités sont conservées : une ligne lissée qui ne part plus de son
 * terminus aurait changé de tracé, pas d'apparence.
 */
function lisser(points, iterations = 2) {
  let courant = points;
  for (let n = 0; n < iterations; n += 1) {
    if (courant.length < 3) return courant;
    const suivant = [courant[0]];
    for (let i = 0; i < courant.length - 1; i += 1) {
      const a = courant[i];
      const b = courant[i + 1];
      suivant.push(
        { lon: a.lon * 0.75 + b.lon * 0.25, lat: a.lat * 0.75 + b.lat * 0.25 },
        { lon: a.lon * 0.25 + b.lon * 0.75, lat: a.lat * 0.25 + b.lat * 0.75 },
      );
    }
    suivant.push(courant[courant.length - 1]);
    courant = suivant;
  }
  return courant;
}

/**
 * La chaîne complète : nettoyer, rééchantillonner, lisser, rééchantillonner.
 *
 * L'ORDRE A ÉTÉ TROUVÉ PAR ESSAIS, et trois versions fausses valent d'être
 * notées — chacune échouait d'une façon différente.
 *
 *   1. Redensifier, lisser, nettoyer (tolérance 60 cm) : le nettoyage final
 *      ramenait la ligne de 800 sommets à 56 et effaçait le lissage qu'on
 *      venait d'appliquer.
 *   2. Nettoyer, lisser, redensifier : la ligne devenait régulière, mais le
 *      rééchantillonnage repose les sommets à intervalle fixe **y compris dans
 *      les courbes**, ce qui y recrée des angles. L'angle le plus vif
 *      remontait de 42° à 71°.
 *   3. Rééchantillonner plus fin : l'angle baissait un peu, le fichier
 *      doublait, et treize angles de plus de 25° subsistaient — autant que
 *      dans la donnée brute.
 *
 * L'ordre juste tient en une idée : le lissage doit venir EN DERNIER sur une
 * matière déjà régulière. On rééchantillonne donc deux fois — une première à
 * pas large pour donner à Chaikin des segments égaux, une seconde plus fine
 * après, qui repose le pas final sans recouper les courbes.
 */
function affiner(points) {
  const propre = nettoyer(points, 0.5);
  // Pas large en entrée : Chaikin coupe les angles d'autant plus franchement
  // que les segments qu'on lui donne sont longs.
  const regulier = redensifier(propre, 30);
  // Trois itérations : à deux, l'angle le plus vif retombait de 98° à 68°, ce
  // qui reste un coude sur une voie ferrée.
  const doux = lisser(regulier, 3);
  // Pas final plus fin que le pas d'entrée, pour suivre la courbe plutôt que
  // la recouper.
  return redensifier(doux, 12);
}

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
 * force — c'était le cas du tronçon ouest (montée Mendel), séparé du reste par
 * 709 m de tracé jusqu'à l'ajout du raccord.
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

/**
 * Le lissage s'applique à la chaîne ENTIÈRE, puis se redécoupe en tronçons.
 *
 * Lisser chaque tronçon séparément laisserait un angle vif à chacune de leurs
 * jonctions — précisément là où le tracé passe du tunnel à la surface, c'est-à-
 * dire à l'endroit que le lab veut montrer. On lisse donc la ligne continue,
 * puis on rend à chaque tronçon la portion qui lui revient, repérée par la
 * distance cumulée.
 */
const pointsBruts = chaine.flatMap((t, i) =>
  i === 0 ? t.points : t.points.slice(1),
);
const pointsLisses = affiner(pointsBruts);

/**
 * Indice du sommet lissé le plus proche d'un point donné.
 *
 * C'est ainsi qu'on retrouve les frontières entre tronçons après lissage, et
 * non par une règle de trois sur les longueurs. Un premier essai répartissait
 * au prorata des longueurs brutes : le tunnel, long de 1,73 km, s'y retrouvait
 * réduit à 0,84 km. Le lissage ne raccourcit pas uniformément — il mord
 * davantage là où les angles sont vifs — et une proportion ne peut pas le
 * suivre. La jonction réelle, elle, reste au même endroit du terrain.
 */
function plusProche(cible, points) {
  let meilleur = 0;
  let distance = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const d = distanceKm(cible, points[i]);
    if (d < distance) {
      distance = d;
      meilleur = i;
    }
  }
  return meilleur;
}

// Les frontières : le point de départ de chaque tronçon, retrouvé sur la ligne
// lissée.
const frontieres = chaine.map((t) => plusProche(t.points[0], pointsLisses));
frontieres.push(pointsLisses.length - 1);

const ordonnes = chaine.map((troncon, i) => {
  const debut = frontieres[i];
  const fin = frontieres[i + 1];
  const points = pointsLisses.slice(debut, fin + 1);
  // Un tronçon très court peut ne retenir aucun sommet : on lui garde au moins
  // ses deux extrémités, sinon il disparaît de la carte.
  return {
    ...troncon,
    points: points.length >= 2 ? points : troncon.points,
  };
});

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
 * Un seul cas depuis le raccord de la montée Mendel (2026-10-08) :
 *
 *   - `1558354781` (0,07 km) est un **doublon de parcours** : ce court
 *     connecteur relie `1012496032` à `778997313`, deux tronçons qui se
 *     touchent déjà directement à 67 m. Le prendre ajouterait 70 m de tracé en
 *     double. Le laisser de côté est le bon choix, pas un défaut du chaînage.
 *
 * Avant le raccord, `1554915809` (0,86 km, montée Mendel) restait isolé à
 * 709 m du reste du tracé : un vrai trou, comblé par `1554915808`.
 */
isoles.forEach((troncon) => {
  const tags = troncon.tags ?? {};
  // Lissés eux aussi : laissés bruts, ils trancheraient à côté du tracé
  // principal, et ce n'est pas leur statut qu'on veut signaler par un aspect
  // différent — la couche et la couleur s'en chargent.
  const points = affiner(troncon.points);
  entites.push({
    type: "Feature",
    properties: {
      couche: "tronçon_isolé",
      osm_id: troncon.id,
      etat: tags.railway ?? "proposed",
      longueur_km: Math.round(longueurKm(points) * 100) / 100,
      note: "Non raccordé au tracé principal dans OSM.",
    },
    geometry: {
      type: "LineString",
      coordinates: points.map((p) => [arrondi(p.lon), arrondi(p.lat)]),
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
// La ligne lissée telle quelle : c'est elle qui porte la géométrie continue
// dont une animation le long du tracé aura besoin.
const tousLesPoints = pointsLisses;

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
      "Le tracé est continu de Le Gendre à Charlesbourg depuis l'ajout du " +
      "raccord de la montée Mendel (way 1554915808, « TramCité »). " +
      "La longueur mesurée rejoint les 19 km annoncés.",
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

// Qualité géométrique, avant et après affinage. Les angles vifs sont ce qui
// fait qu'un tracé « paraît sale » : un tramway ne pivote pas sur un point.
function qualite(points) {
  const segments = [];
  for (let i = 1; i < points.length; i += 1) {
    segments.push(distanceKm(points[i - 1], points[i]) * 1000);
  }
  const angles = [];
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const v1 = [b.lon - a.lon, b.lat - a.lat];
    const v2 = [c.lon - b.lon, c.lat - b.lat];
    const n1 = Math.hypot(...v1);
    const n2 = Math.hypot(...v2);
    if (!n1 || !n2) continue;
    const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)));
    angles.push((Math.acos(cos) * 180) / Math.PI);
  }
  segments.sort((a, b) => a - b);
  return {
    sommets: points.length,
    median: segments[Math.floor(segments.length / 2)] ?? 0,
    vifs: angles.filter((a) => a > 25).length,
    max: angles.length ? Math.max(...angles) : 0,
  };
}

const avant = qualite(pointsBruts);
const apres = qualite(pointsLisses);
console.log(
  `\n  géométrie   sommets   segment médian   angles > 25°   angle max\n` +
    `  brut        ${String(avant.sommets).padStart(7)}   ${avant.median.toFixed(0).padStart(12)} m   ${String(avant.vifs).padStart(12)}   ${avant.max.toFixed(0).padStart(8)}°\n` +
    `  affiné      ${String(apres.sommets).padStart(7)}   ${apres.median.toFixed(0).padStart(12)} m   ${String(apres.vifs).padStart(12)}   ${apres.max.toFixed(0).padStart(8)}°`,
);

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
