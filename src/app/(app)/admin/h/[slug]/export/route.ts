import { NextResponse, type NextRequest } from "next/server";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { toCsv, type CsvCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

type UserCols = {
  id: string;
  full_name: string | null;
  email: string;
  whatsapp: string | null;
  headline: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  telegram_handle: string | null;
};
const USER_COLS = "id, full_name, email, whatsapp, headline, github_url, twitter_url, linkedin_url, telegram_handle";

type MemberRow = {
  team_id: string;
  user_id: string | null;
  invited_email: string;
  is_leader: boolean;
  user: UserCols | UserCols[] | null;
};
const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

async function usersCsv(hackathonId: string): Promise<CsvCell[][]> {
  const supabase = await createServiceRoleClient();
  const [regs, members] = await Promise.all([
    supabase
      .from("hackathon_registrations")
      .select(`user_id, registered_at, terms_accepted_at, luma_confirmed_at, user:users(${USER_COLS})`)
      .eq("hackathon_id", hackathonId)
      .order("registered_at", { ascending: true }),
    supabase
      .from("team_members")
      .select("user_id, teams!inner(name)")
      .eq("hackathon_id", hackathonId)
      .eq("status", "accepted"),
  ]);
  type Reg = {
    user_id: string;
    registered_at: string;
    terms_accepted_at: string | null;
    luma_confirmed_at: string | null;
    user: UserCols | UserCols[] | null;
  };
  const rows = (unwrap(regs, "admin.export.users") as unknown as Reg[] | null) ?? [];
  const teamByUser = new Map<string, string>();
  for (const m of (unwrap(members, "admin.export.users.teams") as unknown as Array<{
    user_id: string | null;
    teams: { name: string } | { name: string }[] | null;
  }> | null) ?? []) {
    const t = one(m.teams);
    if (m.user_id && t) teamByUser.set(m.user_id, t.name);
  }
  return rows.map((r) => {
    const u = one(r.user);
    return [
      u?.full_name,
      u?.email,
      u?.whatsapp,
      u?.headline,
      u?.github_url,
      u?.twitter_url,
      u?.linkedin_url,
      u?.telegram_handle,
      teamByUser.get(r.user_id),
      r.registered_at,
      r.terms_accepted_at,
      r.luma_confirmed_at,
    ];
  });
}
const USERS_HEADER = [
  "nome", "email", "whatsapp", "titulo", "github", "twitter", "linkedin", "telegram",
  "time", "inscrito_em", "termos_aceitos_em", "colosseum_confirmado_em",
];

async function teamsCsv(hackathonId: string): Promise<CsvCell[][]> {
  const supabase = await createServiceRoleClient();
  const [teams, members] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, name, created_at, is_finalist, placement, submissions(status, submitted_at, project_name, github_url, pitch_video_url, website_url)",
      )
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_members")
      .select(`team_id, user_id, invited_email, is_leader, user:users(${USER_COLS})`)
      .eq("hackathon_id", hackathonId)
      .eq("status", "accepted"),
  ]);
  type Sub = {
    status: string;
    submitted_at: string | null;
    project_name: string | null;
    github_url: string | null;
    pitch_video_url: string | null;
    website_url: string | null;
  };
  type TeamRow = {
    id: string;
    name: string;
    created_at: string;
    is_finalist: boolean;
    placement: number | null;
    submissions: Sub | Sub[] | null;
  };
  const teamRows = (unwrap(teams, "admin.export.teams") as unknown as TeamRow[] | null) ?? [];
  const byTeam = new Map<string, MemberRow[]>();
  for (const m of (unwrap(members, "admin.export.teams.members") as unknown as MemberRow[] | null) ?? []) {
    byTeam.set(m.team_id, [...(byTeam.get(m.team_id) ?? []), m]);
  }
  return teamRows.map((t) => {
    const ms = byTeam.get(t.id) ?? [];
    const leader = one(ms.find((m) => m.is_leader)?.user ?? null);
    const s = one(t.submissions);
    const emails = ms.map((m) => one(m.user)?.email ?? m.invited_email);
    return [
      t.name,
      leader?.full_name,
      leader?.email,
      leader?.whatsapp,
      ms.length,
      emails.join("; "),
      s?.status ?? "draft",
      s?.project_name,
      s?.submitted_at,
      s?.github_url,
      s?.pitch_video_url,
      s?.website_url,
      t.is_finalist,
      t.placement,
      t.created_at,
    ];
  });
}
const TEAMS_HEADER = [
  "time", "lider", "lider_email", "lider_whatsapp", "membros", "emails", "status",
  "projeto", "enviado_em", "github", "video", "site", "finalista", "colocacao", "criado_em",
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) {
    return NextResponse.json({ error: "Sem permissão." }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  const type = request.nextUrl.searchParams.get("type");
  if (type !== "users" && type !== "teams") {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  const hackathonId = gate.hackathon.id;
  const csv =
    type === "users"
      ? toCsv(USERS_HEADER, await usersCsv(hackathonId))
      : toCsv(TEAMS_HEADER, await teamsCsv(hackathonId));
  const day = new Date().toISOString().slice(0, 10);
  const name = `${slug}-${type === "users" ? "inscritos" : "times"}-${day}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
