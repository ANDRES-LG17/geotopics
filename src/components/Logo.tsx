/**
 * Marque GeoTopics : trois courbes de niveau et un point de station,
 * clin d'œil au levé topographique.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-7 w-7 shrink-0 text-brand"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M2 22c5-9 10-13 14-13s9 4 14 13" opacity=".35" />
          <path d="M6 24c4-7 7-10 10-10s6 3 10 10" opacity=".6" />
          <path d="M10.5 26c2.5-4.5 4-6.5 5.5-6.5s3 2 5.5 6.5" />
        </g>
        <circle cx="16" cy="9" r="2.6" fill="currentColor" />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        Geo<span className="text-brand">Topics</span>
      </span>
    </span>
  );
}
