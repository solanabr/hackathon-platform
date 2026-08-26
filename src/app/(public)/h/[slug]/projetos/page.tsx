import { notFound } from "next/navigation";
import { publicStorageUrl } from "@/lib/storage";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { getHackathonBySlug, isFinalistsVisible } from "@/lib/hackathon";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { DAY_MONTH_LONG, stripPeriods } from "@/lib/dates";
import type { PublicSubmission, PublicTeamMember } from "@/types/public";

export const dynamic = "force-dynamic";

const DAY = DAY_MONTH_LONG;
const clean = stripPeriods;

export default async function ProjectsGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("public_submissions")
    .select(
      "id, project_name, description, image_path, team_name, team_leader_id, team_leader_name, submitted_at, team_id",
    )
    .eq("hackathon_slug", slug)
    .order("submitted_at", { ascending: false });
  const projects = (data as PublicSubmission[] | null) ?? [];

  // A query error (e.g. the view is missing because migrations are pending)
  // must not read as "no projects yet" — surface it instead.
  if (error) {
    console.error(`[gallery ${slug}] public_submissions query failed:`, error);
  }

  // Member avatars come from the public_team_members view, keyed by team.
  // A missing view or an empty team degrades to no stack, not a broken card.
  const teamIds = [...new Set(projects.map((p) => p.team_id))];
  // Placements only need the edition, so they load alongside the avatars.
  const [membersResult, placementsResult] = await Promise.all([
    teamIds.length > 0
      ? supabase
          .from("public_team_members")
          .select("team_id, user_id, full_name, avatar_url")
          .in("team_id", teamIds)
      : Promise.resolve({ data: null, error: null }),
    isFinalistsVisible(hackathon)
      ? (async () => {
          const service = await createServiceRoleClient();
          return service
            .from("teams")
            .select("id, placement")
            .eq("hackathon_id", hackathon.id)
            .eq("is_finalist", true)
            .not("placement", "is", null);
        })()
      : Promise.resolve(null),
  ]);
  const { data: teamMembers, error: membersError } = membersResult;
  if (membersError) logQueryError("public.gallery.members", membersError);

  const membersByTeam = new Map<string, PublicTeamMember[]>();
  for (const m of (teamMembers as PublicTeamMember[] | null) ?? []) {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push(m);
    membersByTeam.set(m.team_id, list);
  }

  // Winners are placement on the team, not on the submission row, so the base
  // view can't carry them without leaking who made the cut pre-announcement.
  // Only when the same gate the landing uses says finalists are visible do we
  // read placements server-side and pin 1º/2º/3º to the top of the grid.
  const placementByTeam = new Map<string, number>();
  if (placementsResult) {
    const { data: finalists, error: placementsError } = placementsResult;
    // Winners degrade to an unpinned grid rather than an error banner.
    if (placementsError) logQueryError("public.gallery.placements", placementsError);
    for (const t of (finalists as Array<{ id: string; placement: number }> | null) ?? []) {
      placementByTeam.set(t.id, t.placement);
    }
  }

  const sorted = [...projects].sort((a, b) => {
    const pa = placementByTeam.get(a.team_id) ?? Number.POSITIVE_INFINITY;
    const pb = placementByTeam.get(b.team_id) ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime();
  });

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href={`/h/${slug}`} label={hackathon.name} />

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald">Projetos</p>
            <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              Projetos
            </h1>
            <p className="mt-3 max-w-xl text-muted">
              O que as equipes construíram no {hackathon.name}.
            </p>
          </div>
          <p className="font-mono text-sm font-bold tabular-nums text-emerald">
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
          </p>
        </header>

        {placementByTeam.size > 0 && (
          <section aria-label="Hall da fama" className="mt-10">
            <div className="relative overflow-hidden rounded-3xl bg-green-dark px-6 py-10 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-10">
              <div
                aria-hidden
                className="morth absolute -right-20 -top-24 h-72 w-72 bg-emerald/25"
                style={{
                  maskImage: "url(/brand/stbr/elements/morth-12.svg)",
                  WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)",
                  transform: "rotate(-12deg)",
                }}
              />
              <div className="relative">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-surface/60">
                  Hall da fama
                </p>
                <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-surface [font-stretch:118%] sm:text-4xl">
                  Vencedores
                </h2>
                <ol className="mt-7 grid gap-4 sm:grid-cols-3">
                  {sorted
                    .filter((p) => placementByTeam.has(p.team_id))
                    .slice(0, 3)
                    .map((p) => {
                      const place = placementByTeam.get(p.team_id) as number;
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/h/${slug}/projetos/${p.id}`}
                            className={`block h-full rounded-2xl border-2 p-5 transition-colors duration-200 ${
                              place === 1
                                ? "border-yellow bg-yellow/10 hover:bg-yellow/20"
                                : "border-surface/15 bg-surface/[0.04] hover:border-yellow/50"
                            }`}
                          >
                            <p className="font-heading text-2xl font-black uppercase tracking-tight text-yellow [font-stretch:112%]">
                              {place}º lugar
                            </p>
                            <p className="mt-2 font-heading text-lg font-bold leading-tight text-surface">
                              {p.project_name}
                            </p>
                            <p className="mt-1 text-sm text-surface/70">Time {p.team_name}</p>
                          </Link>
                        </li>
                      );
                    })}
                </ol>
              </div>
            </div>
          </section>
        )}

        {error ? (
          <Card className="mt-8 p-8">
            <p className="font-heading text-lg font-bold text-ink">
              Não foi possível carregar os projetos.
            </p>
            <p className="mt-1 text-sm text-muted">Tente novamente em instantes.</p>
          </Card>
        ) : projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState />
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => {
              const imageUrl = p.image_path
                ? publicStorageUrl("project-images", p.image_path)
                : null;
              const placement = placementByTeam.get(p.team_id);
              const members = [...(membersByTeam.get(p.team_id) ?? [])].sort((a, b) => {
                if (a.user_id === p.team_leader_id) return -1;
                if (b.user_id === p.team_leader_id) return 1;
                return 0;
              });
              return (
                <li key={p.id}>
                  <Link
                    href={`/h/${slug}/projetos/${p.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-emerald/50 hover:ring-2 hover:ring-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <div className="relative h-44 overflow-hidden bg-green-dark">
                      {placement !== undefined && (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-yellow px-3 py-1 font-mono text-sm font-bold tabular-nums text-green-dark">
                          {placement}º lugar
                        </span>
                      )}
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 font-heading text-xl font-bold text-surface">
                          {p.project_name}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-xl font-bold text-ink">
                          {p.project_name}
                        </h2>
                        <p className="mt-0.5 text-sm text-muted">
                          {p.team_name}
                          {p.team_leader_name ? ` · ${p.team_leader_name}` : ""}
                        </p>
                      </div>
                      {members.length > 0 && (
                        <div className="flex items-center">
                          {members.slice(0, 4).map((m, i) => (
                            <Avatar
                              key={m.user_id}
                              src={m.avatar_url}
                              name={m.full_name}
                              ring="ring-surface"
                              className={i === 0 ? "" : "-ml-2"}
                            />
                          ))}
                          {members.length > 4 && (
                            <span className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised font-mono text-xs font-bold tabular-nums text-muted ring-2 ring-surface">
                              +{members.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      {p.description && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                          {p.description}
                        </p>
                      )}
                      {p.submitted_at && (
                        <p className="text-xs text-muted">
                          Enviado em {clean(DAY.format(new Date(p.submitted_at)))}
                        </p>
                      )}
                      <span className="mt-auto text-sm font-semibold text-emerald">
                        Ver projeto →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
