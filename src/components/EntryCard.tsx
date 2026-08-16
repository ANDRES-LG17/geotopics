import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import EntryVisual from "./EntryVisual";
import { formatDate, type EntryMeta, type Category } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

/**
 * Une entrée du carnet, en vignette.
 *
 * Au repos, la carte ne montre que son visuel et son titre. Au survol, le
 * visuel se rétracte et découvre ce qui attendait dessous — famille, date,
 * durée de lecture, outils. Le détail existe donc en permanence dans le
 * document ; il est seulement hors du cadre, révélé par la hauteur qui change.
 *
 * Pourquoi la hauteur et non l'opacité : un bloc qu'on fait apparaître par
 * `opacity` occupe déjà sa place, et la carte reste haute même au repos. En
 * animant la hauteur de l'image, c'est elle qui cède du terrain — la carte
 * garde exactement la même taille, et le mouvement se lit comme un
 * dévoilement plutôt que comme un empilement.
 *
 * Toute la carte est cliquable : le lien enveloppe l'ensemble plutôt que le
 * seul titre. Une cible de cette taille se vise sans effort au doigt, là où un
 * titre de deux lignes demande de la précision. Aucun autre lien n'est posé à
 * l'intérieur — un lien dans un lien n'est pas représentable en HTML.
 */

/**
 * Teinte de fond par famille de travaux.
 *
 * La zone révélée est un aplat de couleur, comme la vignette qui a inspiré ce
 * dessin. La palette du site ne compte que deux teintes : les familles se
 * distinguent donc par la profondeur, pas par cinq couleurs inventées pour
 * l'occasion. Toutes restent assez sombres pour porter du texte blanc.
 *
 * Pour ajouter une famille : déclarer sa clé dans `CATEGORIES`
 * (`src/lib/entries.ts`), lui donner une ligne ici et dans `CATEGORY_BACKDROP`
 * (`EntryVisual`), puis traduire son libellé sous `entry.filters`. TypeScript
 * signale les endroits manquants.
 */
const CATEGORY_PANEL: Record<Category, string> = {
  storymap: "bg-[#0a4a3a]",
  gis: "bg-[#0e6f52]",
  cad: "bg-[#1d3630]",
  web: "bg-[#0f7d8c]",
  lab: "bg-[#06342b]",
};

/** Au-delà, les puces débordent sur une seconde ligne et cassent la hauteur. */
const TOOLS_SHOWN = 3;

/**
 * Le dévoilement, en une seule transformation.
 *
 * Le visuel occupe 82 % de la carte et remonte de 30 % de sa propre hauteur au
 * survol, ce qui découvre l'aplat de couleur sur lequel le texte se lit. Le
 * résultat à l'œil est celui d'une image qui se rétracte.
 *
 * Pourquoi `translate` et non `height` : animer la hauteur force le navigateur
 * à refaire la mise en page et à repeindre la carte à *chaque* image de
 * l'animation — soit une quarantaine de calculs de layout par survol, sur
 * quatre cartes voisines. C'est ce qui donnait la sensation d'à-coups.
 * `translate` et `opacity` sont les deux seules propriétés qu'un navigateur
 * sait animer sur le compositeur, sans toucher au layout : le mouvement part
 * alors sur le processeur graphique et reste fluide.
 *
 * Contrepartie : l'image déborde par le haut au lieu de rapetisser.
 * `overflow-hidden` sur la carte la recadre, ce qui ne se voit pas — le motif
 * du fond n'a ni sujet ni horizon à préserver.
 */
const VISUAL_SHIFT =
  "translate-y-0 group-hover:-translate-y-[30%] group-focus-within:-translate-y-[30%]";

/**
 * Durées. Volontairement courtes : un survol doit répondre, pas se dérouler.
 * Au-delà de ~250 ms, la carte paraît réagir en retard même sans aucun
 * à-coup — c'est la durée elle-même qu'on lit comme de la lenteur.
 */
const REVEAL_MS = "duration-300";
const LIFT_MS = "duration-200";

export default function EntryCard({
  entry,
  locale,
}: {
  entry: EntryMeta;
  locale: Locale;
}) {
  const t = useTranslations("entry");
  const extraTools = entry.tools.length - TOOLS_SHOWN;

  return (
    <article className="group h-full">
      <Link
        href={`/blog/${entry.slug}`}
        // `focus-within` sur le parent double chaque `group-hover` : au clavier,
        // le focus sur le lien déclenche la même révélation que la souris.
        className={`relative flex h-[26rem] flex-col overflow-hidden rounded-2xl transition-transform ${LIFT_MS} ease-out hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:scale-100 ${CATEGORY_PANEL[entry.category]}`}
      >
        {/* Le visuel glisse vers le haut et découvre l'aplat sous lui.
            `will-change` prévient le navigateur qu'il devra composer cet
            élément : il lui réserve un calque avant le premier survol, au lieu
            d'en créer un au vol pendant que l'animation démarre. */}
        <div
          className={`relative h-[82%] w-full shrink-0 transition-transform ${REVEAL_MS} ease-out [will-change:transform] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${VISUAL_SHIFT}`}
        >
          <EntryVisual
            category={entry.category}
            cover={entry.cover}
            // Pas de vidéo dans une grille : une lecture par carte ferait
            // télécharger plusieurs fichiers pour un mouvement que personne ne
            // suit. Une couverture vidéo s'affiche alors comme image fixe.
            animate={false}
          />

          {/* Voile qui s'installe au survol. Il s'anime en `opacity` et non en
              couleur de fond : c'est la même économie que pour le déplacement,
              une propriété que le compositeur sait interpoler seul. */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-black/25 opacity-0 transition-opacity ${REVEAL_MS} group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none`}
          />
        </div>

        {/* Posé en absolu contre le bas de la carte, hors du flux : sa hauteur
            ne dépend donc pas de ce que l'image laisse, et un titre de deux
            lignes ne peut pas repousser le détail hors du cadre. */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          {/* Deux lignes au plus : les titres du carnet vont de trois mots à
              une phrase entière, et un titre long dévorerait la place réservée
              au détail — ou déborderait de la carte, dont la hauteur est fixe.
              Le titre complet reste sur la page de l'entrée. */}
          <h3 className="line-clamp-2 text-base font-bold uppercase leading-tight tracking-tight text-white">
            {entry.title}
          </h3>

          {/* Décalé puis remis en place : le détail glisse vers le haut en
              apparaissant, au lieu de surgir sur place.

              `transition-[transform,opacity]` et non `transition-all` : le
              raccourci met en observation toutes les propriétés animables, y
              compris celles qui ne bougent pas ici, et fait travailler le
              navigateur pour rien. Aucun délai non plus — il s'ajoutait au
              temps de réponse et se lisait comme de la latence. */}
          <div
            className={`mt-2 translate-y-1 opacity-0 transition-[transform,opacity] ${REVEAL_MS} ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/75">
              <span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-white">
                {t(`filters.${entry.category}`)}
              </span>
              <time dateTime={entry.date}>{formatDate(entry.date, locale)}</time>
              <span aria-hidden="true">·</span>
              <span>{t("readingTime", { minutes: entry.readingMinutes })}</span>
            </div>

            {entry.tools.length > 0 && (
              <ul
                aria-label={t("toolsUsed")}
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {entry.tools.slice(0, TOOLS_SHOWN).map((tool) => (
                  <li
                    key={tool}
                    className="rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                  >
                    {tool}
                  </li>
                ))}
                {extraTools > 0 && (
                  <li className="px-1 py-0.5 font-mono text-[10px] text-white/60">
                    +{extraTools}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
