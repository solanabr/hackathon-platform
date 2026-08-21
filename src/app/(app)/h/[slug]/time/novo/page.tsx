import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  if (!isProfileComplete(state.profile)) redirect(`/conta?next=/h/${slug}/inscricao`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  if (!isSubmissionWindowOpen(hackathon)) redirect(`/h/${slug}/painel`);

  const existing = await getTeamForHackathon(state.userId, hackathon.id);
  if (existing) redirect(`/h/${slug}/time`);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Badge tone="emerald">Passo 2 de 3 · Time</Badge>
        <h1 className="mt-4 font-heading text-3xl font-bold sm:text-4xl">Criar seu time</h1>
        <p className="mt-2 text-muted">
          Você vira o líder do time. Depois pode convidar até 3 pessoas por e-mail.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <NewTeamForm hackathonId={hackathon.id} slug={slug} />
        </Card>
      </div>
    </div>
  );
}
