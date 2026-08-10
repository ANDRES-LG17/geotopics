"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Intègre une Story Map ArcGIS derrière une façade cliquable.
 *
 * Pourquoi ne pas charger l'iframe tout de suite ? Une Story Map pèse plusieurs
 * mégaoctets. La charger d'emblée ruinerait le temps d'affichage de l'article
 * pour un lecteur qui n'ira peut-être jamais jusqu'à la carte. L'iframe n'est
 * montée qu'au clic.
 */
export default function StoryMapEmbed({
  embedUrl,
  title,
}: {
  embedUrl: string | null;
  title: string;
}) {
  const t = useTranslations("entry");
  const [loaded, setLoaded] = useState(false);

  // Aucune URL renseignée : état d'attente soigné plutôt qu'un cadre cassé.
  if (embedUrl === null) {
    return (
      <div className="topo-pattern-on-dark flex aspect-video items-center justify-center rounded-xl border border-line bg-[#08150f]">
        <p className="text-sm font-medium text-white/50">
          {t("storyComingSoon")}
        </p>
      </div>
    );
  }

  if (loaded) {
    return (
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allowFullScreen
        allow="geolocation; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-xl border border-line"
      />
    );
  }

  return (
    <div className="topo-pattern-on-dark flex aspect-video flex-col items-center justify-center gap-4 rounded-xl border border-line bg-[#08150f]">
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
  );
}
