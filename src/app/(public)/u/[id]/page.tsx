import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProfile, PublicSubmission } from "@/types/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function getProfile(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("public_profiles").select("*").eq("id", id).maybeSingle();
  return data as PublicProfile | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return {};
  const name = profile.full_name ?? "Perfil de builder";
  return {
    title: `${name} · Superteam Brasil`,
    openGraph: { title: name },
  };
}

export default async function BuilderProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("public_submissions")
    .select("*")
    .eq("team_leader_id", id)
    .order("submitted_at", { ascending: false });
  const projects = (data as PublicSubmission[] | null) ?? [];

  const socials = [
    { href: profile.github_url, label: "GitHub" },
    { href: profile.twitter_url, label: "X" },
    { href: profile.linkedin_url, label: "LinkedIn" },
  ].filter((s) => s.href) as Array<{ href: string; label: string }>;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-3xl font-bold">
                {profile.full_name ?? "Builder"}
              </h1>
              {profile.headline && <p className="mt-1 text-muted">{profile.headline}</p>}
              {profile.bio && (
                <p className="mt-4 max-w-xl whitespace-pre-line leading-relaxed text-ink">
                  {profile.bio}
                </p>
              )}
              {socials.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-green/20 px-3 py-1 text-sm font-semibold text-muted transition-colors hover:border-green/50 hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <section className="mt-10" aria-label="Projetos do builder">
          <h2 className="font-heading text-2xl font-bold">Projetos</h2>
          {projects.length === 0 ? (
            <Card className="mt-4 p-8">
              <p className="text-muted">Nenhum projeto publicado ainda.</p>
            </Card>
          ) : (
            <ul className="mt-4 grid gap-6 sm:grid-cols-2">
              {projects.map((p) => {
                const imageUrl = p.image_path
                  ? supabase.storage.from("project-images").getPublicUrl(p.image_path).data
                      .publicUrl
                  : null;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/h/${p.hackathon_slug}/projetos/${p.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-green/20 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] transition-colors hover:border-emerald/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <div className="relative h-40 overflow-hidden bg-green-dark">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 font-heading text-lg font-bold text-surface">
                            {p.project_name}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <h3 className="truncate font-heading text-lg font-bold">
                          {p.project_name}
                        </h3>
                        <p className="text-sm text-muted">
                          {p.team_name} · {p.hackathon_name}
                        </p>
                        {p.description && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                            {p.description}
                          </p>
                        )}
                        <span className="mt-auto text-sm font-semibold text-emerald">
                          Ver projeto →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
