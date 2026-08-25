import { createServiceRoleClient } from "./supabase/server";

export type RegistrationScreeningRow = {
  user_id: string;
  registered_at: string;
  luma_confirmed_at: string | null;
  terms_accepted_at: string | null;
  user: { full_name: string | null; email: string } | null;
};

export async function listRegistrationsForEdition(
  hackathonId: string,
): Promise<RegistrationScreeningRow[]> {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathon_registrations")
    .select(
      "user_id, registered_at, luma_confirmed_at, terms_accepted_at, user:users(full_name, email)",
    )
    .eq("hackathon_id", hackathonId)
    .order("registered_at", { ascending: true });
  return (data as RegistrationScreeningRow[] | null) ?? [];
}

export type TeamOverviewRow = {
  id: string;
  name: string;
  leader_id: string;
  created_at: string;
  submission: { status: string; submitted_at: string | null } | null;
  acceptedMembers: number;
};

export async function listTeamsForEdition(hackathonId: string): Promise<TeamOverviewRow[]> {
  const supabase = await createServiceRoleClient();
  const [{ data: teams }, { data: members }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, leader_id, created_at, submissions(status, submitted_at)")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_members")
      .select("team_id")
      .eq("hackathon_id", hackathonId)
      .eq("status", "accepted"),
  ]);

  const counts = new Map<string, number>();
  for (const m of (members as { team_id: string }[] | null) ?? []) {
    counts.set(m.team_id, (counts.get(m.team_id) ?? 0) + 1);
  }

  type TeamRow = {
    id: string;
    name: string;
    leader_id: string;
    created_at: string;
    submissions:
      | { status: string; submitted_at: string | null }
      | { status: string; submitted_at: string | null }[]
      | null;
  };

  return ((teams as TeamRow[] | null) ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    leader_id: t.leader_id,
    created_at: t.created_at,
    submission: Array.isArray(t.submissions) ? t.submissions[0] : t.submissions,
    acceptedMembers: counts.get(t.id) ?? 0,
  }));
}
