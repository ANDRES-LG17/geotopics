"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Intègre une Story Map ArcGIS derrière une façade cliquable.
 *
 * Pourquoi ne pas charger l'iframe tout de suite ? Une Story Map pèse
 * plusieurs mégaoctets. Trois cartes chargées d'emblée ruineraient le score
 * Lighthouse de la page. L'iframe n'est montée qu'au clic de l'utilisateur.
 */
export default function StoryMapEmbed({
  embedUrl,
  title,
  summary,
  year,
}: {
  embedUrl: string | null;
  title: string;
  summary: string;
  year: string;
}) {
  const t = useTranslations("storymaps");
  const [loaded, setLoaded] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface-raised">
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-xl font-bold tracking-tight text-fg">{title}</h3>
          <span className="shrink-0 text-xs font-medium text-fg-subtle">
            {year}
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{summary}</p>
      </div>

      {embedUrl === null ? (
        // Aucune URL renseignée : on affiche un état d'attente soigné
        // plutôt qu'un cadre blanc cassé.
        <div className="topo-pattern flex aspect-video items-center justify-center border-t border-line bg-[#071620]">
          <p className="text-sm font-medium text-white/50">{t("empty")}</p>
        </div>
      ) : loaded ? (
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allowFullScreen
          allow="geolocation; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full border-t border-line"
        />
      ) : (
        <div className="topo-pattern relative flex aspect-video flex-col items-center justify-center gap-4 border-t border-line bg-[#071620]">
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            {t("openStory")}
          </button>
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-white/60 underline underline-offset-4 hover:text-white"
          >
            {t("openInNewTab")}
          </a>
        </div>
      )}
    </article>
  );
}
