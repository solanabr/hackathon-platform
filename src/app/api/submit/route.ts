import { NextResponse, after, type NextRequest } from "next/server";
import { createPostHogServer } from "@/lib/posthog-server";
import { sendSubmissionReceived, siteUrl } from "@/lib/email";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  not_authenticated: { status: 401, message: "Sessão expirada." },
  not_leader: { status: 403, message: "Apenas o líder pode submeter." },
  team_not_found: { status: 404, message: "Time não encontrado." },
  already_locked: { status: 409, message: "Time já submetido." },
  deadline_passed: { status: 409, message: "Prazo encerrado." },
  external_edition: { status: 400, message: "Esta edição não usa times na plataforma." },
  missing_required_fields: {
    status: 422,
    message: "Preencha todos os campos obrigatórios (incluindo imagem do projeto).",
  },
  team_too_small: {
    status: 422,
    message: "O time precisa de pelo menos 2 integrantes aceitos para submeter.",
  },
  members_missing_luma: {
    status: 422,
    message: "Todos os integrantes precisam confirmar a inscrição no Luma antes de submeter.",
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const leaderEmail = (claimsData?.claims?.email as string | undefined) ?? null;
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { error: rpcError } = await supabase.rpc("submit_team", { p_team_id: body.teamId });
  if (rpcError) {
    const mapped = RPC_ERRORS[rpcError.message];
    return NextResponse.json(
      { error: mapped?.message ?? "Não foi possível submeter.", code: rpcError.message },
      { status: mapped?.status ?? 500 },
    );
  }

  // The RPC only lets the team leader through, so the session email is the
  // leader's. after() runs once the response is flushed and, unlike a floated
  // promise, survives the serverless instance being frozen at flush time.
  after(async () => {
    try {
      const { data: teamRow, error: teamRowError } = await supabase
        .from("teams")
        .select("hackathons(name, slug), submissions(project_name)")
        .eq("id", body.teamId)
        .maybeSingle();
      // Email context only — the submission already succeeded.
      if (teamRowError) logQueryError("api.submit.emailContext", teamRowError);

      type TeamRow = {
        hackathons:
          | { name: string; slug: string }
          | { name: string; slug: string }[]
          | null;
        submissions: { project_name: string | null } | { project_name: string | null }[] | null;
      };
      const row = teamRow as TeamRow | null;
      const edition = Array.isArray(row?.hackathons) ? row?.hackathons[0] : row?.hackathons;
      const submission = Array.isArray(row?.submissions)
        ? row?.submissions[0]
        : row?.submissions;

      // The event the client can't see reliably: the moment a team's project
      // actually lands. Same distinct id the browser identifies with.
      const ph = createPostHogServer();
      const leaderId = claimsData.claims.sub as string | undefined;
      if (ph && leaderId) {
        await ph
          .captureImmediate({
            distinctId: leaderId,
            event: "team_submitted",
            properties: { team_id: body.teamId, edition: edition?.slug ?? null },
          })
          .catch((err) => console.error("posthog team_submitted failed:", err));
      }

      if (leaderEmail && edition?.slug) {
        const result = await sendSubmissionReceived({
          to: leaderEmail,
          projectName: submission?.project_name ?? "Seu projeto",
          editionName: edition.name ?? "",
          editionUrl: `${siteUrl()}/h/${edition.slug}`,
          dashboardUrl: `${siteUrl()}/h/${edition.slug}/dashboard`,
        });
        if (!result.ok) console.error("sendSubmissionReceived failed:", result.error);
      }
    } catch (err) {
      console.error("sendSubmissionReceived error:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
