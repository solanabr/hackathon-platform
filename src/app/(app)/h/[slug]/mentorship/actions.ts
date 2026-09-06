"use server";

import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { track } from "@/lib/analytics-server";
import { bookingErrorMessage } from "@/lib/mentorship";

export type MentorshipActionResult = { ok: true } | { ok: false; error: string };

export async function bookMentorship(input: { mentorId: string }): Promise<MentorshipActionResult> {
  const state = await requireUser();

  // User-scoped client on purpose: book_mentorship is SECURITY DEFINER and
  // keys every check off auth.uid(). The edition is resolved from the mentor
  // inside the function, so nothing here needs to be trusted.
  const supabase = await createServerSupabaseClient();
  const { data: bookingId, error } = await supabase.rpc("book_mentorship", {
    p_mentor_id: input.mentorId,
  });

  if (error) {
    logQueryError("mentorship.book", error);
    return { ok: false, error: bookingErrorMessage(error.message) };
  }

  // Analytics context only. The tables carry no policies, so the read has to
  // use the service role; a failure here leaves the event without its edition.
  const admin = await createServiceRoleClient();
  const { data: booking, error: bookingError } = await admin
    .from("mentorship_bookings")
    .select("track, hackathons(slug)")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) logQueryError("mentorship.book.context", bookingError);
  const edition = Array.isArray(booking?.hackathons) ? booking?.hackathons[0] : booking?.hackathons;
  track(state.userId, "mentorship_booked", {
    edition: edition?.slug ?? null,
    track: booking?.track ?? null,
  });

  return { ok: true };
}
