import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "./Container";
import Logo from "./Logo";
import { siteConfig } from "@/lib/site";

const NAV = [
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
] as const;

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  // On n'affiche que les liens réellement renseignés dans siteConfig.
  const socials = [
    { label: "LinkedIn", href: siteConfig.social.linkedin },
    { label: "GitHub", href: siteConfig.social.github },
    { label: "ArcGIS Online", href: siteConfig.social.arcgis },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="mt-24 border-t border-line bg-surface-muted">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-fg-muted">{t("tagline")}</p>
            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
            >
              {siteConfig.email}
            </a>
          </div>

          <nav aria-label={t("navHeading")}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              {t("navHeading")}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NAV.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-fg-muted transition-colors hover:text-brand"
                  >
                    {tNav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socials.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {t("connectHeading")}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {socials.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-fg-muted transition-colors hover:text-brand"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.author}. {t("rights")}
          </p>
          <p>{t("builtWith")}</p>
        </div>
      </Container>
    </footer>
  );
}
