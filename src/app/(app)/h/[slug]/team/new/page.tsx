import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { NewTeamForm } from "@/components/team/new-team-form";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function NewTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/register`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  if (!isSubmissionWindowOpen(hackathon)) redirect(`/h/${slug}/dashboard`);

  const existing = await getTeamForHackathon(state.userId, hackathon.id);
  if (existing) redirect(`/h/${slug}/team`);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <BackLink href={`/h/${slug}/dashboard`} label="Painel" />

        <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">Time</p>
        <h1 className="mt-1 font-heading text-3xl font-bold sm:text-4xl">Criar seu time</h1>
        <p className="mt-2 text-muted">
          Você vira o líder do time. Depois pode convidar até 3 pessoas por e-mail.
        </p>
        <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Passo 2 de 3
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <NewTeamForm hackathonId={hackathon.id} slug={slug} />
        </Card>
      </div>
    </div>
  );
}
