import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewTeamForm } from "@/components/team/new-team-form";
import { getActiveHackathon, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getCurrentUserTeam } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  const state = await requireUser();
  if (!state.profile?.full_name || !state.profile?.luma_registered_at) {
    redirect("/onboarding");
  }
  const hackathon = await getActiveHackathon();
  if (!hackathon || !isSubmissionWindowOpen(hackathon)) {
    redirect("/dashboard");
  }
  const existing = await getCurrentUserTeam(state.userId, hackathon.id);
  if (existing) redirect("/team");

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Badge tone="emerald">Passo 2 de 3 · Time</Badge>
        <h1 className="mt-4 font-heading text-3xl font-bold sm:text-4xl">Criar seu time</h1>
        <p className="mt-2 text-bh-muted">
          Você vira o líder do time. Depois pode convidar até 3 pessoas por e-mail.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <NewTeamForm hackathonId={hackathon.id} />
        </Card>
      </div>
    </div>
  );
}
