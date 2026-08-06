"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import EntryCard from "./EntryCard";
import { CATEGORIES, type EntryMeta, type Category } from "@/lib/entries";
import type { Locale } from "@/i18n/routing";

type Filter = Category | "all";

/**
 * Liste des entrées avec filtrage par famille de travaux, sans rechargement.
 *
 * Les familles vides sont masquées : inutile d'afficher un onglet « CAO »
 * s'il n'y a encore aucune entrée CAO à montrer.
 */
export default function EntryList({
  entries,
  locale,
}: {
  entries: EntryMeta[];
  locale: Locale;
}) {
  const t = useTranslations("entry");
  const [active, setActive] = useState<Filter>("all");

  const filters = useMemo<Filter[]>(() => {
    const present = CATEGORIES.filter((c) =>
      entries.some((e) => e.category === c),
    );
    return ["all", ...present];
  }, [entries]);

  const visible = useMemo(
    () =>
      active === "all" ? entries : entries.filter((e) => e.category === active),
    [entries, active],
  );

  if (entries.length === 0) {
    return <p className="mt-12 text-fg-muted">{t("empty")}</p>;
  }

  return (
    <>
      {filters.length > 2 && (
        <div role="group" className="mt-10 flex flex-wrap gap-2">
          {filters.map((filter) => {
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
      )}

      {visible.length === 0 ? (
        <p className="mt-12 text-fg-muted">{t("noResults")}</p>
      ) : (
        <div className="mt-10 space-y-8">
          {visible.map((entry) => (
            <EntryCard key={entry.slug} entry={entry} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
