"use client";

import { useEffect, useRef } from "react";
import type { Bilingual, LabHoverRow } from "@/labs/types";

/**
 * Le panneau d'une entité choisie — à CÔTÉ de la carte, jamais dessus.
 *
 * POURQUOI DEHORS — un panneau posé sur la carte masque le territoire au moment
 * précis où le lecteur veut le regarder, et il masque le plus souvent ce qui
 * entoure l'entité choisie, c'est-à-dire ce qu'on vient d'ouvrir. La carte reste
 * donc entière : le panneau prend sa place à côté.
 *
 * Le prix est que la carte rétrécit quand le panneau s'ouvre. MapLibre doit
 * alors recalculer sa taille — `LabMap` écoute son conteneur pour cela.
 *
 * Sous 1024 px le panneau passe SOUS la carte plutôt qu'à côté : à cette
 * largeur, deux colonnes donnent deux bandes trop étroites pour l'une comme
 * pour l'autre.
 */

export type DonneesPanneau = Record<string, unknown>;

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
  attribution,
}: {
  /** Nom de l'entité choisie, en tête du panneau. */
  titre: string;
  lignes: LabHoverRow[];
  donnees: DonneesPanneau;
  curseur?: {
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
   * Légende et provenance, posées au pied du panneau.
   *
   * Elles vivaient sous la carte, où elles lui prenaient trois lignes de
   * hauteur. Ici elles ne coûtent rien : le panneau a de la place en bas, et
   * c'est de toute façon le lieu où l'on lit ce que la carte montre.
   *
   * L'attribution n'est pas facultative — la plupart des licences de données
   * ouvertes l'exigent, ODbL comprise.
   */
  legende?: Array<{ color: string; label: Bilingual }>;
  attribution?: Bilingual;
}) {
  const ouvert = Boolean(titre);

  /**
   * Changer de station remet le curseur à son palier d'ouverture.
   *
   * Sans cela, une station choisie après qu'on a descendu le curseur à trois
   * minutes s'ouvrirait elle aussi à trois — et le lecteur verrait une aire
   * minuscule sans comprendre pourquoi. Chaque station s'ouvre sur son résultat
   * complet.
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

  return (
    <aside
      // Sous 1024 px le panneau est SOUS la carte : il faut alors lui donner une
      // hauteur maximale, sinon une liste longue le pousserait hors de l'écran
      // et le lecteur ne verrait plus la carte en même temps que ses chiffres —
      // or c'est leur coexistence qui fait le propos.
      className="flex max-h-[14rem] flex-col overflow-y-auto rounded-xl border border-line bg-surface-muted p-4 lg:max-h-full"
      role="complementary"
      aria-label={lang === "fr" ? "Détail de la sélection" : "Selection detail"}
      aria-live="polite"
    >
      {!ouvert ? (
        <p className="m-auto max-w-[22ch] text-center text-sm leading-relaxed text-fg-subtle">
          {vide?.[lang] ?? ""}
        </p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold leading-tight text-fg">
              {titre}
            </p>
            <button
              type="button"
              onClick={onFermer}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-fg-muted transition-colors hover:text-fg"
              title={lang === "fr" ? "Fermer" : "Close"}
            >
              <span className="sr-only">
                {lang === "fr" ? "Fermer" : "Close"}
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/*
            Le curseur de durée.

            Un `input range` natif plutôt qu'un dessin maison : il se pilote au
            clavier, annonce sa valeur aux lecteurs d'écran, et se saisit au
            doigt sans qu'on ait rien à écrire pour cela.

            Les paliers sont discrets — les formes intermédiaires n'existent
            pas, elles sont précalculées. Six suffisent à ce que le mouvement
            paraisse continu.
          */}
          {curseur && palier !== null && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="lab-curseur"
                  className="text-[11px] uppercase tracking-wide text-fg-muted"
                >
                  {curseur.label[lang]}
                </label>
                <span className="text-sm font-semibold tabular-nums text-fg">
                  {palier}
                  {curseur.suffix ?? ""}
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
                className="mt-2 w-full accent-brand"
                aria-valuetext={`${palier}${curseur.suffix ?? ""}`}
              />
              <div className="flex justify-between text-[11px] tabular-nums text-fg-subtle">
                <span>
                  {curseur.steps[0]}
                  {curseur.suffix ?? ""}
                </span>
                <span>
                  {curseur.steps[curseur.steps.length - 1]}
                  {curseur.suffix ?? ""}
                </span>
              </div>
            </div>
          )}

          <dl className="mt-5 space-y-2.5">
            {lignes.map((row, i) => {
              // Au palier zéro, aucune aire n'existe : les lignes gardent leur
              // place avec un tiret plutôt que de disparaître, sinon le panneau
              // se replierait et se déplierait au fil du curseur.
              if (palier === 0) {
                return (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-2 last:border-0"
                  >
                    <dt className="text-xs leading-snug text-fg-muted">
                      {row.label?.[lang] ?? row.field}
                    </dt>
                    <dd className="shrink-0 text-sm text-fg-subtle">—</dd>
                  </div>
                );
              }
              const valeur = donnees[row.field];
              if (valeur === undefined || valeur === null || valeur === "") {
                return null;
              }
              // Les grands nombres se lisent par tranches : « 23 146 » plutôt
              // que « 23146 », qu'on doit compter du doigt.
              const texte =
                typeof valeur === "number"
                  ? valeur.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")
                  : String(valeur);
              return (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-2 last:border-0"
                >
                  <dt className="text-xs leading-snug text-fg-muted">
                    {row.label?.[lang] ?? row.field}
                  </dt>
                  <dd className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                    {texte}
                    {row.suffix ?? ""}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}

      {/*
        Légende et provenance, poussées en bas du panneau par `mt-auto`. Elles
        restent visibles qu'une station soit choisie ou non : une carte sans
        légende ne dit rien de ses couleurs, et une carte sans source citée n'a
        aucune valeur — la plupart des licences l'exigent par ailleurs.
      */}
      {(legende?.length || attribution) && (
        <div className="mt-auto space-y-2 pt-5 text-[11px] leading-snug text-fg-subtle">
          {legende?.length ? (
            <ul className="space-y-1.5">
              {legende.map((item) => (
                <li key={item.label.en} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-sm border border-line"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label[lang]}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {attribution && (
            <p className="border-t border-line/60 pt-2">{attribution[lang]}</p>
          )}
        </div>
      )}
    </aside>
  );
}
