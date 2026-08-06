"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ProjectCard from "./ProjectCard";
import type { Locale } from "@/i18n/routing";
import type { Project, ProjectCategory } from "@/data/projects";

type Filter = ProjectCategory | "all";

const FILTERS: Filter[] = ["all", "gis", "cad", "web"];

/** Grille de projets avec filtrage par catégorie, sans rechargement de page. */
export default function ProjectGrid({
  projects,
  locale,
}: {
  projects: Project[];
  locale: Locale;
}) {
  const t = useTranslations("portfolio");
  const [active, setActive] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      active === "all"
        ? projects
        : projects.filter((p) => p.category === active),
    [projects, active],
  );

  return (
    <>
      <div
        role="group"
        aria-label={t("filters.all")}
        className="mt-10 flex flex-wrap gap-2"
      >
        {FILTERS.map((filter) => {
          const isActive = filter === active;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(filter)}
              aria-pressed={isActive}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-brand bg-brand text-white"
                  : "border-line text-fg-muted hover:border-brand/50 hover:text-fg"
              }`}
            >
              {t(`filters.${filter}`)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-fg-muted">{t("noResults")}</p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              locale={locale}
              detailed
            />
          ))}
        </div>
      )}
    </>
  );
}
