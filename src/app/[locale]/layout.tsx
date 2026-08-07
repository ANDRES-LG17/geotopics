import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { buildAlternates } from "@/lib/metadata";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Pré-génère /fr et /en au build : pages statiques, donc rapides. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });

  return {
    metadataBase: new URL(siteConfig.url),
    // « %s » est remplacé par le titre de chaque page enfant.
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s · ${t("name")}`,
    },
    description: t("description"),
    applicationName: t("name"),
    authors: [{ name: siteConfig.author }],
    creator: siteConfig.author,
    alternates: {
      ...buildAlternates(locale, "/"),
      // Rend le flux découvrable automatiquement par les lecteurs RSS
      // et par les connecteurs d'automatisation (Buffer, Zapier, Make).
      types: {
        "application/rss+xml": [
          { url: `${siteConfig.url}/${locale}/rss.xml`, title: t("name") },
        ],
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Rejette toute langue non déclarée dans le routage (ex. /de/portfolio).
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Indispensable pour que le rendu statique connaisse la langue active.
  setRequestLocale(locale);

  const t = await getTranslations("nav");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col`}
      >
        <NextIntlClientProvider>
          {/* Lien d'évitement : première tabulation pour les lecteurs d'écran. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
