import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Versions « conscientes de la langue » des API de navigation Next.js.
 *
 * À utiliser PARTOUT à la place de `next/link` et `next/navigation` :
 * `<Link href="/portfolio">` produit automatiquement /fr/portfolio ou
 * /en/portfolio selon la langue active. Aucun préfixe à écrire à la main.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
