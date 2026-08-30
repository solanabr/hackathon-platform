import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PainelNav } from "@/components/edition/painel-nav";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { isProfileCompleteForTeamUp } from "@/lib/team-up";
import { getTeamUpBoard } from "@/lib/team-up-server";
import { TeamUpBoard } from "./board";

export const dynamic = "force-dynamic";

function Header({ slug, hackathonName }: { slug: string; hackathonName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <BackLink href={`/h/${slug}/dashboard`} label={hackathonName} />
      <PainelNav slug={slug} />
    </div>
  );
}

export default async function TeamUpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  if (!isSubmissionWindowOpen(hackathon)) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <Header slug={slug} hackathonName={hackathon.name} />
          <EmptyState
            title="Formação de times encerrada"
            description="A janela de submissão desta edição já fechou, então o mural de times não está mais disponível."
          />
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [board, snapshot, seekerResult, applicationsResult] = await Promise.all([
    getTeamUpBoard(hackathon.id),
    getTeamForHackathon(state.userId, hackathon.id),
    supabase
      .from("team_seekers")
      .select("*")
      .eq("hackathon_id", hackathon.id)
      .eq("user_id", state.userId)
      .maybeSingle(),
    supabase
      .from("team_applications")
      .select("id, team_id, status, message, created_at")
      .eq("hackathon_id", hackathon.id)
      .eq("user_id", state.userId)
      .order("created_at", { ascending: false }),
  ]);
  if (seekerResult.error) logQueryError("teamUp.page.seeker", seekerResult.error);
  if (applicationsResult.error) logQueryError("teamUp.page.applications", applicationsResult.error);

  const acceptedCount = snapshot?.members.filter((m) => m.status === "accepted").length ?? 0;
  const pendingCount = snapshot?.members.filter((m) => m.status === "pending").length ?? 0;
  const isLeader = Boolean(
    snapshot?.isLeader && !snapshot.team.locked && acceptedCount + pendingCount < 4,
  );

  const seekerRow = seekerResult.data as { roles: string[]; note: string | null; active: boolean } | null;
  const applications = (applicationsResult.data ?? []) as Array<{
    id: string;
    team_id: string;
    status: string;
  }>;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Header slug={slug} hackathonName={hackathon.name} />

        <div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-4xl">
            Encontrar time
          </h1>
          <p className="mt-1.5 font-semibold text-muted">
            Times recrutando e participantes disponíveis para {hackathon.name}.
          </p>
        </div>

        <TeamUpBoard
          slug={slug}
          hackathonId={hackathon.id}
          board={board}
          viewer={{
            userId: state.userId,
            isLeader,
            teamId: snapshot?.team.id ?? null,
            hasTeam: Boolean(snapshot),
            profileComplete: isProfileCompleteForTeamUp(state.profile),
          }}
          seekerPost={
            seekerRow
              ? { roles: seekerRow.roles, note: seekerRow.note, active: seekerRow.active }
              : null
          }
          applications={applications}
        />
      </div>
    </div>
  );
}
