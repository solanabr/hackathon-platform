import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { Card } from "@/components/ui/card";
import {
  MentorTrackPanel,
  BookingsLedger,
  MentorshipEnabledToggle,
  type AdminMentor,
  type AdminBooking,
} from "@/components/admin/mentors-panel";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug, editionUsesTeams } from "@/lib/hackathon";
import { TRACKS } from "@/lib/mentorship";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { HackathonMentor, MentorTrack } from "@/types/db";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  track: MentorTrack;
  mentor_id: string;
  claimed_at: string;
  mentor: { name: string } | { name: string }[] | null;
  team: { name: string } | { name: string }[] | null;
  claimer: { full_name: string | null } | { full_name: string | null }[] | null;
};

function one<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminMentorshipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  // Service role: the tables carry no policies at all, so every read of them
  // outside the two RPCs has to come through here.
  const supabase = await createServiceRoleClient();
  const [mentorResult, bookingResult] = await Promise.all([
    supabase
      .from("hackathon_mentors")
      .select("*")
      .eq("hackathon_id", hackathon.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("mentorship_bookings")
      .select(
        "id, track, mentor_id, claimed_at, mentor:hackathon_mentors(name), team:teams(name), claimer:users!mentorship_bookings_claimed_by_fkey(full_name)",
      )
      .eq("hackathon_id", hackathon.id)
      .is("released_at", null)
      .order("claimed_at", { ascending: false }),
  ]);

  const mentorRows = (unwrap(mentorResult, "admin.mentorship.list") as HackathonMentor[] | null) ?? [];
  const bookingRows = (unwrap(bookingResult, "admin.mentorship.bookings") as BookingRow[] | null) ?? [];

  const bookings: AdminBooking[] = bookingRows.map((row) => ({
    id: row.id,
    track: row.track,
    teamName: one(row.team)?.name ?? "—",
    mentorName: one(row.mentor)?.name ?? "—",
    claimedByName: one(row.claimer)?.full_name ?? null,
    claimedAt: row.claimed_at,
  }));

  // Released bookings must not count, or releasing one to relieve an
  // overloaded mentor would make the number climb forever.
  const mentors: AdminMentor[] = mentorRows.map((mentor) => ({
    id: mentor.id,
    track: mentor.track,
    name: mentor.name,
    specialty: mentor.specialty,
    booking_url: mentor.booking_url,
    available: mentor.available,
    claimCount: bookingRows.filter((b) => b.mentor_id === mentor.id).length,
  }));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/admin/h/${hackathon.slug}`} label={hackathon.name} />
          <AdminEditionNav slug={slug} />
        </div>

        <header>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Mentorias da edição
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Mentores</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Cada time escolhe um mentor técnico e um de negócios. O link só aparece para o líder,
            depois que ele escolhe — o horário é marcado na agenda do mentor.
          </p>
        </header>

        <Card sticker className="p-6 sm:p-7">
          <MentorshipEnabledToggle
            slug={hackathon.slug}
            enabled={hackathon.mentorship_enabled}
            usesTeams={editionUsesTeams(hackathon)}
          />
        </Card>

        {TRACKS.map((track) => (
          <Card key={track} sticker className="p-6 sm:p-7">
            <MentorTrackPanel
              slug={hackathon.slug}
              track={track}
              mentors={mentors.filter((m) => m.track === track)}
            />
          </Card>
        ))}

        <Card sticker className="p-6 sm:p-7">
          <BookingsLedger slug={hackathon.slug} bookings={bookings} />
        </Card>
      </div>
    </div>
  );
}
