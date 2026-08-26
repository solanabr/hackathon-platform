import Link from "next/link";
import Image from "next/image";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileCard } from "@/components/profile/profile-card";
import { requireUser } from "@/lib/user-state";
import { editionStage, isFinalistsVisible } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { DAY_MONTH, stripPeriods } from "@/lib/dates";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const clean = stripPeriods;

type Participation = {
  hackathon: Hackathon;
  coverUrl: string | null;
  teamName: string | null;
  submitted: boolean;
  isFinalist: boolean;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const state = await requireUser();
  const profile = state.profile;
  const supabase = await createServerSupabaseClient();

  const [regsResult, membershipsResult] = await Promise.all([
    supabase
      .from("hackathon_registrations")
      .select("hackathon_id, registered_at, hackathons(*)")
      .eq("user_id", state.userId)
      .order("registered_at", { ascending: false }),
    supabase
      .from("team_members")
      .select("team_id, teams(id, name, hackathon_id, is_finalist)")
      .eq("user_id", state.userId)
      .eq("status", "accepted"),
  ]);
  const regs = unwrap(regsResult, "account.registrations");

  type RegRow = { hackathon_id: string; hackathons: Hackathon | Hackathon[] | null };
  const rows = (regs as unknown as RegRow[] | null) ?? [];

  const memberships = unwrap(membershipsResult, "account.memberships");

  type TeamRow = {
    teams:
      | { id: string; name: string; hackathon_id: string; is_finalist: boolean }
      | { id: string; name: string; hackathon_id: string; is_finalist: boolean }[]
      | null;
  };
  const teamByHackathon = new Map<
    string,
    { id: string; name: string; is_finalist: boolean }
  >();
  for (const m of (memberships as unknown as TeamRow[] | null) ?? []) {
    const t = Array.isArray(m.teams) ? m.teams[0] : m.teams;
    if (t) teamByHackathon.set(t.hackathon_id, { id: t.id, name: t.name, is_finalist: t.is_finalist });
  }

  const teamIds = [...teamByHackathon.values()].map((t) => t.id);
  const subs = teamIds.length
    ? unwrap(
        await supabase.from("submissions").select("team_id, status").in("team_id", teamIds),
        "account.submissions",
      )
    : [];
  const submittedTeams = new Set(
    ((subs as { team_id: string; status: string }[] | null) ?? [])
      .filter((s) => s.status === "submitted")
      .map((s) => s.team_id),
  );

  const participations: Participation[] = rows
    .map((r) => {
      const h = Array.isArray(r.hackathons) ? r.hackathons[0] : r.hackathons;
      if (!h || h.status === "draft") return null;
      const team = teamByHackathon.get(h.id);
      const coverUrl = h.cover_image_path
        ? h.cover_image_path.startsWith("/")
          ? h.cover_image_path
          : supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data
              .publicUrl
        : null;
      return {
        hackathon: h,
        coverUrl,
        teamName: team?.name ?? null,
        submitted: team ? submittedTeams.has(team.id) : false,
        isFinalist: team?.is_finalist ?? false,
      };
    })
    .filter(Boolean) as Participation[];

  const active = participations.filter((p) => editionStage(p.hackathon) !== "finished");
  const past = participations.filter((p) => editionStage(p.hackathon) === "finished");

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <BackLink href="/" label="Hackathons" />

        <ProfileCard userId={state.userId} email={state.email} profile={profile} next={next} />

        <section aria-label="Meus hackathons" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                Participações
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold">Meus hackathons</h2>
            </div>
            {participations.length > 0 && (
              <p className="font-mono text-xs tabular-nums text-muted">
                {participations.length} {participations.length === 1 ? "inscrição" : "inscrições"}
              </p>
            )}
          </div>

          {participations.length === 0 ? (
            <EmptyState
              title="Você ainda não se inscreveu em nenhum hackathon"
              description="Quando participar, seus hackathons e times aparecem aqui."
              cta={
                <Link href="/" className="font-semibold text-emerald underline-offset-4 hover:underline">
                  Ver os abertos
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {[...active, ...past].map((p) => {
                const finished = editionStage(p.hackathon) === "finished";
                const start = new Date(p.hackathon.starts_at);
                const end = new Date(
                  p.hackathon.presential_at ?? p.hackathon.submission_deadline_at,
                );
                return (
                  <Card
                    key={p.hackathon.id}
                    sticker
                    className="overflow-hidden transition-shadow hover:ring-2 hover:ring-yellow/50"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative aspect-[2/1] w-full shrink-0 border-b-2 border-green-dark bg-green-dark sm:aspect-auto sm:w-44 sm:border-b-0 sm:border-r-2">
                        {p.coverUrl ? (
                          <Image
                            src={p.coverUrl}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, 176px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-28 items-center justify-center font-heading text-4xl font-black uppercase text-surface/80">
                            {p.hackathon.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-heading text-lg font-bold">
                              {p.hackathon.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-muted">
                              {clean(DAY_MONTH.format(start))} a {clean(DAY_MONTH.format(end))}
                              {p.hackathon.location_city
                                ? ` · ${p.hackathon.location_city}`
                                : ""}
                            </p>
                          </div>
                          {p.isFinalist && isFinalistsVisible(p.hackathon) ? (
                            <StatusChip tone="ok">finalista</StatusChip>
                          ) : p.submitted ? (
                            <StatusChip tone="ok">submetido</StatusChip>
                          ) : finished ? (
                            <StatusChip tone="muted">encerrado</StatusChip>
                          ) : (
                            <StatusChip tone="ok">inscrito</StatusChip>
                          )}
                        </div>

                        <p className="mt-3 text-sm">
                          <span className="text-muted">Time</span>{" "}
                          <span className="font-semibold">{p.teamName ?? "sem time"}</span>
                          <span className="text-muted"> · Projeto</span>{" "}
                          <span className="font-semibold">
                            {p.submitted ? "enviado" : finished ? "não enviado" : "em edição"}
                          </span>
                        </p>

                        {!finished && (
                          <Link
                            href={`/h/${p.hackathon.slug}/dashboard`}
                            className="btn-primary mt-4 px-5 py-2 text-sm"
                          >
                            Abrir painel
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
