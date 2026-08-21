import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Superteam Brasil <onboarding@resend.dev>";

export type SendResult = { ok: true } | { ok: false; error: string };

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const resend = client();
  if (!resend) return { ok: false, error: "email_not_configured" };

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function layout(body: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f7eacb;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fffdf6;border:1px solid rgba(47,107,63,.15);border-radius:16px;padding:32px">
    ${body}
    <p style="margin:32px 0 0;font-size:12px;color:#2f6b3f">Superteam Brasil</p>
  </div>
</div>`;
}

export async function sendTeamInvite(input: {
  to: string;
  teamName: string;
  leaderName: string;
  hackathonName: string;
  slug: string;
}): Promise<SendResult> {
  const url = `${siteUrl()}/h/${input.slug}`;

  return send(
    input.to,
    `Você foi adicionado ao time ${input.teamName}`,
    layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#1b231d">Você está no time ${escapeHtml(input.teamName)}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1b231d">
        ${escapeHtml(input.leaderName)} adicionou você ao time <strong>${escapeHtml(input.teamName)}</strong>
        no <strong>${escapeHtml(input.hackathonName)}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1b231d">
        Para aparecer no time, entre na plataforma usando <strong>este mesmo e-mail</strong>
        (${escapeHtml(input.to)}). Se você entrar com outro endereço, o time não vai te encontrar.
      </p>
      <a href="${url}" style="display:inline-block;background:#ffd23f;color:#1b231d;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px">
        Entrar na plataforma
      </a>
    `),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
