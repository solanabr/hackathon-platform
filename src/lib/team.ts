import { createServerSupabaseClient } from "./supabase/server";
import { unwrap } from "./supabase/unwrap";
import type { Team, TeamMember, Submission, User } from "@/types/db";

export type TeamSnapshot = {
  team: Team;
  members: Array<TeamMember & { user?: Pick<User, "id" | "full_name" | "email" | "avatar_url" | "github_url"> | null }>;
  submission: Submission;
  isLeader: boolean;
};

export type PendingTeamSnapshot = {
  teamId: string;
  teamName: string;
  leaderName: string | null;
  leaderEmail: string | null;
  /**
   * The pending row only auto-accepts at signup, and only while the team is
   * unlocked with fewer than four accepted members. Locked or full teams leave
   * the invitee in limbo, so the UI needs to know.
   */
  locked: boolean;
  full: boolean;
};

/**
 * The invited user's own PENDING membership for an edition, if any. Goes
 * through the security-definer RPC because RLS only exposes team_members rows
 * to accepted teammates.
 */
export async function getPendingTeamForHackathon(
  hackathonId: string,
): Promise<PendingTeamSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  const data = unwrap(
    await supabase.rpc("pending_membership_for_edition", {
      p_hackathon_id: hackathonId,
    }),
    "team.pendingMembership",
  );
  return (data as PendingTeamSnapshot[] | null)?.[0] ?? null;
}

export async function getTeamForHackathon(userId: string, hackathonId: string): Promise<TeamSnapshot | null> {
  const supabase = await createServerSupabaseClient();

  // null here reads as "no team" and shows the create-team CTA to someone who
  // already has one — fail loud instead.
  const memberships = unwrap(
    await supabase
      .from("team_members")
      .select("team_id, teams!inner(id, hackathon_id)")
      .eq("user_id", userId)
      .eq("status", "accepted"),
    "team.getTeamForHackathon.memberships",
  );

  type Row = { team_id: string; teams: { id: string; hackathon_id: string } | { id: string; hackathon_id: string }[] };
  const match = (memberships as Row[] | null)?.find((m) => {
    const t = Array.isArray(m.teams) ? m.teams[0] : m.teams;
    return t?.hackathon_id === hackathonId;
  });
  if (!match) return null;

  const teamId = match.team_id;

  const [teamResult, membersResult, submissionResult] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
    supabase
      .from("team_members")
      .select(`*, user:users(id, full_name, email, avatar_url, github_url)`)
      .eq("team_id", teamId)
      .neq("status", "removed")
      .order("invited_at", { ascending: true }),
    supabase.from("submissions").select("*").eq("team_id", teamId).maybeSingle(),
  ]);
  const team = unwrap(teamResult, "team.getTeamForHackathon.team");
  const members = unwrap(membersResult, "team.getTeamForHackathon.members");
  const submission = unwrap(submissionResult, "team.getTeamForHackathon.submission");

  if (!team || !submission) return null;

  return {
    team: team as Team,
    members: (members as TeamSnapshot["members"]) ?? [],
    submission: submission as Submission,
    isLeader: (team as Team).leader_id === userId,
  };
}
