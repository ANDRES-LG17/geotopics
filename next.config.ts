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
};

// Branche next-intl sur le build : rend `src/i18n/request.ts` actif.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
