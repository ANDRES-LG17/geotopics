"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Container from "./Container";
import Logo from "./Logo";
import LocaleSwitcher from "./LocaleSwitcher";

/** Ordre de la navigation principale. Les libellés viennent des traductions. */
const NAV = [
  { href: "/", key: "home" },
  { href: "/storymaps", key: "storymaps" },
  { href: "/portfolio", key: "portfolio" },
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
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

          {/* Navigation bureau */}
          <nav aria-label="Navigation" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? "text-brand"
                        : "text-fg-muted hover:text-fg"
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

            {/* Bouton hamburger — masqué sur grand écran */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-fg lg:hidden"
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
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </Container>

      {/* Navigation mobile */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Navigation"
          className="border-t border-line bg-surface lg:hidden"
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
