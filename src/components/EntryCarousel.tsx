"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import EntryVisual from "./EntryVisual";
import { formatDate, type EntryMeta } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

/**
 * Carrousel des travaux en vedette, dans l'esprit de la galerie Apple TV+.
 *
 * Une entrée par diapositive, pleine largeur, sur un fond sombre — la rupture
 * avec le blanc du reste du site est le sujet : cette bande doit se lire comme
 * une vitrine, pas comme une liste de plus.
 *
 * Le fond de chaque diapositive vient d'`EntryVisual`, partagé avec les
 * vignettes de la liste : couverture de l'entrée si elle en porte une, sinon
 * un dégradé construit à partir de sa famille de travaux.
 *
 * Pourquoi pas de librairie d'animation : un rail qui se translate et des
 * transitions CSS suffisent. Importer `framer-motion` pour cela pèserait plus
 * lourd que toute la page, au même titre qu'un moteur 3D pour `Globe`.
 *
 * Le défilement automatique s'arrête au survol, au focus clavier, hors champ
 * et onglet caché : une animation qui tourne dans le vide vide la batterie, et
 * un carrousel qui bouge pendant qu'on lit est une nuisance.
 */

/* --------------------------------------------------------------------------
   Réglages
   -------------------------------------------------------------------------- */

/** Durée d'affichage d'une diapositive, en millisecondes. */
const SLIDE_DURATION = 6000;

/** Durée du glissement d'une diapositive à l'autre. */
const TRANSITION_MS = 700;

/**
 * Distance minimale d'un glissement du doigt pour changer de diapositive, en
 * pixels. En deçà, c'est un défilement vertical contrarié, pas une intention.
 */
const SWIPE_THRESHOLD = 50;

/**
 * Largeur d'une diapositive, et espace entre deux.
 *
 * La bande occupe toute la fenêtre, mais chaque diapositive garde la largeur
 * de lecture du site : c'est ce décalage qui laisse voir un morceau de la
 * précédente et de la suivante. `--slide` reproduit donc exactement le calcul
 * de `Container` — `min(72rem, 100vw − 2 × padding)` — et doit être corrigée
 * ici si ce composant change de gabarit.
 *
 * Le `min()` est indispensable : sans lui, sur une fenêtre étroite la
 * diapositive garderait 72 rem et déborderait au lieu de rétrécir.
 */
const SLIDE_METRICS = {
  "--slide": "min(72rem, 100vw - 2.5rem)",
  "--gap": "1rem",
} as React.CSSProperties;

/* --------------------------------------------------------------------------
   Diapositive
   -------------------------------------------------------------------------- */

function Slide({
  entry,
  locale,
  active,
}: {
  entry: EntryMeta;
  locale: Locale;
  active: boolean;
}) {
  const t = useTranslations("entry");
  const tc = useTranslations("carousel");

  return (
    <article
      // La largeur vient de `--slide` — celle du conteneur du site — et non de
      // la fenêtre : c'est ce qui laisse dépasser les voisines de part et
      // d'autre. `rounded-2xl` est ici et non sur le rail, puisque chaque
      // diapositive est désormais une carte autonome.
      style={{ width: "var(--slide)" }}
      className={`relative isolate flex min-h-[26rem] shrink-0 items-end overflow-hidden rounded-2xl transition-opacity duration-500 sm:min-h-[30rem] lg:min-h-[34rem] ${
        // Les voisines sont à peine estompées. Descendre plus bas les
        // délave sur le blanc de la page : elles virent au gris et se
        // remarquent davantage que la diapositive qu'on regarde, ce qui est
        // l'inverse du but. À 85 %, elles gardent leur couleur et restent
        // second plan.
        active ? "opacity-100" : "opacity-85"
      }`}
    >
      <EntryVisual
        category={entry.category}
        cover={entry.cover}
        scrim="left"
        // Le zoom lent n'est appliqué qu'à la diapositive visible : inutile de
        // faire peindre une transformation sur des calques hors champ.
        mediaClassName={`transition-transform duration-[6s] ease-out motion-reduce:transition-none ${
          active ? "scale-110" : "scale-100"
        }`}
      />

      <div className="relative w-full p-7 sm:p-10 lg:p-14">
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {t(`filters.${entry.category}`)}
            </span>
            <time dateTime={entry.date} className="text-white/70">
              {formatDate(entry.date, locale)}
            </time>
            <span aria-hidden="true" className="text-white/40">
              ·
            </span>
            <span className="text-white/70">
              {t("readingTime", { minutes: entry.readingMinutes })}
            </span>
          </div>

          <h3 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {entry.title}
          </h3>

          <p className="mt-3 leading-relaxed text-white/80 sm:text-lg">
            {entry.description}
          </p>

          <Link
            href={`/blog/${entry.slug}`}
            // Hors de la diapositive active, le lien sort du parcours de
            // tabulation : sans cela, la touche Tab emmène dans des cartes
            // invisibles, poussées hors cadre par la translation du rail.
            tabIndex={active ? undefined : -1}
            aria-hidden={!active}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#06342b] transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {tc("viewProject")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------------------
   Carrousel
   -------------------------------------------------------------------------- */

export default function EntryCarousel({
  entries,
  locale,
  className = "",
}: {
  entries: EntryMeta[];
  locale: Locale;
  className?: string;
}) {
  const t = useTranslations("carousel");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [canHover, setCanHover] = useState(false);

  /**
   * Les deux raisons de suspendre sont suivies séparément, et non dans un seul
   * drapeau : elles vont et viennent indépendamment, et les confondre ferait
   * qu'entrer dans le champ relance le défilement alors que le curseur est
   * posé dessus. Aucune ne touche à `playing`, qui est le choix explicite de
   * la personne — revenir dans le champ ne doit pas relancer ce qu'elle a
   * arrêté au bouton.
   */
  const [engaged, setEngaged] = useState(false);
  const [away, setAway] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<number | null>(null);

  const count = entries.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // `prefers-reduced-motion` coupe le défilement automatique : une bande qui
  // bouge seule est exactement ce que ce réglage demande d'éviter.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /**
   * La pause au survol n'a de sens que là où il existe un curseur.
   *
   * Sur écran tactile, le navigateur fabrique des événements de souris après
   * un appui : `mouseenter` part au premier contact, mais `mouseleave` n'a
   * aucune raison de suivre — rien ne quitte la zone. Le carrousel restait
   * alors suspendu indéfiniment, sans que rien ne l'indique.
   *
   * `(hover: hover)` distingue un vrai pointeur d'un doigt. On ne branche donc
   * la pause au survol que là où elle veut dire quelque chose.
   */
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      setCanHover(query.matches);
      // Le réglage peut changer en cours de route (souris branchée sur une
      // tablette, station détachable) : si le survol cesse d'exister, la pause
      // qu'il avait posée doit être levée, sinon elle ne le sera jamais.
      if (!query.matches) setEngaged(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Rien ne tourne hors champ ni dans un onglet caché : un carrousel qui
  // avance sans personne pour le voir ne fait que vider la batterie.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    let onScreen = true;
    const sync = () => setAway(!onScreen || document.hidden);

    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    seen.observe(node);

    document.addEventListener("visibilitychange", sync);
    return () => {
      seen.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const running =
    playing && !engaged && !away && !reduceMotion && count > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => go(index + 1), SLIDE_DURATION);
    return () => window.clearTimeout(timer);
  }, [running, index, go]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  function onPointerDown(event: React.PointerEvent) {
    pointerStart.current = event.clientX;
  }

  function onPointerUp(event: React.PointerEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start === null) return;
    const dx = event.clientX - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(index + (dx < 0 ? 1 : -1));
  }

  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label={t("label")}
      onKeyDown={onKeyDown}
      onMouseEnter={canHover ? () => setEngaged(true) : undefined}
      onMouseLeave={canHover ? () => setEngaged(false) : undefined}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={SLIDE_METRICS}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Le rail.

          Deux translations se composent ici. La première, en pourcentage,
          amène la diapositive voulue au bord gauche. La seconde, en pixels,
          recentre : la moitié de ce qui reste de la fenêtre une fois la
          diapositive posée, soit `(100vw − largeur) / 2`. C'est cette seconde
          part qui fait dépasser les voisines à gauche et à droite.

          Une seule propriété animée, donc composée par le GPU sans rien
          repeindre. */}
      <div
        className="flex motion-reduce:transition-none"
        style={{
          gap: "var(--gap)",
          transform: `translate3d(calc(${-index} * (var(--slide) + var(--gap)) + (100vw - var(--slide)) / 2), 0, 0)`,
          transition: `transform ${TRANSITION_MS}ms cubic-bezier(.22,.61,.36,1)`,
        }}
      >
        {entries.map((entry, i) => (
          <Slide
            key={entry.slug}
            entry={entry}
            locale={locale}
            active={i === index}
          />
        ))}
      </div>

      {/* La navigation est posée sous le rail, dans le flux, et non plus en
          surimpression : la bande fait maintenant toute la largeur, alors
          qu'une pastille posée en absolu se placerait par rapport à la
          fenêtre et non par rapport à la diapositive centrée — elle finirait
          hors de la carte, sur le blanc de la page. */}
      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label={t("label")}
            className="flex items-center gap-2 rounded-full border border-line px-3 py-2"
          >
            {entries.map((entry, i) => {
              const current = i === index;
              return (
                <button
                  key={entry.slug}
                  type="button"
                  role="tab"
                  aria-selected={current}
                  aria-label={t("goTo", { number: i + 1, total: count })}
                  onClick={() => go(i)}
                  className="group relative h-4 px-0.5"
                >
                  {/* La pastille : un trait qui s'allonge quand il est actif,
                      et se remplit à la vitesse du minuteur. */}
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      current
                        ? "w-7 bg-brand/20"
                        : "w-1.5 bg-fg-subtle/40 group-hover:bg-fg-subtle"
                    }`}
                  >
                    {current && (
                      <span
                        // `key` sur l'index : remonter l'élément à chaque
                        // changement rejoue l'animation depuis zéro, ce qu'un
                        // simple changement de classe ne ferait pas.
                        key={index}
                        className="block h-full rounded-full bg-brand"
                        style={{
                          animation: running
                            ? `carousel-fill ${SLIDE_DURATION}ms linear forwards`
                            : undefined,
                          width: running ? undefined : "100%",
                        }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? t("pause") : t("play")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-brand/50 hover:text-brand"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                {playing ? (
                  <g fill="currentColor">
                    <rect x="3" y="2" width="3.5" height="12" rx="1" />
                    <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                  </g>
                ) : (
                  <path fill="currentColor" d="M4 2.5v11l9.5-5.5L4 2.5Z" />
                )}
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
