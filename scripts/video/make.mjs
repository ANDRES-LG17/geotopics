#!/usr/bin/env node
/**
 * Fabrique la vidéo d'un lab.
 *
 *     npm run video -- velo-quebec-levis                 (4:5, français)
 *     npm run video -- velo-quebec-levis --format 16x9   (blog : + webm)
 *     npm run video -- velo-quebec-levis --lang en
 *     npm run video -- velo-quebec-levis --only compose  (record | overlay | compose)
 *
 * Il faut le site lancé (`npm run dev`, ou --base https://…). Sortie dans
 * `videos/<id>/`, images intermédiaires dans `.video-cache/` (non versionnés).
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { record, overlay, compose, FORMATS } from "./lib.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const id = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
if (!id) {
  console.error("Usage : npm run video -- <lab-id> [--format 4x5|16x9] [--lang fr|en] [--only record|overlay|compose] [--base URL]");
  process.exit(1);
}
const format = opt("format", "4x5");
const lang = opt("lang", "fr");
const only = opt("only", null);
const base = opt("base", "http://localhost:3000");
if (!FORMATS[format]) throw new Error(`Format inconnu : ${format}`);

const racine = path.resolve(import.meta.dirname, "..", "..");
const story = (await import(pathToFileURL(path.join(import.meta.dirname, "storyboards", `${id}.mjs`)))).default;
const dir = path.join(racine, ".video-cache", `${id}-${format}-${lang}`);
const outBase = path.join(racine, "videos", id, `${id}-${format}-${lang}`);

const etapes = only ? [only] : ["record", "overlay", "compose"];
for (const e of etapes) {
  console.log(`● ${e}`);
  if (e === "record") await record(story, { format, lang, base, dir });
  if (e === "overlay") await overlay({ dir });
  if (e === "compose") await compose({ dir, outBase, web: format === "16x9" });
}
