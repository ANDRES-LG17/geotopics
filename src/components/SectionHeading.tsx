/** Titre de section réutilisable, avec sous-titre optionnel. */
export default function SectionHeading({
  title,
  subtitle,
  as: Tag = "h2",
  className = "",
}: {
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={className}>
      <Tag
        className={`font-bold tracking-tight text-fg ${
          Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
