"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { getLab, type LabId } from "@/labs";
import type { Locale } from "@/i18n/routing";
import LabPanel from "./LabPanel";

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

  const [choisi, setChoisi] = useState<Record<string, unknown> | null>(null);
  const [donnees, setDonnees] = useState<Record<string, unknown> | null>(null);
  const [palier, setPalier] = useState<number | null>(
    lab.select?.slider?.start ??
      lab.select?.slider?.steps[lab.select.slider.steps.length - 1] ??
      null,
  );

  // Stable d'un rendu à l'autre : `LabMap` l'a en dépendance d'effet, et une
  // fonction recréée à chaque rendu y relancerait la notification en boucle.
  const recevoirSelection = useCallback(
    (
      entite: Record<string, unknown> | null,
      valeurs: Record<string, unknown> | null,
    ) => {
      setChoisi(entite);
      setDonnees(valeurs);
    },
    [],
  );

  const curseur = lab.select?.slider;

  /**
   * Le panneau prend sa place à côté de la carte, et la garde.
   *
   * Il reste affiché même sans sélection — vide, avec sa phrase d'invitation.
   * Sinon la carte changerait de largeur à chaque clic, MapLibre redessinerait
   * tout, et le lecteur verrait la carte sauter sous ses yeux au moment précis
   * où il vient d'y choisir quelque chose.
   *
   * Sous 1024 px le panneau passe SOUS la carte : à cette largeur, deux
   * colonnes donnent deux bandes trop étroites pour l'une comme pour l'autre.
   */
  const carte = (
    <LabMap
      lab={lab}
      label={title}
      errorLabel={t("labError")}
      locale={locale}
      fill
      onSelection={lab.select ? recevoirSelection : undefined}
      palierExterne={palier}
    />
  );

  return (
    <figure
      className={
        plein
          ? "m-0 flex h-full flex-col p-3 sm:p-4"
          : "m-0 h-[70vh] min-h-[420px] sm:h-[78vh]"
      }
    >
      {lab.select ? (
        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-3 lg:grid-cols-[1fr_20rem] lg:grid-rows-1">
          <div className="relative min-h-0">{carte}</div>
          <LabPanel
            titre={
              choisi ? String(choisi[lab.select.title] ?? "") : ""
            }
            lignes={lab.select.rows}
            donnees={donnees ?? choisi ?? {}}
            curseur={curseur}
            palier={palier}
            onPalier={setPalier}
            onFermer={() => setChoisi(null)}
            lang={locale === "en" ? "en" : "fr"}
            vide={lab.select.empty}
            // En mode plein, la légende et la source n'ont pas d'autre place :
            // le panneau les porte. Dans une entrée, elles restent sous la
            // carte avec la note de méthode, où le texte les entoure.
            legende={plein ? lab.legend : undefined}
            attribution={plein ? lab.attribution : undefined}
          />
        </div>
      ) : (
        carte
      )}

      {/*
        En mode plein, seule l'attribution reste — les licences CC-BY des jeux
        de données l'exigent, et une carte partagée sans crédit n'a aucune
        valeur professionnelle. Légende, note de méthode et lien de
        téléchargement reviendront avec l'article.
      */}
      {plein ? (
        // Avec un panneau, la source est déjà à son pied : la répéter ici
        // prendrait de la hauteur à la carte pour redire la même chose.
        lab.select ? null : (
          <figcaption className="mt-2 shrink-0 text-[11px] leading-snug text-fg-subtle">
            {t("labSource")} {lab.attribution[locale]}
          </figcaption>
        )
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
