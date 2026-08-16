import { useTranslations } from "next-intl";
import Container from "./Container";
import Globe from "./Globe";
import GeodesicMark from "./GeodesicMark";

/**
 * Ouverture de la page d'accueil — la première chose qu'on voit du carnet.
 *
 * Le nom seul, deux lignes pour dire ce qu'on trouvera ici, et une sphère
 * géodésique immense à droite, qui déborde du cadre. Le débordement est le
 * sujet : une planète qu'on voit en entier est un objet, une planète qui sort
 * de l'écran est une échelle. C'est ce que `overflow-hidden` sur la section
 * permet — la sphère est coupée par le bord, elle ne s'y arrête pas.
 *
 * La sphère est positionnée contre la section, pas contre la colonne de
 * texte : un élément dans le `Container` ne pourrait jamais dépasser sa
 * largeur maximale, donc jamais sortir de l'écran.
 *
 * Composant synchrone : `useTranslations` fonctionne côté serveur comme côté
 * client, donc ce fichier reste utilisable des deux côtés sans rien changer.
 */

/* --------------------------------------------------------------------------
   Les réglages qu'on a envie de toucher, regroupés ici plutôt que noyés dans
   le JSX. Chaque valeur existe en deux ou trois temps : mobile, puis `sm:` et
   `lg:` pour les écrans plus larges.
   -------------------------------------------------------------------------- */

/** Hauteur du bloc. Le vide au-dessus et en dessous fait tout le travail. */
const PADDING = "py-24 sm:py-32 lg:py-48";

/** Taille du titre. C'est le principal levier de « présence ». */
const TITLE_SIZE = "text-5xl sm:text-6xl lg:text-7xl";

/** Largeur de la colonne de texte : au-delà, la lecture devient pénible. */
const TEXT_WIDTH = "max-w-lg";

/**
 * Encombrement et débordement de la sphère.
 *
 * `right-[-N]` est ce qui la fait sortir de l'écran : une valeur négative
 * pousse son bord droit au-delà du bord de la fenêtre. Assez pour qu'on
 * comprenne qu'elle continue, pas au point d'en perdre la forme.
 *
 * Sur mobile elle passe derrière le texte : à cette largeur, il n'y a pas de
 * place pour deux colonnes. Elle devient une atmosphère, d'où l'opacité
 * réduite — le texte doit rester le premier lisible.
 */
const GLOBE_BOX = [
  "absolute top-1/2 -translate-y-1/2",
  "right-[-34vw] w-[96vw] opacity-25",
  "sm:right-[-20vw] sm:w-[78vw] sm:opacity-40",
  "lg:right-[-5vw] lg:w-[50vw] lg:max-w-[760px] lg:opacity-100",
].join(" ");

/**
 * Trait fin : à cette taille, c'est ce qui distingue une planète d'un ballon.
 * Exprimé en fraction de la largeur rendue, donc constant à l'œil quelle que
 * soit la taille de l'écran.
 */
const GLOBE_STROKE = 0.0016;

export default function Opening() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Fond décoratif : masqué aux lecteurs d'écran, il ne porte aucun sens.
          Le fondu vers le bas est cuit dans le fichier SVG — pas de masque CSS
          ici, qui obligerait le navigateur à re-mélanger une couche entière à
          chaque image de l'animation qui passe par-dessus. */}
      <div className="topo-pattern absolute inset-0" aria-hidden="true" />

      {/* `pointer-events-none` : la sphère couvre la moitié de la section,
          elle ne doit pas intercepter la sélection du texte ni les clics. */}
      <div className={`${GLOBE_BOX} pointer-events-none`} aria-hidden="true">
        <Globe strokeRatio={GLOBE_STROKE} className="w-full text-brand" />
      </div>

      {/* `relative` remet le texte au-dessus de la sphère en position absolue. */}
      <Container className={`relative ${PADDING}`}>
        <div className={TEXT_WIDTH}>
          {/* Le nom reprend la coupure du logo : le vert tombe sur « Topics »,
              et le même filigrane géodésique que le `Logo` de l'en-tête est
              posé derrière le G — l'ouverture est un agrandissement de la
              marque, pas un texte différent qui lui ressemble. */}
          <h1
            className={`${TITLE_SIZE} font-bold leading-[1.05] tracking-tight text-fg`}
          >
            <span className="relative inline-block">
              <GeodesicMark className="pointer-events-none absolute left-1/2 top-1/2 h-[1.6em] w-[1.6em] -translate-x-1/2 -translate-y-1/2 text-brand opacity-[0.55]" />
              <span className="relative">G</span>
            </span>
            eo<span className="text-brand">Topics</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-fg-muted sm:text-xl">
            {t("blurb")}
          </p>
        </div>
      </Container>
    </section>
  );
}
