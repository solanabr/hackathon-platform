"use server";

import { requireUser } from "@/lib/user-state";
import { sendTeamInvite } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";

export type AddMemberResult =
  | { ok: true; hasAccount: boolean; email: string; emailSent: boolean }
  | { ok: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addMemberByEmail(input: {
  teamId: string;
  email: string;
}): Promise<AddMemberResult> {
  const state = await requireUser();

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }

  const admin = await createServiceRoleClient();

  const { data: leaderCheck } = await admin
    .from("team_members")
    .select("is_leader, status, hackathon_id, team:teams(locked)")
    .eq("team_id", input.teamId)
    .eq("user_id", state.userId)
    .maybeSingle();

  if (!leaderCheck?.is_leader || leaderCheck.status !== "accepted") {
    return { ok: false, error: "Apenas o líder pode adicionar integrantes." };
  }

  const team = Array.isArray(leaderCheck.team)
    ? leaderCheck.team[0]
    : (leaderCheck.team as { locked: boolean } | null);
  if (team?.locked) {
    return { ok: false, error: "Time já está bloqueado." };
  }

  const { data: existingMembers, error: membersError } = await admin
    .from("team_members")
    .select("id, invited_email")
    .eq("team_id", input.teamId)
    .in("status", ["accepted", "pending"]);

  // A failed read here would make the cap and duplicate checks pass vacuously.
  if (membersError) {
    logQueryError("team.addMemberByEmail.members", membersError);
    return { ok: false, error: "Não foi possível validar o time. Tente novamente." };
  }

  if ((existingMembers?.length ?? 0) >= 4) {
    return { ok: false, error: "Time já tem 4 integrantes." };
  }
  if (existingMembers?.some((m) => m.invited_email.toLowerCase() === email)) {
    return { ok: false, error: "Esse e-mail já está no time." };
  }

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    // Plain select, not maybeSingle: someone already on two accepted teams
    // made maybeSingle error out, and the error path let them into a third.
    const { data: otherTeams, error: otherTeamsError } = await admin
      .from("team_members")
      .select("teams(name)")
      .eq("user_id", existingUser.id)
      .eq("hackathon_id", leaderCheck.hackathon_id)
      .eq("status", "accepted");

    if (otherTeamsError) {
      logQueryError("team.addMemberByEmail.otherTeams", otherTeamsError);
      return { ok: false, error: "Não foi possível validar o time. Tente novamente." };
    }

    const otherTeam = otherTeams?.[0];
    if (otherTeam) {
      const teamRel = Array.isArray(otherTeam.teams)
        ? otherTeam.teams[0]
        : (otherTeam.teams as { name: string } | null);
      return {
        ok: false,
        error: `Essa pessoa já está no time "${teamRel?.name ?? "outro"}".`,
      };
    }
  }

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("team_members").insert({
    team_id: input.teamId,
    user_id: existingUser?.id ?? null,
    invited_email: email,
    status: existingUser ? "accepted" : "pending",
    is_leader: false,
    invited_at: now,
    accepted_at: existingUser ? now : null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: "Esse e-mail já está no time." };
    }
    return { ok: false, error: insertError.message };
  }

  // The invite is only useful if the person knows it happened, and the ghost row
  // only resolves when they sign up with this exact address. A failed send must
  // not undo the membership, so it is reported, not thrown.
  const { data: context } = await admin
    .from("teams")
    .select("name, hackathons(name, slug)")
    .eq("id", input.teamId)
    .maybeSingle();

  const teamRow = context as
    | { name: string; hackathons: { name: string; slug: string } | { name: string; slug: string }[] | null }
    | null;
  const edition = Array.isArray(teamRow?.hackathons) ? teamRow?.hackathons[0] : teamRow?.hackathons;

  let emailSent = false;
  if (teamRow && edition) {
    const result = await sendTeamInvite({
      to: email,
      teamName: teamRow.name,
      leaderName: state.profile?.full_name ?? "O líder do time",
      hackathonName: edition.name,
      slug: edition.slug,
    });
    emailSent = result.ok;
  }

  return { ok: true, hasAccount: !!existingUser, email, emailSent };
}
