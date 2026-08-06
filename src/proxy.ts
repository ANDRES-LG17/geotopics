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
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
