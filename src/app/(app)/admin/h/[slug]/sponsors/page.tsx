import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { SponsorTierPanel } from "@/components/admin/sponsors-panel";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { resolveSponsors, groupByTier } from "@/lib/sponsors";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { HackathonSponsor } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  // Service role: RLS hides sponsor rows of draft editions, but their admin
  // still needs to compose the page before publishing.
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathon_sponsors")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("tier", { ascending: true })
    .order("position", { ascending: true });
  const grouped = groupByTier(await resolveSponsors((data as HackathonSponsor[] | null) ?? []));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <BackLink href={`/admin/h/${hackathon.slug}`} label={hackathon.name} />

        <header>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Página pública
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Marcas</h1>
          <p className="mt-1 text-sm text-muted">
            Logos que aparecem no rodapé da página da edição, na ordem definida aqui.
          </p>
        </header>

        <Card className="p-6 sm:p-7">
          <SponsorTierPanel
            slug={hackathon.slug}
            tier="realizacao"
            title="Realização"
            hint="Quem faz o hackathon acontecer. Aparecem maiores, na primeira fileira."
            sponsors={grouped.realizacao}
          />
        </Card>

        <Card className="p-6 sm:p-7">
          <SponsorTierPanel
            slug={hackathon.slug}
            tier="apoiador"
            title="Apoiadores"
            hint="Instituições e comunidades que apoiam a edição."
            sponsors={grouped.apoiador}
          />
        </Card>
      </div>
    </div>
  );
}
