import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getEntriesByLocale } from "@/lib/content";
import { siteConfig } from "@/lib/site";

/**
 * Flux RSS, un par langue : /fr/rss.xml et /en/rss.xml
 *
 * À quoi ça sert concrètement : LinkedIn n'a pas d'API publique pour publier
 * automatiquement un billet de blogue. En revanche, des connecteurs comme
 * Buffer, Zapier ou Make savent surveiller un flux RSS et publier un post
 * LinkedIn dès qu'une nouvelle entrée apparaît. Le flux est donc le point
 * d'accroche de toute automatisation — c'est ce qui rapproche le plus du
 * « quand j'écris, ça part sur LinkedIn ».
 *
 * Le post publié par le connecteur reprendra l'URL de l'entrée ; c'est ensuite
 * la vignette Open Graph de cette page qui fera l'aperçu.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Échappe les caractères interdits dans du XML. */
function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c] as string,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;

  if (!routing.locales.includes(raw as Locale)) {
    return new Response("Not found", { status: 404 });
  }
  const locale = raw as Locale;

  const t = await getTranslations({ locale, namespace: "site" });
  const entries = getEntriesByLocale(locale);
  const feedUrl = `${siteConfig.url}/${locale}/rss.xml`;

  const items = entries
    .map((entry) => {
      const url = `${siteConfig.url}/${locale}/blog/${entry.slug}`;
      return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(entry.description)}</description>
      <pubDate>${new Date(`${entry.date}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${escapeXml(entry.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${t("name")} — ${t("tagline")}`)}</title>
    <link>${siteConfig.url}/${locale}</link>
    <description>${escapeXml(t("description"))}</description>
    <language>${locale === "fr" ? "fr-ca" : "en-ca"}</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Les connecteurs interrogent le flux souvent : une heure de cache suffit.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
