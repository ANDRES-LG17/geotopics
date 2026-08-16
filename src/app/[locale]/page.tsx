import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EntryCarousel from "@/components/EntryCarousel";
import Opening from "@/components/Opening";
import { getEntriesByLocale } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return createPageMetadata({
    locale,
    path: "/",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Opening />

      {/* Les entrées, montrées plutôt qu'énumérées. Le carrousel a remplacé la
          liste qui se trouvait dessous : les deux donnaient les mêmes entrées
          l'une après l'autre, et se répétaient. Chaque diapositive porte son
          propre lien — c'est par là qu'on entre dans le carnet, et l'accueil
          n'a donc plus besoin d'un « tout voir » : la navigation principale
          garde l'entrée vers le carnet complet.

          Hors `Container`, contrairement au reste de la page : la bande prend
          toute la fenêtre pour laisser dépasser les diapositives voisines. La
          largeur de lecture est rendue à l'intérieur, par la diapositive
          elle-même. */}
      <EntryCarousel
        entries={getEntriesByLocale(locale)}
        locale={locale}
        className="py-12 sm:py-20"
      />
    </>
  );
}
