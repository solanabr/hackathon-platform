import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PillLink } from "@/components/ui/pill-link";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveRoleState } from "@/lib/roles";
import { createServiceRoleClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { EDITION_PHASE_LABEL, editionPhase } from "@/lib/hackathon";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const roles = await resolveRoleState();
  if (!roles) redirect("/auth");
  const scoped = !roles.isAdmin;
  if (scoped && roles.adminFor.length === 0) redirect("/");

  const ready = hasServiceRoleKey();
  const supabase = ready ? await createServiceRoleClient() : null;

  const { data, error } = supabase
    ? await supabase.from("hackathons").select("*").order("starts_at", { ascending: false })
    : { data: null, error: null };
  if (error) logQueryError("admin.index.hackathons", error);
  // An edition admin only sees the editions granted to them.
  const hackathons = ((data as Hackathon[] | null) ?? []).filter(
    (h) => !scoped || roles.adminFor.includes(h.id),
  );

  const counts = supabase
    ? await Promise.all(
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
      )
    : [];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {!ready && (
          <div className="mb-8 rounded-2xl border-2 border-yellow bg-yellow/15 p-5">
            <p className="font-heading font-bold">Falta a chave de service role</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Copie a <strong>service_role</strong> em Supabase, Project Settings, API para{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              no <code className="rounded bg-surface px-1.5 py-0.5 text-xs">.env.local</code> e
              reinicie o servidor. Sem ela esta página não lê dados de todos os times.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Operação
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold">Administração</h1>
          </div>
          {!scoped && (
            <Link href="/admin/people" className="btn-secondary min-h-11 px-5 py-2 text-sm">
              Pessoas
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-4">
          {hackathons.map((h) => {
            const c = counts.find((x) => x.id === h.id);
            return (
              <Card sticker key={h.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge tone={h.status === "closed" || h.status === "draft" ? "neutral" : "emerald"}>
                      {EDITION_PHASE_LABEL[editionPhase(h)]}
                    </Badge>
                    <h2 className="mt-2 font-heading text-xl font-bold">{h.name}</h2>
                    <p className="font-mono text-sm tabular-nums text-muted">/{h.slug}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-mono text-sm tabular-nums text-muted">
                      {c?.registrations ?? 0} inscritos · {c?.teams ?? 0} times
                    </p>
                    <PillLink
                      href={`/admin/h/${h.slug}`}
                      className="inline-flex min-h-11 shrink-0 items-center"
                    >
                      Editar
                    </PillLink>
                  </div>
                </div>
              </Card>
            );
          })}
          {hackathons.length === 0 && (
            <EmptyState
              title="Nenhuma edição ainda"
              description="Crie a primeira edição direto no banco — o formulário de criação ainda não existe."
            />
          )}
        </div>
      </div>
    </div>
  );
}