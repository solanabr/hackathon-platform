import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { RoleManager } from "@/components/admin/role-manager";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient, hasServiceRoleKey } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const supabase = hasServiceRoleKey() ? await createServiceRoleClient() : null;

  const [{ data: roles }, { data: hackathons }] = supabase
    ? await Promise.all([
        supabase
          .from("platform_roles")
          // platform_roles has two FKs to users (user_id, granted_by), so a
          // bare users(email) embed is ambiguous and PostgREST refuses it.
          .select(
            "id, role, hackathon_id, users!platform_roles_user_id_fkey(email, full_name, avatar_url), hackathons(name)",
          )
          .order("granted_at", { ascending: true }),
        supabase.from("hackathons").select("id, name").order("starts_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }];

  type JoinedUser = { email: string; full_name: string | null; avatar_url: string | null };
  type Joined = {
    id: string;
    role: "admin" | "judge";
    users: JoinedUser | JoinedUser[] | null;
    hackathons: { name: string } | { name: string }[] | null;
  };

  const rows = ((roles as Joined[] | null) ?? []).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    const hackathon = Array.isArray(r.hackathons) ? r.hackathons[0] : r.hackathons;
    return {
      id: r.id,
      role: r.role,
      email: user?.email ?? "-",
      name: user?.full_name ?? null,
      avatarUrl: user?.avatar_url ?? null,
      hackathonName: hackathon?.name ?? null,
    };
  });

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <BackLink href="/admin" label="Administração" />

        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
          Operação
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold">Pessoas</h1>
        <p className="mt-2 text-muted">
          Admins enxergam tudo. Jurados só votam no hackathon em que foram indicados.
        </p>
        <div className="mt-8">
          <RoleManager rows={rows} hackathons={(hackathons as { id: string; name: string }[]) ?? []} />
        </div>
      </div>
    </div>
  );
}