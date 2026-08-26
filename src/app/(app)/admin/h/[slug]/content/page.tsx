import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { ContentRow, type AdminContentItem } from "@/components/admin/content-row";
import { NewContentForm } from "@/components/admin/new-content-form";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const supabase = await createServiceRoleClient();
  const data = unwrap(
    await supabase
      .from("hackathon_contents")
      .select("*")
      .eq("hackathon_id", hackathon.id)
      .order("position", { ascending: true }),
    "admin.content.list",
  );

  const all = (data as HackathonContent[] | null) ?? [];
  const contents = all.filter((c) => !c.deleted_at);
  const publishedCount = contents.filter((c) => c.published).length;

  const items: AdminContentItem[] = contents.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    youtubeId: c.youtube_id,
    fileUrl: c.external_url,
    published: c.published,
  }));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/admin/h/${slug}`} label={hackathon.name} />
          <AdminEditionNav slug={slug} />
        </div>

        <header>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Conteúdo da edição
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Conteúdos</h1>
          <p className="mt-2 text-muted">
            {hackathon.name} ·{" "}
            <span className="font-mono tabular-nums">
              {publishedCount} de {contents.length} publicados.
            </span>
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Cada conteúdo é um título, uma descrição e um anexo — vídeo, arquivo ou link. Só
            aparece para participantes inscritos depois de publicar.
          </p>
        </header>

        <NewContentForm hackathonId={hackathon.id} slug={slug} />

        {items.length === 0 ? (
          <EmptyState
            title="Nenhum conteúdo ainda"
            description="Adicione o primeiro item da trilha desta edição."
          />
        ) : (
          <ul className="space-y-4">
            {items.map((item, i) => (
              <ContentRow
                key={item.id}
                item={item}
                slug={slug}
                hackathonId={hackathon.id}
                isFirst={i === 0}
                isLast={i === items.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
