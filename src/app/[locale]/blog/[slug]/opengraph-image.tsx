import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getEntry, getAllEntryParams } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

/**
 * Vignette de partage propre à chaque entrée.
 *
 * LinkedIn ne lit ni titre ni description passés en paramètre d'URL : il va
 * chercher les balises Open Graph de la page. Générer une image par entrée,
 * avec son titre dessus, est donc ce qui distingue un lien partagé qui a l'air
 * soigné d'un lien qui a l'air d'un lien.
 *
 * 1200 × 630 est le format qui survit au recadrage de LinkedIn comme de Slack.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GeoTopics";

export function generateStaticParams() {
  return getAllEntryParams();
}

export default async function Image({
  params,
}: {
  // `params` est une Promise dans Next.js 16 — l'oublier fait passer un slug
  // `undefined` et toutes les entrées reçoivent alors la même vignette.
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const entry = await getEntry(locale, slug);
  const t = await getTranslations({ locale, namespace: "entry" });

  const title = entry?.title ?? "GeoTopics";
  const category = entry ? t(`filters.${entry.category}`) : "";

  // Le titre rétrécit quand il s'allonge, pour rester dans le cadre.
  const titleSize = title.length > 80 ? 46 : title.length > 50 ? 56 : 66;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#071620",
          padding: "68px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <g fill="none" stroke="#34c6c9" strokeWidth="1.7">
              <path d="M2 22c5-9 10-13 14-13s9 4 14 13" opacity=".35" />
              <path d="M6 24c4-7 7-10 10-10s6 3 10 10" opacity=".6" />
              <path d="M10.5 26c2.5-4.5 4-6.5 5.5-6.5s3 2 5.5 6.5" />
            </g>
            <circle cx="16" cy="9" r="2.6" fill="#34c6c9" />
          </svg>
          <span style={{ fontSize: 30, fontWeight: 700 }}>
            Geo<span style={{ color: "#34c6c9" }}>Topics</span>
          </span>
          {category && (
            <span
              style={{
                marginLeft: "10px",
                fontSize: 20,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#34c6c9",
                border: "1px solid #1d4f52",
                borderRadius: "999px",
                padding: "6px 16px",
              }}
            >
              {category}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              height: "6px",
              width: "72px",
              background: "#34c6c9",
              borderRadius: "3px",
            }}
          />
          <span style={{ fontSize: 24, color: "#9dafc0" }}>Andrés Lozada</span>
        </div>
      </div>
    ),
    size,
  );
}
