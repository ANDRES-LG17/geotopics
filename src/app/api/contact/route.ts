import { NextResponse } from "next/server";
import { Resend } from "resend";
import { siteConfig } from "@/lib/site";

/**
 * Réception du formulaire de contact.
 *
 * CONFIGURATION REQUISE (sinon la route renvoie une erreur explicite) :
 *   1. Créez un compte gratuit sur https://resend.com
 *   2. Générez une clé API
 *   3. Ajoutez-la aux variables d'environnement Vercel : RESEND_API_KEY
 *   4. Optionnel : CONTACT_FROM_EMAIL (adresse d'expédition vérifiée chez Resend)
 *
 * Sans domaine vérifié, Resend n'autorise l'envoi que via
 * « onboarding@resend.dev », valeur utilisée par défaut ci-dessous.
 */

type Payload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** Champ piège : rempli uniquement par les robots. */
  company?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Payload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const subject = body.subject?.trim() || "(sans objet)";
  const message = body.message?.trim() ?? "";

  // Piège à robots : on répond 200 pour ne pas leur signaler la détection,
  // mais on n'envoie rien.
  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  // Revalidation serveur : le client peut toujours être contourné.
  if (!name || !EMAIL_RE.test(email) || message.length < 20) {
    return NextResponse.json({ error: "validation_failed" }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[contact] RESEND_API_KEY absente : impossible d'envoyer le courriel.",
    );
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev",
      to: siteConfig.email,
      // Permet de répondre directement au visiteur depuis sa boîte courriel.
      replyTo: email,
      subject: `[${siteConfig.name}] ${subject}`,
      text: [
        `Nom     : ${name}`,
        `Courriel: ${email}`,
        `Objet   : ${subject}`,
        "",
        message,
      ].join("\n"),
    });

    if (error) {
      console.error("[contact] Resend a renvoyé une erreur :", error);
      return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Erreur inattendue :", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}
