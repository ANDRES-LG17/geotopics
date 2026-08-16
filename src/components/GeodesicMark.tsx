import {
  GEODESIC_EDGES,
  GEODESIC_STROKE,
  GEODESIC_VIEWBOX,
} from "./geodesic-geometry";

/**
 * La sphère géodésique, figée, pour servir de marque.
 *
 * Le même polyèdre que le `Globe` de la page d'accueil, arête pour arête :
 * 120 segments, six paliers de profondeur, la pose de repos. Redessiné au
 * trait plutôt que capturé — une photo du canvas ne survit pas à la
 * réduction, ses traits tombant sous le pixel, alors qu'un tracé reste net à
 * toute taille.
 *
 * Seule l'encre change avec la taille : `strokeWidth` est ajustable, parce que
 * l'épaisseur du décor (0,16 % de sa largeur) devient invisible à 29 px. La
 * géométrie, elle, est la même partout.
 *
 * ---------------------------------------------------------------------------
 * REMPLACER LA MARQUE PAR UN AUTRE DESSIN
 * ---------------------------------------------------------------------------
 *
 * Ce fichier est le point d'entrée : l'en-tête (`Logo`) et le titre d'accueil
 * (`Opening`) l'affichent tous les deux, donc les changer ici les change
 * ensemble.
 *
 * Attention au second endroit : `OgBrand` redessine la marque pour les
 * vignettes de partage. Il ne peut pas réutiliser ce composant — Satori, qui
 * rend ces images, ignore `currentColor` et veut une couleur littérale. Une
 * marque changée ici et pas là laisse LinkedIn afficher l'ancienne.
 *
 * Tailles réellement rendues, c'est ce qui contraint le dessin :
 *
 *   en-tête              29 px   ← la contrainte ; ce qui ne s'y lit pas est mort
 *   accueil (mobile)     77 px
 *   accueil (bureau)    115 px
 *   vignettes         48–61 px
 *
 * Un SVG est le format à demander. Il lui faut :
 *   — un `viewBox` carré, sinon la sphère devient un œuf ;
 *   — aucun `width`/`height` en dur : la taille vient des classes CSS ;
 *   — `stroke="currentColor"` et `fill="none"`, pour hériter du vert de marque
 *     et rester lisible en thème clair comme sombre.
 *
 * Un PNG marche aussi, mais à conditions : fond réellement transparent (canal
 * alpha, pas du blanc), carré, 640 px au moins, et `object-contain` côté CSS
 * sans quoi il s'étire. Sa limite est connue pour l'avoir essuyée : les traits
 * fins disparaissent en tombant à 29 px, là où un tracé vectoriel tient.
 */
export default function GeodesicMark({
  className = "",
  strokeWidth = GEODESIC_STROKE,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox={GEODESIC_VIEWBOX} aria-hidden="true" className={className}>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        {GEODESIC_EDGES.map(({ d, opacity }) => (
          <path key={opacity} d={d} opacity={opacity} />
        ))}
      </g>
    </svg>
  );
}
