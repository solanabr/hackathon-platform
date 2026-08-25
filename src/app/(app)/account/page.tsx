import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/user-state";
import { editionStage, isFinalistsVisible } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function clean(s: string): string {
  return s.replace(/\./g, "");
}

type Participation = {
  hackathon: Hackathon;
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

  const { data: regs } = await supabase
    .from("hackathon_registrations")
    .select("hackathon_id, registered_at, hackathons(*)")
    .eq("user_id", state.userId)
    .order("registered_at", { ascending: false });

  type RegRow = { hackathon_id: string; hackathons: Hackathon | Hackathon[] | null };
  const rows = (regs as RegRow[] | null) ?? [];

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, teams(id, name, hackathon_id, is_finalist), submissions:teams(id)")
    .eq("user_id", state.userId)
    .eq("status", "accepted");

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
  for (const m of (memberships as TeamRow[] | null) ?? []) {
    const t = Array.isArray(m.teams) ? m.teams[0] : m.teams;
    if (t) teamByHackathon.set(t.hackathon_id, { id: t.id, name: t.name, is_finalist: t.is_finalist });
  }

  const teamIds = [...teamByHackathon.values()].map((t) => t.id);
  const { data: subs } = teamIds.length
    ? await supabase.from("submissions").select("team_id, status").in("team_id", teamIds)
    : { data: [] };
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
      return {
        hackathon: h,
        teamName: team?.name ?? null,
        submitted: team ? submittedTeams.has(team.id) : false,
        isFinalist: team?.is_finalist ?? false,
      };
    })
    .filter(Boolean) as Participation[];

  const active = participations.filter((p) => editionStage(p.hackathon) !== "finished");
  const past = participations.filter((p) => editionStage(p.hackathon) === "finished");

  const socials = [
    { href: profile?.github_url, label: "GitHub" },
    { href: profile?.twitter_url, label: "X" },
    { href: profile?.linkedin_url, label: "LinkedIn" },
  ].filter((s) => s.href) as Array<{ href: string; label: string }>;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <BackLink href="/" label="Hackathons" />

        <Card className="p-6 sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">PERFIL</p>
          <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-start">
            <AvatarUpload
              userId={state.userId}
              currentUrl={profile?.avatar_url ?? null}
              name={profile?.full_name ?? state.email}
            />

            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-3xl font-bold">
                {profile?.full_name ?? "Sua conta"}
              </h1>
              {profile?.headline && <p className="mt-1 text-muted">{profile.headline}</p>}
              <p className="mt-2 font-mono text-sm text-muted">{state.email}</p>

              {profile?.bio && (
                <p className="mt-4 max-w-xl leading-relaxed text-ink">{profile.bio}</p>
              )}

              {socials.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-green-dark/15 px-3 py-1 text-sm font-semibold text-muted transition-colors hover:border-emerald/40 hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <section aria-label="Meus hackathons" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">PARTICIPAÇÕES</p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              {[...active, ...past].map((p) => {
                const finished = editionStage(p.hackathon) === "finished";
                return (
                  <Card
                    key={p.hackathon.id}
                    className="p-6 transition-shadow hover:ring-2 hover:ring-yellow/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-heading text-lg font-bold">
                          {p.hackathon.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">
                          {clean(DAY.format(new Date(p.hackathon.starts_at)))}
                          {p.hackathon.location_city ? ` · ${p.hackathon.location_city}` : ""}
                        </p>
                      </div>
                      {p.isFinalist && isFinalistsVisible(p.hackathon) ? (
                        <StatusChip tone="ok">finalista</StatusChip>
                      ) : finished ? (
                        <StatusChip tone="muted">encerrado</StatusChip>
                      ) : (
                        <StatusChip tone="ok">inscrito</StatusChip>
                      )}
                    </div>

                    {!finished && (
                      <p className="mt-4 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                        Você está inscrito
                      </p>
                    )}

                    <dl className="mt-4 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="w-16 shrink-0 text-muted">Time</dt>
                        <dd className="min-w-0 truncate font-semibold">
                          {p.teamName ?? "sem time"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-16 shrink-0 text-muted">Projeto</dt>
                        <dd className="font-semibold">
                          {p.submitted ? "enviado" : finished ? "não enviado" : "em edição"}
                        </dd>
                      </div>
                    </dl>

                    {!finished && (
                      <Link
                        href={`/h/${p.hackathon.slug}/dashboard`}
                        className="btn-primary mt-5 px-5 py-2 text-sm"
                      >
                        Abrir painel
                      </Link>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Editar perfil">
          <Card className="p-6 sm:p-8">
            <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">CONTA</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Editar perfil</h2>
            <p className="mt-1 text-sm text-muted">
              Essas informações aparecem para o seu time e para a organização.
            </p>
            <div className="mt-6">
              <ProfileForm profile={profile} next={next} />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
