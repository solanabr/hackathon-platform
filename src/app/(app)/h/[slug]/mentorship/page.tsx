import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PainelNav } from "@/components/edition/painel-nav";
import { getHackathonBySlug, editionUsesMentorship } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete, isProfileComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";
import { mentorshipView } from "@/lib/mentorship";
import { getMentorshipBoard } from "@/lib/mentorship-server";
import { MentorPicker, BookedMentor } from "./mentor-picker";

export const dynamic = "force-dynamic";

function Header({ slug, hackathonName }: { slug: string; hackathonName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <BackLink href={`/h/${slug}/dashboard`} label={hackathonName} />
      <PainelNav slug={slug} />
    </div>
  );
}

export default async function MentorshipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft" || !editionUsesMentorship(hackathon)) notFound();
  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/mentorship`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const view = mentorshipView(await getMentorshipBoard(hackathon.id));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Header slug={slug} hackathonName={hackathon.name} />

        <header>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Mentorias
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Mentorias</h1>
          <p className="mt-2 max-w-xl leading-relaxed text-muted">
            Seu time escolhe um mentor técnico e um de negócios. O horário você marca na agenda
            do mentor.
          </p>
        </header>

        {view.kind === "no-team" && (
          <EmptyState
            title="Você não está em um time"
            description="As mentorias são por time, e quem escolhe o mentor é o líder. Crie um time ou entre em um pelo mural."
            cta={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href={`/h/${slug}/team/new`}>
                  <Button variant="primary">Criar time</Button>
                </Link>
                <Link href={`/h/${slug}/team-up`}>
                  <Button variant="secondary">Encontrar time</Button>
                </Link>
              </div>
            }
          />
        )}

        {view.kind === "not-leader" && view.bookings.length === 0 && (
          <EmptyState
            title="Quem escolhe o mentor é o líder"
            description="Só o líder do time escolhe os mentores. Assim que ele escolher, eles aparecem aqui para todo mundo."
          />
        )}

        {view.kind === "not-leader" && view.bookings.length > 0 && (
          <div className="space-y-4">
            {view.bookings.map((booking) => (
              <BookedMentor key={booking.id} booking={booking} />
            ))}
            <p className="text-sm text-muted">
              Só o líder do time escolhe os mentores. Você acompanha por aqui.
            </p>
          </div>
        )}

        {view.kind === "empty" && (
          <EmptyState
            title="Mentores em breve"
            description="A organização ainda está fechando a lista de mentores desta edição. Volte aqui em breve."
          />
        )}

        {view.kind === "tracks" && <MentorPicker groups={view.groups} />}
      </div>
    </div>
  );
}
