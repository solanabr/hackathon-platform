import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { PainelNav } from "@/components/edition/painel-nav";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const KIND_LABEL: Record<string, string> = {
  aula: "Aula",
  workshop: "Workshop",
  mentoria: "Mentoria",
  material: "Material",
  link: "Link",
  evento: "Evento",
};

type ScheduleRow = Pick<
  HackathonContent,
  "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "position"
>;

export default async function ContentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const supabase = await createServerSupabaseClient();

  // Every scheduled item is listed; RLS keeps the unpublished ones out of the
  // second query, which is what marks an item as watchable.
  const [{ data: scheduleData }, { data: availableData }] = await Promise.all([
    supabase
      .from("public_schedule")
      .select("id, kind, title, speaker, description, scheduled_at, position")
      .eq("hackathon_id", hackathon.id)
      .order("position", { ascending: true }),
    supabase.from("hackathon_contents").select("id").eq("hackathon_id", hackathon.id),
  ]);

  const schedule = (scheduleData as ScheduleRow[] | null) ?? [];
  const available = new Set(((availableData as { id: string }[] | null) ?? []).map((c) => c.id));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}/dashboard`} label="Painel" />
          <PainelNav slug={slug} />
        </div>

        <p className="mt-8 text-[12px] font-bold uppercase tracking-wider text-emerald">TRILHA</p>
        <h1 className="mt-1 font-heading text-3xl font-bold sm:text-4xl">Conteúdos</h1>
        <p className="mt-2 font-mono text-sm tabular-nums text-muted">
          {available.size}/{schedule.length} disponíveis. As gravações entram depois de cada
          encontro.
        </p>

        {schedule.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Nada por aqui ainda"
            description="Os conteúdos desta edição ainda não foram publicados. Volte em breve."
          />
        ) : (
          <ul className="mt-8 grid gap-4">
            {schedule.map((item) => {
              const ready = available.has(item.id);
              const when = item.scheduled_at
                ? WHEN.format(new Date(item.scheduled_at)).replace(/\./g, "")
                : null;

              const body = (
                <Card className={`p-6 ${ready ? "card-hover" : "opacity-75"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {when ? `${when} · ` : ""}
                      {KIND_LABEL[item.kind] ?? item.kind}
                    </p>
                    <StatusChip tone={ready ? "ok" : "muted"}>
                      {ready ? "disponível" : "em breve"}
                    </StatusChip>
                  </div>

                  <h2 className="mt-3 font-heading text-xl font-bold leading-tight">
                    {item.title}
                  </h2>
                  {item.speaker && (
                    <p className="mt-0.5 text-sm font-semibold text-emerald">{item.speaker}</p>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                  )}
                </Card>
              );

              return (
                <li key={item.id}>
                  {ready ? (
                    <Link href={`/h/${slug}/content/${item.id}`}>{body}</Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
