import { useTranslations } from "next-intl";
import Container from "./Container";

/**
 * Ouverture de la page d'accueil — la première chose qu'on voit du carnet.
 *
 * Parti pris : la présence vient de l'échelle et du vide, jamais d'un
 * argumentaire. Pas de bouton, pas de promesse, pas de chiffres. On dit qui
 * écrit et pourquoi, puis on laisse la place aux entrées. Un visiteur doit
 * comprendre qu'il arrive sur un carnet, pas sur une offre de services.
 *
 * Le motif de courbes de niveau reste très en retrait et s'efface vers le bas :
 * il situe le sujet — le territoire — sans décorer.
 *
 * Composant synchrone : `useTranslations` fonctionne côté serveur comme côté
 * client, donc ce fichier reste utilisable des deux côtés sans rien changer.
 */

/* --------------------------------------------------------------------------
   Les réglages qu'on a envie de toucher, regroupés ici plutôt que noyés dans
   le JSX. Modifier ces constantes suffit à changer l'allure de l'ouverture.
   -------------------------------------------------------------------------- */

/** Hauteur du bloc. Le vide au-dessus et en dessous fait tout le travail. */
const PADDING = "py-24 sm:py-36";

/** Taille du titre. C'est le principal levier de « présence ». */
const TITLE_SIZE = "text-4xl sm:text-6xl";

/** Largeur de la colonne de texte : au-delà, la lecture devient pénible. */
const TEXT_WIDTH = "max-w-2xl";

export default function Opening() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Fond décoratif : masqué aux lecteurs d'écran, il ne porte aucun sens. */}
      <div
        className="topo-pattern absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden="true"
      />

      {/* `relative` remet le texte au-dessus du motif en position absolue. */}
      <Container className={`relative ${PADDING}`}>
        <div className="max-w-3xl">
          <h1
            className={`${TITLE_SIZE} font-bold leading-[1.1] tracking-tight text-fg`}
          >
            {t("greeting")}
          </h1>

          <p
            className={`mt-8 ${TEXT_WIDTH} text-lg leading-relaxed text-fg-muted sm:text-xl`}
          >
            {t("lead")}
          </p>

          <p className="mt-6 text-sm text-fg-subtle">{t("note")}</p>
        </div>
      </Container>
    </section>
  );
}
