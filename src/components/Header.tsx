"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Container from "./Container";
import Logo from "./Logo";
import LocaleSwitcher from "./LocaleSwitcher";

/** Navigation principale. Trois entrées : c'est un carnet, pas un site vitrine. */
const NAV = [
  { href: "/", key: "home" },
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
] as const;

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Referme le menu mobile après une navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Empêche le défilement de l'arrière-plan quand le menu mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label={t("home")} className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Navigation" className="hidden sm:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href) ? "text-brand" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <LocaleSwitcher />

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-fg sm:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </Container>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Navigation"
          className="border-t border-line bg-surface sm:hidden"
        >
          <Container>
            <ul className="flex flex-col py-2">
              {NAV.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`block border-b border-line/60 py-3 text-base font-medium last:border-0 ${
                      isActive(href) ? "text-brand" : "text-fg"
                    }`}
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
}
