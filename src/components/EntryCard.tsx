import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate, type EntryMeta, type Category } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

/** Pastille de couleur par famille de travaux, pour un repérage rapide. */
const CATEGORY_STYLES: Record<Category, string> = {
  storymap: "bg-accent/15 text-accent",
  gis: "bg-brand-soft text-brand-ink",
  cad: "bg-fg/10 text-fg-muted",
  web: "bg-brand/15 text-brand",
};

/**
 * Une entrée du carnet dans la liste.
 *
 * Composant synchrone : `useTranslations` fonctionne côté serveur comme côté
 * client, ce qui permet de le réutiliser dans la liste filtrable sans le dupliquer.
 */
export default function EntryCard({
  entry,
  locale,
}: {
  entry: EntryMeta;
  locale: Locale;
}) {
  const t = useTranslations("entry");

  return (
    <article className="border-b border-line pb-8 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide ${CATEGORY_STYLES[entry.category]}`}
        >
          {t(`filters.${entry.category}`)}
        </span>
        <time dateTime={entry.date} className="text-fg-subtle">
          {formatDate(entry.date, locale)}
        </time>
        <span aria-hidden="true" className="text-fg-subtle">
          ·
        </span>
        <span className="text-fg-subtle">
          {t("readingTime", { minutes: entry.readingMinutes })}
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight">
        <Link
          href={`/blog/${entry.slug}`}
          className="text-fg transition-colors hover:text-brand"
        >
          {entry.title}
        </Link>
      </h2>

      <p className="mt-2.5 max-w-2xl leading-relaxed text-fg-muted">
        {entry.description}
      </p>

      {entry.tools.length > 0 && (
        <ul aria-label={t("toolsUsed")} className="mt-4 flex flex-wrap gap-1.5">
          {entry.tools.map((tool) => (
            <li
              key={tool}
              className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-fg-subtle"
            >
              {tool}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
