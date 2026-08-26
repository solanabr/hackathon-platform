import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { PageEditor } from "@/components/admin/page-editor";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug, isFinalistsVisible } from "@/lib/hackathon";
import { DEFAULT_PAGE_MD } from "@/lib/page-template";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPageEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  let finalists: Array<{ teamId: string; teamName: string; placement: number | null }> = [];
  if (isFinalistsVisible(hackathon)) {
    const sr = await createServiceRoleClient();
    const { data: rows } = await sr
      .from("teams")
      .select("id, name, placement")
      .eq("hackathon_id", hackathon.id)
      .eq("is_finalist", true)
      .order("placement", { ascending: true, nullsFirst: false });
    finalists = ((rows as Array<{ id: string; name: string; placement: number | null }> | null) ?? [])
      .map((r) => ({ teamId: r.id, teamName: r.name, placement: r.placement }));
  }

  // The sponsor band is not part of the document, so it stays out of the
  // editor preview — it is managed and previewed in Marcas.
  const ctx = {
    sponsors: { realizacao: [], apoiador: [] },
    finalists,
    finalistsVisible: isFinalistsVisible(hackathon),
  };

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/admin/h/${hackathon.slug}`} label={hackathon.name} />
          <AdminEditionNav slug={slug} />
        </div>

        <header>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Página pública
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Editor da página</h1>
          <p className="mt-1 text-sm text-muted">
            Um documento em markdown puro. Títulos com ## viram âncoras; as seções ao vivo
            entram sozinhas depois do texto.
          </p>
        </header>

        <PageEditor
          slug={hackathon.slug}
          initialDoc={hackathon.page_md ?? DEFAULT_PAGE_MD}
          savedDoc={hackathon.page_md ?? ""}
          ctx={ctx}
        />
      </div>
    </div>
  );
}
