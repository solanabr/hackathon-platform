export type PhaseBounds = { startsAt: number; endsAt: number };

export type PhaseState = "todo" | "current" | "done";

/**
 * Pure phase math, kept out of lib/hackathon so client components (the
 * timeline, and the page editor's live preview that renders it) can import it
 * without dragging the server Supabase client — and next/headers — into the
 * browser bundle.
 */
export function phaseState(bounds: PhaseBounds, now: number): PhaseState {
  if (now < bounds.startsAt) return "todo";
  if (now < bounds.endsAt) return "current";
  return "done";
}
