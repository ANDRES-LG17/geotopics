import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

/**
 * Coquille HTML de la page de prévisualisation.
 *
 * Nécessaire parce que le site n'a pas de layout racine : `<html>` et `<body>`
 * vivent dans `[locale]/layout.tsx`, et cette page est volontairement en
 * dehors — elle n'a ni traduction, ni en-tête, ni pied de page.
 *
 * On reprend seulement les polices et la feuille de styles globale : le reste
 * (Header, Footer, fournisseur next-intl) masquerait ce qu'on vient regarder.
 */

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function LabPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh`}
        // Les extensions de navigateur (antivirus, bloqueurs) écrivent des
        // attributs dans le DOM avant React : sans cela, chaque ouverture en
        // développement affiche une erreur d'hydratation qui n'en est pas une.
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
