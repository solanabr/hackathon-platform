import { createServerSupabaseClient } from "./supabase/server";
import { unwrap } from "./supabase/unwrap";
import type { BoardMentor, BoardBooking, MentorshipBoard } from "./mentorship";

type RawBoard = {
  has_team: boolean;
  is_leader: boolean;
  mentors: BoardMentor[] | null;
  bookings: BoardBooking[] | null;
};

export async function getMentorshipBoard(hackathonId: string): Promise<MentorshipBoard> {
  const supabase = await createServerSupabaseClient();
  const data = unwrap(
    await supabase.rpc("mentorship_board", { p_hackathon_id: hackathonId }),
    "mentorship.board",
  );
  const raw = data as RawBoard | null;
  return {
    hasTeam: Boolean(raw?.has_team),
    isLeader: Boolean(raw?.is_leader),
    mentors: raw?.mentors ?? [],
    bookings: raw?.bookings ?? [],
  };
}
