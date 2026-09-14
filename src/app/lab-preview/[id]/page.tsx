import { notFound } from "next/navigation";
import { isLabId } from "@/labs";
import LabPreview from "@/components/LabPreview";

/**
 * Prévisualisation plein écran d'un lab, hors de toute entrée.
 *
 *     /lab-preview/lac-saint-charles
 *     /lab-preview/lac-saint-charles?locale=en
 *
 * Sert à mettre au point une carte sans le texte autour, et à la tester sur un
 * téléphone à taille réelle. La page vit hors de `[locale]` : elle n'a ni
 * en-tête, ni pied de page, ni traduction — donc rien qui puisse masquer ce
 * qu'on vient regarder.
 *
 * `noindex` : c'est un outil de travail, pas une page du carnet.
 */

export const metadata = {
  title: "Prévisualisation d'un lab",
  robots: { index: false, follow: false },
};

export default async function LabPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { id } = await params;
  const { locale } = await searchParams;

  if (!isLabId(id)) notFound();

  return <LabPreview labId={id} locale={locale === "en" ? "en" : "fr"} />;
}
