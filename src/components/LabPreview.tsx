"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { getLab, type LabId } from "@/labs";

/**
 * Affiche l'erreur à l'écran plutôt qu'en console.
 *
 * Sur une page de mise au point, une carte qui ne s'affiche pas sans rien dire
 * est un cul-de-sac : il faut ouvrir les outils de développement pour savoir
 * pourquoi. Ici, le message vient au lecteur.
 */
class ErrorBox extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full overflow-auto rounded-xl border border-line bg-[#1a0d0d] p-4">
        <p className="font-mono text-sm text-red-300">
          {this.state.error.message}
        </p>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-red-300/60">
          {this.state.error.stack}
        </pre>
      </div>
    );
  }
}

/**
 * Le lab, seul, en plein écran.
 *
 * Contrairement à `LabEmbed`, la carte se charge tout de suite : on vient ici
 * précisément pour la voir. Pas de bouton d'ouverture, pas de texte autour,
 * pas de `next-intl` — la page est hors de `[locale]`, donc aucun fournisseur
 * de traduction ne l'entoure, et demander `useTranslations` ici planterait.
 */

const LabMap = dynamic(() => import("./LabMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#08150f] text-sm text-white/40">
      Chargement de la carte…
    </div>
  ),
});

export default function LabPreview({
  labId,
  locale,
}: {
  labId: LabId;
  locale: "fr" | "en";
}) {
  const lab = getLab(labId);

  return (
    // Ni en-tête ni pied : cette page est publiée telle quelle, et le nom
    // technique du lab, les mesures de diagnostic, la légende et la ligne
    // d'attribution la chargeaient au-dessus et au-dessous de la carte. La
    // légende reste dans le panneau ; l'attribution, dans le contrôle de la
    // carte (OpenStreetMap, OpenFreeMap) et dans « Méthode et sources ».
    <main className="flex min-h-dvh flex-col bg-surface p-4 sm:p-6">

      {/*
        Hauteur explicite plutôt qu'une chaîne `flex-1` + `h-full` : un
        pourcentage de hauteur ne se résout que si le parent a une hauteur
        définie, et la chaîne peut s'effondrer à zéro sans rien signaler. Ici la
        valeur est calculée une fois, à partir de la fenêtre.
      */}
      <div className="h-[calc(100dvh-2rem)] min-h-[320px] sm:h-[calc(100dvh-3rem)]">
        <ErrorBox>
          <LabMap
            fill
            lab={lab}
            label={lab.id}
            errorLabel="Données introuvables — vérifier le chemin dans la définition du lab."
            locale={locale}
          />
        </ErrorBox>
      </div>

    </main>
  );
}
