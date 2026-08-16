import GeodesicMark from "./GeodesicMark";

/**
 * Marque GeoTopics : le mot, et la sphère géodésique posée derrière son G.
 *
 * La sphère ne se tient plus à côté du nom comme le faisait l'ancien symbole
 * des courbes de niveau — elle passe dessous. Un symbole juxtaposé se lit
 * comme un deuxième objet, qu'on peut détacher du mot ; un symbole traversé
 * par le mot n'est plus détachable. Le G devient le globe, ce qui est
 * exactement ce que « Geo » veut dire.
 *
 * C'est aussi la même sphère que celle qui tourne en grand sur la page
 * d'accueil, dans la même pose : la marque est un arrêt sur image du décor,
 * pas un dessin de plus à faire vivre.
 */

/**
 * Diamètre de la sphère, en cadratins — donc solidaire de la taille du texte,
 * quel que soit l'endroit où la marque est posée.
 *
 * 1,6 : au-delà, la sphère avale le « eo » et le mot passe au second plan ;
 * en deçà, elle se coince dans le G et on ne voit plus qu'un griffonnage.
 */
const MARK_SIZE = "h-[1.6em] w-[1.6em]";

/**
 * Opacité de la sphère. Le nom doit se lire en premier : c'est un filigrane,
 * pas une illustration.
 *
 * 0,8 et non les 0,55 du décor : la marque fait 29 px là où le décor en fait
 * 760, et la maille de 120 arêtes s'y efface. C'est le seul écart avec le
 * globe de la page d'accueil — l'encre, pas le dessin.
 */
const MARK_TINT = "text-brand opacity-[0.8]";

/**
 * Retrait à gauche.
 *
 * La sphère est centrée sur le G et plus large que lui : elle déborde d'à peu
 * près (1,6 − 0,75) / 2 cadratin de chaque côté. À droite le mot lui-même
 * fait la place ; à gauche il n'y a rien, et sans ce retrait la sphère mordrait
 * sur le bord du conteneur — ou se ferait couper dans l'en-tête collant.
 */
const MARK_ROOM = "pl-[0.42em]";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    // `leading-none` cale la boîte de ligne sur le cadratin : son centre tombe
    // alors sur celui des capitales à un centième de cadratin près, ce qui
    // permet de centrer la sphère sur le G sans constante de rattrapage.
    <span
      className={`inline-block text-lg font-bold leading-none tracking-tight ${MARK_ROOM} ${className}`}
    >
      {/* Le G est isolé pour servir d'ancrage : c'est sa boîte, et pas celle
          du mot entier, qui donne son centre à la sphère. */}
      <span className="relative inline-block">
        <GeodesicMark
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${MARK_SIZE} ${MARK_TINT}`}
        />
        {/* `relative` repasse la lettre au-dessus de la sphère : sans ça, un
            élément positionné se peint par-dessus le texte qui le suit. */}
        <span className="relative">G</span>
      </span>
      eo<span className="text-brand">Topics</span>
    </span>
  );
}
