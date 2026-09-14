"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { getLab, type LabId } from "@/labs";
import type { Locale } from "@/i18n/routing";

/**
 * Enveloppe d'un lab dans une entrée du carnet.
 *
 * La carte s'ouvre d'emblée, sans clic préalable : dans une entrée « lab »,
 * elle EST le sujet de la page, pas une illustration qu'on déplie. Un bouton
 * d'ouverture n'avait de sens que tant qu'un long texte l'entourait.
 *
 * MapLibre reste chargé par import dynamique en `ssr: false` — obligatoire, la
 * bibliothèque touche `window` dès l'import — donc son poids ne pèse que sur
 * les pages qui portent une carte, jamais sur le reste du carnet.
 *
 * Ce qui entoure la carte — légende, note de méthode, source, lien de
 * téléchargement — est rendu côté serveur : lisible sans JavaScript, et
 * indexable.
 */

const LabMap = dynamic(() => import("./LabMap"), {
  ssr: false,
  // `loading` est déclaré au niveau du module : il ne reçoit aucune prop, donc
  // il ne peut pas savoir si la carte est en pleine fenêtre ou dans une entrée.
  // Il se dimensionne donc sur son conteneur — `h-full` suit la figure en mode
  // plein, et le `min-h` tient la hauteur dans le cas normal, où le parent n'a
  // pas de hauteur propre.
  loading: () => (
    <div className="topo-pattern-on-dark h-full min-h-[420px] w-full animate-pulse rounded-xl border border-line bg-[#08150f]" />
  ),
});

export default function LabEmbed({
  labId,
  title,
  locale,
  plein = false,
}: {
  labId: LabId;
  /** Titre de l'entrée — sert d'étiquette accessible à la carte. */
  title: string;
  locale: Locale;
  /**
   * La carte occupe toute la fenêtre, légende comprise.
   *
   * Utilisé par les entrées « labOnly », qui n'ont ni titre ni texte autour :
   * la carte n'y est plus une illustration dans une colonne de lecture, elle
   * est la page.
   */
  plein?: boolean;
}) {
  const t = useTranslations("entry");
  const lab = getLab(labId);

  return (
    <figure
      className={
        plein
          ? "m-0 flex h-full flex-col p-3 sm:p-4"
          : "m-0 h-[70vh] min-h-[420px] sm:h-[78vh]"
      }
    >
      <LabMap
        lab={lab}
        label={title}
        errorLabel={t("labError")}
        locale={locale}
        fill
      />

      {/*
        En mode plein, seule l'attribution reste — les licences CC-BY des jeux
        de données l'exigent, et une carte partagée sans crédit n'a aucune
        valeur professionnelle. Légende, note de méthode et lien de
        téléchargement reviendront avec l'article.
      */}
      {plein ? (
        <figcaption className="mt-2 shrink-0 text-[11px] leading-snug text-fg-subtle">
          {t("labSource")} {lab.attribution[locale]}
        </figcaption>
      ) : (
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
      )}
    </figure>
  );
}
