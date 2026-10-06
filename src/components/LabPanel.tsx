"use client";

import { useEffect, useRef, useState } from "react";
import type { Bilingual, LabHoverRow, LabPanelConfig } from "@/labs/types";

/**
 * Le panneau d'une entité choisie — à CÔTÉ de la carte, jamais dessus.
 *
 * POURQUOI DEHORS — un panneau posé sur la carte masque le territoire au moment
 * précis où le lecteur veut le regarder, et il masque le plus souvent ce qui
 * entoure l'entité choisie, c'est-à-dire ce qu'on vient d'ouvrir. La carte reste
 * donc entière : le panneau prend sa place à côté.
 *
 * LE TABLEAU DE BORD — quand le lab déclare `select.panel`, le panneau se lit
 * dans un ordre fixe : statut, chiffre principal comparé, curseur, courbe,
 * synthèse, anneau, indicateurs, méthode. Le public est large ; le registre
 * reste celui d'un rapport : termes exacts, chacun avec sa définition à portée
 * (« ? »). Toute valeur est comparée — un chiffre isolé ne dit pas s'il est
 * élevé ou faible.
 *
 * Les graphiques sont dessinés en SVG, sans bibliothèque : aucun poids ajouté
 * à la page. Toutes les valeurs sont précalculées par palier ; le panneau ne
 * fait aucun calcul géographique.
 */

export type DonneesPanneau = Record<string, unknown>;

const nombre = (v: unknown, lang: "fr" | "en") =>
  typeof v === "number" ? v.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA") : String(v ?? "");

export default function LabPanel({
  titre,
  lignes,
  donnees,
  curseur,
  palier,
  onPalier,
  onFermer,
  lang,
  vide,
  legende,
  config,
  entite,
  serie = [],
  ensemble = [],
}: {
  /** Nom de l'entité choisie, en tête du panneau. */
  titre: string;
  lignes: LabHoverRow[];
  /** Les mesures au palier courant. */
  donnees: DonneesPanneau;
  curseur?: {
    /** Champ qui porte le palier, ex. `"minutes"`. */
    field?: string;
    steps: number[];
    start?: number;
    label: Bilingual;
    suffix?: string;
  };
  palier: number | null;
  onPalier: (valeur: number) => void;
  onFermer: () => void;
  lang: "fr" | "en";
  /**
   * Texte affiché tant que rien n'est choisi.
   *
   * Le panneau garde sa place dans la grille : sans cela, la carte s'élargirait
   * et se rétrécirait à chaque clic, et MapLibre redessinerait tout à chaque
   * fois.
   */
  vide?: Bilingual;
  /**
   * Légende, au pied du panneau. L'attribution, elle, est rendue sous la carte
   * par `LabEmbed` et `LabPreview` — voir le pied du panneau.
   */
  legende?: Array<{ color: string; label: Bilingual }>;
  /** Le tableau de bord déclaré par le lab. */
  config?: LabPanelConfig;
  /** Propriétés de l'entité cliquée (la station). */
  entite?: Record<string, unknown> | null;
  /** Mesures de l'entité choisie, une par palier, triées. */
  serie?: Record<string, unknown>[];
  /** Toutes les entités comparables. */
  ensemble?: Record<string, unknown>[];
}) {
  const ouvert = Boolean(titre);
  const suffixe = curseur?.suffix ?? "";
  const mesures = palier && Object.keys(donnees).length ? donnees : null;

  /**
   * Changer de station remet le curseur à son palier d'ouverture.
   *
   * Sans cela, une station ouverte après qu'on a poussé le curseur à douze
   * minutes afficherait d'emblée sa plus grande aire — et le geste de la faire
   * grandir, qui est le propos, serait déjà joué.
   *
   * `??` et non `||` : `start: 0` est une valeur, pas une absence.
   */
  const dernierTitre = useRef<string | null>(null);
  useEffect(() => {
    if (!ouvert) {
      dernierTitre.current = null;
      return;
    }
    if (titre === dernierTitre.current) return;
    dernierTitre.current = titre;

    const arrivee = curseur?.start ?? curseur?.steps[curseur.steps.length - 1];
    if (arrivee !== undefined && arrivee !== palier) onPalier(arrivee);
    // `onPalier` et `palier` changent à chaque mouvement du curseur ; les
    // inclure ramènerait le lecteur au palier d'ouverture sous ses doigts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titre, ouvert, curseur]);

  const estStatut = Boolean(config?.status && entite?.[config.status.field]);
  const titreAffiche =
    config?.titlePrefix && estStatut ? `${config.titlePrefix[lang]} ${titre}` : titre;

  return (
    <aside
      // Sous 1024 px le panneau est SOUS la carte : hauteur bornée et
      // défilement interne, pour que carte et chiffres restent visibles
      // ensemble — c'est leur coexistence qui fait le propos.
      className="flex max-h-[14rem] flex-col overflow-y-auto rounded-xl border border-line bg-surface-muted lg:max-h-full"
      role="complementary"
      aria-label={lang === "fr" ? "Détail de la sélection" : "Selection detail"}
      aria-live="polite"
    >
      {!ouvert ? (
        <p className="m-auto max-w-[22ch] p-4 text-center text-sm leading-relaxed text-fg-subtle">
          {vide?.[lang] ?? ""}
        </p>
      ) : (
        <>
          {/*
            En-tête, chiffre principal et curseur dans UN seul bloc : ils se
            lisent ensemble — « où », « combien », « en combien de temps ». Deux
            blocs coûtaient une bordure et deux marges, et le panneau débordait
            la hauteur de la carte.
          */}
          <Bloc>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold leading-tight text-fg [text-wrap:balance]">
                  {titreAffiche}
                </p>
                {config?.status && (
                  <p
                    className="mt-1 text-xs font-medium"
                    style={{ color: config.status.color ?? "var(--fg-muted)" }}
                  >
                    {estStatut ? config.status.yes[lang] : config.status.no[lang]}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {config?.order && entite?.[config.order.field] !== undefined && (
                  <span className="font-mono text-xs tabular-nums text-fg-subtle">
                    {String(entite[config.order.field])} / {config.order.total}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onFermer}
                  className="-mr-1 rounded-lg p-1 text-fg-muted transition-colors hover:text-fg"
                  title={lang === "fr" ? "Fermer" : "Close"}
                >
                  <span className="sr-only">{lang === "fr" ? "Fermer" : "Close"}</span>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {config?.headline && (
              <ChiffrePrincipal
                config={config.headline}
                mesures={mesures}
                palier={palier}
                suffixe={suffixe}
                steps={curseur?.steps ?? []}
                ensemble={ensemble}
                lang={lang}
              />
            )}

            {/*
              Le curseur de durée. Un `input range` natif : il se pilote au
              clavier, annonce sa valeur aux lecteurs d'écran, et se saisit au
              doigt.
            */}
            {curseur && palier !== null && (
              <div className={config?.headline ? "mt-1" : ""}>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="lab-curseur" className="text-xs text-fg-muted">
                    {curseur.label[lang]}
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-fg">
                    {palier}
                    {suffixe}
                  </span>
                </div>
                <input
                  id="lab-curseur"
                  type="range"
                  min={0}
                  max={curseur.steps.length - 1}
                  step={1}
                  value={Math.max(0, curseur.steps.indexOf(palier))}
                  onChange={(e) => onPalier(curseur.steps[Number(e.target.value)])}
                  className="mt-1.5 w-full accent-brand"
                  aria-valuetext={`${palier}${suffixe}`}
                />
                <div className="flex justify-between font-mono text-[10.5px] tabular-nums text-fg-subtle">
                  <span>
                    {curseur.steps[0]}
                    {suffixe}
                  </span>
                  <span>
                    {curseur.steps[curseur.steps.length - 1]}
                    {suffixe}
                  </span>
                </div>
              </div>
            )}
          </Bloc>

          {/* Courbe, puis la phrase de synthèse qui en donne la lecture. */}
          {config?.curve && serie.length > 1 && (
            <Bloc titre={config.curve.title[lang]} aide={config.curve.help?.[lang]}>
              <Courbe config={config.curve} serie={serie} champX={curseur?.field ?? "minutes"} palier={palier} suffixe={suffixe} lang={lang} />
              {config.summary && (
                <p className="border-l-2 pl-2.5 text-[12.5px] leading-snug text-fg" style={{ borderColor: config.curve.value.color }}>
                  {mesures
                    ? config.summary(mesures, entite ?? {}, lang)
                    : lang === "fr"
                      ? "L'aire de marche apparaît dès les premières minutes : déplacez le curseur."
                      : "The walkshed appears within the first minutes: move the slider."}
                </p>
              )}
            </Bloc>
          )}

          {config?.donut && (
            <Bloc titre={config.donut.title[lang]} aide={config.donut.help?.[lang]}>
              <Anneau config={config.donut} mesures={mesures} lang={lang} />
              {config.donut.note && (
                <p className="text-[11px] leading-snug text-fg-subtle">{config.donut.note[lang]}</p>
              )}
            </Bloc>
          )}

          {lignes.length > 0 && (
            <Bloc titre={config?.indicatorsTitle?.[lang]}>
              <Indicateurs lignes={lignes} donnees={donnees} palier={palier} lang={lang} />
            </Bloc>
          )}

        </>
      )}

      {/*
        Pied du panneau : la méthode, repliée, puis la légende en ligne.

        L'attribution n'y figure plus : elle est déjà sous la carte, quelle
        que soit la forme de publication (entrée, pleine page, prévisualisation),
        ce qui satisfait les licences. Répétée ici, elle coûtait deux lignes et
        faisait déborder le panneau de la hauteur de la carte.
      */}
      {((ouvert && config?.method) || legende?.length) && (
        <div className="mt-auto grid gap-2 border-t border-line px-4 py-2.5 text-[11px] leading-snug text-fg-subtle">
          {ouvert && config?.method && (
            <details className="group">
              <summary className="cursor-pointer list-none text-[12px] text-fg-muted marker:hidden">
                <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
                {config.method.title[lang]}
              </summary>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{config.method.text[lang]}</p>
            </details>
          )}
          {legende?.length ? (
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
              {legende.map((item) => (
                <li key={item.label.en} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.label[lang]}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </aside>
  );
}

/** Un bloc du panneau : un surtitre facultatif, son aide « ? », son contenu. */
function Bloc({ titre, aide, children }: { titre?: string; aide?: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <section className="grid gap-2 border-t border-line px-4 py-2.5 first:border-t-0">
      {titre && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{titre}</h3>
          {aide && (
            <button
              type="button"
              onClick={() => setOuvert((o) => !o)}
              aria-expanded={ouvert}
              className="h-4 w-4 shrink-0 rounded-full border border-line bg-surface text-[10px] font-semibold leading-[14px] text-fg-subtle hover:text-fg"
              title={aide}
            >
              ?
            </button>
          )}
        </div>
      )}
      {aide && ouvert && (
        <p className="m-0 rounded-lg bg-surface px-2.5 py-2 text-xs leading-snug text-fg-muted">{aide}</p>
      )}
      {children}
    </section>
  );
}

/** Le chiffre principal, son rang et la moyenne de l'ensemble au même palier. */
function ChiffrePrincipal({
  config,
  mesures,
  palier,
  suffixe,
  steps,
  ensemble,
  lang,
}: {
  config: NonNullable<LabPanelConfig["headline"]>;
  mesures: Record<string, unknown> | null;
  palier: number | null;
  suffixe: string;
  steps: number[];
  ensemble: Record<string, unknown>[];
  lang: "fr" | "en";
}) {
  const valeur = mesures ? Number(mesures[config.field]) : null;

  // Les séries de l'ensemble sont alignées sur les paliers SANS le zéro.
  let comparaison: string | null = null;
  if (valeur !== null && palier && config.compareSeries && config.compareText && ensemble.length) {
    const paliers = steps.filter((s) => s > 0);
    const i = paliers.indexOf(palier);
    const valeurs = ensemble
      .map((e) => {
        const s = e[config.compareSeries!];
        const tableau = typeof s === "string" ? (JSON.parse(s) as number[]) : (s as number[]);
        return Array.isArray(tableau) ? Number(tableau[i]) : NaN;
      })
      .filter((v) => Number.isFinite(v));
    if (valeurs.length && i >= 0) {
      const rang = 1 + valeurs.filter((v) => v > valeur).length;
      const moyenne = Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length);
      comparaison = config.compareText[lang]
        .replace("{rang}", String(rang))
        .replace("{total}", String(valeurs.length))
        .replace("{moyenne}", nombre(moyenne, lang));
    }
  }

  return (
    <div className="grid gap-1">
      <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
        {config.label[lang]}
        {palier ? ` · ${palier}${suffixe}` : ""}
      </p>
      <p className="m-0 text-[32px] font-semibold leading-none tracking-tight text-fg tabular-nums">
        {valeur !== null ? nombre(valeur, lang) : <span className="text-fg-subtle">—</span>}
        {valeur !== null && <span className="ml-1.5 text-sm font-medium tracking-normal text-fg-muted">{config.unit[lang]}</span>}
      </p>
      {comparaison && <p className="m-0 text-xs text-fg-muted">{comparaison}</p>}
    </div>
  );
}

/** Deux courbes par palier — la référence en pointillé, la mesure pleine. */
function Courbe({
  config,
  serie,
  champX,
  palier,
  suffixe,
  lang,
}: {
  config: NonNullable<LabPanelConfig["curve"]>;
  serie: Record<string, unknown>[];
  champX: string;
  palier: number | null;
  suffixe: string;
  lang: "fr" | "en";
}) {
  // `h` laisse au-dessus de la plus haute graduation la place de l'unité.
  const W = 300, d = 6, b = 20;
  // Sans graduations, ni unité à loger en haut ni hauteur à consacrer à
  // l'échelle : la forme des courbes se lit aussi bien sur moins de hauteur.
  const H = config.simple ? 112 : 156;
  const h = config.simple ? 10 : 18;
  // Sans graduations, plus besoin de marge à gauche pour leurs valeurs.
  const g = config.simple ? 8 : 34;
  const xs = serie.map((p) => Number(p[champX]));
  const ref = serie.map((p) => Number(p[config.reference.field]));
  const val = serie.map((p) => Number(p[config.value.field]));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  // Une échelle ronde : graduations à des valeurs que la courbe atteint.
  const brut = Math.max(...ref, ...val);
  const pas = brut > 300 ? 100 : brut > 150 ? 50 : brut > 60 ? 20 : 10;
  const ymax = Math.ceil(brut / pas) * pas;
  const X = (v: number) => g + ((v - xmin) / (xmax - xmin)) * (W - g - d);
  const Y = (v: number) => H - b - (v / ymax) * (H - b - h);
  const trace = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const i = palier ? xs.indexOf(palier) : -1;
  // Mode simple : la seule ligne de base, et les deux bornes du temps.
  const graduations = config.simple
    ? [0]
    : Array.from({ length: Math.floor(ymax / pas) + 1 }, (_, k) => k * pas);
  const reperes = xs.filter(
    (_, k) => k === 0 || k === xs.length - 1 || (!config.simple && xs[k] % 5 === 0),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${config.value.label[lang]} / ${config.reference.label[lang]}`}>
      {graduations.map((v) => (
        <g key={v}>
          <line x1={g} x2={W - d} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth={1} />
          {!config.simple && (
            <text x={g - 5} y={Y(v) + 3} textAnchor="end" className="fill-fg-subtle font-mono text-[9px]">{v}</text>
          )}
        </g>
      ))}
      {reperes.map((v) => (
        <text
          key={v}
          x={X(v)}
          y={H - 5}
          // Les bornes s'alignent vers l'intérieur : centrées, elles
          // débordaient du dessin et se coupaient (« min », « 15 m »).
          textAnchor={v === xmin ? "start" : v === xmax ? "end" : "middle"}
          className="fill-fg-subtle font-mono text-[9px]"
        >
          {v}{suffixe}
        </text>
      ))}
      {!config.simple && (
        <text x={g - 5} y={8} textAnchor="end" className="fill-fg-subtle font-mono text-[9px]">{config.unit}</text>
      )}

      <path d={`${trace(val)}L${X(xmax)},${Y(0)}L${X(xmin)},${Y(0)}Z`} fill={config.value.color} fillOpacity={0.12} />
      <path d={trace(ref)} fill="none" stroke={config.reference.color} strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={trace(val)} fill="none" stroke={config.value.color} strokeWidth={2} />
      <text x={X(xmax) - 2} y={Y(ref[ref.length - 1]) - 6} textAnchor="end" className="fill-fg-subtle font-mono text-[9px]">
        {config.reference.label[lang]}
      </text>
      <text x={X(xmax) - 2} y={Y(val[val.length - 1]) + 14} textAnchor="end" className="font-mono text-[9px]" fill={config.value.color}>
        {config.value.label[lang]}
      </text>

      {i >= 0 && (
        <g>
          <line x1={X(xs[i])} x2={X(xs[i])} y1={h} y2={H - b} stroke="var(--fg-subtle)" strokeWidth={1} strokeDasharray="2 2" />
          <circle cx={X(xs[i])} cy={Y(ref[i])} r={3.5} fill="var(--surface)" stroke={config.reference.color} strokeWidth={1.5} />
          <circle cx={X(xs[i])} cy={Y(val[i])} r={4.5} fill={config.value.color} stroke="var(--surface)" strokeWidth={1.5} />
        </g>
      )}
    </svg>
  );
}

/** Anneau de parts, la première au centre ; transitions fondues entre paliers. */
function Anneau({
  config,
  mesures,
  lang,
}: {
  config: NonNullable<LabPanelConfig["donut"]>;
  mesures: Record<string, unknown> | null;
  lang: "fr" | "en";
}) {
  const R = 42, C = 2 * Math.PI * R;
  const parts = config.segments.map((s) => (mesures ? Number(mesures[s.field]) || 0 : 0));
  // Début de chaque arc : la somme des parts qui le précèdent.
  const debuts = parts.map((_, k) => parts.slice(0, k).reduce((a, b) => a + b, 0) / 100);
  const premier = config.segments[0];

  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-4">
      <svg viewBox="0 0 112 112" className="w-full" role="img" aria-label={config.title[lang]}>
        <circle cx={56} cy={56} r={R} fill="none" stroke="var(--line)" strokeWidth={14} />
        {config.segments.map((s, k) => {
          const p = parts[k] / 100;
          const decalage = -debuts[k] * C;
          return (
            <circle
              key={s.field}
              cx={56}
              cy={56}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={14}
              transform="rotate(-90 56 56)"
              strokeDasharray={`${p * C} ${C}`}
              strokeDashoffset={decalage}
              className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
            />
          );
        })}
        <text x={56} y={57} textAnchor="middle" className="fill-fg text-[19px] font-semibold tabular-nums">
          {mesures ? `${parts[0]} %` : "—"}
        </text>
        <text x={56} y={71} textAnchor="middle" className="fill-fg-subtle text-[8.5px]">
          {premier.label[lang].toLowerCase()}
        </text>
      </svg>
      <ul className="m-0 grid list-none gap-1 p-0 text-[12.5px]">
        {config.segments.map((s, k) => (
          <li key={s.field} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-2.5">
            <i aria-hidden="true" className="block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-fg-muted">{s.label[lang]}</span>
            <span className="font-semibold tabular-nums text-fg">{mesures ? `${parts[k]} %` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Les indicateurs techniques : tirets au palier zéro, pour que rien ne saute. */
function Indicateurs({
  lignes,
  donnees,
  palier,
  lang,
}: {
  lignes: LabHoverRow[];
  donnees: DonneesPanneau;
  palier: number | null;
  lang: "fr" | "en";
}) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-[12.5px]">
      {lignes.map((row) => {
        const v = donnees[row.field];
        const vide = palier === 0 || v === undefined || v === null || v === "";
        return (
          <div key={row.field} className="contents">
            <dt className="text-fg-muted">{row.label?.[lang] ?? row.field}</dt>
            <dd className={`m-0 text-right tabular-nums ${vide ? "text-fg-subtle" : "font-semibold text-fg"}`}>
              {vide ? "—" : `${nombre(v, lang)}${row.suffix ?? ""}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
