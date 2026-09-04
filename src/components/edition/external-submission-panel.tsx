import Link from "next/link";
import Image from "next/image";
import { ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { Badge } from "@/components/ui/badge";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { EditionInfoCard } from "@/components/edition/info-card";
import { DAY_MONTH_LONG_TIME } from "@/lib/dates";
import { isSubmissionWindowOpen } from "@/lib/hackathon";
import { campaignForSlug, withPlatformUtm } from "@/lib/attribution";
import type { Hackathon } from "@/types/db";

/** Dashboard body for editions that collect the project elsewhere: the
 * registration is done here, the three steps point outward. */
export function ExternalSubmissionPanel({
  hackathon,
  slug,
  firstName,
  submissionUrl,
  contentCount,
}: {
  hackathon: Hackathon;
  slug: string;
  firstName: string | null;
  submissionUrl: string | null;
  contentCount: number;
}) {
  const open = isSubmissionWindowOpen(hackathon);
  const host = submissionUrl ? new URL(submissionUrl).hostname.replace(/^www\./, "") : null;
  const isEarn = host?.includes("superteam.fun") ?? false;

  return (
    <>
      <header className="relative overflow-hidden rounded-3xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 opacity-[0.12]">
          <Image src="/brand/stbr/elements/morth-05.svg" alt="" width={320} height={320} className="animate-float-b" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">Painel</p>
            <h1 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-4xl">
              Olá{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-1.5 font-semibold text-muted">{hackathon.name}</p>
          </div>
          <div className="rounded-2xl border-2 border-green-dark bg-yellow/20 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                {open ? "Submissão fecha em" : "Edição encerrada"}
              </p>
              {!open && <Badge tone="neutral">Submissão encerrada</Badge>}
            </div>
            <Countdown deadlineIso={hackathon.submission_deadline_at} variant="segments" size="md" className="mt-2 !justify-start !gap-3" />
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {DAY_MONTH_LONG_TIME.format(new Date(hackathon.submission_deadline_at))}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card sticker className="p-6 sm:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">Como participar</p>
          <h2 className="mt-2 font-heading text-2xl font-black tracking-tight">Três passos, o projeto vai pelo {isEarn ? "Superteam Earn" : host ?? "site da edição"}.</h2>
          <ol className="mt-6 space-y-4">
            <li className="flex gap-4 rounded-2xl border-2 border-emerald/40 bg-emerald/10 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald text-surface">
                <CheckIcon size={18} weight="bold" aria-hidden />
              </span>
              <div>
                <p className="font-heading text-lg font-bold">Inscrição confirmada</p>
                <p className="mt-0.5 text-sm text-muted">Você está na lista da edição. Avisos chegam por e-mail e na comunidade.</p>
              </div>
            </li>
            <li className="flex gap-4 rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-dark font-heading font-black text-yellow">2</span>
              <div>
                <p className="font-heading text-lg font-bold">Monte o projeto</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  Os entregáveis, o cronograma e as regras estão na{" "}
                  <Link href={`/h/${slug}`} className="font-semibold text-emerald underline-offset-4 hover:underline">
                    página da edição
                  </Link>
                  . Times de qualquer tamanho, um projeto por pessoa ou equipe.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-dark font-heading font-black text-yellow">3</span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-lg font-bold">Envie {isEarn ? "no Superteam Earn" : "no site da edição"}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {isEarn
                    ? "Use o mesmo e-mail do cadastro aqui. Sem conta no Earn ainda? Ela se cria em dois minutos, e é por lá que o prêmio é pago."
                    : "A submissão acontece fora da plataforma, no link abaixo."}
                </p>
                {submissionUrl ? (
                  <TrackedCta
                    href={withPlatformUtm(submissionUrl, { content: "dashboard_step3", campaign: campaignForSlug(slug) })}
                    event="campaign_link_clicked"
                    properties={{ target: "external_submission", location: "dashboard", edition: slug }}
                    className="btn-primary mt-4 inline-flex px-6 py-2.5 text-sm shadow-sticker"
                  >
                    {open ? "Abrir a submissão" : "Ver a submissão"}
                    <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
                  </TrackedCta>
                ) : (
                  <p className="mt-4 inline-flex rounded-full border-2 border-dashed border-green-dark/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                    Link de submissão em breve
                  </p>
                )}
                {isEarn && (
                  <p className="mt-3 text-sm text-muted">
                    Ganhou?{" "}
                    <Link href="/guias/do-earn-ao-pix" className="font-semibold text-emerald underline-offset-4 hover:underline">
                      Veja como receber a grant em reais
                    </Link>
                    .
                  </p>
                )}
              </div>
            </li>
          </ol>
        </Card>

        <aside className="space-y-6">
          <EditionInfoCard hackathon={hackathon} />
          {contentCount > 0 && (
            <Card sticker className="p-6 sm:p-7">
              <h2 className="font-heading text-xl font-bold">Conteúdos</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">Lives, workshops e materiais da edição.</p>
              <Link href={`/h/${slug}/content`} className="btn-primary mt-4 inline-block px-5 py-2 text-sm">
                Ver conteúdos
              </Link>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
