import GeodesicMark from "./GeodesicMark";
import { coverKind, type Category } from "@/lib/entries";

/**
 * Le visuel d'une entrée : sa couverture, ou un fond construit à défaut.
 *
 * Partagé par le carrousel et les vignettes de la liste, parce que les deux
 * doivent montrer la même chose d'une même entrée. Dupliquer ce choix les
 * ferait diverger au premier réglage.
 *
 * Deux régimes. Avec un `cover`, c'est lui qui occupe le fond — image fixe,
 * GIF animé ou vidéo, selon son extension. Sans, on retombe sur le dégradé de
 * la famille de travaux, la texture topographique et la sphère : un fond qui
 * ne demande aucun fichier et reste dans le vocabulaire du site. Le carnet
 * peut donc se publier sans une seule photo.
 */

/**
 * Fond par famille de travaux.
 *
 * Deux teintes seulement dans la palette du site : les familles se distinguent
 * donc par l'orientation et la profondeur du dégradé, pas par cinq couleurs
 * inventées pour l'occasion. Toutes restent sombres — le texte posé dessus est
 * blanc, et son contraste ne doit dépendre d'aucune entrée en particulier.
 *
 * Pour ajouter une famille : déclarer sa clé dans `CATEGORIES`
 * (`src/lib/entries.ts`), lui donner une ligne ici, et traduire son libellé
 * sous `entry.filters` dans `messages/*.json`. TypeScript signale les trois
 * endroits si l'un manque.
 */
const CATEGORY_BACKDROP: Record<Category, string> = {
  storymap: "from-[#06342b] via-[#0a4a3a] to-[#0f7d8c]",
  gis: "from-[#052e24] via-[#0e6f52] to-[#0a4a3a]",
  cad: "from-[#101c18] via-[#1d3630] to-[#063a2b]",
  web: "from-[#052b33] via-[#0f7d8c] to-[#0a4a3a]",
  lab: "from-[#04241d] via-[#0e6f52] to-[#0f7d8c]",
};

export default function EntryVisual({
  category,
  cover,
  /** Classe appliquée au média : c'est par là qu'on anime un zoom au survol. */
  mediaClassName = "",
  /**
   * Voile sombre par-dessus. Utile quand du texte se pose sur le visuel,
   * inutile quand il est seul dans une vignette.
   */
  scrim = "none",
  /**
   * Une vidéo de fond ne se lance que là où on la regarde vraiment. Dans une
   * grille de vignettes, en lire une par carte gaspillerait de la bande
   * passante pour un mouvement que personne ne suit.
   */
  animate = true,
}: {
  category: Category;
  cover: string | null;
  mediaClassName?: string;
  scrim?: "none" | "left" | "bottom";
  animate?: boolean;
}) {
  const media = `absolute inset-0 h-full w-full object-cover ${mediaClassName}`;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {cover ? (
        coverKind(cover) === "video" && animate ? (
          <video
            // `muted` et `playsInline` ne sont pas décoratifs : sans eux, iOS
            // et les navigateurs de bureau refusent la lecture automatique.
            src={cover}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={media}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- visuel décoratif de fond ; l'optimiseur de Next fige un GIF animé sur sa première image.
          <img src={cover} alt="" loading="lazy" className={media} />
        )
      ) : (
        <>
          <div
            className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_BACKDROP[category]} ${mediaClassName}`}
          />

          {/* Texture topographique déjà utilisée par le pied de page sombre. */}
          <div className="topo-pattern-on-dark absolute inset-0 opacity-70" />

          {/* La marque en très grand, débordant du cadre : la même sphère que
              l'ouverture, ici réduite à une texture de fond. */}
          <GeodesicMark
            strokeWidth={0.45}
            className="absolute -right-[12%] top-1/2 h-[150%] w-auto -translate-y-1/2 text-white/20"
          />
        </>
      )}

      {/* Le voile garantit que le texte blanc reste lisible quoi qu'il y ait
          dessous : une photo claire déposée plus tard ne doit pas rendre un
          titre illisible, et on ne peut pas auditer à l'avance chaque visuel.
          Il est donc plus dense sous une couverture que sous le dégradé, qui
          est sombre par construction. */}
      {scrim === "left" && (
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            cover
              ? "from-black/85 via-black/55 to-black/20"
              : "from-black/70 via-black/40 to-transparent"
          }`}
        />
      )}
      {scrim === "bottom" && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      )}
    </div>
  );
}
