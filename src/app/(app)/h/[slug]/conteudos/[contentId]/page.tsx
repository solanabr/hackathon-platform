import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ContentEmbed } from "@/components/content/content-embed";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getContent } from "@/lib/content";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string; contentId: string }>;
}) {
  const { slug, contentId } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const content = await getContent(contentId, hackathon.id);
  if (!content) notFound();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={`/h/${slug}/conteudos`} className="text-sm text-muted hover:text-ink">
          ← todos os conteúdos
        </Link>

        <h1 className="mt-4 font-heading text-3xl font-bold">{content.title}</h1>
        {content.speaker && <p className="mt-1 text-muted">{content.speaker}</p>}

        {content.youtube_id && (
          <div className="mt-8">
            <ContentEmbed youtubeId={content.youtube_id} title={content.title} />
          </div>
        )}

        {content.description && (
          <p className="mt-8 whitespace-pre-line text-muted">{content.description}</p>
        )}

        {content.external_url && (
          <a
            href={content.external_url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-8"
          >
            Abrir material
          </a>
        )}
      </div>
    </div>
  );
}