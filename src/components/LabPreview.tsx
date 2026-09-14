"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { getLab, type LabId } from "@/labs";

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

  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-surface p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-mono text-sm text-fg">{lab.id}</h1>
        <p className="font-mono text-xs text-fg-subtle">
          {diagnostic ? `${diagnostic} · ` : ""}
          {locale}
          {" · "}
          <a
            href={`/lab-preview/${lab.id}?locale=${locale === "fr" ? "en" : "fr"}`}
            className="underline underline-offset-2"
          >
            {locale === "fr" ? "en" : "fr"}
          </a>
        </p>
      </header>

      {/*
        Hauteur explicite plutôt qu'une chaîne `flex-1` + `h-full` : un
        pourcentage de hauteur ne se résout que si le parent a une hauteur
        définie, et la chaîne peut s'effondrer à zéro sans rien signaler. Ici la
        valeur est calculée une fois, à partir de la fenêtre.
      */}
      <div ref={zone} className="h-[calc(100dvh-11rem)] min-h-[320px]">
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

      <footer className="space-y-2 text-xs text-fg-subtle">
        {lab.legend && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {lab.legend.map((item) => (
              <li key={item.label.en} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm border border-line"
                  style={{ backgroundColor: item.color }}
                />
                {item.label[locale]}
              </li>
            ))}
          </ul>
        )}
        <p>{lab.attribution[locale]}</p>
      </footer>
    </main>
  );
}
