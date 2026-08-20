import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getActiveHackathon } from "@/lib/hackathon";
import {
  SubmissionCard,
  type Member,
  type Rating,
  type Row,
} from "@/components/admin/submission-card";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; rated?: string }>;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) notFound();

  const hackathon = await getActiveHackathon();
  if (!hackathon) notFound();

  const params = await searchParams;
  const statusFilter =
    params.status === "draft" || params.status === "submitted" ? params.status : null;
  const ratedFilter =
    params.rated === "unrated" || params.rated === "rated" ? params.rated : null;
  const search = (params.q ?? "").trim().toLowerCase();

  // Service-role client: this page must read across all teams, which RLS
  // would forbid. We're already gated to admin emails above.
  const admin = await createServiceRoleClient();

  const { data: teams } = await admin
    .from("teams")
    .select(
      `
      id, name, locked, hackathon_id,
      submissions(id, project_name, description, pitch_url, pitch_video_url, demo_video_url, github_url, twitter_url, website_url, image_path, status, submitted_at),
      team_members(invited_email, is_leader, status, users(email, full_name, github_url, twitter_url, linkedin_url, telegram_handle))
      `,
    )
    .eq("hackathon_id", hackathon.id)
    .order("name", { ascending: true });

  const submissionIds = (teams ?? [])
    .flatMap((t) => (Array.isArray(t.submissions) ? t.submissions : [t.submissions]))
    .map((s) => (s as { id?: string } | null)?.id)
    .filter((id): id is string => typeof id === "string");

  const { data: ratingsRaw } =
    submissionIds.length > 0
      ? await admin
          .from("submission_ratings")
          .select("submission_id, admin_id, grade, comment, updated_at")
          .in("submission_id", submissionIds)
      : { data: [] };

  const ratingAdminIds = [
    ...new Set((ratingsRaw ?? []).map((r) => r.admin_id as string)),
  ];
  const { data: ratingAdmins } =
    ratingAdminIds.length > 0
      ? await admin
          .from("users")
          .select("id, email, full_name")
          .in("id", ratingAdminIds)
      : { data: [] };

  type RatingRaw = {
    submission_id: string;
    admin_id: string;
    grade: number | null;
    comment: string | null;
    updated_at: string;
  };
  type AdminUser = { id: string; email: string; full_name: string | null };

  const adminById = new Map<string, AdminUser>(
    (ratingAdmins ?? []).map((u) => [u.id as string, u as AdminUser]),
  );

  const ratingsBySubmission = new Map<string, Rating[]>();
  for (const r of (ratingsRaw ?? []) as RatingRaw[]) {
    const u = adminById.get(r.admin_id);
    const arr = ratingsBySubmission.get(r.submission_id) ?? [];
    arr.push({
      admin_id: r.admin_id,
      admin_email: u?.email ?? "—",
      admin_full_name: u?.full_name ?? null,
      grade: r.grade,
      comment: r.comment,
      updated_at: r.updated_at,
    });
    ratingsBySubmission.set(r.submission_id, arr);
  }

  type SubRow = {
    id: string | null;
    project_name: string | null;
    description: string | null;
    pitch_url: string | null;
    pitch_video_url: string | null;
    demo_video_url: string | null;
    github_url: string | null;
    twitter_url: string | null;
    website_url: string | null;
    image_path: string | null;
    status: "draft" | "submitted";
    submitted_at: string | null;
  };
  type UserRow = {
    email: string;
    full_name: string | null;
    github_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    telegram_handle: string | null;
  };
  type MemberRow = {
    invited_email: string;
    is_leader: boolean;
    status: string;
    users: UserRow | UserRow[] | null;
  };

  const myAdminId = gate.state.userId;

  const rows: Row[] = (teams ?? []).map((t) => {
    const sub = Array.isArray(t.submissions)
      ? (t.submissions[0] as SubRow | null)
      : (t.submissions as SubRow | null);
    const mrows = (t.team_members ?? []) as MemberRow[];
    const members: Member[] = mrows
      .filter((m) => m.status === "accepted")
      .map((m) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          email: u?.email ?? m.invited_email,
          full_name: u?.full_name ?? null,
          is_leader: m.is_leader,
          github_url: u?.github_url ?? null,
          twitter_url: u?.twitter_url ?? null,
          linkedin_url: u?.linkedin_url ?? null,
          telegram_handle: u?.telegram_handle ?? null,
        };
      });

    const submissionId = sub?.id ?? null;
    const ratings = submissionId ? (ratingsBySubmission.get(submissionId) ?? []) : [];
    const myRating = ratings.find((r) => r.admin_id === myAdminId) ?? null;

    return {
      team_id: t.id,
      submission_id: submissionId,
      team_name: t.name,
      team_locked: t.locked,
      status: (sub?.status as "draft" | "submitted") ?? "draft",
      submitted_at: sub?.submitted_at ?? null,
      project_name: sub?.project_name ?? null,
      description: sub?.description ?? null,
      pitch_url: sub?.pitch_url ?? null,
      pitch_video_url: sub?.pitch_video_url ?? null,
      demo_video_url: sub?.demo_video_url ?? null,
      github_url: sub?.github_url ?? null,
      twitter_url: sub?.twitter_url ?? null,
      website_url: sub?.website_url ?? null,
      image_path: sub?.image_path ?? null,
      members,
      ratings,
      my_rating: myRating,
    };
  });

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (ratedFilter === "unrated" && r.ratings.length > 0) return false;
    if (ratedFilter === "rated" && r.ratings.length === 0) return false;
    if (search) {
      const hay =
        `${r.team_name} ${r.project_name ?? ""} ${r.members.map((m) => m.email + " " + (m.full_name ?? "")).join(" ")}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const counts = {
    total: rows.length,
    submitted: rows.filter((r) => r.status === "submitted").length,
    draft: rows.filter((r) => r.status === "draft").length,
    pending: rows.filter((r) => r.status === "submitted" && r.ratings.length === 0).length,
  };

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone="yellow">Painel da curadoria</Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Projetos submetidos</h1>
            <p className="mt-1 text-bh-muted">
              Visão somente-leitura de todos os times do hackathon.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Stat label="Total" value={counts.total} />
            <Stat label="Submetidos" value={counts.submitted} tone="emerald" />
            <Stat label="Por avaliar" value={counts.pending} tone="yellow" />
            <Stat label="Rascunhos" value={counts.draft} tone="neutral" />
          </div>
        </header>

        <Card className="p-5">
          <form className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por time, projeto, e-mail…"
              className="flex-1 rounded-xl border border-bh-border bg-bh-surface-2 px-4 py-2 text-sm focus:border-bh-violet focus:outline-none"
            />
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-xl border border-bh-border bg-bh-surface-2 px-3 py-2 text-sm focus:border-bh-violet focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="submitted">Apenas submetidos</option>
              <option value="draft">Apenas rascunhos</option>
            </select>
            <select
              name="rated"
              defaultValue={ratedFilter ?? ""}
              className="rounded-xl border border-bh-border bg-bh-surface-2 px-3 py-2 text-sm focus:border-bh-violet focus:outline-none"
            >
              <option value="">Todos os projetos</option>
              <option value="unrated">Não avaliados</option>
              <option value="rated">Avaliados</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-bh-violet px-4 py-2 text-sm font-medium text-white hover:bg-bh-violet-strong"
            >
              Aplicar
            </button>
          </form>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <SubmissionCard key={r.team_id} row={r} />
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-bh-muted">
              Nenhum time corresponde ao filtro.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "violet",
}: {
  label: string;
  value: number;
  tone?: "violet" | "emerald" | "neutral" | "yellow";
}) {
  const colors = {
    violet: "text-bh-text",
    emerald: "text-emerald-300",
    neutral: "text-bh-muted",
    yellow: "text-stbr-yellow",
  };
  return (
    <div className="rounded-xl border border-bh-border bg-bh-surface-2 px-4 py-2">
      <p className={`font-heading text-lg font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-bh-muted">{label}</p>
    </div>
  );
}
