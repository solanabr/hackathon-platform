import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { EditionForm } from "@/components/admin/edition-form";
import { CoverUpload } from "@/components/admin/cover-upload";
import { requireAdmin } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEditionPage({
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
  const coverUrl = hackathon.cover_image_path
    ? hackathon.cover_image_path.startsWith("/")
      ? hackathon.cover_image_path
      : supabase.storage.from("hackathon-covers").getPublicUrl(hackathon.cover_image_path).data
          .publicUrl
    : null;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <BackLink href="/admin" label="Administração" />

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">{hackathon.name}</h1>
            <p className="mt-1 text-sm text-muted">/{hackathon.slug}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/h/${hackathon.slug}/content`}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Conteúdos
            </Link>
            <Link
              href={`/admin/h/${hackathon.slug}/judges`}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Jurados
            </Link>
            <Link href={`/h/${hackathon.slug}`} className="btn-secondary px-5 py-2 text-sm">
              Ver página
            </Link>
          </div>
        </header>

        <Card className="p-6 sm:p-7">
          <h2 className="font-heading text-lg font-bold">Arte da edição</h2>
          <p className="mt-1 text-sm text-muted">
            Aparece no card da home e no topo da página pública. Quadrada funciona melhor.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            {coverUrl && (
              <Image
                src={coverUrl}
                alt=""
                width={120}
                height={120}
                className="h-28 w-28 rounded-2xl border border-green/15 object-cover"
              />
            )}
            <CoverUpload hackathonId={hackathon.id} slug={hackathon.slug} />
          </div>
        </Card>

        <EditionForm hackathon={hackathon} />
      </div>
    </div>
  );
}
