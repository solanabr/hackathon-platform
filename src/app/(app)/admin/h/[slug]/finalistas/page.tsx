import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { FinalistPicker } from "@/components/admin/finalist-picker";
import { requireAdmin } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { finalistCandidates, type FinalistRow } from "@/lib/finalists";

export const dynamic = "force-dynamic";

export default async function AdminFinalistsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const supabase = await createServiceRoleClient();
  // `!left` keeps submitted-but-unrated projects in the picker: filtering an
  // embedded resource would otherwise turn the join into an INNER one and drop
  // rows with no triagem ratings yet.
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, project_name, teams!inner(id, name, is_finalist, finalist_notified_at, placement), submission_ratings!left(grade)",
    )
    .eq("teams.hackathon_id", hackathon.id)
    .eq("status", "submitted")
    .eq("submission_ratings.round", "triagem");

  const candidates = finalistCandidates(data as FinalistRow[] | null);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <BackLink href="/admin" label="Administração" />

        <header>
          <h1 className="font-heading text-3xl font-bold">Finalistas</h1>
          <p className="mt-2 text-muted">{hackathon.name} · média da triagem.</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A média da triagem decide a classificação (regulamento 7.1). Marque as equipes que
            avançam e notifique os líderes por e-mail.
          </p>
        </header>

        {candidates.length === 0 ? (
          <p className="text-muted">Nenhum projeto submetido ainda.</p>
        ) : (
          <FinalistPicker candidates={candidates} slug={slug} hackathonId={hackathon.id} />
        )}
      </div>
    </div>
  );
}
