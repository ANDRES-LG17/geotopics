import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import ContactForm from "@/components/ContactForm";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return createPageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("contact");

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading as="h1" title={t("heading")} subtitle={t("intro")} />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <ContactForm />

        <aside className="space-y-6 lg:order-last">
          <InfoBlock label={t("directEmail")}>
            <a
              href={`mailto:${siteConfig.email}`}
              className="font-medium text-brand hover:underline"
            >
              {siteConfig.email}
            </a>
          </InfoBlock>

          <InfoBlock label={t("location")}>
            <span className="text-fg-muted">{t("locationValue")}</span>
          </InfoBlock>

          <InfoBlock label={t("availability")}>
            <span className="inline-flex items-center gap-2 text-fg-muted">
              <span
                className="h-2 w-2 rounded-full bg-green-500"
                aria-hidden="true"
              />
              {t("availabilityValue")}
            </span>
          </InfoBlock>

          {siteConfig.social.linkedin && (
            <InfoBlock label="LinkedIn">
              <a
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:underline"
              >
                {siteConfig.author}
              </a>
            </InfoBlock>
          )}
        </aside>
      </div>
    </Container>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </h2>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}
