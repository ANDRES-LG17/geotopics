"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Bascule FR ⇄ EN en conservant la page courante.
 *
 * `usePathname` (version next-intl) renvoie le chemin SANS préfixe de langue,
 * donc /fr/portfolio devient "/portfolio" : il suffit de le rejouer avec
 * l'autre langue pour obtenir /en/portfolio.
 */
export default function LocaleSwitcher() {
  const t = useTranslations("nav");
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      className="inline-flex items-center rounded-full border border-line bg-surface-muted p-0.5 text-xs font-semibold"
      data-pending={isPending || undefined}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
              isActive
                ? "bg-brand text-white"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
