import {
  GEODESIC_EDGES,
  GEODESIC_STROKE,
  GEODESIC_VIEWBOX,
} from "./geodesic-geometry";

/**
 * La marque GeoTopics pour les vignettes de partage.
 *
 * Doublon apparent de `Logo`, pour une raison de fond : les vignettes ne sont
 * pas rendues par un navigateur mais par Satori, qui ne connaît ni `em` ni les
 * classes utilitaires — seulement du flexbox et des pixels. Tout ce que
 * `Logo` exprime en cadratins doit donc être recalculé ici en nombres.
 *
 * Le tracé ne passe pas par `GeodesicMark` : Satori ignore `currentColor` et
 * veut une couleur littérale. Seules les coordonnées sont partagées, ce qui
 * suffit — c'est la géométrie qui doit rester identique, pas le JSX.
 *
 * Conséquence à retenir : changer la marque demande de passer ici AUSSI. Une
 * marque refaite dans `GeodesicMark` seulement laisserait LinkedIn et Slack
 * afficher l'ancienne, sans que rien ne signale l'oubli.
 *
 * La composition est la même que `Logo` : la sphère derrière le G. À 48 px et
 * plus, la maille tient sans qu'on force l'encre ; l'opacité reste celle du
 * décor, contrairement à l'en-tête.
 */

/** Diamètre de la sphère, en multiples de la taille du texte. Cf. `Logo`. */
const MARK_RATIO = 1.6;

/**
 * Chasse approximative du « G » gras, en multiples de la taille du texte.
 *
 * Approximative parce qu'on ne peut pas mesurer un glyphe pendant le rendu :
 * Satori dispose le texte lui-même, on ne fait que lui réserver la place. La
 * valeur vient de la fonte grotesque utilisée par défaut ; une erreur d'un
 * centième de cadratin décale la sphère d'un tiers de pixel, ce qui ne se
 * voit pas.
 */
const G_WIDTH_RATIO = 0.76;

export default function OgBrand({
  fontSize,
  color = "#45c78d",
}: {
  fontSize: number;
  color?: string;
}) {
  const mark = fontSize * MARK_RATIO;

  return (
    // La hauteur vaut le diamètre de la sphère et le texte est centré dedans :
    // c'est ce qui aligne le centre du G sur celui de la sphère verticalement,
    // sans avoir à traduire quoi que ce soit.
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: mark,
        // Décale le mot pour que le G tombe au centre de la sphère.
        paddingLeft: (mark - fontSize * G_WIDTH_RATIO) / 2,
      }}
    >
      <svg
        width={mark}
        height={mark}
        viewBox={GEODESIC_VIEWBOX}
        style={{ position: "absolute", left: 0, top: 0, opacity: 0.55 }}
      >
        <g
          fill="none"
          stroke={color}
          strokeWidth={GEODESIC_STROKE}
          strokeLinecap="round"
        >
          {GEODESIC_EDGES.map(({ d, opacity }) => (
            <path key={opacity} d={d} opacity={opacity} />
          ))}
        </g>
      </svg>

      {/* Déclaré après la sphère : Satori peint dans l'ordre du document, donc
          le mot passe par-dessus sans avoir à empiler quoi que ce soit. */}
      <span style={{ fontSize, fontWeight: 700 }}>
        Geo<span style={{ color }}>Topics</span>
      </span>
    </div>
  );
}
