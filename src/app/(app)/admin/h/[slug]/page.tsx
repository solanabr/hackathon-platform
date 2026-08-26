import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BackLink } from "@/components/ui/back-link";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { Card } from "@/components/ui/card";
import { EditionForm } from "@/components/admin/edition-form";
import { CoverUpload } from "@/components/admin/cover-upload";
import { LifecycleControl } from "@/components/admin/lifecycle-control";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { TeamsTable } from "@/components/admin/teams-table";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug, isSubmissionWindowOpen, ratingRound } from "@/lib/hackathon";
import {
  listRegistrationsForEdition,
  listTeamsForEdition,
} from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError, unwrap } from "@/lib/supabase/unwrap";
import { DATE_TIME_NUMERIC } from "@/lib/dates";

const SUBMITTED_AT = DATE_TIME_NUMERIC;

export const dynamic = "force-dynamic";

export default async function AdminEditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const supabase = await createServiceRoleClient();
  const coverUrl = hackathon.cover_image_path
    ? hackathon.cover_image_path.startsWith("/")
      ? hackathon.cover_image_path
      : supabase.storage.from("hackathon-covers").getPublicUrl(hackathon.cover_image_path).data
          .publicUrl
    : null;

  const [registrations, teams] = await Promise.all([
    listRegistrationsForEdition(hackathon.id),
    listTeamsForEdition(hackathon.id),
  ]);
  const submittedTeams = teams.filter(
    (t) => t.submission?.status === "submitted",
  ).length;

  const round = ratingRound(hackathon);
  const submittedRows = unwrap(
    await supabase
      .from("submissions")
      .select("id, teams!inner(hackathon_id)")
      .eq("teams.hackathon_id", hackathon.id)
      .eq("status", "submitted"),
    "admin.overview.submitted",
  );
  const submittedIds = ((submittedRows as { id: string }[] | null) ?? []).map((s) => s.id);

  const [judgeRoles, assignmentRows, ratingCount] = await Promise.all([
    supabase
      .from("platform_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "judge")
      .eq("hackathon_id", hackathon.id),
    submittedIds.length
      ? supabase
          .from("submission_assignments")
          .select("submission_id")
          .eq("round", round)
          .in("submission_id", submittedIds)
      : Promise.resolve({ data: [] as { submission_id: string }[] }),
    submittedIds.length
      ? supabase
          .from("submission_ratings")
          .select("id", { count: "exact", head: true })
          .eq("round", round)
          .in("submission_id", submittedIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const judgeCount = judgeRoles.count ?? 0;
  const perSubmission = new Map<string, number>();
  for (const row of (assignmentRows.data as { submission_id: string }[] | null) ?? []) {
    perSubmission.set(row.submission_id, (perSubmission.get(row.submission_id) ?? 0) + 1);
  }
  const fullyAssigned = submittedIds.filter((id) => (perSubmission.get(id) ?? 0) >= 2).length;
  const ratingsIn = ratingCount.count ?? 0;

  const windowOpen = isSubmissionWindowOpen(hackathon);
  const roundLabel = round === "triagem" ? "triagem" : "banca final";

  const { data: acceptedMembers, error: acceptedMembersError } = await supabase
    .from("team_members")
    .select("user_id, teams!inner(name)")
    .eq("hackathon_id", hackathon.id)
    .eq("status", "accepted");
  if (acceptedMembersError) logQueryError("admin.overview.acceptedMembers", acceptedMembersError);
  const teamNameByUser = new Map<string, string>();
  for (const m of (acceptedMembers as unknown as Array<{
    user_id: string | null;
    teams: { name: string } | { name: string }[] | null;
  }> | null) ?? []) {
    const t = Array.isArray(m.teams) ? m.teams[0] : m.teams;
    if (m.user_id && t) teamNameByUser.set(m.user_id, t.name);
  }

  const registrationRows = registrations.map((r) => ({
    userId: r.user_id,
    name: r.user?.full_name ?? null,
    email: r.user?.email ?? null,
    teamName: teamNameByUser.get(r.user_id) ?? null,
  }));
  const teamRows = teams.map((t) => ({
    id: t.id,
    name: t.name,
    acceptedMembers: t.acceptedMembers,
    status: t.submission?.status ?? null,
    submittedAtLabel: t.submission?.submitted_at
      ? SUBMITTED_AT.format(new Date(t.submission.submitted_at))
      : null,
  }));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href="/admin" label="Administração" />
          <AdminEditionNav slug={slug} />
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Operação
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold">{hackathon.name}</h1>
            <p className="mt-1 font-mono text-sm tabular-nums text-muted">/{hackathon.slug}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/h/${hackathon.slug}`} className="btn-secondary px-5 py-2 text-sm">
              Ver página
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Janela de submissão
            </p>
            <p className="mt-1 font-heading text-xl font-bold">
              {windowOpen ? "Aberta" : "Encerrada"}
            </p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
              {windowOpen ? "até " : "desde "}
              {SUBMITTED_AT.format(new Date(hackathon.submission_deadline_at))}
            </p>
          </div>
          <div className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Times
            </p>
            <p className="mt-1 font-heading text-xl font-bold tabular-nums">
              {submittedTeams} de {teams.length}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted">submetidos</p>
          </div>
          <div className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Jurados · {roundLabel}
            </p>
            <p className="mt-1 font-heading text-xl font-bold tabular-nums">{judgeCount}</p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
              projetos com dupla completa: {fullyAssigned} de {submittedIds.length}
            </p>
          </div>
          <div className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Notas · {roundLabel}
            </p>
            <p className="mt-1 font-heading text-xl font-bold tabular-nums">{ratingsIn}</p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
              de {submittedIds.length * 2} esperadas na rodada
            </p>
          </div>
        </div>

        <LifecycleControl
          slug={hackathon.slug}
          status={hackathon.status}
          finalistsAnnouncedAt={hackathon.finalists_announced_at}
        />

        <Card sticker className="p-6 sm:p-7">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Identidade
          </p>
          <h2 className="mt-1 font-heading text-lg font-bold">Arte da edição</h2>
          <p className="mt-1 text-sm text-muted">
            Aparece no card da home e no topo da página pública. Quadrada funciona melhor.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            {coverUrl && (
              <Image
                src={coverUrl}
                alt=""
                width={120}
                height={120}
                className="h-28 w-28 rounded-2xl border-2 border-green-dark/15 object-cover"
              />
            )}
            <CoverUpload hackathonId={hackathon.id} slug={hackathon.slug} />
          </div>
        </Card>

        <EditionForm hackathon={hackathon} />

        <Card sticker className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                Screening
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">Inscrições</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono tabular-nums">{registrations.length}</span>{" "}
                {registrations.length === 1 ? "inscrição" : "inscrições"}
              </p>
            </div>
          </div>
          {registrations.length === 0 ? (
            <p className="mt-5 font-mono text-sm text-muted">Nenhuma inscrição ainda.</p>
          ) : (
            <RegistrationsTable rows={registrationRows} />
          )}
        </Card>

        <Card sticker className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                Submissões
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">Times e submissões</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono tabular-nums">{teams.length}</span> times ·
                <span className="font-mono tabular-nums"> {submittedTeams}</span> submetidos
              </p>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="mt-5 font-mono text-sm text-muted">Nenhum time formado ainda.</p>
          ) : (
            <TeamsTable rows={teamRows} />
          )}
        </Card>

      </div>
    </div>
  );
}
