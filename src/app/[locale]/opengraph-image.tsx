import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <svg width="52" height="52" viewBox="0 0 32 32">
            <g fill="none" stroke="#45c78d" strokeWidth="1.7">
              <path d="M2 22c5-9 10-13 14-13s9 4 14 13" opacity=".35" />
              <path d="M6 24c4-7 7-10 10-10s6 3 10 10" opacity=".6" />
              <path d="M10.5 26c2.5-4.5 4-6.5 5.5-6.5s3 2 5.5 6.5" />
            </g>
            <circle cx="16" cy="9" r="2.6" fill="#45c78d" />
          </svg>
          <span style={{ fontSize: 38, fontWeight: 700 }}>
            Geo<span style={{ color: "#45c78d" }}>Topics</span>
          </span>
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
