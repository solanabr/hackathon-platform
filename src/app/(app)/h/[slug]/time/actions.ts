"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user-state";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type AddMemberResult =
  | { ok: true; hasAccount: boolean; email: string }
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

  const { data: existingMembers } = await admin
    .from("team_members")
    .select("id, invited_email")
    .eq("team_id", input.teamId)
    .in("status", ["accepted", "pending"]);

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
    const { data: otherTeam } = await admin
      .from("team_members")
      .select("teams(name)")
      .eq("user_id", existingUser.id)
      .eq("hackathon_id", leaderCheck.hackathon_id)
      .eq("status", "accepted")
      .maybeSingle();

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

  revalidatePath("/h/[slug]/time");
  return { ok: true, hasAccount: !!existingUser, email };
}
