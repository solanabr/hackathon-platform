"use server";

import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { bookingErrorMessage } from "@/lib/mentorship";

export type MentorshipActionResult = { ok: true } | { ok: false; error: string };

export async function bookMentorship(input: { mentorId: string }): Promise<MentorshipActionResult> {
  await requireUser();

  // User-scoped client on purpose: book_mentorship is SECURITY DEFINER and
  // keys every check off auth.uid(). The edition is resolved from the mentor
  // inside the function, so nothing here needs to be trusted.
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("book_mentorship", { p_mentor_id: input.mentorId });

  if (error) {
    logQueryError("mentorship.book", error);
    return { ok: false, error: bookingErrorMessage(error.message) };
  }

  return { ok: true };
}
