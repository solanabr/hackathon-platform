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

function FlagChip({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
        on ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-ink/10 text-muted"
      }`}
    >
      {on ? "Sim" : "Não"}
    </span>
  );
}

function TeamStatusChip({ status }: { status: string | null }) {
  const submitted = status === "submitted";
  const label = submitted ? "Submetido" : status === "draft" ? "Rascunho" : "Sem submissão";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
        submitted
          ? "border-emerald/30 bg-emerald/10 text-emerald"
          : "border-ink/10 text-muted"
      }`}
    >
      {label}
    </span>
  );
}

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
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
              Operação
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold">{hackathon.name}</h1>
            <p className="mt-1 font-mono text-sm tabular-nums text-muted">/{hackathon.slug}</p>
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
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Identidade
          </p>
          <h2 className="mt-1 font-heading text-lg font-bold">Arte da edição</h2>
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
                className="h-28 w-28 rounded-2xl border border-ink/10 object-cover"
              />
            )}
            <CoverUpload hackathonId={hackathon.id} slug={hackathon.slug} />
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
                Screening
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">Inscrições</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono tabular-nums">{registrations.length}</span> inscritas ·
                <span className="font-mono tabular-nums"> {confirmedRegistrations}</span>{" "}
                confirmadas no Luma e com termos aceitos
              </p>
            </div>
          </div>
          {registrations.length === 0 ? (
            <p className="mt-5 font-mono text-sm text-muted">Nenhuma inscrição ainda.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-widest text-muted">
                    <th className="py-3 pl-4 pr-4 font-semibold">Nome</th>
                    <th className="py-3 pr-4 font-semibold">E-mail</th>
                    <th className="py-3 pr-4 font-semibold">Luma</th>
                    <th className="py-3 pr-4 font-semibold">Termos</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.user_id} className="odd:bg-surface-deep">
                      <td className="py-2.5 pl-4 pr-4 font-medium">{r.user?.full_name ?? "—"}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                        {r.user?.email ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <FlagChip on={!!r.luma_confirmed_at} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <FlagChip on={!!r.terms_accepted_at} />
                      </td>
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
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
                Submissões
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">Times e submissões</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono tabular-nums">{teams.length}</span> times ·
                <span className="font-mono tabular-nums"> {submittedTeams}</span> submetidos
              </p>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="mt-5 font-mono text-sm text-muted">Nenhum time formado ainda.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-widest text-muted">
                    <th className="py-3 pl-4 pr-4 font-semibold">Time</th>
                    <th className="py-3 pr-4 font-semibold">Membros aceitos</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Submetido em</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="odd:bg-surface-deep">
                      <td className="py-2.5 pl-4 pr-4 font-medium">{t.name}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums text-muted">
                        {t.acceptedMembers}
                      </td>
                      <td className="py-2.5 pr-4">
                        <TeamStatusChip status={t.submission?.status ?? null} />
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs tabular-nums text-muted">
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
