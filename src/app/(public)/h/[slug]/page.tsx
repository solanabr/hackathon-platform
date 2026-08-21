import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHackathonBySlug, isRegistrationOpen } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("public_schedule")
    .select("id, kind, title, speaker, description, scheduled_at, location, position")
    .eq("hackathon_id", hackathon.id)
    .order("position", { ascending: true });
  const schedule =
    (data as Pick<
      HackathonContent,
      "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "location" | "position"
    >[] | null) ?? [];

  const open = isRegistrationOpen(hackathon);

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Badge tone={open ? "emerald" : "neutral"}>
          {open ? "Inscrições abertas" : "Inscrições encerradas"}
        </Badge>

        <h1 className="mt-4 font-heading text-4xl font-bold sm:text-5xl">{hackathon.name}</h1>
        {hackathon.tagline && <p className="mt-3 text-xl text-muted">{hackathon.tagline}</p>}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/h/${hackathon.slug}/inscricao`} className="btn-primary">
            {open ? "Quero participar" : "Ver detalhes"}
          </Link>
          {hackathon.luma_url && (
            <a href={hackathon.luma_url} target="_blank" rel="noreferrer" className="btn-secondary">
              Inscrição no Luma
            </a>
          )}
        </div>

        {hackathon.description && (
          <p className="mt-10 whitespace-pre-line text-muted">{hackathon.description}</p>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Quando</p>
            <p className="mt-2 font-heading text-lg font-bold">
              {DATE.format(new Date(hackathon.starts_at))} —{" "}
              {DATE.format(new Date(hackathon.presential_at ?? hackathon.submission_deadline_at))}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Onde</p>
            <p className="mt-2 font-heading text-lg font-bold">
              {hackathon.location_name ?? "Online"}
            </p>
            {hackathon.location_city && (
              <p className="text-sm text-muted">{hackathon.location_city}</p>
            )}
          </Card>
        </div>

        {hackathon.prize_summary && (
          <Card className="mt-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Premiação</p>
            <p className="mt-2 text-ink">{hackathon.prize_summary}</p>
          </Card>
        )}

        {schedule.length > 0 && (
          <section className="mt-14">
            <h2 className="font-heading text-2xl font-bold">Programação</h2>
            <ul className="mt-6 divide-y divide-green/10">
              {schedule.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                  <span className="w-24 font-heading font-bold">
                    {item.scheduled_at ? DATE.format(new Date(item.scheduled_at)) : "—"}
                  </span>
                  <span className="flex-1 font-semibold">{item.title}</span>
                  {item.speaker && <span className="text-sm text-muted">{item.speaker}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}