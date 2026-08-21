import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionEditor } from "@/components/submission/submission-editor";
import { Countdown } from "@/components/ui/countdown";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/conta?next=/h/${slug}/submissao`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
  if (!snapshot) redirect(`/h/${slug}/painel`);

  const { team, submission, isLeader } = snapshot;
  const open = isSubmissionWindowOpen(hackathon);
  const editable = open && !team.locked;

  let imagePublicUrl: string | null = null;
  if (submission.image_path) {
    const supabase = await createServerSupabaseClient();
    const { data } = supabase.storage.from("project-images").getPublicUrl(submission.image_path);
    imagePublicUrl = data.publicUrl;
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={`/h/${slug}/painel`} className="text-sm text-muted hover:text-ink">
          ← voltar ao painel
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone={submission.status === "submitted" ? "emerald" : "neutral"}>
              {submission.status === "submitted" ? "Submetido" : editable ? "Rascunho · Editável" : "Bloqueado"}
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Submissão · {team.name}</h1>
            {editable && (
              <p className="mt-1 text-sm text-muted">
                Você pode editar e salvar quantas vezes quiser até o prazo final. Encerra em{" "}
                <strong className="text-ink">
                  <Countdown deadlineIso={hackathon.submission_deadline_at} />
                </strong>
                .
              </p>
            )}
            {!editable && submission.status !== "submitted" && (
              <p className="mt-1 text-sm text-amber-300">
                Prazo encerrado. As edições estão bloqueadas; o rascunho atual será considerado.
              </p>
            )}
          </div>
        </header>

        <Card className="mt-8 p-6 sm:p-8">
          <SubmissionEditor
            teamId={team.id}
            isLeader={isLeader}
            editable={editable}
            initial={submission}
            initialImageUrl={imagePublicUrl}
            painelHref={`/h/${slug}/painel`}
          />
        </Card>
      </div>
    </div>
  );
}