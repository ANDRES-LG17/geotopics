import { useTranslations } from "next-intl";

/**
 * Lien de partage LinkedIn.
 *
 * LinkedIn ne lit pas de titre ni de description passés en paramètre : il va
 * chercher lui-même les balises Open Graph de l'URL partagée. C'est pourquoi
 * chaque entrée génère sa propre image OG — c'est elle qui fera la vignette.
 */
export default function ShareOnLinkedIn({ url }: { url: string }) {
  const t = useTranslations("entry");
  const href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:border-brand/50 hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z" />
      </svg>
      {t("shareOnLinkedin")}
    </a>
  );
}
