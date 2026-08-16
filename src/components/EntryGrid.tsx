import { useTranslations } from "next-intl";
import EntryCard from "./EntryCard";
import Reveal from "./Reveal";
import type { EntryMeta } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

/**
 * Les entrées du carnet, en grille.
 *
 * Une seule disposition : la carte se dévoile au survol, et ce mouvement ne
 * fonctionne qu'en vignette. Une vue en liste l'aurait étirée en bandeau, où
 * il n'y a plus rien à découvrir — deux dispositions pour un dessin qui n'en
 * sert qu'une.
 *
 * Le titre de chaque carte est un `<h3>` : la page porte le `<h1>`, la section
 * un `<h2>`. Sauter un niveau casserait la table des matières que les lecteurs
 * d'écran construisent.
 */
export default function EntryGrid({
  entries,
  locale,
}: {
  entries: EntryMeta[];
  locale: Locale;
}) {
  const t = useTranslations("entry");

  // Une recherche sans résultat doit le dire. `role="status"` fait annoncer la
  // phrase quand elle apparaît, sans déplacer le focus.
  if (entries.length === 0) {
    return (
      <p role="status" className="mt-12 text-fg-muted">
        {t("noResults")}
      </p>
    );
  }

  return (
    <ul
      // Quatre colonnes sur grand écran : les cartes sont petites, et c'est le
      // nombre qui fait la vitrine. Le survol agrandit la carte de 3,5 % —
      // l'écart entre colonnes doit rester assez large pour qu'elle ne touche
      // pas sa voisine en grandissant.
      className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4"
    >
      {entries.map((entry, i) => (
        <li key={entry.slug}>
          {/* Cascade légère : chaque carte arrive juste après la précédente.
              Plafonnée, sinon la dernière d'une longue liste attendrait une
              seconde entière avant de paraître. */}
          <Reveal delay={Math.min(i, 6) * 70}>
            <EntryCard entry={entry} locale={locale} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
