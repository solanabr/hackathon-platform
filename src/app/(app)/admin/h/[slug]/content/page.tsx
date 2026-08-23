import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { ContentRow, type AdminContentItem } from "@/components/admin/content-row";
import { NewContentForm } from "@/components/admin/new-content-form";
import { toLocalInput } from "@/lib/edition-fields";
import { requireAdmin } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminContentPage({
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
  const { data } = await supabase
    .from("hackathon_contents")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("position", { ascending: true });

  const contents = (data as HackathonContent[] | null) ?? [];
  const publishedCount = contents.filter((c) => c.published).length;

  const items: AdminContentItem[] = contents.map((c) => ({
    id: c.id,
    kind: c.kind,
    title: c.title,
    speaker: c.speaker,
    description: c.description,
    location: c.location,
    duration_minutes: c.duration_minutes,
    scheduledAtLocal: toLocalInput(c.scheduled_at),
    scheduledLabel: c.scheduled_at
      ? WHEN.format(new Date(c.scheduled_at)).replace(/\./g, "")
      : "sem data",
    youtubeId: c.youtube_id,
    fileUrl: c.external_url,
    published: c.published,
  }));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <BackLink href="/admin" label="Administração" />

        <header>
          <h1 className="font-heading text-3xl font-bold">Conteúdos</h1>
          <p className="mt-2 text-muted">
            {hackathon.name} · {publishedCount} de {contents.length} publicados.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A data e o título aparecem na página pública desde já. O vídeo só fica visível para
            participantes inscritos depois de publicar.
          </p>
        </header>

        <NewContentForm hackathonId={hackathon.id} slug={slug} />

        {items.length === 0 ? (
          <p className="text-muted">Nenhum conteúdo cadastrado para esta edição.</p>
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
