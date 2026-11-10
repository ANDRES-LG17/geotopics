/**
 * Vidéo du lab « Portée vélo Québec–Lévis » — ~30 s, TOUT DE SUITE.
 *
 * Leçon de la première vidéo publiée : les outils arrivaient trop tard, le
 * public avait déjà défilé. Ici, la première image montre déjà la carte qui
 * calcule ; chaque outil a 4 à 6 s, puis l'appel à essayer la carte.
 *
 * Tout est en coordonnées géographiques et en sélecteurs : le même scénario
 * sert au 4:5 (LinkedIn) et au 16:9 (blog). Textes en { fr, en }.
 */

const SAINT_ROCH = [-71.2245, 46.8139];
const LIMOILOU = [-71.2155, 46.834];
const MONTCALM = [-71.231, 46.8];
const SAINT_SAUVEUR = [-71.238, 46.809];
const LEVIS = [-71.178, 46.806];

const VUE = { center: [-71.212, 46.806], zoom: 12.3, bearing: 0, pitch: 0 };

const PANNEAU = "aside:not([aria-hidden])";
const RESULTATS = 'aside[aria-hidden="false"]';

export default {
  id: "velo-quebec-levis",
  path: "/lab-preview/velo-quebec-levis",
  poster: 0.6,

  async run(v) {
    await v.setup(async () => {
      await v.jump(VUE);
      // Préchargements : la colmena, l'hiver et les lieux chargent leurs
      // données au premier usage. On les appelle une fois, hors caméra.
      await v.at(SAINT_ROCH);
      await v.select("#vue-portee", "expose");
      await v.page.waitForTimeout(400);
      await v.at(MONTCALM);
      await v.key("h");
      await v.page.waitForLoadState("networkidle");
      await v.page.clock.runFor(800);
      await v.key("h");
      await v.select("#vue-portee", "temps");
      await v.click();
      await v.page.waitForLoadState("networkidle");
      await v.page.clock.runFor(2500);
      await v.key("Escape");
      await v.page.clock.runFor(500);
      await v.jump(VUE);
      await v.at(LIMOILOU);
      await v.page.clock.runFor(300);
    });

    // 0–3 s · LE CROCHET : la tache suit le curseur, et l'hiver la fait fondre.
    v.caption("hook", { fr: "15 minutes à vélo.", en: "15 minutes by bike." }, { fr: "Partout. Recalculé en direct.", en: "Anywhere. Recomputed live." }, 3.2);
    v.glide([SAINT_ROCH, MONTCALM], 3);
    await v.wait(1.4);
    await v.key("h");
    await v.wait(1.6);
    await v.key("h");

    // 3–8 s · LE PANNEAU : les surfaces, chiffrées à chaque mouvement.
    await v.zoom(PANNEAU, 0.7, { bottom: 260, right: 60 });
    v.glide([SAINT_SAUVEUR, SAINT_ROCH], 4.4);
    await v.wait(0.2);
    v.caption("lower", { fr: "Chaque départ, sa surface.", en: "Every start, its own area." }, { fr: "Relief, autoroutes, fleuve : tout compte.", en: "Hills, motorways, river: all of it counts." }, 4.4);
    await v.wait(4.2);
    await v.zoom("full", 0.7);

    // 8–13 s · LE FLEUVE, puis l'hiver à Lévis — chiffré par la carte.
    v.glide([[-71.205, 46.812], LEVIS], 2.6);
    v.caption("lower", { fr: "Le fleuve coupe la ville en deux.", en: "The river cuts the city in two." }, { fr: "Traversier : 12 min + l'attente.", en: "Ferry: 12 min + the wait." }, 3);
    await v.wait(3);
    await v.key("h");
    await v.wait(0.5);
    const ecart = (await v.text(PANNEAU)).match(/-\s?\d+\s?%/g)?.pop()?.replace(/\s/g, "") ?? "";
    v.caption("lower",
      { fr: `L'hiver : ${ecart.replace("-", "−")} de territoire.`, en: `Winter: ${ecart.replace("-", "−")} of territory.` },
      { fr: "Vitesses × 0,79 sur chaussée enneigée.", en: "Speeds × 0.79 on snowy pavement." }, 2.2);
    await v.wait(2.2);
    await v.key("h");

    // 13–18 s · LE CONFORT : rapide n'est pas tranquille.
    v.glide([SAINT_ROCH], 1.2);
    await v.wait(0.6);
    await v.select("#vue-portee", "expose");
    v.caption("lower", { fr: "Rapide ≠ tranquille.", en: "Fast ≠ low-stress." }, { fr: "Confort à vélo, hexagone par hexagone.", en: "Cycling comfort, hexagon by hexagon." }, 4.4);
    v.glide([[-71.229, 46.811], SAINT_ROCH], 4.2);
    await v.wait(4.4);

    // 18–25 s · LA VILLE DES 15 MINUTES : un clic, et les lieux tombent.
    await v.select("#vue-portee", "temps");
    await v.wait(0.3);
    await v.click();
    await v.wait(1.2);
    const fonctions = (await v.text(RESULTATS)).match(/(\d)\s*\/\s*(\d)/);
    const n = fonctions ? `${fonctions[1]} / ${fonctions[2]}` : "4 / 4";
    v.caption("lower", { fr: "Ville des 15 minutes", en: "15-minute city" },
      { fr: `${n} fonctions à portée : se soigner, apprendre, s'approvisionner, s'épanouir.`, en: `${n} functions in reach: health, learning, groceries, leisure.` }, 5.4);
    // Le clic recadre de loin (le site laisse la place aux panneaux) : on
    // revient près des lieux, qui remplissent le bas de l'image.
    await v.camera({ center: [-71.205, 46.826], zoom: 12.7 }, 1.4);
    await v.wait(5.4);

    // 25–30 s · L'APPEL : essayer la carte.
    v.caption("end",
      { fr: "Essayez depuis votre adresse", en: "Try it from your address" },
      { fr: "Andrés Lozada — géomatique, Québec", en: "Andrés Lozada — geomatics, Québec" }, 5,
      { kicker: { fr: "Carte interactive", en: "Interactive map" }, url: "geotopics.vercel.app" });
    await v.wait(5);
  },
};
