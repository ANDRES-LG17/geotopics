import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Redirige « / » vers « /fr » (ou « /en » selon l'en-tête Accept-Language)
 * et injecte la langue active dans chaque requête.
 *
 * Note : depuis Next.js 16, ce fichier se nomme `proxy.ts`
 * (l'ancienne convention `middleware.ts` est dépréciée).
 */
export default createMiddleware(routing);

export const config = {
  // On ignore les routes d'API, les fichiers internes de Next.js
  // et tout ce qui contient un point (images, PDF, robots.txt...).
  //
  // `lab-preview` est également exclu : cette page de mise au point vit hors
  // de `[locale]` et n'a pas de version traduite. Sans cette exclusion, le
  // middleware la redirigerait vers `/fr/lab-preview/...`, qui n'existe pas.
  matcher: "/((?!api|_next|_vercel|lab-preview|.*\\..*).*)",
};
