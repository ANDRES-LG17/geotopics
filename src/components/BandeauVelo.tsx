"use client";

import { useEffect, useRef, useState } from "react";

type MediaSaison = { webm: string; mp4: string; poster: string };

/**
 * Le bandeau du panneau d'itinéraire : un cycliste qui pédale, le paysage qui
 * défile derrière lui, l'été ou l'hiver — une vidéo en boucle par saison.
 *
 * LA MÉCANIQUE
 * - Les deux vidéos sont superposées ; la saison choisie est visible, l'autre
 *   fondue. Au changement, l'entrante démarre, puis la sortante se met en
 *   pause une fois le fondu fini (une seule vidéo décodée à la fois).
 * - La vitesse passe par la vitesse de lecture, lissée vers sa cible dans une
 *   boucle `requestAnimationFrame` : × 1,6 pendant que le trajet se dessine
 *   sur la carte, puis retour en douceur. La vidéo d'hiver est lue à
 *   `winterRate`, réglé pour que son sol défile à 0,79 de l'été — le même
 *   facteur que le modèle.
 * - Si le système demande moins de mouvement : les images fixes.
 */
export default function BandeauVelo({
  media,
  hiver,
  rapide,
  actif = true,
  children,
}: {
  media: { summer: MediaSaison; winter: MediaSaison; winterRate: number };
  hiver: boolean;
  /** Le trajet se dessine sur la carte : le cycliste accélère. */
  rapide: boolean;
  /** Panneau rangé (invisible) : vidéos en pause, aucune boucle. */
  actif?: boolean;
  children?: React.ReactNode;
}) {
  const [immobile, setImmobile] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const suivre = () => setImmobile(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);
    return () => requete.removeEventListener("change", suivre);
  }, []);

  const ete = useRef<HTMLVideoElement | null>(null);
  const hivers = useRef<HTMLVideoElement | null>(null);
  const cible = useRef(1);
  useEffect(() => {
    cible.current = rapide ? 1.6 : 1;
  }, [rapide]);

  // Saison : l'entrante joue tout de suite, la sortante s'arrête après le
  // fondu. Panneau rangé : les deux en pause (rien à décoder).
  useEffect(() => {
    if (immobile) return;
    const entrante = hiver ? hivers.current : ete.current;
    const sortante = hiver ? ete.current : hivers.current;
    if (!actif) {
      entrante?.pause();
      sortante?.pause();
      return;
    }
    entrante?.play().catch(() => {});
    const t = window.setTimeout(() => sortante?.pause(), 750);
    return () => window.clearTimeout(t);
  }, [hiver, immobile, actif]);

  // Vitesse de lecture lissée vers sa cible : pas d'à-coup. La boucle ne
  // tourne QUE pendant le changement de vitesse, puis s'arrête (fluidité :
  // rien ne tourne au repos).
  const vitesse = useRef(1);
  useEffect(() => {
    if (immobile || !actif) return;
    let precedent = performance.now();
    let image = 0;
    const regler = (v: HTMLVideoElement | null, taux: number) => {
      if (v && Math.abs(v.playbackRate - taux) > 0.005) v.playbackRate = taux;
    };
    const boucle = (t: number) => {
      const dt = Math.min(0.05, (t - precedent) / 1000);
      precedent = t;
      vitesse.current += (cible.current - vitesse.current) * Math.min(1, dt * 2.5);
      if (Math.abs(cible.current - vitesse.current) < 0.003) vitesse.current = cible.current;
      regler(ete.current, vitesse.current);
      regler(hivers.current, vitesse.current * media.winterRate);
      image = vitesse.current === cible.current ? 0 : requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
  }, [immobile, actif, rapide, media.winterRate]);

  const couche = (m: MediaSaison, visible: boolean, ref: React.RefObject<HTMLVideoElement | null>) => (
    <div
      aria-hidden="true"
      className="absolute inset-0 transition-opacity duration-700 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {immobile ? (
        // eslint-disable-next-line @next/next/no-img-element -- image d'affiche statique, déjà optimisée
        <img src={m.poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          autoPlay={visible}
          muted
          loop
          playsInline
          preload="auto"
          poster={m.poster}
        >
          <source src={m.webm} type="video/webm" />
          <source src={m.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );

  return (
    <div className="relative aspect-[5/2] w-full shrink-0 overflow-hidden">
      {couche(media.summer, !hiver, ete)}
      {couche(media.winter, hiver, hivers)}
      {children}
    </div>
  );
}
