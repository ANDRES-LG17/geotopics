"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { getLab, type LabId } from "@/labs";
import type { Locale } from "@/i18n/routing";

/**
 * Enveloppe d'un lab dans une entrée du carnet.
 *
 * Même parti pris que pour les Story Maps : rien de lourd ne se charge avant
 * que le lecteur le demande. Ici, ce qu'on diffère est notre propre code —
 * MapLibre et le fichier de données — grâce à l'import dynamique en `ssr:
 * false` (obligatoire : la bibliothèque touche `window` dès l'import).
 *
 * Ce qui entoure la carte — légende, note de méthode, source, lien de
 * téléchargement — est rendu tout de suite, avant même le clic. Deux raisons :
 * ça reste lisible sans JavaScript, et ça reste indexable.
 */

const LabMap = dynamic(() => import("./LabMap"), {
  ssr: false,
  loading: () => (
    <div className="topo-pattern-on-dark h-[420px] w-full animate-pulse rounded-xl border border-line bg-[#08150f] sm:h-[520px]" />
  ),
});

export default function LabEmbed({
  labId,
  title,
  locale,
}: {
  labId: LabId;
  /** Titre de l'entrée — sert d'étiquette accessible à la carte. */
  title: string;
  locale: Locale;
}) {
  const t = useTranslations("entry");
  const [opened, setOpened] = useState(false);
  const lab = getLab(labId);

  return (
    <figure className="m-0">
      {opened ? (
        <LabMap
          lab={lab}
          label={title}
          errorLabel={t("labError")}
          locale={locale}
        />
      ) : (
        <div className="topo-pattern-on-dark flex h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-line bg-[#08150f] sm:h-[520px]">
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 4 3 7v13l6-3 6 3 6-3V4l-6 3-6-3Z" />
              <path d="M9 4v13M15 7v13" />
            </svg>
            {t("openLab")}
          </button>
          <p className="max-w-xs text-center text-xs text-white/50">
            {t("labHint")}
          </p>
        </div>
      )}

      <figcaption className="mt-4 space-y-3 text-sm">
        {lab.legend && (
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {lab.legend.map((item) => (
              <li key={item.label.en} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-sm border border-line"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-fg-muted">{item.label[locale]}</span>
              </li>
            ))}
          </ul>
        )}

        {lab.note && (
          <p className="leading-relaxed text-fg-subtle">{lab.note[locale]}</p>
        )}

        <p className="text-xs text-fg-subtle">
          {t("labSource")} {lab.attribution[locale]}
          {lab.download && (
            <>
              {" · "}
              <a
                href={lab.download}
                download
                className="underline underline-offset-2 hover:text-brand"
              >
                {t("labDownload")}
              </a>
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}
