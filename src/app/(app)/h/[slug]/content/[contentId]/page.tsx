import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ContentEmbed } from "@/components/content/content-embed";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getContent } from "@/lib/content";
import { isUploadedFileUrl } from "@/lib/content-fields";
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
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const content = await getContent(contentId, hackathon.id);
  if (!content) notFound();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/h/${slug}/content`}
          className="inline-flex items-center gap-2 rounded-full border border-green-dark/15 bg-surface-raised px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-emerald/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span aria-hidden>←</span>
          Conteúdos
        </Link>

        <p className="mt-8 text-[12px] font-bold uppercase tracking-wider text-emerald">CONTEÚDOS</p>
        <h1 className="mt-1 font-heading text-3xl font-bold">{content.title}</h1>
        {content.speaker && <p className="mt-1 font-mono text-sm text-muted">{content.speaker}</p>}

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
            {isUploadedFileUrl(content.external_url) ? "Baixar material" : "Abrir link"}
          </a>
        )}
      </div>
    </div>
  );
}