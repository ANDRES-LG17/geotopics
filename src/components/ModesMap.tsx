"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import BandeauVelo from "./BandeauVelo";
import { ReachEngine, type ReachBand, type ReachGraph, type ReachNames } from "@/lib/reach";
import type { LabDefinition, LabTravelMode } from "@/labs/types";
import type { Locale } from "@/i18n/routing";

/**
 * La carte du lab « trois modes » : 15 minutes à pied, à vélo et en auto.
 *
 * Même moteur que le lab vélo (`src/lib/reach.ts`), une instance par mode, sur
 * la MÊME grille : trois canevas superposés, l'auto dessous (la plus grande
 * tache), le piéton dessus. Chaque mouvement du curseur refait les trois
 * parcours ; l'hiver, l'été est d'abord mesuré sans peindre, pour la barre en
 * contour.
 *
 * Sous la carte, une carte par mode — bandeau animé, trois barres — en une
 * rangée basse : rien à faire défiler en écran large. Au téléphone, la rangée
 * devient un carrousel horizontal ; la carte garde la hauteur.
 *
 * Fichier à part de `LabMap` (le lab vélo) : rien de ce lab-là n'est touché.
 */

setWorkerUrl("/maplibre-gl-worker.mjs");

type Mode = LabTravelMode;
type Lecture = { km2: number[]; km2Ete?: number[] };
type Info = { nom: string | null; modes: Array<Lecture | null> };

const rgba = (hex: string, opacite: number): ReachBand["rgba"] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), Math.round(opacite * 255)];
};

type Zone = { c0: number; c1: number; l0: number; l1: number };
type Grille = ReachGraph["grille"];

/**
 * Le BORD de la tache, en lignes : carrés marchants sur l'opacité du canevas,
 * au seuil de la moitié de l'opacité pleine — là où la courbe en S du moteur
 * place le bord visible. Les segments sont chaînés par l'arête de cellule
 * qu'ils partagent (clé entière), pour que les tirets courent sans se
 * rompre à chaque cellule. La zone de travail a un bord vide (MARGE de
 * reach.ts) : les contours se ferment.
 */
function contours(px: Uint8ClampedArray, g: Grille, z: Zone, seuil: number): number[][][] {
  const W = g.colonnes;
  const a = (c: number, l: number) => px[4 * (l * W + c) + 3];
  const lon = (x: number) => g.ouest + x * g.dlon;
  const lat = (y: number) => (2 * Math.atan(Math.exp(g.y_nord - y * g.dy)) - Math.PI / 2) * (180 / Math.PI);
  // Clés d'arête : 2 × indice de cellule (+1 pour une arête verticale).
  const pts = new Map<number, [number, number]>();
  const segs: Array<[number, number]> = [];
  const point = (k: number, x: number, y: number) => {
    if (!pts.has(k)) pts.set(k, [lon(x + 0.5), lat(y + 0.5)]);
    return k;
  };
  const t = (v1: number, v2: number) => (v1 === v2 ? 0.5 : (seuil - v1) / (v2 - v1));
  for (let l = z.l0; l < z.l1; l++) {
    for (let c = z.c0; c < z.c1; c++) {
      const tl = a(c, l), tr = a(c + 1, l), br = a(c + 1, l + 1), bl = a(c, l + 1);
      const cas = (tl >= seuil ? 8 : 0) | (tr >= seuil ? 4 : 0) | (br >= seuil ? 2 : 0) | (bl >= seuil ? 1 : 0);
      if (cas === 0 || cas === 15) continue;
      // Les quatre arêtes de la case, avec leur point interpolé.
      const haut = () => point(2 * (l * W + c), c + t(tl, tr), l);
      const bas = () => point(2 * ((l + 1) * W + c), c + t(bl, br), l + 1);
      const gauche = () => point(2 * (l * W + c) + 1, c, l + t(tl, bl));
      const droite = () => point(2 * (l * W + c + 1) + 1, c + 1, l + t(tr, br));
      const centre = (tl + tr + br + bl) / 4 >= seuil;
      switch (cas) {
        case 1: case 14: segs.push([gauche(), bas()]); break;
        case 2: case 13: segs.push([bas(), droite()]); break;
        case 3: case 12: segs.push([gauche(), droite()]); break;
        case 4: case 11: segs.push([haut(), droite()]); break;
        case 6: case 9: segs.push([haut(), bas()]); break;
        case 7: case 8: segs.push([gauche(), haut()]); break;
        case 5:
          if (centre) { segs.push([gauche(), haut()]); segs.push([bas(), droite()]); }
          else { segs.push([gauche(), bas()]); segs.push([haut(), droite()]); }
          break;
        case 10:
          if (centre) { segs.push([gauche(), bas()]); segs.push([haut(), droite()]); }
          else { segs.push([gauche(), haut()]); segs.push([bas(), droite()]); }
          break;
      }
    }
  }
  // Chaînage : chaque clé d'arête touche deux segments (contour fermé).
  const parCle = new Map<number, number[]>();
  segs.forEach(([p, q], i) => {
    (parCle.get(p) ?? parCle.set(p, []).get(p)!).push(i);
    (parCle.get(q) ?? parCle.set(q, []).get(q)!).push(i);
  });
  const pris = new Uint8Array(segs.length);
  const lignes: number[][][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (pris[s]) continue;
    pris[s] = 1;
    const chaine = [segs[s][0], segs[s][1]];
    let fin = segs[s][1];
    for (;;) {
      const suivant = parCle.get(fin)?.find((i) => !pris[i]);
      if (suivant === undefined) break;
      pris[suivant] = 1;
      fin = segs[suivant][0] === fin ? segs[suivant][1] : segs[suivant][0];
      chaine.push(fin);
    }
    // Les miettes (quelques cellules) ne portent pas de tirets lisibles.
    if (chaine.length >= 6) lignes.push(chaine.map((k) => pts.get(k)!));
  }
  return lignes;
}

/**
 * Curseur : un rond blanc cerclé d'encre, un point au centre — neutre, aucun
 * mode n'est privilégié. Point chaud au centre ; `crosshair` en repli. Le
 * script vidéo le reprend tel quel pour le dessiner dans les captures.
 */
const SVG_CURSEUR = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">',
  '<circle cx="16" cy="16" r="13" fill="#ffffff" fill-opacity="0.95" stroke="#14261f" stroke-width="2"/>',
  '<circle cx="16" cy="16" r="3.5" fill="#14261f"/>',
  "</svg>",
].join("");
const CURSEUR = `url("data:image/svg+xml,${encodeURIComponent(SVG_CURSEUR)}") 12 12, crosshair`;

/** Bande d'accès peinte autour de chaque rue atteinte, en km. */
const ACCES_KM = 0.2;

const nombre = (v: number, lang: Locale, d = 1) =>
  v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function ModesMap({
  lab,
  label,
  errorLabel,
  locale: lang,
  fill = false,
}: {
  lab: LabDefinition;
  label: string;
  errorLabel: string;
  locale: Locale;
  fill?: boolean;
}) {
  const cfg = lab.modes!;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hiver, setHiver] = useState(false);
  const hiverRef = useRef(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [epingle, setEpingle] = useState(false);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");
  const redessinerRef = useRef<() => void>(() => {});
  const libererRef = useRef<() => void>(() => {});

  useEffect(() => {
    hiverRef.current = hiver;
    redessinerRef.current();
  }, [hiver]);

  // Raccourcis : H saison, Échap libérer le départ.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "Escape") libererRef.current();
      else if ((e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey && !e.altKey) setHiver((v) => !v);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const basemap = lab.basemap;
    const view = lab.view;
    const map = new MapLibreMap({
      container,
      clickTolerance: 8,
      style: basemap?.kind === "style" ? basemap.url : { version: 8, sources: {}, layers: [] },
      ...("bounds" in view
        ? { bounds: [[view.bounds[0], view.bounds[1]], [view.bounds[2], view.bounds[3]]] as [[number, number], [number, number]], fitBoundsOptions: { padding: 16 } }
        : { center: view.center, zoom: view.zoom }),
      maxZoom: lab.maxZoom,
      cooperativeGestures: false,
      attributionControl: {
        compact: true,
        ...(basemap?.kind === "style" && basemap.attribution ? { customAttribution: basemap.attribution[lang] } : {}),
      },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.getCanvas().style.cursor = CURSEUR;

    const modes = cfg.list;
    const bande = cfg.thresholds[cfg.thresholds.length - 1];
    let moteurs: ReachEngine[] | null = null;
    let noms: ReachNames | null = null;
    let carteChargee = false;
    const canevas = modes.map(() => document.createElement("canvas"));
    const images: Array<ImageData | null> = modes.map(() => null);
    const zonesAvant: Array<{ c0: number; c1: number; l0: number; l1: number } | null> = modes.map(() => null);
    let point: { lng: number; lat: number } | null = null;
    let fixe: { lng: number; lat: number } | null = null;
    let attente = 0;
    let tout = true;
    let departsAvant = "";
    let detruit = false;

    const peindre = () => {
      attente = 0;
      if (!moteurs || !carteChargee || images.some((i) => !i)) return;
      const ici = fixe ?? point;
      const enHiver = hiverRef.current;
      const departs = moteurs.map((m, i) => {
        const md = modes[i];
        const s = enHiver && md.winterScenario ? md.winterScenario : md.scenario;
        return ici ? m.depart(ici.lng, ici.lat, s) : -1;
      });
      const cle = departs.join(",");
      if (!tout && cle === departsAvant) return;
      tout = false;
      departsAvant = cle;

      const lectures: Array<Lecture | null> = modes.map((md, i) => {
        const m = moteurs![i];
        const depart = departs[i];
        const s = enHiver && md.winterScenario ? md.winterScenario : md.scenario;
        const facteur = enHiver && md.winterSpeedRatio ? 1 / md.winterSpeedRatio : 1;
        const km2Ete = enHiver && depart >= 0 ? m.mesurer(depart, md.scenario, cfg.thresholds) : undefined;
        const img = images[i]!;
        const km2 = m.peindre(
          depart,
          s,
          [{ max: bande, rgba: rgba(enHiver ? md.color.winter : md.color.summer, cfg.opacity) }],
          img.data,
          cfg.thresholds,
          facteur,
        );
        // N'envoyer que le rectangle qui change : l'ancienne tache et la nouvelle.
        const zone = depart >= 0 ? m.zonePeinte() : null;
        const avant = zonesAvant[i];
        const rect = [avant, zone].reduce<typeof zone>(
          (acc, z) =>
            !z ? acc : !acc ? { ...z } : { c0: Math.min(acc.c0, z.c0), c1: Math.max(acc.c1, z.c1), l0: Math.min(acc.l0, z.l0), l1: Math.max(acc.l1, z.l1) },
          null,
        );
        zonesAvant[i] = zone ? { ...zone } : null;
        // Le bord en tirets, tiré du canevas qui vient d'être peint.
        const bord = map.getSource(`modes-${md.id}-bord`) as { setData: (d: unknown) => void } | undefined;
        bord?.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiLineString",
            coordinates: zone ? contours(img.data, m.g.grille, zone, (cfg.opacity * 255) / 2) : [],
          },
        });
        if (rect) {
          canevas[i].getContext("2d")?.putImageData(img, 0, 0, rect.c0, rect.l0, rect.c1 - rect.c0 + 1, rect.l1 - rect.l0 + 1);
          const src = map.getSource(`modes-${md.id}`) as { play?: () => void; pause?: () => void } | undefined;
          src?.play?.();
          src?.pause?.();
        }
        return depart >= 0 ? { km2, km2Ete } : null;
      });

      const iNoms = modes.findIndex((md) => md.id === cfg.namesMode);
      const nom = iNoms >= 0 && departs[iNoms] >= 0 ? moteurs[iNoms].nomDepart(departs[iNoms], modes[iNoms].scenario, noms) : null;
      setInfo(lectures.some(Boolean) ? { nom, modes: lectures } : null);
    };
    const redessiner = (complet = true) => {
      if (complet) tout = true;
      if (!attente) attente = requestAnimationFrame(peindre);
    };
    /**
     * La saison sur la carte, hors taches : la couleur des bords, et l'hiver
     * un fond gris bleuté (fond et eau du style), mémorisé pour revenir à
     * l'été tel quel.
     */
    const origine = new Map<string, ReturnType<MapLibreMap["getPaintProperty"]>>();
    const appliquerSaison = () => {
      if (!carteChargee) return;
      const enHiver = hiverRef.current;
      for (const md of modes) {
        const id = `modes-${md.id}-bord`;
        if (map.getLayer(id)) map.setPaintProperty(id, "line-color", enHiver ? md.outline.winter : md.outline.summer);
      }
      const fond = cfg.winterBasemap;
      if (!fond) return;
      for (const couche of map.getStyle().layers ?? []) {
        const prop =
          couche.type === "background" ? "background-color" : couche.type === "fill" && /water/.test(couche.id) ? "fill-color" : null;
        if (!prop) continue;
        const cle = `${couche.id}|${prop}`;
        if (!origine.has(cle)) origine.set(cle, map.getPaintProperty(couche.id, prop));
        map.setPaintProperty(
          couche.id,
          prop,
          // La valeur d'origine est une couleur ou une expression du style.
          (enHiver ? (prop === "background-color" ? fond.background : fond.water) : origine.get(cle)) as string,
        );
      }
    };
    redessinerRef.current = () => {
      appliquerSaison();
      redessiner();
    };

    const marquer = () => {
      const src = map.getSource("modes-depart") as { setData: (d: unknown) => void } | undefined;
      src?.setData({
        type: "FeatureCollection",
        features: fixe ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [fixe.lng, fixe.lat] } }] : [],
      });
    };
    libererRef.current = () => {
      if (!fixe) return;
      fixe = null;
      setEpingle(false);
      marquer();
      redessiner();
    };

    const poser = () => {
      if (!moteurs || !carteChargee || map.getSource(`modes-${modes[0].id}`)) return;
      // Sous les étiquettes du fond : les noms de quartiers restent lisibles.
      const avantEtiquettes = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
      // Du dessous au-dessus : la plus grande tache d'abord (dernier mode).
      for (let i = modes.length - 1; i >= 0; i--) {
        const { colonnes, lignes, coins } = moteurs[i].g.grille;
        canevas[i].width = colonnes;
        canevas[i].height = lignes;
        images[i] = canevas[i].getContext("2d")?.createImageData(colonnes, lignes) ?? null;
        const id = `modes-${modes[i].id}`;
        map.addSource(id, {
          type: "canvas",
          canvas: canevas[i],
          coordinates: coins as [[number, number], [number, number], [number, number], [number, number]],
          animate: false,
        });
        map.addLayer(
          {
            id,
            type: "raster",
            source: id,
            paint: {
              "raster-resampling": "linear",
              "raster-fade-duration": 0,
              "raster-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 1, 15, 0.3],
            },
          },
          avantEtiquettes,
        );
      }
      // Les bords, au-dessus des trois taches (sinon une tache claire
      // couvrirait le bord d'une autre), dans le même ordre.
      for (let i = modes.length - 1; i >= 0; i--) {
        const md = modes[i];
        const id = `modes-${md.id}-bord`;
        map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer(
          {
            id,
            type: "line",
            source: id,
            layout: { "line-join": "round", "line-cap": md.outline.dash[0] < 1 ? "round" : "butt" },
            paint: {
              "line-color": hiverRef.current ? md.outline.winter : md.outline.summer,
              "line-width": md.id === "pied" ? 2.2 : 1.7,
              "line-dasharray": md.outline.dash,
            },
          },
          avantEtiquettes,
        );
      }
      appliquerSaison();
      map.addSource("modes-depart", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "modes-depart",
        type: "circle",
        source: "modes-depart",
        paint: { "circle-radius": 6, "circle-color": "#14261f", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
      });
      setEtat("pret");
      redessiner();
    };

    map.on("load", () => {
      carteChargee = true;
      poser();
      // Mode vidéo (`?video=1`) : le script d'enregistrement (`scripts/video/`)
      // pilote la caméra par la carte elle-même, comme dans `LabMap`.
      if (new URLSearchParams(window.location.search).get("video") === "1") {
        (window as unknown as { __geoVideo?: { map: MapLibreMap } }).__geoVideo = { map };
      }
    });
    map.on("mousemove", (e) => {
      if (fixe) return;
      point = e.lngLat;
      redessiner(false);
    });
    map.on("mouseout", () => {
      if (fixe) return;
      point = null;
      redessiner(false);
    });
    map.on("click", (e) => {
      fixe = e.lngLat;
      point = e.lngLat;
      setEpingle(true);
      marquer();
      redessiner();
    });
    map.on("contextmenu", () => libererRef.current());

    const json = <T,>(url: string) =>
      fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(`${url} ${r.status}`))));
    Promise.all(modes.map((md) => json<ReachGraph>(md.url)))
      .then((graphes) => {
        if (detruit) return;
        moteurs = graphes.map((g) => new ReachEngine(g));
        poser();
        // Les noms arrivent après : la tache n'en a pas besoin.
        json<ReachNames>(cfg.names)
          .then((n) => {
            noms = n;
            redessiner();
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!detruit) setEtat("erreur");
      });

    return () => {
      detruit = true;
      if (attente) cancelAnimationFrame(attente);
      map.remove();
    };
  }, [lab, cfg, lang]);

  const saison = hiver ? (lang === "fr" ? "hiver" : "winter") : lang === "fr" ? "été" : "summer";
  // Ni l'orange ni le bleu du lab vélo : l'encre l'été, l'ardoise l'hiver.
  const fort = hiver ? "#34465a" : "#14261f";

  return (
    <div className={`flex min-h-0 flex-col gap-2 sm:gap-3 ${fill ? "h-full flex-1" : ""}`}>
      <div className={`relative min-h-0 overflow-hidden rounded-xl border border-line ${fill ? "flex-1" : "h-[420px] sm:h-[520px]"}`}>
        {/* Pas `absolute inset-0` : MapLibre impose `position: relative` à son conteneur. */}
        <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />

        {/* Départ et saison, en haut à gauche. */}
        <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-4rem)] flex-wrap items-center gap-2 sm:left-3 sm:top-3">
          <div className="min-w-0 rounded-lg border border-line bg-surface/95 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              {lang === "fr" ? "Départ" : "Start"}
              {epingle && (
                <button
                  type="button"
                  onClick={() => libererRef.current()}
                  className="ml-2 rounded border border-line px-1.5 text-[10px] font-medium normal-case tracking-normal text-fg-muted hover:text-fg"
                  title={lang === "fr" ? "Libérer (Échap ou clic droit)" : "Release (Esc or right-click)"}
                >
                  {lang === "fr" ? "Libérer" : "Release"}
                </button>
              )}
            </p>
            <p className="m-0 truncate text-sm font-semibold leading-tight text-fg">
              {info?.nom ?? <span className="font-normal text-fg-subtle">{cfg.empty[lang]}</span>}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label={lang === "fr" ? "Saison" : "Season"}
            className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface/95 p-0.5 shadow-md backdrop-blur-sm"
          >
            {[
              { v: false, fr: "Été", en: "Summer" },
              { v: true, fr: "Hiver", en: "Winter" },
            ].map((o) => (
              <button
                key={o.en}
                type="button"
                role="radio"
                aria-checked={hiver === o.v}
                onClick={() => setHiver(o.v)}
                title={lang === "fr" ? "Touche H" : "H key"}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-700 ${
                  hiver === o.v ? "text-white" : "text-fg-muted hover:text-fg"
                }`}
                style={hiver === o.v ? { backgroundColor: fort } : undefined}
              >
                {o[lang]}
              </button>
            ))}
          </div>
        </div>

        {etat !== "pret" && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 m-0 text-center text-sm text-fg-muted">
            {etat === "erreur" ? errorLabel : lang === "fr" ? "Chargement des trois réseaux…" : "Loading the three networks…"}
          </p>
        )}
        {etat === "pret" && !info && (
          <p className="pointer-events-none absolute bottom-8 right-3 z-10 m-0 hidden max-w-[18rem] rounded-lg border border-line bg-surface/90 px-3 py-2 text-xs leading-snug text-fg-muted shadow-sm backdrop-blur-sm sm:block">
            {cfg.hint[lang]}
          </p>
        )}
      </div>

      {/*
        Les trois cartes, toujours côte à côte : rangée basse en écran large,
        trois colonnes au téléphone (animation en tête, chiffres dessous).
      */}
      <section aria-label={cfg.title[lang]} className="shrink-0">
        <h2 className="m-0 mb-1.5 truncate px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          {cfg.title[lang]} · {saison}
          {hiver && (
            <span className="hidden font-normal normal-case tracking-normal sm:inline">
              {lang === "fr" ? " — contour : l'été" : " — outline: summer"}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-3 gap-1.5 md:gap-3">
          {cfg.list.map((md, i) => (
            <CarteMode
              key={md.id}
              mode={md}
              lecture={info?.modes[i] ?? null}
              thresholds={cfg.thresholds}
              hiver={hiver}
              lang={lang}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function CarteMode({
  mode,
  lecture,
  thresholds,
  hiver,
  lang,
}: {
  mode: Mode;
  lecture: Lecture | null;
  thresholds: number[];
  hiver: boolean;
  lang: Locale;
}) {
  const couleur = hiver ? mode.color.winter : mode.color.summer;
  const trait = hiver ? mode.outline.winter : mode.outline.summer;
  // Le motif du bord sur la carte (en largeurs de trait), redessiné ici.
  const motif = mode.outline.dash.map((v) => Math.max(1, v * 2)).join(" ");
  // Les trois budgets, calculés une fois pour les deux mises en page.
  const lignes = thresholds.map((minutes, k) => {
    const km2 = lecture?.km2[k] ?? 0;
    const ete = lecture?.km2Ete?.[k];
    // Disque de référence : ligne droite + ≈ 200 m d'accès (voir plus bas).
    const rayon = (mode.discSpeed * minutes) / 60 + ACCES_KM;
    const disque = Math.PI * rayon * rayon;
    return {
      minutes,
      km2,
      part: Math.min(1, km2 / disque),
      partEte: ete !== undefined ? Math.min(1, ete / disque) : null,
      ecart: ete ? Math.round(100 * (km2 / ete - 1)) : null,
    };
  });
  const pourcent = (e: number) => `${e > 0 ? "+" : e < 0 ? "−" : ""}${Math.abs(e)}${lang === "fr" ? " %" : "%"}`;
  return (
    <article
      aria-label={mode.label[lang]}
      // Téléphone : trois COLONNES côte à côte, l'animation en tête et les
      // chiffres dessous — les trois modes se lisent ensemble, sans faire
      // défiler. Écran large : une carte basse, animation à gauche. Un seul
      // bandeau dans les deux cas : la vidéo n'est décodée qu'une fois.
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-t-4 border-line border-t-[var(--c)] bg-surface-muted shadow-sm transition-colors duration-700 md:h-[7.5rem] md:flex-row md:rounded-xl md:border-l-4 md:border-t md:border-l-[var(--c)] md:border-t-line"
      style={{ "--c": couleur } as React.CSSProperties}
    >
      {/* 3:2 au téléphone : en 4:3, l'avant de l'auto était rogné. */}
      <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden md:aspect-auto md:w-[40%]">
        {mode.media ? (
          <BandeauVelo media={mode.media} hiver={hiver} rapide={false} className="h-full w-full" />
        ) : (
          <Pictogramme mode={mode.id} couleur={couleur} lang={lang} />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <p className="absolute bottom-1 left-1.5 m-0 text-[11px] font-semibold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)] md:bottom-1.5 md:left-2 md:text-[13px]">
          {mode.label[lang]}
        </p>
      </div>

      {/* Téléphone : sous l'animation, les trois budgets, l'un sous l'autre. */}
      <div className="grid min-w-0 gap-1.5 px-2 py-2 md:hidden">
        {lignes.map((l) => (
          <div key={l.minutes} className="grid min-w-0 gap-0.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[9.5px] tabular-nums text-fg-muted">{l.minutes} min</span>
              <span className="truncate text-[12px] font-semibold leading-none tabular-nums text-fg">
                {lecture ? nombre(l.km2, lang, l.km2 < 10 ? 1 : 0) : "—"}
                <span className="ml-0.5 text-[9px] font-medium text-fg-muted">km²</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                {l.partEte !== null && (
                  <div className="absolute inset-y-0 left-0 rounded-full border" style={{ width: `${l.partEte * 100}%`, borderColor: couleur }} />
                )}
                <div className="relative h-full rounded-full transition-[width,background-color] duration-150" style={{ width: `${l.part * 100}%`, backgroundColor: couleur }} />
              </div>
              {l.ecart !== null && (
                <span className="shrink-0 text-[9px] leading-none tabular-nums text-fg-subtle">{pourcent(l.ecart)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden min-w-0 flex-1 content-center gap-1.5 px-3 py-2 md:grid">
        {/* La légende du mode : son aplat et son bord, tels que sur la carte. */}
        <p className="m-0 flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
          <svg aria-hidden="true" width="26" height="12" className="shrink-0">
            <rect x="1.5" y="1.5" width="23" height="9" rx="2" fill={couleur} fillOpacity="0.45" stroke={trait} strokeWidth="1.6" strokeDasharray={motif} strokeLinecap={mode.outline.dash[0] < 1 ? "round" : "butt"} />
          </svg>
          {lang === "fr" ? "Bord : limite des 15 min" : "Edge: 15-min limit"}
        </p>
        {lignes.map(({ minutes, km2, part, partEte, ecart }) => {
          // Disque de référence : la distance en ligne droite, PLUS les ≈ 200 m
          // que la tache peint de part et d'autre de chaque rue atteinte
          // (`RAYON` de reach.ts). Sans eux, à pied, les barres de 5 et 10 min
          // dépassaient toujours le disque.
          const rayon = (mode.discSpeed * minutes) / 60 + ACCES_KM;
          return (
            <div key={minutes} className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-[11px] tabular-nums text-fg-muted">{minutes} min</span>
              <div
                className="relative h-2 overflow-hidden rounded-full bg-surface"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(part * 100)}
                aria-label={`${mode.label[lang]}, ${minutes} min`}
                title={
                  lang === "fr"
                    ? `${nombre(part * 100, lang, 0)} % du disque de ${nombre(rayon, lang, 1)} km (${mode.discSpeed} km/h en ligne droite, + 200 m d'accès)`
                    : `${nombre(part * 100, lang, 0)}% of the ${nombre(rayon, lang, 1)} km disc (${mode.discSpeed} km/h in a straight line, + 200 m access)`
                }
              >
                {partEte !== null && (
                  <div aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full border" style={{ width: `${partEte * 100}%`, borderColor: couleur }} />
                )}
                <div className="relative h-full rounded-full transition-[width,background-color] duration-150" style={{ width: `${part * 100}%`, backgroundColor: couleur }} />
              </div>
              <span className="text-right text-[12px] font-semibold tabular-nums text-fg">
                {lecture ? nombre(km2, lang, km2 < 10 ? 1 : 0) : "—"}
                <span className="ml-0.5 text-[10.5px] font-medium text-fg-muted">km²</span>
                {ecart !== null && <span className="ml-1 text-[10.5px] font-normal text-fg-subtle">{pourcent(ecart)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** En attendant la vidéo du mode : un pictogramme sur la couleur de la saison. */
function Pictogramme({ mode, couleur, lang }: { mode: Mode["id"]; couleur: string; lang: Locale }) {
  return (
    <div className="flex h-full w-full items-center justify-center transition-colors duration-700" style={{ backgroundColor: couleur }}>
      <svg viewBox="0 0 48 48" className="h-12 w-12 text-white/90" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={lang === "fr" ? "Animation à venir" : "Animation coming"}>
        {mode === "auto" ? (
          <>
            <path d="M6 30v-6l5-9h22l7 9h2v6" />
            <path d="M6 30h36" />
            <circle cx="14" cy="32" r="4" />
            <circle cx="34" cy="32" r="4" />
            <path d="M12 24h28" />
          </>
        ) : (
          <>
            <circle cx="26" cy="8" r="3.5" />
            <path d="M24 15l-5 11 6 5 2 11M24 15l5 9 7 2M19 26l-6 4M25 31l-7 11" />
          </>
        )}
      </svg>
    </div>
  );
}
