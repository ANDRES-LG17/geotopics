import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import OgBrand from "@/components/OgBrand";

/**
 * Vignette de partage générée à la volée (LinkedIn, Facebook, Slack…).
 * Une par langue, appliquée à toutes les pages de la section.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GeoTopics";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({
  params,
}: {
  // `params` est une Promise dans Next.js 16 : il faut l'attendre.
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08150f",
          padding: "72px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <OgBrand fontSize={38} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.15 }}>
            {t("tagline")}
          </div>
          <div style={{ fontSize: 30, color: "#9fb2a8" }}>{t("author")}</div>
        </div>

        <div
          style={{
            display: "flex",
            height: "8px",
            width: "220px",
            background: "#45c78d",
            borderRadius: "4px",
          }}
        />
      </div>
    ),
    size,
  );
}
