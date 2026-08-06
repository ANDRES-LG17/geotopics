import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Project } from "@/data/projects";

/** Couleur de pastille par catégorie, pour un repérage visuel rapide. */
const CATEGORY_STYLES: Record<Project["category"], string> = {
  gis: "bg-brand-soft text-brand-ink",
  cad: "bg-accent/15 text-accent",
  web: "bg-fg/10 text-fg-muted",
};

/**
 * Composant synchrone : `useTranslations` fonctionne aussi bien côté serveur
 * que côté client, ce qui permet de réutiliser cette carte à l'intérieur du
 * filtre interactif du portfolio sans la dupliquer.
 */
export default function ProjectCard({
  project,
  locale,
  /** `detailed` ajoute le paragraphe méthodologique (page portfolio). */
  detailed = false,
}: {
  project: Project;
  locale: Locale;
  detailed?: boolean;
}) {
  const t = useTranslations("portfolio");

  return (
    <article className="group flex flex-col rounded-xl border border-line bg-surface-raised p-6 transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${CATEGORY_STYLES[project.category]}`}
        >
          {t(`filters.${project.category}`)}
        </span>
        <span className="text-xs font-medium text-fg-subtle">{project.year}</span>
      </div>

      <h3 className="mt-4 text-xl font-bold leading-snug tracking-tight text-fg">
        {project.href ? (
          <a
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-brand"
          >
            {project.title[locale]}
          </a>
        ) : (
          project.title[locale]
        )}
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        {project.summary[locale]}
      </p>

      {detailed && (
        <p className="mt-3 border-l-2 border-brand/40 pl-4 text-sm leading-relaxed text-fg-subtle">
          {project.detail[locale]}
        </p>
      )}

      {/* `mt-auto` colle la liste d'outils en bas : toutes les cartes
          d'une même rangée gardent ainsi la même allure. */}
      <ul
        aria-label={t("toolsUsed")}
        className="mt-auto flex flex-wrap gap-1.5 pt-5"
      >
        {project.tools.map((tool) => (
          <li
            key={tool}
            className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-fg-subtle"
          >
            {tool}
          </li>
        ))}
      </ul>
    </article>
  );
}
