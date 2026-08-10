import { useTranslations } from "next-intl";
import Container from "./Container";
import Globe from "./Globe";

/**
 * Ouverture de la page d'accueil — la première chose qu'on voit du carnet.
 *
 * Le nom seul, deux lignes pour dire ce qu'on trouvera ici, et une sphère
 * géodésique qui flotte à droite. Pas de bouton, pas de promesse : on annonce
 * un carnet, pas une offre.
 *
 * Composant synchrone : `useTranslations` fonctionne côté serveur comme côté
 * client, donc ce fichier reste utilisable des deux côtés sans rien changer.
 */

/* --------------------------------------------------------------------------
   Les réglages qu'on a envie de toucher, regroupés ici plutôt que noyés dans
   le JSX. Chaque valeur existe en deux temps : mobile, puis `sm:`/`lg:` pour
   les écrans plus larges.
   -------------------------------------------------------------------------- */

/** Hauteur du bloc. Le vide au-dessus et en dessous fait tout le travail. */
const PADDING = "py-20 sm:py-28 lg:py-32";

/** Taille du titre. C'est le principal levier de « présence ». */
const TITLE_SIZE = "text-5xl sm:text-6xl lg:text-7xl";

/** Largeur de la colonne de texte : au-delà, la lecture devient pénible. */
const TEXT_WIDTH = "max-w-lg";

/** Encombrement du globe. Il accompagne le titre, il ne le concurrence pas. */
const GLOBE_SIZE = "w-56 sm:w-72 lg:w-[24rem]";

export default function Opening() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Fond décoratif : masqué aux lecteurs d'écran, il ne porte aucun sens. */}
      <div
        className="topo-pattern absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden="true"
      />

      {/* `relative` remet le contenu au-dessus du motif en position absolue. */}
      <Container className={`relative ${PADDING}`}>
        <div className="flex flex-col items-center gap-14 lg:flex-row lg:justify-between lg:gap-16">
          <div className={TEXT_WIDTH}>
            {/* Le nom reprend la coupure du logo : le vert tombe sur « Topics ». */}
            <h1
              className={`${TITLE_SIZE} font-bold leading-[1.05] tracking-tight text-fg`}
            >
              Geo<span className="text-brand">Topics</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-fg-muted sm:text-xl">
              {t("blurb")}
            </p>
          </div>

          <Globe className={`${GLOBE_SIZE} shrink-0 text-brand`} />
        </div>
      </Container>
    </section>
  );
}
