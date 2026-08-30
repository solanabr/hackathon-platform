import { createServerSupabaseClient } from "./supabase/server";
import { unwrap } from "./supabase/unwrap";
import type { TeamUpBoard } from "./team-up";

export async function getTeamUpBoard(hackathonId: string): Promise<TeamUpBoard> {
  const supabase = await createServerSupabaseClient();
  const data = unwrap(
    await supabase.rpc("team_up_board", { p_hackathon_id: hackathonId }),
    "teamUp.board",
  );
  const board = data as TeamUpBoard | null;
  return { teams: board?.teams ?? [], seekers: board?.seekers ?? [] };
}
