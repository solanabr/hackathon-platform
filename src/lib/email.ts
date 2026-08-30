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
  // PNG, not SVG: Gmail strips SVG. Hosted from the deployed site, so local
  // sends show a broken logo — the links break the same way, acceptable.
  const logo = `${siteUrl()}/brand/stbr/logo/horizontal-email.png`;
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f7eacb;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto">
    <img src="${logo}" alt="Superteam Brasil" width="176" style="display:block;margin:0 auto 20px" />
    <div style="background:#fffdf6;border:2px solid #1b231d;border-radius:16px;padding:32px">
      ${body}
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#2f6b3f">
      Superteam Brasil · <a href="${siteUrl()}" style="color:#2f6b3f">hackathon.superteam.com.br</a>
    </p>
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

export async function sendApplicationReceived(input: {
  to: string;
  applicantName: string;
  teamName: string;
  roles: string[];
  message: string | null;
  slug: string;
}): Promise<SendResult> {
  const url = `${siteUrl()}/h/${input.slug}/team`;
  return send(
    input.to,
    `Nova candidatura para o time ${input.teamName}`,
    layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#1b231d">Nova candidatura</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1b231d">
        <strong>${escapeHtml(input.applicantName)}</strong> quer entrar no time
        <strong>${escapeHtml(input.teamName)}</strong>${
          input.roles.length ? ` como ${escapeHtml(input.roles.join(", "))}` : ""
        }.
      </p>
      ${
        input.message
          ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1b231d;border-left:3px solid #ffd23f;padding-left:12px">${escapeHtml(input.message)}</p>`
          : ""
      }
      <a href="${url}" style="display:inline-block;background:#ffd23f;color:#1b231d;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px">
        Responder no painel do time
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
 * Sends the finalist email to every yet-unnotified finalist team's leader.
 *
 * Each team is claimed atomically (`finalist_notified_at` set by a single-row
 * UPDATE ... AND finalist_notified_at IS NULL) before its email goes out, so a
 * concurrent or retried run never sends the same leader twice. If the send
 * fails the claim is rolled back and the team is counted as failed, so a retry
 * reaches it. Admin-gated callers only; never import this into a client
 * component.
 */
export async function notifyFinalists(hackathonId: string): Promise<FinalistNotifyResult> {
  const supabase = await createServiceRoleClient();

  const { data: hack, error: hackError } = await supabase
    .from("hackathons")
    .select("name, slug")
    .eq("id", hackathonId)
    .maybeSingle();

  const edition = hack as { name: string; slug: string } | null;
  if (hackError || !edition) return { ok: false, error: "Edição não encontrada." };

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, users(email)")
    .eq("hackathon_id", hackathonId)
    .eq("is_finalist", true)
    .is("finalist_notified_at", null);

  if (error) return { ok: false, error: error.message };

  type TeamRow = {
    id: string;
    name: string;
    users: { email: string } | { email: string }[] | null;
  };
  const teams = (data as TeamRow[] | null) ?? [];

  let sent = 0;
  let failed = 0;

  for (const team of teams) {
    const leader = Array.isArray(team.users) ? team.users[0] : team.users;
    if (!leader?.email) {
      failed++;
      continue;
    }

    // Atomic claim: only the run whose UPDATE returns a row may send, which
    // closes the select-then-stamp race between concurrent notifications.
    const { data: claimed, error: claimError } = await supabase
      .from("teams")
      .update({ finalist_notified_at: new Date().toISOString() })
      .eq("id", team.id)
      .is("finalist_notified_at", null)
      .select("id, finalist_notified_at")
      .maybeSingle();

    if (claimError) {
      failed++;
      continue;
    }
    if (!claimed) continue; // another run claimed this team first

    const result = await sendFinalistEmail({
      to: leader.email,
      projectName: team.name,
      editionName: edition.name,
      editionUrl: `${siteUrl()}/h/${edition.slug}`,
    });

    if (result.ok) {
      sent++;
    } else {
      // Roll the claim back so a retry re-sends to this team.
      await supabase
        .from("teams")
        .update({ finalist_notified_at: null })
        .eq("id", team.id)
        .eq("finalist_notified_at", claimed.finalist_notified_at);
      failed++;
    }
  }

  return { ok: true, sent, failed };
}
