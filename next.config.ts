import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vignettes de Story Maps hébergées sur ArcGIS Online.
      { protocol: "https", hostname: "**.arcgis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  async headers() {
    return [
      {
        // Données des labs. Next.js sert `public/` en `max-age=0` par défaut,
        // parce qu'il ne peut pas savoir si un fichier a changé. Nous, si :
        // le nom porte sa version (`-v1`, `-v2`), donc un fichier publié ne
        // change JAMAIS de contenu. On peut le déclarer immuable et cesser de
        // le redemander — voir `public/data/README.md`.
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// Branche next-intl sur le build : rend `src/i18n/request.ts` actif.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
