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
/** Durée de l'entrée, en millisecondes. Doit suivre celle de `globals.css`. */
const REVEAL_MS = 700;

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
  const [state, setState] = useState<"idle" | "pending" | "shown" | "done">(
    "idle",
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Déjà dans la fenêtre au chargement : on affiche sans animer, sinon le
    // haut de page clignoterait à chaque visite. Directement « done », donc :
    // il n'y a aucune entrée à jouer, et donc aucune transition à porter.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      setState("done");
      return;
    }

    setState("pending");

    // Le passage à « done » est piloté par une minuterie et non par
    // `transitionend` : cet événement ne se déclenche pas si la transition
    // n'avait rien à animer, et l'élément resterait alors indéfiniment porteur
    // d'une transition de 0,7 s et d'un délai — exactement ce qu'on cherche à
    // retirer. Une minuterie, elle, se déclenche toujours.
    let settle = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("shown");
        observer.disconnect();
        settle = window.setTimeout(() => setState("done"), delay + REVEAL_MS);
      },
      // Se déclenche un peu avant le bord bas : le mouvement accompagne
      // le scroll au lieu de le suivre.
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(settle);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      data-reveal={state}
      // Le délai n'existe que pendant l'entrée. Laissé en place, il s'appliquait
      // ensuite à tout ce que ce sous-arbre pouvait animer — le survol des
      // cartes attendait jusqu'à 420 ms avant de démarrer.
      style={
        delay && state !== "done" ? { transitionDelay: `${delay}ms` } : undefined
      }
      className={className}
    >
      {children}
    </div>
  );
}
