import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "./Container";

/**
 * Bandeau d'ouverture de la page d'accueil.
 * Fond sombre + motif de courbes de niveau, quel que soit le thème :
 * c'est le premier écran que verra un recruteur, il doit avoir du caractère.
 */
export default async function HeroSection() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden bg-[#071620] text-white">
      {/* Couches décoratives : motif topographique + halo turquoise */}
      <div className="topo-pattern absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand/20 blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative py-24 sm:py-32">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
          {t("eyebrow")}
        </p>

        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          {t("title")}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
