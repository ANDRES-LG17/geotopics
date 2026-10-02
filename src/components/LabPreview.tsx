"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { getLab, type LabId } from "@/labs";
import LabPanel from "./LabPanel";

/**
 * Mesure ce qui, sur cette page, peut empêcher une carte d'apparaître sans rien
 * dire : un conteneur de hauteur nulle, ou un WebGL indisponible. Les deux
 * échouent en silence — la carte est là, mais invisible.
 */
function useDiagnostic(cible: React.RefObject<HTMLDivElement | null>) {
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const boite = cible.current?.getBoundingClientRect();
      let webgl = "non";
      try {
        const c = document.createElement("canvas");
        if (c.getContext("webgl2")) webgl = "webgl2";
        else if (c.getContext("webgl")) webgl = "webgl1";
      } catch {
        webgl = "erreur";
      }
      const canvas = cible.current?.querySelector("canvas");
      setInfo(
        `conteneur ${Math.round(boite?.width ?? 0)}×${Math.round(boite?.height ?? 0)} · ` +
          `webgl ${webgl} · ` +
          `canvas ${canvas ? `${canvas.width}×${canvas.height}` : "absent"}`,
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [cible]);

  return info;
}

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
  const zone = useRef<HTMLDivElement>(null);
  const diagnostic = useDiagnostic(zone);

  // La prévisualisation doit montrer le lab tel qu'il sera lu, panneau compris :
  // c'est ici qu'on vérifie une mise en page avant de la publier.
  const [choisi, setChoisi] = useState<Record<string, unknown> | null>(null);
  const [donnees, setDonnees] = useState<Record<string, unknown> | null>(null);
  const [palier, setPalier] = useState<number | null>(
    lab.select?.slider?.start ??
      lab.select?.slider?.steps[lab.select.slider.steps.length - 1] ??
      null,
  );
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

  const carte = (
    <LabMap
      fill
      lab={lab}
      label={lab.id}
      errorLabel="Données introuvables — vérifier le chemin dans la définition du lab."
      locale={locale}
      onSelection={lab.select ? recevoirSelection : undefined}
      palierExterne={palier}
    />
  );

  return (
    <main className="flex h-dvh flex-col bg-surface p-2 sm:p-3">
      {/*
        Le relevé de diagnostic — taille du conteneur, WebGL, langue — est posé
        en surimpression, en haut à droite, plutôt qu'en bandeau au-dessus de la
        carte.

        POURQUOI — cette page sert à juger du rendu, et un bandeau qui prend
        trois lignes de haut fausse ce jugement : on regarde une carte plus
        courte que celle qu'on publiera. Le relevé reste là, discret, pour les
        deux pannes qu'il seul sait nommer — un conteneur de hauteur nulle et un
        WebGL absent, qui échouent tous deux en silence.
      */}
      <p className="pointer-events-none absolute right-3 top-2 z-30 font-mono text-[10px] text-fg-subtle/60">
        {lab.id}
        {diagnostic ? ` · ${diagnostic}` : ""}
        {" · "}
        <a
          href={`/lab-preview/${lab.id}?locale=${locale === "fr" ? "en" : "fr"}`}
          className="pointer-events-auto underline underline-offset-2"
        >
          {locale === "fr" ? "en" : "fr"}
        </a>
      </p>

      <div ref={zone} className="min-h-0 flex-1">
        <ErrorBox>
          {lab.select ? (
            <div className="grid h-full min-h-0 grid-rows-[1fr_auto] gap-3 lg:grid-cols-[1fr_20rem] lg:grid-rows-1">
              <div className="relative min-h-0">{carte}</div>
              <LabPanel
                titre={choisi ? String(choisi[lab.select.title] ?? "") : ""}
                lignes={lab.select.rows}
                donnees={donnees ?? choisi ?? {}}
                curseur={lab.select.slider}
                palier={palier}
                onPalier={setPalier}
                onFermer={() => setChoisi(null)}
                lang={locale}
                vide={lab.select.empty}
                legende={lab.legend}
                attribution={lab.attribution}
              />
            </div>
          ) : (
            carte
          )}
        </ErrorBox>
      </div>

    </main>
  );
}
