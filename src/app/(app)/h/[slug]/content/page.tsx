import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { PainelNav } from "@/components/edition/painel-nav";
import { ContentList, type ContentCard } from "@/components/edition/content-list";
import { getHackathonBySlug } from "@/lib/hackathon";
import { renderableThumbnail, youtubeThumbnail } from "@/lib/content";
import { KIND_LABELS } from "@/lib/content-fields";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DAY_MONTH_TIME, stripPeriods } from "@/lib/dates";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const WHEN = DAY_MONTH_TIME;

type ScheduleRow = Pick<
  HackathonContent,
  "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "position"
>;

type AvailableRow = Pick<
  HackathonContent,
  "id" | "kind" | "youtube_id" | "external_url" | "thumbnail_url"
>;

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default async function ContentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const supabase = await createServerSupabaseClient();

  // Only published items are listed — RLS keeps the unpublished ones out of
  // the second query, and anything absent from it stays off the page.
  const [{ data: scheduleData }, { data: availableData }] = await Promise.all([
    supabase
      .from("public_schedule")
      .select("id, kind, title, speaker, description, scheduled_at, position")
      .eq("hackathon_id", hackathon.id)
      .order("position", { ascending: true }),
    supabase
      .from("hackathon_contents")
      .select("id, kind, youtube_id, external_url, thumbnail_url")
      .eq("hackathon_id", hackathon.id),
  ]);

  const availableRows = (availableData as AvailableRow[] | null) ?? [];
  const available = new Map(availableRows.map((c) => [c.id, c] as const));
  const schedule = ((scheduleData as ScheduleRow[] | null) ?? []).filter(
    (s) => s.kind !== "evento" && available.has(s.id),
  );

  const cards: ContentCard[] = schedule.map((item) => {
    const row = available.get(item.id);
    const thumb = renderableThumbnail(row?.thumbnail_url)
      ? (row?.thumbnail_url as string)
      : row?.youtube_id
        ? youtubeThumbnail(row.youtube_id)
        : null;
    const external = !row?.youtube_id && row?.external_url ? row.external_url : null;
    return {
      id: item.id,
      kind: item.kind,
      kindLabel: KIND_LABELS[item.kind] ?? item.kind,
      title: item.title,
      speaker: item.speaker,
      description: item.description,
      when: item.scheduled_at ? stripPeriods(WHEN.format(new Date(item.scheduled_at))) : null,
      thumb,
      isYoutube: Boolean(row?.youtube_id),
      external,
      domain: external ? domainOf(external) : null,
      href: `/h/${slug}/content/${item.id}`,
    };
  });

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}/dashboard`} label="Painel" />
          <PainelNav slug={slug} />
        </div>

        <ContentList items={cards}>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Trilha
            </p>
            <h1 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-4xl">
              Conteúdos
            </h1>
            <p className="mt-2 text-sm text-muted">
              As gravações entram depois de cada encontro.
            </p>
          </div>
        </ContentList>
      </div>
    </div>
  );
}
