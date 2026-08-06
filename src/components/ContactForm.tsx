"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "sending" | "success" | "error";
type FieldErrors = Partial<Record<"name" | "email" | "message", string>>;

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle/70 focus:border-brand";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  /** Validation côté client — le serveur revalide de toute façon. */
  function validate(data: Record<string, string>): FieldErrors {
    const next: FieldErrors = {};
    if (!data.name.trim()) next.name = t("required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = t("invalidEmail");
    if (data.message.trim().length < 20) next.message = t("tooShort");
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("sending");
    setServerError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setServerError(t("errorGeneric"));
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-brand/30 bg-brand-soft p-6"
      >
        <h3 className="font-bold text-brand-ink">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-brand-ink/80">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("name")} error={errors.name} htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
          />
        </Field>

        <Field label={t("email")} error={errors.email} htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={Boolean(errors.email)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("subject")} htmlFor="subject">
        <input
          id="subject"
          name="subject"
          type="text"
          placeholder={t("subjectPlaceholder")}
          className={inputClass}
        />
      </Field>

      <Field label={t("message")} error={errors.message} htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder={t("messagePlaceholder")}
          aria-invalid={Boolean(errors.message)}
          className={`${inputClass} resize-y`}
        />
      </Field>

      {/* Piège à robots : invisible pour l'humain, rempli par les bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {serverError && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          <strong>{t("errorTitle")} — </strong>
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {status === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-fg"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
