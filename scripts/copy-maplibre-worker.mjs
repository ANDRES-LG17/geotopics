/**
 * Copie le worker de MapLibre dans `public/`.
 *
 *     node scripts/copy-maplibre-worker.mjs
 *
 * Pourquoi c'est nécessaire — MapLibre GL JS 6 ne met plus son worker dans le
 * bundle : il le charge comme un module séparé, dont l'URL est résolue à
 * l'exécution depuis `import.meta.url` :
 *
 *     new Worker(url, { type: "module" })
 *
 * Or le bundler (Turbopack) place `maplibre-gl.mjs` dans
 * `/_next/static/chunks/` sans y copier le fichier du worker. MapLibre le
 * demande donc à un chemin qui n'existe pas ; le serveur répond par sa page 404
 * en HTML, le navigateur refuse le module (« non-JavaScript MIME type »), et la
 * carte ne s'initialise jamais — sans message d'erreur, puisque MapLibre n'a
 * pas atteint le point où il sait en produire un.
 *
 * La parade : servir le worker nous-mêmes depuis `public/`, et le déclarer avec
 * `setWorkerUrl()` (voir `src/components/LabMap.tsx`). Le fichier devient un
 * actif du site comme un autre — rien à résoudre, rien qui dépende du bundler.
 *
 * Ce script tourne en `postinstall` : le worker doit suivre la version de la
 * bibliothèque, sinon un `npm update` laisserait un worker périmé face à un
 * moteur neuf.
 */

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));

// DEUX fichiers, pas un.
//
// Le worker n'est pas autonome : sa première ligne est
// `import … from "./maplibre-gl-shared.mjs"`. Copier le worker seul le laisse
// chercher un voisin qui n'existe pas — il échoue au démarrage, aussi
// silencieusement que s'il était absent. C'est l'erreur qui a coûté le plus
// long à voir, parce que le worker, lui, répondait bien en HTTP 200.
//
// Le build de production, pas celui de développement : sous Turbopack,
// `import.meta.url` ne se termine pas par `-dev.mjs`, donc MapLibre attend le
// worker de production. C'est aussi le seul qui parte en ligne.
const FICHIERS = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

try {
  const dist = join(RACINE, "node_modules", "maplibre-gl", "dist");
  const version = JSON.parse(
    readFileSync(join(RACINE, "node_modules", "maplibre-gl", "package.json"), "utf8"),
  ).version;

  mkdirSync(join(RACINE, "public"), { recursive: true });
  for (const nom of FICHIERS) {
    copyFileSync(join(dist, nom), join(RACINE, "public", nom));
  }

  console.log(`maplibre-gl ${version} : ${FICHIERS.join(" + ")} copiés dans public/`);
} catch (erreur) {
  // Un `npm install` ne doit pas échouer pour autant : le message suffit, et
  // la carte dira clairement ce qui manque au premier affichage.
  console.error("Impossible de copier le worker MapLibre :", erreur.message);
  console.error("La carte ne s'affichera pas tant qu'il manque.");
}
