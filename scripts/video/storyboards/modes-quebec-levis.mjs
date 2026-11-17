/**
 * Vidéo du lab « 15 minutes à pied, à vélo, en auto » — ~30 s, LinkedIn 4:5.
 *
 * Le crochet est un CONTRASTE DE CHIFFRES, lus sur la carte au départ choisi :
 * la surface à pied contre la surface en auto. Les trois animations (piéton,
 * cycliste, auto) restent à l'image du début à la fin, sous la carte ; les
 * titres vont donc EN HAUT, pour ne jamais les couvrir. L'hiver bascule la
 * carte et les trois animations d'un coup.
 *
 * Chiffres : lus dans les cartes des modes (`v.text`), jamais écrits à la main.
 */

const SAINT_ROCH = [-71.2245, 46.8139];
const PRES_SAINT_ROCH = [-71.236, 46.817];
const LIMOILOU = [-71.2155, 46.834];
const LEVIS = [-71.178, 46.806];

// Toute la tache d'auto à l'image, la tache à pied encore lisible.
// Fenêtre de téléphone (540 px) : un cran de zoom de moins qu'à 1080 px.
// Centres décalés vers le nord : la tache tombe dans le bas de la carte, sous
// le titre posé en haut.
const LARGE = { center: [-71.255, 46.885], zoom: 9.3, bearing: 0, pitch: 0 };
const PRES = { center: [-71.215, 46.855], zoom: 10.3 };

const MODES = { pied: "À pied", velo: "À vélo", auto: "En auto" };
const COULEURS = { pied: "#6d3fc0", velo: "#1f9d6b", auto: "#e0a100" };

/** Les chiffres d'une carte de mode : km² à 5, 10, 15 min, et les écarts d'hiver. */
async function lire(v, mode) {
  const t = await v.text(`article[aria-label="${MODES[mode]}"]`);
  const km2 = [...t.matchAll(/(\d+(?:,\d+)?)\s*km²/g)].map((m) => m[1]).slice(0, 3);
  const ecarts = [...t.matchAll(/([−+]\d+)\s*%/g)].map((m) => m[1]).slice(0, 3);
  return { km2, ecarts, km2_15: km2[2], ecart15: ecarts[2] };
}
const nombre = (s) => Number(String(s).replace(",", "."));

const pastilles = Object.entries(MODES)
  .map(([k, l]) => `<span style="color:${COULEURS[k]};font-size:1.1em">●</span>&nbsp;${l.toLowerCase()}`)
  .join("&nbsp;&nbsp;&nbsp;");

export default {
  id: "modes-quebec-levis",
  path: "/fr/blog/modes-quebec-levis",
  poster: 1.2,
  accent: "#14261f",
  // Mise en page du TÉLÉPHONE : les trois animations en colonnes, grandes,
  // sous la carte — c'est le propos. Même sortie 1080 × 1350 (540 × 675 en 4×).
  capture: { w: 540, h: 675, dsf: 4 },

  async run(v) {
    await v.setup(async () => {
      // Le crédit de la carte, replié en « i » : le pied de page porte déjà
      // la source complète (OpenStreetMap…), visible à l'image.
      await v.page.addStyleTag({ content: ".maplibregl-ctrl-attrib-inner{display:none!important}" });
      // La ligne des sources sous la carte, retirée de la vidéo à la demande
      // de l'auteur (elle reste sur le site) ; les sources vont dans le post.
      await v.page.addStyleTag({ content: "figcaption{display:none!important}" });
      await v.jump(LARGE);
      // Préchargement : les vidéos d'hiver et l'hiver des trois graphes.
      await v.at(SAINT_ROCH);
      await v.page.clock.runFor(800);
      await v.key("h");
      await v.page.waitForLoadState("networkidle");
      await v.page.clock.runFor(1500);
      await v.key("h");
      await v.page.clock.runFor(1500);
      await v.at(SAINT_ROCH);
      await v.page.clock.runFor(600);
    });

    const ete = { pied: await lire(v, "pied"), velo: await lire(v, "velo"), auto: await lire(v, "auto") };
    console.log("  été, Saint-Roch :", ete.pied.km2_15, ete.velo.km2_15, ete.auto.km2_15, "km²");

    // 0–3 s · LE CROCHET : le contraste, chiffré par la carte.
    v.caption("hook",
      { fr: `À pied : ${ete.pied.km2_15} km².<br>En auto : ${ete.auto.km2_15} km².` },
      { fr: `Même départ. Mêmes 15 minutes.<br>${pastilles}` }, 3.4, { pos: "top" });
    v.glide([PRES_SAINT_ROCH, SAINT_ROCH], 3.4);
    await v.wait(3.4);

    // 3–8 s · TROIS RÉSEAUX : on s'approche, le curseur file vers Limoilou.
    v.camera(PRES, 4.6);
    v.glide([LIMOILOU], 4.6);
    v.caption("lower", { fr: "Même départ. Trois réseaux." },
      { fr: "Trottoirs et relief · pistes et rues · limites de vitesse" }, 4.8, { pos: "top" });
    await v.wait(4.8);

    // 8–14 s · L'HIVER : la carte et les trois animations basculent ensemble.
    await v.key("h");
    await v.wait(0.9);
    const hiv = { pied: await lire(v, "pied"), velo: await lire(v, "velo"), auto: await lire(v, "auto") };
    console.log("  hiver, Limoilou :", hiv.pied.ecart15, hiv.velo.ecart15, hiv.auto.ecart15);
    const e = (s) => (s ?? "").replace("-", "−");
    v.caption("lower",
      { fr: `L'hiver : ${e(hiv.pied.ecart15)} % à pied, ${e(hiv.velo.ecart15)} % à vélo, ${e(hiv.auto.ecart15)} % en auto` },
      { fr: "Vitesses sur neige : NTNU, Shoman et al., FHWA" }, 5.2, { pos: "top" });
    await v.wait(5.2);

    // 14–19 s · LE FLEUVE : on traverse vers Lévis, toujours l'hiver.
    // La caméra suit vers Lévis : sinon le point tombe au bord bas de la
    // carte, sous le crédit, et le curseur ne touche plus le réseau.
    v.camera({ center: [-71.19, 46.84], zoom: 10.3 }, 2.4);
    v.glide([[-71.2, 46.82], LEVIS], 4.4);
    v.caption("lower", { fr: "Le fleuve et le relief redessinent chaque tache." }, null, 4.8, { pos: "top" });
    await v.wait(4.8);

    // 19–25 s · RETOUR À L'ÉTÉ, vue d'ensemble : le rapport auto / pied.
    await v.key("h");
    v.camera(LARGE, 2.2);
    v.glide([[-71.2, 46.815], SAINT_ROCH], 2.2);
    const rapport = Math.round(nombre(ete.auto.km2_15) / nombre(ete.pied.km2_15));
    v.caption("lower", { fr: `En auto : ×${rapport} la surface à pied.` },
      { fr: "La ville des 15 minutes se joue à pied et à vélo." }, 5.6, { pos: "top" });
    await v.wait(5.6);

    // 25–30 s · L'APPEL.
    v.caption("end",
      { fr: "Essayez depuis votre adresse", en: "Try it from your address" },
      { fr: "Andrés Lozada — géomatique, Québec", en: "Andrés Lozada — geomatics, Québec" }, 5,
      { kicker: { fr: "Carte interactive", en: "Interactive map" }, url: "geotopics.vercel.app" });
    await v.wait(5);
  },
};
