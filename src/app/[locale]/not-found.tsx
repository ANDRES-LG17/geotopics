import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Container from "@/components/Container";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-32 text-center">
      <p className="font-mono text-6xl font-bold text-brand">404</p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-fg">
        {t("title")}
      </h1>
      <p className="mt-3 text-fg-muted">{t("body")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 font-semibold text-white"
      >
        {t("back")}
      </Link>
    </Container>
  );
}
