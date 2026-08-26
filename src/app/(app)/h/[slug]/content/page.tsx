import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BackLink } from "@/components/ui/back-link";
import { PainelNav } from "@/components/edition/painel-nav";
import { SegmentedNav } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
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

const FILTERS: Array<{ key: string; label: string; kinds: string[] }> = [
  { key: "todos", label: "Tudo", kinds: [] },
  { key: "aulas", label: "Aulas e workshops", kinds: ["aula", "workshop", "mentoria"] },
  { key: "materiais", label: "Materiais", kinds: ["material"] },
  { key: "links", label: "Links", kinds: ["link"] },
];

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const { slug } = await params;
  const { f } = await searchParams;
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

  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const filtered =
    filter.kinds.length === 0 ? schedule : schedule.filter((s) => filter.kinds.includes(s.kind));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}/dashboard`} label="Painel" />
          <PainelNav slug={slug} />
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
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

          <SegmentedNav
            label="Filtrar conteúdos"
            items={FILTERS.map((opt) => ({
              key: opt.key,
              href: opt.key === "todos" ? `/h/${slug}/content` : `/h/${slug}/content?f=${opt.key}`,
              label: opt.label,
              active: filter.key === opt.key,
            }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Nada por aqui ainda"
            description="Os conteúdos desta edição ainda não foram publicados. Volte em breve."
          />
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {filtered.map((item) => {
              const row = available.get(item.id);
              const when = item.scheduled_at
                ? stripPeriods(WHEN.format(new Date(item.scheduled_at)))
                : null;
              const thumb = renderableThumbnail(row?.thumbnail_url)
                ? (row?.thumbnail_url as string)
                : row?.youtube_id
                  ? youtubeThumbnail(row.youtube_id)
                  : null;
              const external =
                !row?.youtube_id && row?.external_url ? row.external_url : null;
              const domain = external ? domainOf(external) : null;

              const card = (
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker transition-transform duration-200 hover:-translate-y-0.5">
                  {thumb && (
                    <div className="relative aspect-video overflow-hidden border-b-2 border-green-dark/15 bg-green-dark">
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {row?.youtube_id && (
                        <span
                          aria-hidden
                          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-green-dark/85 pl-1 text-xl text-surface transition-transform duration-200 group-hover:scale-110"
                        >
                          ▶
                        </span>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-dark">
                        {KIND_LABELS[item.kind] ?? item.kind}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {!thumb && `${KIND_LABELS[item.kind] ?? item.kind} · `}
                        {when ?? "sem data"}
                        {!thumb && domain && ` · ${domain}`}
                      </p>
                    </div>
                    <h2 className="mt-2 font-heading text-lg font-bold leading-tight">
                      {item.title}
                    </h2>
                    {item.speaker && (
                      <p className="mt-0.5 text-sm font-semibold text-emerald">{item.speaker}</p>
                    )}
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              );

              return (
                <li key={item.id} className="min-w-0">
                  {external ? (
                    <a href={external} target="_blank" rel="noreferrer" className="block h-full">
                      {card}
                    </a>
                  ) : (
                    <Link href={`/h/${slug}/content/${item.id}`} className="block h-full">
                      {card}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
