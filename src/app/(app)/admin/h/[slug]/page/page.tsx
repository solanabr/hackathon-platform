import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { PageEditor } from "@/components/admin/page-editor";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { DEFAULT_PAGE_MD } from "@/lib/page-template";

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
            Um documento em markdown. Títulos com ## viram âncoras; os blocos cercados puxam os
            dados da edição.
          </p>
        </header>

        <PageEditor
          slug={hackathon.slug}
          initialDoc={hackathon.page_md ?? DEFAULT_PAGE_MD}
          savedDoc={hackathon.page_md ?? ""}
        />
      </div>
    </div>
  );
}
