/**
 * Réseau marchable d'OpenStreetMap sur tout le corridor de TramCité.
 *
 * La première version ne couvrait que Saint-Roch et la colline — l'essai sur
 * une station. Les 29 stations demandent le corridor entier, de Le Gendre à
 * Charlesbourg, élargi de ~1,1 km : la portée de quinze minutes de marche à
 * 4,2 km/h (1 050 m), plus une marge pour que l'isochrone ne bute pas sur le
 * bord du téléchargement.
 *
 * UNE REQUÊTE PAR TYPE DE VOIE : une expression régulière qui les réunit
 * toutes expire (504) sur une emprise de cette taille.
 *
 * Exécution : node scripts/analysis/tramway-reseau-pieton.mjs
 * Sortie    : geodata/2026-10-tramway-quebec/00-brut/osm/reseau-pieton-corridor.json
 */
import fs from "node:fs";
import path from "node:path";

const EMPRISE = "46.749,-71.368,46.853,-71.200"; // sud, ouest, nord, est
const TYPES = [
  "footway", "steps", "pedestrian", "path", "living_street", "residential",
  "service", "unclassified", "tertiary", "secondary", "primary", "cycleway",
];
const SORTIE = path.join(
  "geodata", "2026-10-tramway-quebec", "00-brut", "osm", "reseau-pieton-corridor.json",
);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Reprise : `node … secondary cycleway` ne retélécharge que ces types et les
// ajoute au fichier existant. Le serveur public refuse souvent (504, 429)
// une requête sur une emprise de cette taille.
const reprise = process.argv.slice(2);
const elements = reprise.length && fs.existsSync(SORTIE)
  ? JSON.parse(fs.readFileSync(SORTIE, "utf8")).elements
  : [];
const vues = new Set(elements.map((e) => e.id));

for (const type of reprise.length ? reprise : TYPES) {
  const requete = `[out:json][timeout:180];way["highway"="${type}"](${EMPRISE});out geom;`;
  for (let essai = 1; essai <= 5; essai++) {
    const reponse = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "geotopics-dev/1.0", "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(requete),
    });
    if (reponse.ok) {
      const { elements: lot } = await reponse.json();
      let neufs = 0;
      for (const e of lot) if (!vues.has(e.id)) { vues.add(e.id); elements.push(e); neufs++; }
      console.log(`${type.padEnd(14)} ${String(neufs).padStart(6)} voies`);
      break;
    }
    console.log(`${type}: HTTP ${reponse.status}, essai ${essai}/5`);
    await pause(20000 * essai);
  }
  await pause(3000); // courtoisie envers le serveur public
}

fs.writeFileSync(SORTIE, JSON.stringify({ elements }));
console.log(`\n${elements.length} voies · ${(fs.statSync(SORTIE).size / 1e6).toFixed(1)} Mo → ${SORTIE}`);
