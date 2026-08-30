import { createServiceRoleClient } from "./supabase/server";
import { logQueryError } from "./supabase/unwrap";
import { sendTeamInvite } from "./email";
import type { AuthenticatedState } from "./user-state";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddMemberResult =
  | { ok: true; hasAccount: boolean; email: string; emailSent: boolean }
  | { ok: false; error: string };

export async function addMemberToTeam(
  state: AuthenticatedState,
  teamId: string,
  rawEmail: string,
): Promise<AddMemberResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }

  const admin = await createServiceRoleClient();

  const { data: leaderCheck, error: leaderError } = await admin
    .from("team_members")
    .select("is_leader, status, hackathon_id, team:teams(locked)")
    .eq("team_id", teamId)
    .eq("user_id", state.userId)
    .maybeSingle();

  if (leaderError) {
    logQueryError("team.addMemberByEmail.leaderCheck", leaderError);
    return { ok: false, error: "Não foi possível validar o time. Tente novamente." };
  }
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
    .eq("team_id", teamId)
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

  // A failed lookup here would skip the cross-team check below AND insert a
  // ghost row for someone who has an account — which only the signup trigger
  // links, so an existing user would stay invited-but-invisible forever.
  const { data: existingUser, error: userLookupError } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (userLookupError) {
    logQueryError("team.addMemberByEmail.userLookup", userLookupError);
    return { ok: false, error: "Não foi possível validar o convite. Tente novamente." };
  }

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

  // Always pending: joining a team is the member's own act. An existing
  // account accepts on the team page; a new account is auto-linked at signup.
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("team_members").insert({
    team_id: teamId,
    user_id: existingUser?.id ?? null,
    invited_email: email,
    status: "pending",
    is_leader: false,
    invited_at: now,
    accepted_at: null,
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
  const { data: context, error: contextError } = await admin
    .from("teams")
    .select("name, hackathons(name, slug)")
    .eq("id", teamId)
    .maybeSingle();
  // Email context only: the membership already exists, so a failed read just
  // skips the notification (emailSent: false says so).
  if (contextError) logQueryError("team.addMemberByEmail.emailContext", contextError);

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
