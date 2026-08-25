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
          .select("id, role, hackathon_id, users(email), hackathons(name)")
          .order("granted_at", { ascending: true }),
        supabase.from("hackathons").select("id, name").order("starts_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }];

  type Joined = {
    id: string;
    role: "admin" | "judge";
    users: { email: string } | { email: string }[] | null;
    hackathons: { name: string } | { name: string }[] | null;
  };

  const rows = ((roles as Joined[] | null) ?? []).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    const hackathon = Array.isArray(r.hackathons) ? r.hackathons[0] : r.hackathons;
    return {
      id: r.id,
      role: r.role,
      email: user?.email ?? "-",
      hackathonName: hackathon?.name ?? null,
    };
  });

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/admin" label="Administração" />

        <h1 className="font-heading text-3xl font-bold">Pessoas</h1>
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