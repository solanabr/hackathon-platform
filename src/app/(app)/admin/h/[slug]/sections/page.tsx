import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { SectionRow, AddSectionButton } from "@/components/admin/section-row";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { HackathonSection } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminSectionsPage({
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
  const { data } = await supabase
    .from("hackathon_sections")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  const sections = (data as HackathonSection[] | null) ?? [];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <BackLink href={`/admin/h/${slug}`} label={hackathon.name} />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
              Página da edição
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold">Seções</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              A página pública renderiza estas seções na ordem abaixo.{" "}
              <Link href={`/h/${slug}`} className="font-semibold text-emerald hover:underline">
                Ver a página →
              </Link>
            </p>
          </div>
          <AddSectionButton slug={slug} hackathonId={hackathon.id} />
        </div>

        {sections.length === 0 ? (
          <p className="mt-8 rounded-2xl border-2 border-dashed border-green-dark/25 p-8 text-center text-sm leading-relaxed text-muted">
            Nenhuma seção ainda — a página pública está usando os blocos padrão. Rode a migração
            00036 para materializá-los aqui, ou crie uma seção de texto.
          </p>
        ) : (
          <div className="mt-8 space-y-5">
            {sections.map((section) => (
              <SectionRow key={section.id} slug={slug} section={section} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
