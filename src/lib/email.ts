import { Resend } from "resend";
import { createServiceRoleClient } from "./supabase/server";

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

export async function sendSubmissionReceived(input: {
  to: string;
  projectName: string;
  editionName: string;
  editionUrl: string;
  dashboardUrl: string;
}): Promise<SendResult> {
  return send(
    input.to,
    `Submissão recebida · ${input.editionName}`,
    layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#1b231d">Submissão recebida</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1b231d">
        O projeto <strong>${escapeHtml(input.projectName)}</strong> foi submetido com sucesso no
        <strong>${escapeHtml(input.editionName)}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1b231d">
        Os finalistas são anunciados por e-mail. Acompanhe a edição pelo painel do time.
      </p>
      <a href="${input.editionUrl}" style="display:inline-block;background:#ffd23f;color:#1b231d;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;margin-right:12px">
        Ver edição
      </a>
      <a href="${input.dashboardUrl}" style="display:inline-block;border:2px solid #1b231d;color:#1b231d;font-weight:600;text-decoration:none;padding:10px 22px;border-radius:999px">
        Painel do time
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

export async function sendFinalistEmail(input: {
  to: string;
  projectName: string;
  editionName: string;
  editionUrl: string;
}): Promise<SendResult> {
  return send(
    input.to,
    `Você é finalista do ${input.editionName}`,
    layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#1b231d">Parabéns, você é finalista!</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1b231d">
        O projeto <strong>${escapeHtml(input.projectName)}</strong> foi selecionado entre os
        finalistas do <strong>${escapeHtml(input.editionName)}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1b231d">
        Preparem o pitch final e nos vemos na próxima fase.
      </p>
      <a href="${input.editionUrl}" style="display:inline-block;background:#ffd23f;color:#1b231d;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px">
        Ver detalhes da edição
      </a>
    `),
  );
}

export type FinalistNotifyResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

/**
 * Sends the finalist email to every yet-unnotified finalist team's leader and
 * stamps finalist_notified_at on success, so a retry only reaches the teams
 * that never got the email. Admin-gated callers only; never import this into a
 * client component.
 */
export async function notifyFinalists(hackathonId: string): Promise<FinalistNotifyResult> {
  const supabase = await createServiceRoleClient();

  const { data: hack } = await supabase
    .from("hackathons")
    .select("name, slug")
    .eq("id", hackathonId)
    .maybeSingle();

  const edition = hack as { name: string; slug: string } | null;
  if (!edition) return { ok: false, error: "Edição não encontrada." };

  const { data } = await supabase
    .from("teams")
    .select("id, name, users(email)")
    .eq("hackathon_id", hackathonId)
    .eq("is_finalist", true)
    .is("finalist_notified_at", null);

  type TeamRow = {
    id: string;
    name: string;
    users: { email: string } | { email: string }[] | null;
  };
  const teams = ((data as TeamRow[] | null) ?? []).filter(
    (t) => t.users !== null && t.users !== undefined,
  );

  let sent = 0;
  let failed = 0;

  for (const team of teams) {
    const leader = Array.isArray(team.users) ? team.users[0] : team.users;
    if (!leader?.email) {
      failed++;
      continue;
    }

    const result = await sendFinalistEmail({
      to: leader.email,
      projectName: team.name,
      editionName: edition.name,
      editionUrl: `${siteUrl()}/h/${edition.slug}`,
    });

    if (result.ok) {
      sent++;
      await supabase
        .from("teams")
        .update({ finalist_notified_at: new Date().toISOString() })
        .eq("id", team.id);
    } else {
      failed++;
    }
  }

  return { ok: true, sent, failed };
}
