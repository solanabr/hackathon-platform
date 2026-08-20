import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHackathonBySlug } from "@/lib/hackathon";
import { listContents } from "@/lib/content";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function ContentsPage({
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

  const contents = await listContents(hackathon.id);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Conteúdos</h1>
        <p className="mt-2 text-muted">
          As aulas ficam disponíveis aqui depois de cada encontro.
        </p>

        {contents.length === 0 ? (
          <Card className="mt-8 p-8 text-muted">
            Nenhum conteúdo liberado ainda. A primeira aula é em{" "}
            {WHEN.format(new Date(hackathon.starts_at))}.
          </Card>
        ) : (
          <div className="mt-8 grid gap-4">
            {contents.map((content) => (
              <Link key={content.id} href={`/h/${slug}/conteudos/${content.id}`}>
                <Card className="card-hover p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={content.kind === "mentoria" ? "yellow" : "emerald"}>
                      {content.kind}
                    </Badge>
                    {content.scheduled_at && (
                      <span className="text-sm text-muted">
                        {WHEN.format(new Date(content.scheduled_at))}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 font-heading text-xl font-bold">{content.title}</h2>
                  {content.speaker && <p className="text-sm text-muted">{content.speaker}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}