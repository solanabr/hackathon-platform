import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProfile, PublicSubmission } from "@/types/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function getProfile(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, full_name, avatar_url, headline, bio, github_url, twitter_url, linkedin_url")
    .eq("id", id)
    .maybeSingle();
  return { profile: data as PublicProfile | null, error };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { profile } = await getProfile(id);
  if (!profile) return {};
  const name = profile.full_name ?? "Perfil de builder";
  return {
    title: `${name} · Superteam Brasil`,
    openGraph: { title: name },
  };
}

export default async function BuilderProfilePage({ params }: Props) {
  const { id } = await params;
  const { profile, error: profileError } = await getProfile(id);
  if (profileError) {
    console.error(`[profile ${id}] public_profiles query failed:`, profileError);
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="p-8">
            <p className="font-heading text-lg font-bold text-ink">
              Não foi possível carregar o perfil.
            </p>
            <p className="mt-1 text-sm text-muted">Tente novamente em instantes.</p>
          </Card>
        </div>
      </div>
    );
  }
  if (!profile) notFound();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("public_submissions")
    .select("id, project_name, description, image_path, team_name, hackathon_slug, hackathon_name")
    .eq("team_leader_id", id)
    .order("submitted_at", { ascending: false });
  const projects = (data as PublicSubmission[] | null) ?? [];

  // A query error must not read as "no projects yet" — surface it instead.
  if (error) {
    console.error(`[profile ${id}] public_submissions query failed:`, error);
  }

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
              <p className="text-xs font-bold uppercase tracking-wider text-emerald">Builder</p>
              <h1 className="mt-2 font-heading text-3xl font-bold uppercase leading-tight tracking-tight sm:text-4xl">
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
                      className="rounded-full border border-ink/10 px-3 py-1 text-sm font-semibold text-muted transition-colors hover:border-emerald/50 hover:text-ink"
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald">Projetos</p>
          <h2 className="mt-2 font-heading text-2xl font-bold">Projetos</h2>
          {error ? (
            <Card className="mt-4 p-8">
              <p className="font-heading text-lg font-bold text-ink">
                Não foi possível carregar os projetos.
              </p>
              <p className="mt-1 text-sm text-muted">Tente novamente em instantes.</p>
            </Card>
          ) : projects.length === 0 ? (
            <div className="mt-4">
              <EmptyState />
            </div>
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
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-emerald/50 hover:ring-2 hover:ring-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
                        <h3 className="truncate font-heading text-lg font-bold text-ink">
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
