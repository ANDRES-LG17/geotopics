"use client";

import { useEffect, useId, useRef, useState } from "react";
import BandeauVelo from "./BandeauVelo";
import type { Bilingual } from "@/labs/types";

type MediaSaison = { webm: string; mp4: string; poster: string };

/**
 * Le panneau de la portée sous le curseur — à CÔTÉ de la carte, comme
 * `LabPanel`, pour la même raison : posé dessus, il masquerait la tache.
 *
 * Il dit deux choses : d'OÙ l'on part (la voie sous le curseur) et COMBIEN de
 * territoire on atteint, à trois budgets de temps. Chaque surface est comparée
 * à un disque — ce qu'on couvrirait en ligne droite à la même vitesse — parce
 * qu'un nombre de km² seul ne dit pas s'il est grand ou petit. La barre est
 * cette part ; le nombre reste écrit à côté.
 *
 * EN HIVER, la barre d'été reste en fond, en contour, et la barre d'hiver se
 * pose devant : l'écart se voit sans lire un chiffre, et le chiffre est écrit
 * quand même.
 *
 * Aucun calcul ici : les surfaces arrivent du moteur (`src/lib/reach.ts`).
 */

export type InfoPortee = {
  nom: string | null;
  km2: number[];
  km2Ete?: number[];
  /**
   * Vue « confort à vélo » : confort moyen de la tache (0–1, pondéré par les
   * km parcourus), coupures de piste atteintes, hexagones dessinés.
   */
  confort?: {
    indice: number;
    coupures: number;
    hexagones: number;
    /** Les quatre lectures : été / hiver × aujourd'hui / avec les corridors. */
    lectures?: { ete: number; hiver: number; eteCvc: number; hiverCvc: number };
  };
};

export type VuePortee = "temps" | "expose";

/** Ville des 15 minutes : lieux de chaque fonction touchés par la tache épinglée. */
export type InfoLieux = {
  etat: "chargement" | "pret";
  /** Une liste par fonction, triée par temps d'accès. */
  parFonction?: Array<Array<LieuListe>>;
};
export type LieuListe = { nom: string; minutes: number; lon: number; lat: number; noeud: number };

/** L'itinéraire entre deux clics, tel que le panneau l'affiche. */
export type InfoItineraire = {
  etat: "depart" | "arrivee" | "chargement" | "pret" | "introuvable" | "hors-reseau";
  minutes?: number;
  km?: number;
  dPlus?: number;
  dMoins?: number;
  /** Part de la distance sur des voies tranquilles (≤ 40 km/h ou hors rue). */
  partTranquille?: number;
  /**
   * Profil en long, un point par nœud du trajet : distance cumulée (km),
   * altitude (m), heure d'arrivée (min), et si l'arête qui y mène est exposée.
   */
  profil?: { km: number[]; z: number[]; t: number[]; expose: boolean[] };
  etapes?: Array<{
    nom: string;
    km: number;
    minutes: number;
    expose: boolean;
    aPied: boolean;
    penteMax: number;
  }>;
};

const MESSAGES: Record<InfoItineraire["etat"], { fr: string; en: string }> = {
  depart: { fr: "Cliquez le point de départ.", en: "Click the starting point." },
  arrivee: { fr: "Cliquez le point d'arrivée.", en: "Click the destination." },
  chargement: { fr: "Chargement des tronçons…", en: "Loading segments…" },
  pret: { fr: "", en: "" },
  introuvable: {
    fr: "Aucun trajet à vélo entre ces deux points.",
    en: "No bike route between these two points.",
  },
  "hors-reseau": {
    fr: "Point trop loin d'une voie cyclable (plus de 300 m). Cliquez plus près d'une rue.",
    en: "Point too far from a bikeable street (over 300 m). Click closer to a street.",
  },
};

/** Durée lisible : « 23 min », « 1 h 05 ». */
const duree = (minutes: number) => {
  const m = Math.round(minutes);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

const nombre = (v: number, lang: "fr" | "en", decimales = 1) =>
  v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

export default function ReachPanel({
  info,
  title,
  thresholds,
  discSpeed,
  barColors,
  empty,
  legende,
  lang,
  hiver,
  vues,
  mode,
  itineraire,
  bandeau,
  halo,
  className = "",
  style,
}: {
  info: InfoPortee | null;
  title: Bilingual;
  thresholds: number[];
  discSpeed: number;
  /** Une couleur par budget, dans l'ordre de `thresholds`. */
  barColors: string[];
  note: Bilingual;
  empty: Bilingual;
  legende?: Array<{ color: string; label: Bilingual }>;
  lang: "fr" | "en";
  /** Interrupteur été / hiver ; absent = pas d'interrupteur. */
  hiver?: { actif: boolean; onChange: (v: boolean) => void; note: Bilingual };
  /** Liste des vues ; absent = pas de liste. */
  vues?: {
    actuelle: VuePortee;
    options: Array<{ id: VuePortee; label: Bilingual }>;
    onChange: (v: VuePortee) => void;
    /** Définition du chiffre de la vue « rues exposées ». */
    noteExpose: Bilingual;
    /** Couleurs de la colmena (rampe du confort, coupure), pour le panneau. */
    rampe?: {
      couleurs: string[];
      coupure: string;
      contour: string;
      /** L'hiver : les pistes entretenues dessinées sur la carte. */
      hiver?: { couleur: string; deneige: Bilingual; dame: Bilingual; note: Bilingual };
      /** L'été : les corridors VivaCité réalisés dessinés sur la carte. */
      ete?: { couleur: string; label: Bilingual };
    };
    /** Interrupteur « aujourd'hui / avec les 14 corridors VivaCité ». */
    corridors?: { actif: boolean; onChange: (v: boolean) => void; aujourdhui: Bilingual; avec: Bilingual };
  };
  /** Portée ou itinéraire ; absent = portée seule. */
  mode?: { actuel: "portee" | "itineraire"; onChange: (v: "portee" | "itineraire") => void };
  itineraire?: InfoItineraire | null;
  /** Ville des 15 minutes ; absent = pas de bloc. */
  lieux?: {
    info: InfoLieux | null;
    title: Bilingual;
    functions: Array<{ id: string; label: Bilingual; color: string }>;
    prompt: Bilingual;
    /** La consigne en une ligne, pour le panneau de portée. */
    promptShort?: Bilingual;
    note: Bilingual;
    onLiberer: () => void;
    /**
     * Clic sur un lieu de la liste : zoom dessus, ou — pendant le choix d'une
     * destination — itinéraire vers lui.
     */
    onLieu: (l: LieuListe) => void;
    /** Survol d'un lieu de la liste : la carte le cerne ; null à la sortie. */
    onSurvol?: (l: LieuListe | null) => void;
    /** Lieu survolé SUR LA CARTE : sa ligne se marque dans la liste. */
    survolNom?: string | null;
  };
  /** Bandeau animé du départ : un paysage par saison. */
  bandeau?: { summer: MediaSaison; winter: MediaSaison; alt: Bilingual };
  /**
   * Couleur de la saison (celle de la tache) : un liseré intérieur très
   * discret, qui relie le panneau à la carte sans attirer l'œil.
   */
  halo?: string;
  /** Placement dans la grille, ex. `lg:order-first` pour passer à gauche. */
  className?: string;
  style?: React.CSSProperties;
}) {
  const enHiver = Boolean(hiver?.actif);
  const enItineraire = mode?.actuel === "itineraire";
  return (
    <aside
      aria-label={title[lang]}
      className={`flex max-h-[14rem] flex-col overflow-y-auto rounded-xl border border-line bg-surface-muted transition-[box-shadow,transform,opacity] duration-300 ease-out ${className}`}
      style={{
        ...style,
        ...(halo
          ? {
              // Ombre portée (le panneau flotte) + liseré intérieur de 3 px à
              // 60 % et halo intérieur diffus à 30 % : la saison se lit au
              // bord du panneau, sans rien retirer à la carte.
              boxShadow: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), inset 0 0 0 3px ${halo}99, inset 0 0 30px ${halo}4d`,
            }
          : {}),
      }}
    >
      {bandeau && (
        <BandeauSaison
          bandeau={bandeau}
          hiver={enHiver}
          lang={lang}
          titre={enItineraire ? (lang === "fr" ? "Itinéraire" : "Route") : lang === "fr" ? "Départ" : "Start"}
          texte={enItineraire ? null : info?.nom ?? null}
          vide={enItineraire ? (lang === "fr" ? "Le plus rapide, de A à B" : "Fastest, from A to B") : empty[lang]}
        />
      )}

      {mode && (
        <section className={`px-4 pb-1 ${bandeau ? "pt-3" : "pt-4"}`}>
          <div
            role="tablist"
            aria-label={lang === "fr" ? "Mode" : "Mode"}
            className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1"
          >
            {(
              [
                { v: "portee", fr: "Portée", en: "Reach" },
                { v: "itineraire", fr: "Itinéraire", en: "Route" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                role="tab"
                aria-selected={mode.actuel === o.v}
                onClick={() => mode.onChange(o.v)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  mode.actuel === o.v ? "bg-fg text-surface" : "text-fg-muted hover:text-fg"
                }`}
              >
                {o[lang]}
              </button>
            ))}
          </div>
        </section>
      )}

      {!enItineraire && !bandeau && (
        <section className="grid gap-1 px-4 pb-3 pt-3">
          <h3 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {lang === "fr" ? "Départ" : "Start"}
          </h3>
          <p className="m-0 text-base font-semibold leading-tight text-fg [text-wrap:balance]">
            {info?.nom ?? <span className="font-normal text-fg-subtle">{empty[lang]}</span>}
          </p>
        </section>
      )}

      {enItineraire && <BlocItineraire info={itineraire ?? { etat: "depart" }} lang={lang} />}


      {/*
        Réglages sur UNE rangée — saison à gauche, vue à droite — puis les
        raccourcis en une ligne : le panneau tient sans défiler sur un écran
        de portable.
      */}
      {(vues || hiver) && !enItineraire && (
        <section className="grid gap-1.5 border-t border-line px-4 py-2.5">
          <div className="grid grid-cols-2 items-center gap-2">
            {hiver ? (
              // Deux boutons radio plutôt qu'une case à cocher : « été » et
              // « hiver » sont deux états qui se nomment, pas un oui/non.
              <div
                role="radiogroup"
                aria-label={lang === "fr" ? "Conditions" : "Conditions"}
                className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-0.5"
              >
                {[
                  { v: false, fr: "Été", en: "Summer" },
                  { v: true, fr: "Hiver", en: "Winter" },
                ].map((o) => (
                  <button
                    key={o.en}
                    type="button"
                    role="radio"
                    aria-checked={enHiver === o.v}
                    onClick={() => hiver.onChange(o.v)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-700 ${
                      enHiver === o.v
                        ? "bg-[var(--s-fort)] text-white"
                        : "text-fg-muted hover:bg-[var(--s-teinte)] hover:text-[var(--s-texte)]"
                    }`}
                  >
                    {o[lang]}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            {vues && (
              <select
                id="vue-portee"
                aria-label={lang === "fr" ? "Afficher" : "Show"}
                value={vues.actuelle}
                onChange={(e) => {
                  vues.onChange(e.target.value as VuePortee);
                  // La liste rend la main : sinon le focus y reste, et les
                  // raccourcis H, N, [ ] (ignorés dans un champ) ne marchent plus.
                  e.currentTarget.blur();
                }}
                className="w-full min-w-0 rounded-lg border border-[var(--s-bord)] bg-surface px-2 py-1 text-xs text-fg transition-colors duration-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--s-fort)]"
              >
                {vues.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label[lang]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="m-0 text-center text-[10.5px] text-fg-subtle">
            {[
              ...(hiver ? [["H", lang === "fr" ? "saison" : "season"]] : []),
              ["N", lang === "fr" ? "nord" : "north"],
              ["[ ]", lang === "fr" ? "panneaux" : "panels"],
            ].map(([k, t], i) => (
              <span key={k}>
                {i > 0 && " · "}
                <kbd className="rounded border border-line bg-surface px-1 font-mono text-[10px] text-fg-muted">{k}</kbd>{" "}
                {t}
              </span>
            ))}
          </p>
        </section>
      )}

      {/*
        Vue « confort à vélo » : le confort moyen de la tache (le même indice
        que les alvéoles, sur toute la tache), sa place sur la rampe de la
        carte, et le nombre de pistes coupées. Des mots simples, pas de note.
      */}
      {vues?.actuelle === "expose" && !enItineraire && (
        <section className="grid gap-2 border-t border-line px-4 py-3">
          {/* Aujourd'hui / avec les 14 corridors : même interrupteur que la saison. */}
          {vues.corridors && (
            <div
              role="radiogroup"
              aria-label={lang === "fr" ? "Réseau" : "Network"}
              className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-0.5"
            >
              {[
                { v: false, l: vues.corridors.aujourdhui },
                { v: true, l: vues.corridors.avec },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={vues.corridors!.actif === o.v}
                  onClick={() => vues.corridors!.onChange(o.v)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-300 ${
                    vues.corridors!.actif === o.v
                      ? "bg-[var(--s-fort)] text-white"
                      : "text-fg-muted hover:bg-[var(--s-teinte)] hover:text-[var(--s-texte)]"
                  }`}
                >
                  {o.l[lang]}
                </button>
              ))}
            </div>
          )}
          <h3 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {lang === "fr" ? "Confort à vélo dans les 15 min" : "Cycling comfort within 15 min"}
            {hiver ? (enHiver ? (lang === "fr" ? " · hiver" : " · winter") : lang === "fr" ? " · été" : " · summer") : ""}
          </h3>
          <p className="m-0 text-[28px] font-semibold leading-none tracking-tight text-fg tabular-nums">
            {info?.confort ? Math.round(info.confort.indice * 100) : "—"}
            <span className="ml-1 text-sm font-medium tracking-normal text-fg-muted">/ 100</span>
          </p>
          {vues.rampe && (
            <div className="grid gap-1">
              {/* La rampe de la carte, avec un repère au confort moyen. */}
              <div className="relative flex h-2.5 overflow-visible rounded-full">
                {vues.rampe.couleurs.map((c, i) => (
                  <span
                    key={c}
                    className={`h-full flex-1 ${i === 0 ? "rounded-l-full" : ""} ${i === vues.rampe!.couleurs.length - 1 ? "rounded-r-full" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {info?.confort && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-fg shadow transition-[left] duration-300"
                    style={{ left: `${Math.min(100, Math.max(0, info.confort.indice * 100))}%` }}
                  />
                )}
              </div>
              <p className="m-0 flex justify-between text-[10.5px] text-fg-subtle">
                {/* Le vocabulaire du ressenti, choisi par l'auteur : « rues
                    rapides » se lisait comme un atout pour le vélo. */}
                <span>{lang === "fr" ? "Peu sécuritaire" : "Not very safe"}</span>
                <span>{lang === "fr" ? "Sécuritaire" : "Safe"}</span>
              </p>
            </div>
          )}
          {/*
            Comment lire la carte, en mots simples : les deux bouts de la
            rampe, le rouge (avec le nombre de coupures ici), et l'hiver les
            pistes entretenues. Chaque ligne porte la marque qu'on voit sur
            la carte.
          */}
          {vues.rampe && (
            <ul className="m-0 mt-1 grid list-none gap-1.5 p-0 text-[12px] leading-snug text-fg">
              <li className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: vues.rampe.couleurs[vues.rampe.couleurs.length - 1] }} />
                {lang === "fr"
                  ? "Sécuritaire : presque tout en pistes cyclables ou rues calmes."
                  : "Safe: almost all bike paths or calm streets."}
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: vues.rampe.couleurs[0] }} />
                {lang === "fr"
                  ? "Peu sécuritaire : surtout des rues où les autos roulent vite."
                  : "Not very safe: mostly streets where cars go fast."}
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-2"
                  style={{ backgroundColor: vues.rampe.coupure, borderColor: vues.rampe.contour }}
                />
                <span>
                  {lang === "fr"
                    ? "Rouge : une piste s'arrête net et vous laisse sur une avenue."
                    : "Red: a bike path ends abruptly and leaves you on a busy street."}
                  {info?.confort && (
                    <span className="text-fg-muted">
                      {" "}
                      {lang === "fr"
                        ? `(${info.confort.coupures} ${info.confort.coupures > 1 ? "endroits" : "endroit"} ici)`
                        : `(${info.confort.coupures} ${info.confort.coupures === 1 ? "place" : "places"} here)`}
                    </span>
                  )}
                </span>
              </li>
              {!enHiver && vues.rampe.ete && (
                <li className="flex items-center gap-2">
                  <svg aria-hidden="true" width="14" height="6" className="shrink-0">
                    <line x1="0" y1="3" x2="14" y2="3" stroke={vues.rampe.ete.couleur} strokeWidth="2.5" />
                  </svg>
                  {vues.rampe.ete.label[lang]}
                </li>
              )}
              {enHiver && vues.rampe.hiver && (
                <>
                  <li className="flex items-center gap-2">
                    <svg aria-hidden="true" width="14" height="6" className="shrink-0">
                      <line x1="0" y1="3" x2="14" y2="3" stroke={vues.rampe.hiver.couleur} strokeWidth="2.5" />
                    </svg>
                    {vues.rampe.hiver.deneige[lang]}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg aria-hidden="true" width="14" height="6" className="shrink-0">
                      <line x1="0" y1="3" x2="14" y2="3" stroke={vues.rampe.hiver.couleur} strokeWidth="2.5" strokeDasharray="4 2.5" />
                    </svg>
                    {vues.rampe.hiver.dame[lang]}
                  </li>
                  <li className="text-[11px] text-fg-subtle">{vues.rampe.hiver.note[lang]}</li>
                </>
              )}
            </ul>
          )}
          {/*
            Les quatre lectures côte à côte : l'été, l'hiver, et ce que les
            corridors changeraient à chacun. La case affichée sur la carte est
            soulignée.
          */}
          {info?.confort?.lectures && vues.corridors && (
            <table className="mt-1 w-full border-collapse text-[12px] tabular-nums">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="pb-1 text-left font-semibold" />
                  <th className="pb-1 text-right font-semibold">{lang === "fr" ? "Été" : "Summer"}</th>
                  <th className="pb-1 text-right font-semibold">{lang === "fr" ? "Hiver" : "Winter"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { cvc: false, l: vues.corridors.aujourdhui, e: info.confort.lectures.ete, h: info.confort.lectures.hiver },
                  { cvc: true, l: vues.corridors.avec, e: info.confort.lectures.eteCvc, h: info.confort.lectures.hiverCvc },
                ].map((r) => (
                  <tr key={String(r.cvc)} className="border-t border-line">
                    <td className="py-1 text-left text-fg-muted">{r.l[lang]}</td>
                    {[
                      { hiv: false, v: r.e },
                      { hiv: true, v: r.h },
                    ].map((c) => {
                      const affichee = r.cvc === vues.corridors!.actif && c.hiv === enHiver;
                      return (
                        <td
                          key={String(c.hiv)}
                          className={`py-1 text-right ${affichee ? "font-semibold text-fg underline decoration-[var(--s-fort)] decoration-2 underline-offset-2" : "text-fg-muted"}`}
                        >
                          {Math.round(c.v * 100)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Les surfaces 5 / 10 / 15 min décrivent la vue des temps : dans la
          vue « confort à vélo », elles parleraient d'autre chose. */}
      {!enItineraire && vues?.actuelle !== "expose" && (
      <section className="grid gap-2.5 border-t border-line px-4 py-3">
        {/* Les notes de méthode (disque de référence, modèle d'hiver) vont
            dans l'article : le panneau ne garde que les chiffres. */}
        <h3 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          {title[lang]}
        </h3>
        {thresholds.map((minutes, i) => {
          const km2 = info?.km2[i] ?? 0;
          const ete = enHiver ? info?.km2Ete?.[i] : undefined;
          // Disque parcouru en ligne droite à la vitesse d'été : rayon =
          // vitesse × temps. Le même disque sert de référence en hiver, pour
          // que les deux barres se comparent.
          const rayon = (discSpeed * minutes) / 60;
          const disque = Math.PI * rayon * rayon;
          const part = Math.min(1, km2 / disque);
          const partEte = ete !== undefined ? Math.min(1, ete / disque) : null;
          const ecart = ete ? Math.round(100 * (km2 / ete - 1)) : null;
          return (
            <div key={minutes} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-fg-muted">{minutes} min</span>
                <span className="text-sm font-semibold tabular-nums text-fg">
                  {nombre(km2, lang)}
                  <span className="ml-1 text-xs font-medium text-fg-muted">km²</span>
                </span>
              </div>
              <div
                className="relative h-2 w-full overflow-hidden rounded-full bg-surface"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(part * 100)}
                aria-label={`${minutes} min`}
              >
                {partEte !== null && (
                  // L'été, en contour : la place que l'hiver a perdue.
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 rounded-full border"
                    style={{ width: `${partEte * 100}%`, borderColor: barColors[i] }}
                  />
                )}
                <div
                  className="relative h-full rounded-full transition-[width] duration-150"
                  style={{ width: `${part * 100}%`, backgroundColor: barColors[i] }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-fg-subtle">
                {ete !== undefined && ecart !== null
                  ? lang === "fr"
                    ? `été : ${nombre(ete, lang)} km² · ${ecart} %`
                    : `summer: ${nombre(ete, lang)} km² · ${ecart}%`
                  : lang === "fr"
                    ? `${nombre(part * 100, lang, 0)} % du disque de ${nombre(rayon, lang, rayon % 1 ? 1 : 0)} km`
                    : `${nombre(part * 100, lang, 0)}% of the ${nombre(rayon, lang, rayon % 1 ? 1 : 0)} km disc`}
              </span>
            </div>
          );
        })}
      </section>
      )}


      {legende && legende.length > 0 && !enItineraire && (
        <div className="mt-auto border-t border-line px-4 py-2.5">
          <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] leading-snug text-fg-subtle">
            {legende.map((item) => (
              <li key={item.label.en} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {item.label[lang]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

/**
 * Profil en long du trajet : altitude selon la distance, tracé en vert sur les
 * voies tranquilles et en rouge sur les exposées, comme la ligne de la carte.
 * Pendant l'animation, il se dévoile jusqu'à la tête du trajet, sur la même
 * horloge en minutes que la carte. Un seul axe ; écart vertical d'au moins 20 m,
 * pour qu'un trajet plat ne ressemble pas à une montagne.
 */
function ProfilElevation({
  profil,
  minutesAnim,
  lang,
}: {
  profil: NonNullable<InfoItineraire["profil"]>;
  minutesAnim: number | null;
  lang: "fr" | "en";
}) {
  const id = `profil-${useId().replace(/:/g, "")}`;
  const W = 400;
  const H = 100;
  const { km, z, t, expose } = profil;
  const n = km.length;
  if (n < 2) return null;
  const long = km[n - 1] || 1;
  let bas = Math.min(...z);
  let haut = Math.max(...z);
  if (haut - bas < 20) {
    const milieu = (haut + bas) / 2;
    bas = milieu - 10;
    haut = milieu + 10;
  }
  const marge = (haut - bas) * 0.08;
  const X = (d: number) => (d / long) * W;
  const Y = (h: number) => H - ((h - (bas - marge)) / (haut + marge - (bas - marge))) * H;

  // Tête : distance et altitude à l'heure de l'animation.
  let tete: { x: number; y: number } | null = null;
  let jusqua = W;
  if (minutesAnim !== null) {
    let i = 1;
    while (i < n - 1 && t[i] < minutesAnim) i++;
    const span = t[i] - t[i - 1];
    const f = span > 0 ? Math.min(1, Math.max(0, (minutesAnim - t[i - 1]) / span)) : 1;
    const d = km[i - 1] + (km[i] - km[i - 1]) * f;
    const h = z[i - 1] + (z[i] - z[i - 1]) * f;
    tete = { x: X(d), y: Y(h) };
    jusqua = tete.x;
  }

  // Morceaux de même nature : un tracé par couleur.
  const morceaux: Array<{ expose: boolean; d: string }> = [];
  for (let i = 1; i < n; i++) {
    const dernier = morceaux[morceaux.length - 1];
    if (dernier && dernier.expose === expose[i]) {
      dernier.d += ` L${X(km[i]).toFixed(1)} ${Y(z[i]).toFixed(1)}`;
    } else {
      morceaux.push({
        expose: expose[i],
        d: `M${X(km[i - 1]).toFixed(1)} ${Y(z[i - 1]).toFixed(1)} L${X(km[i]).toFixed(1)} ${Y(z[i]).toFixed(1)}`,
      });
    }
  }
  const aire =
    `M0 ${H} ` + km.map((d, i) => `L${X(d).toFixed(1)} ${Y(z[i]).toFixed(1)}`).join(" ") + ` L${W} ${H} Z`;
  const nb = (v: number, d = 1) =>
    v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="col-span-2">
      <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
        {lang === "fr" ? "Profil du trajet" : "Route profile"}
      </p>
      <div className="relative mt-1 h-16">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <clipPath id={id}>
              <rect x={0} y={0} width={jusqua} height={H} />
            </clipPath>
          </defs>
          <line x1={0} x2={W} y1={Y(haut)} y2={Y(haut)} stroke="currentColor" className="text-line" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="currentColor" className="text-line" vectorEffect="non-scaling-stroke" />
          <g clipPath={`url(#${id})`}>
            <path d={aire} fill="var(--s-teinte, #eef0f2)" className="transition-colors duration-700" />
            {morceaux.map((m, i) => (
              <path
                key={i}
                d={m.d}
                fill="none"
                stroke={m.expose ? "#c81e1e" : "#0f8a5f"}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
        {tete && (
          <span
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--s-fort)] shadow"
            style={{ left: `${(tete.x / W) * 100}%`, top: `${(tete.y / H) * 100}%` }}
          />
        )}
        <span className="absolute left-0 -translate-y-1/2 bg-surface/80 pr-1 text-[10px] tabular-nums text-fg-subtle" style={{ top: `${(Y(haut) / H) * 100}%` }}>
          {Math.round(Math.max(...z))} m
        </span>
        <span className="absolute bottom-0 left-0 bg-surface/80 pr-1 text-[10px] tabular-nums text-fg-subtle">
          {Math.round(Math.min(...z))} m
        </span>
      </div>
      <p className="m-0 mt-0.5 flex justify-between text-[10px] tabular-nums text-fg-subtle">
        <span>0 km</span>
        <span>{nb(long)} km</span>
      </p>
    </div>
  );
}

/**
 * L'itinéraire : résumé (temps, distance, dénivelé, part tranquille), puis les
 * étapes. La difficulté ne dit QUE la circulation — tranquille (≤ 40 km/h ou
 * hors rue) ou exposée (> 40 km/h) ; la pente est un fait à côté, pas une note.
 */
function BlocItineraire({
  info,
  lang,
  minutesAnim = null,
  defile = false,
}: {
  info: InfoItineraire;
  lang: "fr" | "en";
  minutesAnim?: number | null;
  /** Panneau d'itinéraire : seules les étapes défilent, le résumé reste en place. */
  defile?: boolean;
}) {
  if (info.etat !== "pret") {
    return (
      <section className="border-t border-line px-4 py-3">
        <p className="m-0 text-sm text-fg-muted">{MESSAGES[info.etat][lang]}</p>
      </section>
    );
  }
  const nb = (v: number, d = 1) =>
    v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  return (
    <>
      <section className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-2 border-t border-line px-4 py-3">
        {defile ? (
          // Panneau de résultats : les trois chiffres sur UNE ligne, pour
          // laisser la hauteur au profil et aux étapes.
          <div className="col-span-2 flex items-end justify-between gap-3">
            <p className="m-0 text-[24px] font-semibold leading-none tracking-tight text-fg tabular-nums">
              {duree(minutesAnim ?? info.minutes ?? 0)}
            </p>
            <p className="m-0 text-right text-[12.5px] font-semibold leading-tight tabular-nums text-fg">
              {nb(info.km ?? 0)} km
              <span className="ml-2 font-normal text-fg-muted">
                +{Math.round(info.dPlus ?? 0)} m
                {info.dMoins !== undefined ? ` · −${Math.round(info.dMoins)} m` : ""}
              </span>
            </p>
          </div>
        ) : (
        <>
        <div className="col-span-2">
          <p className="m-0 text-[28px] font-semibold leading-none tracking-tight text-fg tabular-nums">
            {duree(minutesAnim ?? info.minutes ?? 0)}
          </p>
          <p className="m-0 mt-1 text-xs text-fg-muted">
            {lang === "fr" ? "Itinéraire le plus rapide" : "Fastest route"}
          </p>
        </div>
        <div>
          <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">Distance</p>
          <p className="m-0 text-sm font-semibold tabular-nums text-fg">{nb(info.km ?? 0)} km</p>
        </div>
        <div>
          <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            {info.dMoins !== undefined ? (lang === "fr" ? "Dénivelé" : "Elevation") : lang === "fr" ? "Dénivelé +" : "Climb"}
          </p>
          <p className="m-0 text-sm font-semibold tabular-nums text-fg">
            {info.dMoins !== undefined
              ? `+${Math.round(info.dPlus ?? 0)} m · −${Math.round(info.dMoins)} m`
              : `${Math.round(info.dPlus ?? 0)} m`}
          </p>
        </div>
        </>
        )}
        <div className="col-span-2">
          <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            {lang === "fr" ? "Part tranquille" : "Low-stress share"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#c81e1e]">
              <div
                className="h-full rounded-full bg-[#0f8a5f]"
                style={{ width: `${(info.partTranquille ?? 0) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums text-fg">
              {nb((info.partTranquille ?? 0) * 100, 0)} %
            </span>
          </div>
        </div>
        {info.profil && <ProfilElevation profil={info.profil} minutesAnim={minutesAnim} lang={lang} />}
      </section>

      <section
        className={`grid gap-1 border-t border-line px-4 py-3 ${
          defile ? "min-h-[7rem] flex-1 grid-rows-[auto_minmax(0,1fr)] pb-0" : ""
        }`}
      >
        <h3 className="m-0 mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          {lang === "fr" ? "Étapes" : "Steps"}
        </h3>
        <ol className={`m-0 grid list-none content-start gap-1.5 p-0 ${defile ? "overflow-y-auto pb-3 pr-1" : ""}`}>
          {(info.etapes ?? []).map((e, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 translate-y-[1px] rounded-full"
                style={{ backgroundColor: e.expose ? "#c81e1e" : "#0f8a5f" }}
              />
              <span className="min-w-0 text-[12.5px] leading-snug text-fg">
                {e.nom}
                <span className="block text-[11px] text-fg-subtle">
                  {e.expose
                    ? lang === "fr" ? "Exposée" : "High-stress"
                    : lang === "fr" ? "Tranquille" : "Low-stress"}
                  {e.aPied ? (lang === "fr" ? " · à pied" : " · on foot") : ""}
                  {e.penteMax >= 4 ? (lang === "fr" ? ` · pente max ${e.penteMax} %` : ` · max grade ${e.penteMax}%`) : ""}
                </span>
              </span>
              <span className="text-right text-[11.5px] tabular-nums text-fg-muted">
                {nb(e.km, e.km < 1 ? 2 : 1)} km
                <span className="block text-[11px] text-fg-subtle">{duree(e.minutes)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/**
 * La ville des 15 minutes (Moreno et al., 2021) : pour chaque fonction, le
 * lieu le plus proche et son temps d'accès en tête — c'est le chiffre qui
 * distingue les quartiers, à vélo où presque tout tient en 15 min —, puis la
 * liste. Rend DEUX zones : l'en-tête (fixe) et la liste (la seule qui défile).
 */
function BlocLieux({
  lieux,
  lang,
  actions,
}: {
  lieux: NonNullable<Parameters<typeof ReachPanel>[0]["lieux"]>;
  lang: "fr" | "en";
  /** Boutons de l'en-tête (replier le panneau). */
  actions?: React.ReactNode;
}) {
  const { info } = lieux;
  const listes = info?.parFonction ?? [];
  const couvertes = listes.filter((l) => l.length > 0).length;
  return (
    <>
      <section className="flex shrink-0 items-start justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <div className="min-w-0">
          <h3 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {lieux.title[lang]}
          </h3>
          <p className="m-0 mt-0.5 text-sm font-semibold text-fg tabular-nums">
            {info?.etat === "pret" ? (
              <>
                {couvertes} / {lieux.functions.length}{" "}
                <span className="font-normal text-fg-muted">
                  {lang === "fr" ? "fonctions à moins de 15 min" : "functions within 15 min"}
                </span>
              </>
            ) : (
              <span className="font-normal text-fg-muted">
                {lang === "fr" ? "Chargement des lieux…" : "Loading places…"}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={lieux.onLiberer}
            className="rounded-md border border-[var(--s-bord)] px-2 py-0.5 text-[11px] text-[var(--s-texte)] transition-colors duration-700 hover:bg-[var(--s-teinte)]"
            title={lang === "fr" ? "Libérer la tache (clic droit ou Échap)" : "Release the patch (right-click or Esc)"}
          >
            {lang === "fr" ? "Libérer" : "Release"}
          </button>
          {actions}
        </div>
      </section>

      {/*
        Chaque fonction est REPLIÉE : une ligne — couleur, nom, le plus proche
        et son temps, le nombre de lieux — et une flèche qui déplie la liste.
        Survol d'un lieu : la carte le cerne ; survol d'un point sur la carte :
        sa ligne (et sa fonction) se marquent ici. Clic : zoom, ou destination
        de l'itinéraire pendant le choix.
      */}
      {info?.etat === "pret" && (
        <section className="min-h-0 flex-1 overflow-y-auto border-t border-line px-4 py-3">
          <div className="grid gap-1.5">
            {lieux.functions.map((fn, i) => {
              const liste = listes[i] ?? [];
              const premier = liste[0];
              const marquee = Boolean(lieux.survolNom && liste.some((l) => l.nom === lieux.survolNom));
              return (
                <details
                  key={fn.id}
                  className={`group rounded-lg border bg-surface/60 transition-colors ${
                    marquee ? "border-[var(--s-fort)]" : "border-line"
                  }`}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-[#14261f]"
                      style={{ backgroundColor: fn.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold leading-tight text-fg">
                        {fn.label[lang]}
                        <span className="ml-1.5 text-[11px] font-normal tabular-nums text-fg-subtle">
                          {liste.length} {lang === "fr" ? (liste.length > 1 ? "lieux" : "lieu") : liste.length > 1 ? "places" : "place"}
                        </span>
                      </span>
                      <span className="block truncate text-[11.5px] text-fg-muted" title={premier?.nom}>
                        {premier
                          ? `${premier.nom} · ${Math.round(premier.minutes)} min`
                          : lang === "fr"
                            ? "Aucun lieu à moins de 15 min"
                            : "No place within 15 min"}
                      </span>
                    </span>
                    {liste.length > 0 && (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-90 group-open:text-[var(--s-texte)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    )}
                  </summary>
                  {liste.length > 0 && (
                    <ol className="m-0 grid list-none gap-0.5 border-t border-line p-1.5">
                      {liste.map((l, k) => (
                        <li key={k}>
                          <button
                            type="button"
                            onClick={() => lieux.onLieu(l)}
                            onMouseEnter={() => lieux.onSurvol?.(l)}
                            onMouseLeave={() => lieux.onSurvol?.(null)}
                            onFocus={() => lieux.onSurvol?.(l)}
                            onBlur={() => lieux.onSurvol?.(null)}
                            className={`flex w-full items-baseline justify-between gap-2 rounded px-1.5 py-1 text-left text-[12px] leading-snug transition-colors hover:bg-[var(--s-teinte)] ${
                              lieux.survolNom === l.nom ? "bg-[var(--s-teinte)]" : ""
                            }`}
                            title={l.nom}
                          >
                            <span className="min-w-0 truncate text-fg">{l.nom}</span>
                            <span className="shrink-0 tabular-nums text-fg-muted">{Math.round(l.minutes)} min</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Le bandeau du départ : Québec vue de Lévis, un paysage par saison, en boucle
 * (illustration et animation générées par IA — voir SOURCES.md). Les deux
 * saisons sont superposées et se fondent l'une dans l'autre au changement :
 * la touche H fait passer la ville de l'été à l'hiver sous les yeux.
 *
 * Le nom de la voie se pose dessus, sur un dégradé sombre qui le garde
 * lisible quel que soit le paysage. Si le système demande moins de
 * mouvement, les vidéos cèdent la place à leurs images fixes.
 */
function BandeauSaison({
  bandeau,
  hiver,
  lang,
  titre,
  texte,
  vide,
}: {
  bandeau: { summer: MediaSaison; winter: MediaSaison; alt: Bilingual };
  hiver: boolean;
  lang: "fr" | "en";
  titre: string;
  texte: string | null;
  vide: string;
}) {
  const [immobile, setImmobile] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const suivre = () => setImmobile(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);
    return () => requete.removeEventListener("change", suivre);
  }, []);

  // FLUIDITÉ : une seule vidéo décodée à la fois. La saison cachée se met en
  // pause une fois le fondu fini ; elle repart quand on revient à elle.
  const videoEte = useRef<HTMLVideoElement | null>(null);
  const videoHiver = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (immobile) return;
    const entrante = hiver ? videoHiver.current : videoEte.current;
    const sortante = hiver ? videoEte.current : videoHiver.current;
    entrante?.play().catch(() => {});
    const t = window.setTimeout(() => sortante?.pause(), 750);
    return () => window.clearTimeout(t);
  }, [hiver, immobile]);

  const couche = (media: MediaSaison, visible: boolean, ref: React.RefObject<HTMLVideoElement | null>) => (
    <div
      aria-hidden="true"
      className="absolute inset-0 transition-opacity duration-700 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {immobile ? (
        // eslint-disable-next-line @next/next/no-img-element -- image d'affiche statique, déjà optimisée
        <img src={media.poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          autoPlay={visible}
          muted
          loop
          playsInline
          preload="auto"
          poster={media.poster}
        >
          <source src={media.webm} type="video/webm" />
          <source src={media.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );

  return (
    <section
      role="img"
      aria-label={bandeau.alt[lang]}
      // 25:11, la proportion des vidéos : le paysage entier, ciel et fleuve
      // compris (en 25:9 il était rogné). Les notes retirées du panneau
      // laissent la place.
      className="relative aspect-[25/11] w-full shrink-0 overflow-hidden"
    >
      {couche(bandeau.summer, !hiver, videoEte)}
      {couche(bandeau.winter, hiver, videoHiver)}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
        <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/80">{titre}</p>
        <p className="m-0 text-lg font-semibold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)] [text-wrap:balance]">
          {texte ?? <span className="font-normal text-white/85">{vide}</span>}
        </p>
      </div>
    </section>
  );
}

/** « L'hiver ici » : ce que le panneau de droite montre au clic, vue confort. */
export type InfoHiver = {
  /** Nom de la voie du départ. */
  nom: string | null;
  /** Piste déneigée / damée la plus proche : minutes à vélo l'hiver (null = au-delà de 15 min) et distance à vol d'oiseau (m). */
  deneigee: { minutes: number | null; metres: number } | null;
  damee: { minutes: number | null; metres: number } | null;
  /** Km de pistes déneigées / damées atteints en 15 min l'hiver. */
  kmDeneige: number;
  kmDame: number;
  /** Chaque piste déneigée atteinte en 15 min d'hiver (tracée en jaune) : nom, minutes. */
  acces?: Array<{ nom: string; minutes: number }>;
  /** L'été : chaque corridor VivaCité réalisé atteint en 15 min (tracé en orange). */
  corridors?: Array<{ nom: string; minutes: number }>;
};

/**
 * « L'hiver ici » — le panneau de droite de la vue confort : au clic, la
 * piste déneigée la plus proche et ce que le réseau blanc offre dans les
 * 15 minutes d'hiver, avec le chiffre des articles (le réseau blanc a suivi
 * la hausse des cyclistes d'hiver). Mêmes gestes que le panneau des lieux.
 */
export function PanneauHiver({
  info,
  contexte,
  contexteEte,
  couleur,
  lang,
  plie,
  onPlier,
  onLiberer,
  halo,
  bandeau,
  hiver = false,
  rapide = false,
  className = "",
}: {
  info: InfoHiver | null;
  /** Vidéos du cycliste (en-tête, comme le panneau d'itinéraire). */
  bandeau?: { summer: MediaSaison; winter: MediaSaison; winterRate: number };
  /** Saison affichée : le cycliste la suit, comme dans l'autre panneau. */
  hiver?: boolean;
  /** Le trajet vers la piste se dessine : le cycliste accélère. */
  rapide?: boolean;
  /** Phrase des articles, sous les chiffres (hiver). */
  contexte?: Bilingual;
  /** Phrase des articles, l'été (corridors VivaCité). */
  contexteEte?: Bilingual;
  /** Bleu des pistes d'hiver sur la carte. */
  couleur: string;
  lang: "fr" | "en";
  plie: boolean;
  onPlier: (v: boolean) => void;
  onLiberer: () => void;
  halo?: string;
  className?: string;
}) {
  const ouvert = info !== null;
  const [dernier, setDernier] = useState(info);
  if (info && info !== dernier) setDernier(info);
  const i = info ?? dernier;
  const nb = (v: number, d = 1) =>
    v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
  const distance = (p: { minutes: number | null; metres: number } | null) => {
    if (!p) return lang === "fr" ? "aucune connue" : "none known";
    if (p.minutes !== null) {
      const m = Math.max(1, Math.round(p.minutes));
      return lang === "fr" ? `à ${m} min à vélo` : `${m} min by bike`;
    }
    const km = p.metres / 1000;
    return lang === "fr"
      ? `à plus de 15 min (${nb(km)} km à vol d'oiseau)`
      : `over 15 min away (${nb(km)} km as the crow flies)`;
  };
  return (
    <aside
      aria-label={hiver ? (lang === "fr" ? "L'hiver ici" : "Winter here") : lang === "fr" ? "L'été ici" : "Summer here"}
      aria-hidden={!ouvert}
      inert={!ouvert}
      className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 backdrop-blur-sm transition-[transform,opacity,max-height,box-shadow] duration-300 ease-out ${
        !ouvert
          ? "pointer-events-none translate-y-[calc(100%+1rem)] opacity-0 lg:translate-x-[calc(100%+1rem)] lg:translate-y-0"
          : plie
            ? "max-lg:max-h-[4.25rem] lg:pointer-events-none lg:translate-x-[calc(100%+1rem)] lg:opacity-0"
            : "translate-x-0 translate-y-0 opacity-100"
      } ${className}`}
      style={{
        boxShadow: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)${
          halo ? `, inset 0 0 0 3px ${halo}99, inset 0 0 30px ${halo}4d` : ""
        }`,
      }}
    >
      {/*
        En-tête : le même que le panneau d'itinéraire — le cycliste qui
        pédale, été ou hiver selon la saison affichée (touche H). Titre,
        voie, « Libérer » et repli posés dessus.
      */}
      {(() => {
        const entete = (
          <>
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-2 top-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onLiberer}
                className="rounded-md bg-black/25 px-2 py-0.5 text-[11.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-[var(--s-fort)]"
                title={lang === "fr" ? "Libérer la tache (clic droit ou Échap)" : "Release the patch (right-click or Esc)"}
              >
                {lang === "fr" ? "Libérer" : "Release"}
              </button>
              <BoutonPlier onClick={() => onPlier(!plie)} lang={lang} surVideo />
            </div>
            <div className="absolute inset-x-0 bottom-0 px-4 pb-2">
              <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/85">
                {hiver ? (lang === "fr" ? "L'hiver ici" : "Winter here") : lang === "fr" ? "L'été ici" : "Summer here"}
              </p>
              {i?.nom && (
                <p className="m-0 truncate text-[13px] font-semibold leading-snug text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]" title={i.nom}>
                  {i.nom}
                </p>
              )}
            </div>
          </>
        );
        return bandeau ? (
          <BandeauVelo media={bandeau} hiver={hiver} rapide={rapide} actif={ouvert}>
            {entete}
          </BandeauVelo>
        ) : (
          <div className="relative h-20 shrink-0 bg-[var(--s-fort)]">{entete}</div>
        );
      })()}

      {/*
        L'ÉTÉ : les corridors VivaCité réalisés à portée, chacun avec son
        chemin orange sur la carte — le pendant des pistes déneigées.
      */}
      {i && !hiver && (
        <section className="grid min-h-0 gap-3 overflow-y-auto border-t border-line px-4 py-3">
          <div className="grid gap-0.5">
            <p className="m-0 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
              <svg aria-hidden="true" width="16" height="8" className="shrink-0">
                <line x1="1" y1="4" x2="15" y2="4" stroke="#14261f" strokeWidth="6" strokeLinecap="round" />
                <line x1="1" y1="4" x2="15" y2="4" stroke="#ff8a1f" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
              {lang === "fr" ? "Corridor VivaCité le plus proche" : "Nearest VivaCité corridor"}
            </p>
            <p className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-fg">
              {i.corridors && i.corridors.length > 0
                ? lang === "fr"
                  ? `à ${Math.max(1, Math.round(i.corridors[0].minutes))} min à vélo`
                  : `${Math.max(1, Math.round(i.corridors[0].minutes))} min by bike`
                : lang === "fr"
                  ? "aucun à moins de 15 min"
                  : "none within 15 min"}
            </p>
          </div>
          {i.corridors && i.corridors.length > 0 && (
            <div className="grid gap-1.5">
              <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
                {lang === "fr"
                  ? `${i.corridors.length} ${i.corridors.length > 1 ? "corridors réalisés" : "corridor réalisé"} à portée — chemins en orange`
                  : `${i.corridors.length} built ${i.corridors.length > 1 ? "corridors" : "corridor"} within reach — routes in orange`}
              </p>
              <ol className="m-0 grid list-none gap-0.5 p-0">
                {i.corridors.map((a, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="min-w-0 truncate text-fg" title={a.nom}>{a.nom}</span>
                    <span className="shrink-0 tabular-nums text-fg-muted">{Math.max(1, Math.round(a.minutes))} min</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {contexteEte && <p className="m-0 text-[12px] leading-snug text-fg-muted">{contexteEte[lang]}</p>}
        </section>
      )}

      {i && hiver && (
        <section className="grid min-h-0 gap-3 overflow-y-auto border-t border-line px-4 py-3">
          {/* La piste déneigée la plus proche : LE chiffre de l'hiver. */}
          <div className="grid gap-0.5">
            <p className="m-0 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
              <svg aria-hidden="true" width="16" height="6" className="shrink-0">
                <line x1="0" y1="3" x2="16" y2="3" stroke={couleur} strokeWidth="3" />
              </svg>
              {lang === "fr" ? "Piste déneigée la plus proche" : "Nearest snow-cleared bike path"}
            </p>
            <p className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-fg">{distance(i.deneigee)}</p>
          </div>

          {/* Chaque piste déneigée à portée, avec son chemin jaune sur la carte. */}
          {i.acces && i.acces.length > 0 && (
            <div className="grid gap-1.5">
              <p className="m-0 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
                <svg aria-hidden="true" width="16" height="8" className="shrink-0">
                  <line x1="1" y1="4" x2="15" y2="4" stroke="#14261f" strokeWidth="6" strokeLinecap="round" />
                  <line x1="1" y1="4" x2="15" y2="4" stroke="#ffd23f" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
                {lang === "fr"
                  ? `${i.acces.length} ${i.acces.length > 1 ? "pistes déneigées" : "piste déneigée"} à portée — chemins en jaune`
                  : `${i.acces.length} snow-cleared ${i.acces.length > 1 ? "paths" : "path"} within reach — routes in yellow`}
              </p>
              <ol className="m-0 grid list-none gap-0.5 p-0">
                {i.acces.map((a, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="min-w-0 truncate text-fg" title={a.nom}>{a.nom}</span>
                    <span className="shrink-0 tabular-nums text-fg-muted">
                      {Math.max(1, Math.round(a.minutes))} min
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid gap-0.5">
            <p className="m-0 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
              <svg aria-hidden="true" width="16" height="6" className="shrink-0">
                <line x1="0" y1="3" x2="16" y2="3" stroke={couleur} strokeWidth="3" strokeDasharray="5 3" />
              </svg>
              {lang === "fr" ? "Piste damée la plus proche" : "Nearest packed-snow bike path"}
            </p>
            <p className="m-0 text-sm font-semibold text-fg">{distance(i.damee)}</p>
          </div>

          <div className="grid gap-1 rounded-lg border border-line bg-surface/60 px-3 py-2.5">
            <p className="m-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
              {lang === "fr" ? "En 15 min l'hiver, vous atteignez" : "Within 15 winter minutes, you reach"}
            </p>
            <p className="m-0 text-[13px] text-fg">
              <strong className="tabular-nums">{nb(i.kmDeneige)} km</strong>{" "}
              {lang === "fr" ? "de pistes déneigées" : "of snow-cleared paths"}
            </p>
            <p className="m-0 text-[13px] text-fg">
              <strong className="tabular-nums">{nb(i.kmDame)} km</strong>{" "}
              {lang === "fr" ? "de pistes damées" : "of packed-snow paths"}
            </p>
            {i.kmDeneige + i.kmDame === 0 && (
              <p className="m-0 text-[11.5px] text-fg-muted">
                {lang === "fr"
                  ? "Aucune piste entretenue à portée — ou un secteur sans donnée d'hiver (Lévis)."
                  : "No maintained path within reach — or an area without winter data (Lévis)."}
              </p>
            )}
          </div>

          {contexte && <p className="m-0 text-[12px] leading-snug text-fg-muted">{contexte[lang]}</p>}
        </section>
      )}
    </aside>
  );
}

/** Bouton « replier » : chevron vers le bord (écran large) ou vers le bas (mobile). */
function BoutonPlier({
  onClick,
  lang,
  surVideo = false,
}: {
  onClick: () => void;
  lang: "fr" | "en";
  surVideo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lang === "fr" ? "Replier le panneau (touche ])" : "Collapse the panel (] key)"}
      title={lang === "fr" ? "Replier (touche ])" : "Collapse (] key)"}
      className={
        surVideo
          ? "rounded-md bg-black/25 p-1 text-white backdrop-blur-sm transition-colors hover:bg-[var(--s-fort)]"
          : "rounded-md p-1 text-fg-subtle transition-colors hover:bg-[var(--s-teinte)] hover:text-[var(--s-texte)]"
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path className="max-lg:hidden" d="M7 6l6 6-6 6M13 6l6 6-6 6" />
        <path className="lg:hidden" d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

/**
 * Le panneau des RÉSULTATS, à droite : ce qu'on trouve depuis le départ.
 * Un seul panneau, dont le contenu suit l'action — jamais deux panneaux du
 * même côté (patron « deux panneaux » des géoportails, Calcite d'Esri) :
 *
 *   ① Lieux       la tache est fixée : la ville des 15 minutes
 *   ② Choix de B  « Itinéraire vers un autre lieu » : une consigne en tête
 *   ③ Itinéraire  le trajet A → B, avec « ← Lieux » pour revenir
 *
 * Chaque état : un en-tête fixe, une seule zone qui défile. Il sort par la
 * droite quand la tache est fixée, et rentre quand on la libère — le contenu
 * reste celui de la dernière tache le temps qu'il se range.
 *
 * Sous 1024 px, c'est une feuille posée au bas de la carte ; repliée, il
 * n'en reste que l'en-tête.
 */
export function PanneauResultats({
  lieux,
  itineraire,
  choix,
  bandeau,
  hiver = false,
  halo,
  lang,
  plie,
  onPlier,
  cleTache = 0,
  className = "",
  style,
}: {
  lieux: NonNullable<Parameters<typeof ReachPanel>[0]["lieux"]>;
  /**
   * Change à chaque tache fixée : la liste repart avec toutes ses fonctions
   * repliées. Au retour de l'itinéraire, elle reste comme on l'a laissée.
   */
  cleTache?: number;
  itineraire: {
    info: InfoItineraire;
    depart: string;
    arrivee: string;
    /** Minutes au bout du trait pendant l'animation ; null = trajet posé. */
    minutesAnim: number | null;
    onRetour: () => void;
  } | null;
  /** On attend le clic sur la destination. */
  choix: { onAnnuler: () => void } | null;
  /** Vidéos du cycliste ; absentes, le titre se pose sur un aplat. */
  bandeau?: { summer: MediaSaison; winter: MediaSaison; winterRate: number };
  hiver?: boolean;
  halo?: string;
  lang: "fr" | "en";
  plie: boolean;
  onPlier: (v: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ouvert = lieux.info !== null;
  const [derniere, setDerniere] = useState(lieux.info);
  if (lieux.info && lieux.info !== derniere) setDerniere(lieux.info);
  const affiche = ouvert ? lieux : { ...lieux, info: derniere };
  const plier = <BoutonPlier onClick={() => onPlier(!plie)} lang={lang} surVideo={Boolean(itineraire)} />;

  const enteteTrajet = itineraire && (
    <>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute inset-x-2 top-2 flex items-center justify-between">
        <button
          type="button"
          onClick={itineraire.onRetour}
          className="rounded-md bg-black/25 px-2 py-0.5 text-[11.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-[var(--s-fort)]"
        >
          ← {lang === "fr" ? "Lieux" : "Places"}
        </button>
        {plier}
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-2">
        <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/85">
          {lang === "fr" ? "Itinéraire" : "Route"}
        </p>
        <p className="m-0 truncate text-[13px] font-semibold leading-snug text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]" title={`${itineraire.depart} → ${itineraire.arrivee}`}>
          <span className="mr-1 rounded bg-[var(--s-fort)] px-1 text-[10px] text-white transition-colors duration-700">A</span>
          {itineraire.depart}
          <span className="mx-1.5 text-white/70">→</span>
          <span className="mr-1 rounded bg-[var(--s-fort)] px-1 text-[10px] text-white transition-colors duration-700">B</span>
          {itineraire.arrivee}
        </p>
      </div>
    </>
  );

  return (
    <aside
      aria-label={itineraire ? (lang === "fr" ? "Itinéraire" : "Route") : lieux.title[lang]}
      aria-hidden={!ouvert}
      inert={!ouvert}
      className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 backdrop-blur-sm transition-[transform,opacity,max-height,box-shadow] duration-300 ease-out ${
        !ouvert
          ? "pointer-events-none translate-y-[calc(100%+1rem)] opacity-0 lg:translate-x-[calc(100%+1rem)] lg:translate-y-0"
          : plie
            ? "max-lg:max-h-[4.25rem] lg:pointer-events-none lg:translate-x-[calc(100%+1rem)] lg:opacity-0"
            : "translate-x-0 translate-y-0 opacity-100"
      } ${className}`}
      style={{
        ...style,
        boxShadow: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)${
          halo ? `, inset 0 0 0 3px ${halo}99, inset 0 0 30px ${halo}4d` : ""
        }`,
      }}
    >
      {/*
        La liste reste MONTÉE pendant l'itinéraire (cachée) : « ← Lieux »
        la retrouve avec les fonctions dépliées comme on les a laissées.
      */}
      <div className={itineraire ? "hidden" : "contents"}>
        {affiche.info && <BlocLieux key={cleTache} lieux={affiche} lang={lang} actions={plier} />}
        {choix && !itineraire && (
          <div className="order-first flex shrink-0 items-center justify-between gap-2 bg-[var(--s-fort,#c84a12)] px-4 py-2 text-[12px] text-white transition-colors duration-700">
            <span>
              {lang === "fr"
                ? "Choisissez la destination : un lieu sur la carte ou dans la liste."
                : "Pick the destination: a place on the map or in the list."}
            </span>
            <button
              type="button"
              onClick={choix.onAnnuler}
              className="shrink-0 rounded-md border border-white/60 px-2 py-0.5 text-[11px] text-white transition-colors hover:bg-white/15"
            >
              {lang === "fr" ? "Annuler" : "Cancel"}
            </button>
          </div>
        )}
      </div>
      {itineraire && (
        <>
          {/*
            Bandeau : le cycliste pédale pendant que le trajet se dessine (plus
            vite), puis à son rythme ; l'hiver, plus lentement.
          */}
          {bandeau ? (
            <BandeauVelo media={bandeau} hiver={hiver} rapide={itineraire.minutesAnim !== null} actif={ouvert}>
              {enteteTrajet}
            </BandeauVelo>
          ) : (
            <div className="relative h-20 shrink-0 bg-[var(--s-fort)] transition-colors duration-700">{enteteTrajet}</div>
          )}
          <BlocItineraire info={itineraire.info} lang={lang} minutesAnim={itineraire.minutesAnim} defile />
        </>
      )}
    </aside>
  );
}
