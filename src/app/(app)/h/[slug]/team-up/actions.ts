"use server";

import { after } from "next/server";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { sanitizeText } from "@/lib/security";
import { sanitizeRoles, roleLabel, isProfileCompleteForTeamUp } from "@/lib/team-up";
import { addMemberToTeam, type AddMemberResult } from "@/lib/team-invite";
import { sendApplicationReceived } from "@/lib/email";

export type TeamUpActionResult = { ok: true } | { ok: false; error: string };

const RPC_ERRORS: Record<string, string> = {
  not_registered: "Complete sua inscrição na edição antes de continuar.",
  already_on_team: "Você já está em um time nesta edição.",
  team_locked: "Esse time já fechou a submissão.",
  team_full: "Esse time já está com 4 integrantes.",
  opening_not_found: "Essa vaga não está mais aberta.",
  application_not_found: "Candidatura não encontrada.",
  not_leader: "Apenas o líder pode responder candidaturas.",
  already_applied: "Você já se candidatou a esse time.",
  own_team: "Esse é o seu próprio time.",
};

function mapRpcError(message: string): TeamUpActionResult {
  return { ok: false, error: RPC_ERRORS[message] ?? "Não foi possível concluir. Tente novamente." };
}

export async function saveOpening(input: {
  teamId: string;
  roles: string[];
  note: string;
  active: boolean;
}): Promise<TeamUpActionResult> {
  const state = await requireUser();
  const roles = sanitizeRoles(input.roles);
  if (!roles) return { ok: false, error: "Selecione de 1 a 6 funções." };

  const admin = await createServiceRoleClient();
  const { data: team, error } = await admin
    .from("teams")
    .select("id, hackathon_id, leader_id, locked")
    .eq("id", input.teamId)
    .maybeSingle();
  if (error) {
    logQueryError("teamUp.saveOpening.team", error);
    return { ok: false, error: "Não foi possível validar o time. Tente novamente." };
  }
  if (!team || team.leader_id !== state.userId) {
    return { ok: false, error: "Apenas o líder pode editar o recrutamento." };
  }
  if (team.locked) return { ok: false, error: "Time já está bloqueado." };

  const { error: upsertError } = await admin.from("team_openings").upsert({
    team_id: team.id,
    hackathon_id: team.hackathon_id,
    roles,
    note: sanitizeText(input.note, 280),
    active: input.active,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) {
    logQueryError("teamUp.saveOpening.upsert", upsertError);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
}

export async function saveSeekerPost(input: {
  hackathonId: string;
  roles: string[];
  note: string;
  active: boolean;
}): Promise<TeamUpActionResult> {
  const state = await requireUser();
  const roles = sanitizeRoles(input.roles);
  if (!roles) return { ok: false, error: "Selecione de 1 a 6 funções." };
  if (input.active && !isProfileCompleteForTeamUp(state.profile)) {
    return { ok: false, error: "profile_incomplete" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("team_seekers").upsert(
    {
      hackathon_id: input.hackathonId,
      user_id: state.userId,
      roles,
      note: sanitizeText(input.note, 280),
      active: input.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "hackathon_id,user_id" },
  );
  if (error) {
    logQueryError("teamUp.saveSeekerPost", error);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
}

export async function applyToTeam(input: {
  teamId: string;
  message: string;
}): Promise<TeamUpActionResult> {
  const state = await requireUser();
  const supabase = await createServerSupabaseClient();
  const message = sanitizeText(input.message, 500) ?? "";
  const { error } = await supabase.rpc("apply_to_team", {
    p_team_id: input.teamId,
    p_message: message,
  });
  if (error) return mapRpcError(error.message);

  after(async () => {
    const admin = await createServiceRoleClient();
    const { data, error: ctxError } = await admin
      .from("teams")
      .select("name, hackathon_id, users(email), hackathons(slug)")
      .eq("id", input.teamId)
      .maybeSingle();
    if (ctxError || !data) {
      if (ctxError) logQueryError("teamUp.applyEmail.context", ctxError);
      return;
    }

    const teamRow = data as {
      name: string;
      hackathon_id: string;
      users: { email: string } | { email: string }[] | null;
      hackathons: { slug: string } | { slug: string }[] | null;
    };
    const leader = Array.isArray(teamRow.users) ? teamRow.users[0] : teamRow.users;
    const edition = Array.isArray(teamRow.hackathons) ? teamRow.hackathons[0] : teamRow.hackathons;
    if (!leader?.email || !edition) return;

    const { data: seeker, error: seekerError } = await admin
      .from("team_seekers")
      .select("roles")
      .eq("user_id", state.userId)
      .eq("hackathon_id", teamRow.hackathon_id)
      .maybeSingle();
    if (seekerError) logQueryError("teamUp.applyEmail.seeker", seekerError);

    const roles = ((seeker?.roles as string[] | undefined) ?? []).map(roleLabel);

    const result = await sendApplicationReceived({
      to: leader.email,
      applicantName: state.profile?.full_name ?? "Participante",
      teamName: teamRow.name,
      roles,
      message: message || null,
      slug: edition.slug,
    });
    if (!result.ok) console.error("teamUp.applyEmail.send", result.error);
  });

  return { ok: true };
}

export async function withdrawApplication(input: {
  applicationId: string;
}): Promise<TeamUpActionResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("withdraw_application", {
    p_application_id: input.applicationId,
  });
  if (error) return mapRpcError(error.message);
  return { ok: true };
}

export async function respondToApplication(input: {
  applicationId: string;
  accept: boolean;
}): Promise<TeamUpActionResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("respond_to_application", {
    p_application_id: input.applicationId,
    p_accept: input.accept,
  });
  if (error) return mapRpcError(error.message);
  return { ok: true };
}

export async function inviteSeeker(input: {
  teamId: string;
  userId: string;
}): Promise<AddMemberResult> {
  const state = await requireUser();
  const admin = await createServiceRoleClient();
  const { data: seeker, error } = await admin
    .from("users")
    .select("email")
    .eq("id", input.userId)
    .maybeSingle();
  if (error) {
    logQueryError("teamUp.inviteSeeker.lookup", error);
    return { ok: false, error: "Não foi possível convidar. Tente novamente." };
  }
  if (!seeker?.email) return { ok: false, error: "Perfil não encontrado." };
  return addMemberToTeam(state, input.teamId, seeker.email);
}
