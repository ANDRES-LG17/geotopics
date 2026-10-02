"use client";

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
}: {
  /** Nom de l'entité choisie, en tête du panneau. */
  titre: string;
  lignes: LabHoverRow[];
  donnees: DonneesPanneau;
  curseur?: {
    steps: number[];
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
}) {
  const ouvert = Boolean(titre);

  return (
    <aside
      className="flex flex-col overflow-y-auto rounded-xl border border-line bg-surface-muted p-4 lg:max-h-full"
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
    </aside>
  );
}
