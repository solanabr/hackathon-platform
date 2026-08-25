import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { EditionForm } from "@/components/admin/edition-form";
import { CoverUpload } from "@/components/admin/cover-upload";
import { requireAdmin } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import {
  listRegistrationsForEdition,
  listTeamsForEdition,
} from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

const SUBMITTED_AT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

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

  const [registrations, teams] = await Promise.all([
    listRegistrationsForEdition(hackathon.id),
    listTeamsForEdition(hackathon.id),
  ]);
  const confirmedRegistrations = registrations.filter(
    (r) => r.luma_confirmed_at && r.terms_accepted_at,
  ).length;
  const submittedTeams = teams.filter(
    (t) => t.submission?.status === "submitted",
  ).length;

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
            <Link
              href={`/admin/h/${hackathon.slug}/finalistas`}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Finalistas
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

        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Inscrições</h2>
              <p className="mt-1 text-sm text-muted">
                {registrations.length} inscritas · {confirmedRegistrations} confirmadas no Luma e
                com termos aceitos
              </p>
            </div>
          </div>
          {registrations.length === 0 ? (
            <p className="mt-5 text-sm text-muted">Nenhuma inscrição ainda.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-green/15 text-xs uppercase tracking-wider text-muted">
                    <th className="py-2 pr-4 font-bold">Nome</th>
                    <th className="py-2 pr-4 font-bold">E-mail</th>
                    <th className="py-2 pr-4 font-bold">Luma</th>
                    <th className="py-2 font-bold">Termos</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.user_id} className="border-b border-green/10">
                      <td className="py-2 pr-4 font-medium">{r.user?.full_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted">{r.user?.email ?? "—"}</td>
                      <td className="py-2 pr-4">{r.luma_confirmed_at ? "Sim" : "Não"}</td>
                      <td className="py-2">{r.terms_accepted_at ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Times e submissões</h2>
              <p className="mt-1 text-sm text-muted">
                {teams.length} times · {submittedTeams} submetidos
              </p>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="mt-5 text-sm text-muted">Nenhum time formado ainda.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-green/15 text-xs uppercase tracking-wider text-muted">
                    <th className="py-2 pr-4 font-bold">Time</th>
                    <th className="py-2 pr-4 font-bold">Membros aceitos</th>
                    <th className="py-2 pr-4 font-bold">Status</th>
                    <th className="py-2 font-bold">Submetido em</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-b border-green/10">
                      <td className="py-2 pr-4 font-medium">{t.name}</td>
                      <td className="py-2 pr-4">{t.acceptedMembers}</td>
                      <td className="py-2 pr-4">
                        {t.submission?.status === "submitted"
                          ? "Submetido"
                          : t.submission?.status ?? "Sem submissão"}
                      </td>
                      <td className="py-2">
                        {t.submission?.submitted_at
                          ? SUBMITTED_AT.format(new Date(t.submission.submitted_at))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <EditionForm hackathon={hackathon} />
      </div>
    </div>
  );
}
