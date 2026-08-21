import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .order("starts_at", { ascending: false });
  const hackathons = (data as Hackathon[] | null) ?? [];

  const counts = await Promise.all(
    hackathons.map(async (h) => {
      const [registrations, teams] = await Promise.all([
        supabase
          .from("hackathon_registrations")
          .select("id", { count: "exact", head: true })
          .eq("hackathon_id", h.id),
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("hackathon_id", h.id),
      ]);
      return { id: h.id, registrations: registrations.count ?? 0, teams: teams.count ?? 0 };
    }),
  );

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-3xl font-bold">Administração</h1>
          <Link href="/admin/pessoas" className="btn-secondary px-5 py-2 text-sm">
            Pessoas
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          {hackathons.map((h) => {
            const c = counts.find((x) => x.id === h.id);
            return (
              <Card key={h.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge tone={h.status === "closed" ? "neutral" : "emerald"}>{h.status}</Badge>
                    <h2 className="mt-2 font-heading text-xl font-bold">{h.name}</h2>
                    <p className="text-sm text-muted">/{h.slug}</p>
                  </div>
                  <p className="text-sm text-muted">
                    {c?.registrations ?? 0} inscritos · {c?.teams ?? 0} times
                  </p>
                </div>
              </Card>
            );
          })}
          {hackathons.length === 0 && <p className="text-muted">Nenhum hackathon criado ainda.</p>}
        </div>
      </div>
    </div>
  );
}