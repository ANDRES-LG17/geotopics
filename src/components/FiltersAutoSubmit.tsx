"use client";

import { useEffect } from "react";

/**
 * Amélioration progressive des filtres du carnet.
 *
 * Sans lui, la barre de filtres reste un formulaire ordinaire : on coche, on
 * clique « Filtrer », la page se recharge. C'est le comportement de repli, et
 * il fonctionne — y compris sans JavaScript.
 *
 * Avec lui, cocher une case soumet le formulaire tout seul, et le bouton
 * disparaît puisqu'il n'a plus rien à faire. La recherche libre attend une
 * pause dans la frappe : soumettre à chaque lettre déclencherait une
 * navigation par caractère.
 *
 * Il n'y a rien d'autre à faire ici. Pas de filtrage côté client, pas d'état
 * en mémoire : le serveur reste seul à décider ce qui s'affiche, à partir de
 * l'URL. Ce fichier ne fait que raccourcir le chemin jusqu'à cette URL.
 */

/** Pause après la dernière touche avant de soumettre la recherche. */
const TYPING_PAUSE = 400;

export default function FiltersAutoSubmit() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("[data-filters]");
    if (!form) return;

    // Le bouton n'est retiré qu'ici : s'il disparaissait du rendu serveur,
    // une page sans JavaScript n'aurait plus aucun moyen de filtrer.
    const submit = form.querySelector<HTMLElement>("[data-filters-submit]");
    submit?.remove();

    // Le formulaire est soumis par le navigateur, pas intercepté : c'est lui
    // qui sait sérialiser les cases cochées en `?category=…&category=…`.
    // `requestSubmit` déclenche la validation comme un vrai clic.
    let timer = 0;
    const send = () => form.requestSubmit();

    function onChange(event: Event) {
      if ((event.target as HTMLElement).matches('input[type="checkbox"]')) {
        send();
      }
    }

    function onInput(event: Event) {
      if (!(event.target as HTMLElement).matches('input[type="search"]')) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(send, TYPING_PAUSE);
    }

    form.addEventListener("change", onChange);
    form.addEventListener("input", onInput);

    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("change", onChange);
      form.removeEventListener("input", onInput);
    };
  }, []);

  return null;
}
