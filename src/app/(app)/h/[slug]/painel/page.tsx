import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function PainelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
  const open = isSubmissionWindowOpen(hackathon);

  const steps = [
    { done: true, label: "Inscrição confirmada", href: null },
    {
      done: Boolean(snapshot),
      label: snapshot ? `Time: ${snapshot.team.name}` : "Monte seu time",
      href: snapshot ? `/h/${slug}/time` : `/h/${slug}/time/novo`,
    },
    {
      done: snapshot?.submission.status === "submitted",
      label: "Projeto submetido",
      href: snapshot ? `/h/${slug}/submissao` : null,
    },
  ];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone={open ? "emerald" : "neutral"}>
              {open ? "Submissões abertas" : "Submissões encerradas"}
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
              Olá, {state.profile?.full_name?.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-muted">{hackathon.name}</p>
          </div>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-muted">Entrega em</p>
            <p className="font-heading text-xl font-bold">
              <Countdown deadlineIso={hackathon.submission_deadline_at} />
            </p>
          </Card>
        </header>

        <Card className="p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold">Sua participação</h2>
          <ul className="mt-5 space-y-4">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step.done ? "bg-emerald text-surface" : "bg-green/10 text-muted"
                  }`}
                >
                  {step.done ? "✓" : "·"}
                </span>
                {step.href ? (
                  <Link href={step.href} className="font-semibold underline-offset-4 hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <span className={step.done ? "" : "text-muted"}>{step.label}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href={`/h/${slug}/conteudos`} className="btn-primary">
            Ver conteúdos
          </Link>
          {hackathon.community_url && (
            <a href={hackathon.community_url} target="_blank" rel="noreferrer" className="btn-secondary">
              Entrar na comunidade
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
