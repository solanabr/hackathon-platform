import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { getHackathonBySlug, isFinalistsVisible } from "@/lib/hackathon";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { PublicSubmission, PublicTeamMember } from "@/types/public";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

function clean(s: string): string {
  return s.replace(/\./g, "");
}

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
  const { data: teamMembers } =
    teamIds.length > 0
      ? await supabase
          .from("public_team_members")
          .select("team_id, user_id, full_name, avatar_url")
          .in("team_id", teamIds)
      : { data: null };

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
  if (isFinalistsVisible(hackathon)) {
    const service = await createServiceRoleClient();
    const { data: finalists } = await service
      .from("teams")
      .select("id, placement")
      .eq("hackathon_id", hackathon.id)
      .eq("is_finalist", true)
      .not("placement", "is", null);
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
                ? supabase.storage.from("project-images").getPublicUrl(p.image_path).data.publicUrl
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
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white-10 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-emerald/50 hover:ring-2 hover:ring-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
                        <div className="flex h-full items-center justify-center px-6 font-heading text-xl font-bold text-ink">
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
