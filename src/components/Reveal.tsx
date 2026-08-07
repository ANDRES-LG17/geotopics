"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fait apparaître son contenu quand il entre dans la fenêtre.
 *
 * Pourquoi un IntersectionObserver plutôt que les animations liées au scroll
 * en CSS (`animation-timeline: view()`) : ces dernières ne sont pas encore
 * suivies par Safari, et une entrée qui reste invisible sur un navigateur est
 * bien pire qu'une entrée qui n'est pas animée.
 *
 * L'élément est visible par défaut et ne devient « en attente » qu'une fois le
 * script chargé : si le JavaScript ne s'exécute jamais, le contenu reste lisible.
 *
 * Le respect de `prefers-reduced-motion` est traité en CSS (globals.css) :
 * l'animation y est neutralisée, sans condition à écrire ici.
 */
export default function Reveal({
  children,
  /** Décalage en millisecondes, pour faire apparaître une liste en cascade. */
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Déjà dans la fenêtre au chargement : on affiche sans animer, sinon le
    // haut de page clignoterait à chaque visite.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      setState("shown");
      return;
    }

    setState("pending");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      // Se déclenche un peu avant le bord bas : le mouvement accompagne
      // le scroll au lieu de le suivre.
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
