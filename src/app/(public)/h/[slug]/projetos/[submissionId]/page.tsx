import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicSubmission, PublicTeamMember } from "@/types/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; submissionId: string }> };

async function getSubmission(slug: string, id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("public_submissions")
    .select(
      "id, project_name, description, image_path, github_url, twitter_url, website_url, demo_video_url, pitch_video_url, team_id, team_name, team_leader_name, hackathon_name",
    )
    .eq("id", id)
    .eq("hackathon_slug", slug)
    .maybeSingle();
  return { submission: data as PublicSubmission | null, error };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, submissionId } = await params;
  const { submission } = await getSubmission(slug, submissionId);
  if (!submission) return {};

  const title = submission.project_name ?? submission.team_name;
  const supabase = await createServerSupabaseClient();
  const ogImage = submission.image_path
    ? supabase.storage.from("project-images").getPublicUrl(submission.image_path).data.publicUrl
    : undefined;

  return {
    title: `${title} · ${submission.hackathon_name}`,
    description: submission.description ?? undefined,
    openGraph: {
      title,
      description: submission.description ?? undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug, submissionId } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const { submission, error: submissionError } = await getSubmission(slug, submissionId);
  if (submissionError) {
    console.error(`[submission ${submissionId}] public_submissions query failed:`, submissionError);
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <BackLink href={`/h/${slug}/projetos`} label="Projetos" />
          <Card className="mt-8 p-8">
            <p className="font-heading text-lg font-bold text-ink">
              Não foi possível carregar o projeto.
            </p>
            <p className="mt-1 text-sm text-muted">Tente novamente em instantes.</p>
          </Card>
        </div>
      </div>
    );
  }
  if (!submission) notFound();

  const supabase = await createServerSupabaseClient();
  const imageUrl = submission.image_path
    ? supabase.storage.from("project-images").getPublicUrl(submission.image_path).data.publicUrl
    : null;

  const { data: membersData, error: membersError } = await supabase
    .from("public_team_members")
    .select("user_id, full_name, avatar_url, headline")
    .eq("team_id", submission.team_id)
    .order("full_name");
  const members = (membersData as PublicTeamMember[] | null) ?? [];

  if (membersError) {
    console.error(`[submission ${submissionId}] public_team_members query failed:`, membersError);
  }

  const links = [
    { href: submission.github_url, label: "GitHub" },
    { href: submission.website_url, label: "Site" },
    { href: submission.demo_video_url, label: "Vídeo demo" },
    { href: submission.pitch_video_url, label: "Pitch" },
    { href: submission.twitter_url, label: "X" },
  ].filter((l) => l.href) as Array<{ href: string; label: string }>;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <BackLink href={`/h/${slug}/projetos`} label="Projetos" />

        <header className="mt-4">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {submission.project_name ?? submission.team_name}
          </h1>
          <p className="mt-1 text-muted">
            {submission.team_name}
            {submission.team_leader_name ? ` · ${submission.team_leader_name}` : ""}
          </p>
        </header>

        {imageUrl && (
          <div className="relative mt-8 h-72 overflow-hidden rounded-2xl border border-green/20 bg-green-dark sm:h-96">
            <Image
              src={imageUrl}
              alt={`Imagem do projeto ${submission.project_name ?? ""}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
          </div>
        )}

        {submission.description && (
          <section className="mt-8" aria-label="Descrição">
            <h2 className="font-heading text-lg font-bold">Sobre o projeto</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">
              {submission.description}
            </p>
          </section>
        )}

        {membersError && (
          <section className="mt-10" aria-label="Equipe">
            <h2 className="font-heading text-lg font-bold">Equipe</h2>
            <p className="mt-3 text-sm text-muted">Não foi possível carregar a equipe.</p>
          </section>
        )}

        {!membersError && members.length > 0 && (
          <section className="mt-10" aria-label="Equipe">
            <h2 className="font-heading text-lg font-bold">Equipe</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {members.map((m) => (
                <li key={m.user_id}>
                  <Link
                    href={`/u/${m.user_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-green/15 bg-surface-raised p-4 transition-colors hover:border-emerald/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Avatar src={m.avatar_url} name={m.full_name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-heading font-bold">
                        {m.full_name ?? "Participante"}
                      </p>
                      {m.headline && <p className="truncate text-sm text-muted">{m.headline}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {links.length > 0 && (
          <section className="mt-10" aria-label="Links do projeto">
            <h2 className="font-heading text-lg font-bold">Links</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-green/20 px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-green/50 hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <Card className="p-6">
            <p className="text-sm text-muted">
              Projeto submetido no{" "}
              <Link href={`/h/${slug}`} className="font-semibold text-emerald underline-offset-4 hover:underline">
                {hackathon.name}
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
