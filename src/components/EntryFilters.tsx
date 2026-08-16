import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category, type EntryMeta } from "@/lib/entries";

/**
 * Barre de filtres du carnet — familles de travaux et recherche libre.
 *
 * Tout passe par l'URL, et rien par un état caché : `?category=gis&q=python`
 * décrit la vue entièrement. Une sélection se met donc en favori, se partage,
 * se recharge et s'indexe, ce qu'un filtre en mémoire ne permet pas.
 *
 * Conséquence : ce composant reste rendu côté serveur. C'est un `<form
 * method="get">` avec des cases à cocher — le navigateur sait construire
 * l'URL tout seul. Sans JavaScript, le bouton « Filtrer » suffit ; avec, le
 * script de progressive enhancement (`filters-autosubmit`) soumet dès qu'on
 * coche, et le bouton disparaît.
 *
 * Les familles se combinent (OU) : cocher SIG et CAO montre les deux. Chaque
 * entrée n'appartient qu'à une famille, mais on veut pouvoir en regarder
 * plusieurs à la fois.
 */

/** Nom des paramètres d'URL. Partagé avec la page qui les lit. */
export const CATEGORY_PARAM = "category";
export const SEARCH_PARAM = "q";

export default function EntryFilters({
  entries,
  selected,
  search,
}: {
  /** Toutes les entrées, non filtrées : les compteurs annoncent le total. */
  entries: EntryMeta[];
  selected: Category[];
  search: string;
}) {
  const t = useTranslations("entry");
  const tf = useTranslations("filters");

  const countFor = (category: Category) =>
    entries.filter((e) => e.category === category).length;

  // Une famille sans aucune entrée ne mérite pas sa case : proposer un filtre
  // qui ne peut que donner une liste vide n'aide personne.
  const present = CATEGORIES.filter((c) => countFor(c) > 0);
  const active = selected.length > 0 || search.length > 0;

  return (
    <form method="get" data-filters className="mt-8">
      <fieldset>
        <legend className="sr-only">{tf("legend")}</legend>

        <div className="flex flex-wrap items-center gap-2">
          {/* « Tout » n'est pas une case mais un lien de remise à zéro : c'est
              l'absence de filtre, pas un filtre de plus. Le décrire comme une
              case cochable laisserait croire qu'on peut la combiner. */}
          <Link
            href="/blog"
            aria-current={active ? undefined : "page"}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "border-line text-fg-muted hover:border-brand/50 hover:text-fg"
                : "border-brand bg-brand text-white"
            }`}
          >
            {t("filters.all")}
            <span className="ml-1.5 font-normal opacity-70">
              {entries.length}
            </span>
          </Link>

          {present.map((category) => {
            const checked = selected.includes(category);
            return (
              // La case est visuellement masquée mais bien présente : c'est
              // elle qui porte l'état, le focus clavier et l'annonce vocale.
              // Le style vit sur le `<label>`, via `peer-*`.
              <label
                key={category}
                className="cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  name={CATEGORY_PARAM}
                  value={category}
                  // `defaultChecked` ne survit pas au rendu serveur : React ne
                  // l'écrit pas dans le HTML, si bien qu'en rechargeant
                  // `?category=cad` la case revenait vide alors que le filtre
                  // était bien appliqué. `checked` est sérialisé, lui ; il
                  // rendrait le champ contrôlé, d'où `readOnly` — le
                  // formulaire natif reste seul maître de l'état.
                  checked={checked}
                  readOnly
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-fg-muted transition-colors hover:border-brand/50 hover:text-fg peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                  {t(`filters.${category}`)}
                  <span className="ml-1.5 font-normal opacity-70">
                    {countFor(category)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="entry-search" className="sr-only">
            {tf("searchLabel")}
          </label>
          <input
            id="entry-search"
            type="search"
            name={SEARCH_PARAM}
            defaultValue={search}
            placeholder={tf("searchPlaceholder")}
            className="w-full max-w-xs rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none sm:w-64"
          />

          {/* Retiré par le script d'amélioration progressive quand il
              s'installe : avec JavaScript, cocher suffit. */}
          <button
            type="submit"
            data-filters-submit
            className="rounded-full border border-brand bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-ink"
          >
            {tf("apply")}
          </button>

          {active && (
            <Link
              href="/blog"
              className="text-sm font-semibold text-fg-muted underline-offset-4 hover:text-brand hover:underline"
            >
              {tf("clear")}
            </Link>
          )}
        </div>
      </fieldset>
    </form>
  );
}
