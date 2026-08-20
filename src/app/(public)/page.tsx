import { listHackathons, editionStage } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EditionCard } from "@/components/layout/edition-card";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const GROUPS = [
  { stage: "running" as const, title: "Acontecendo agora" },
  { stage: "upcoming" as const, title: "Em breve" },
  { stage: "finished" as const, title: "Encerrados" },
];

export default async function HomePage() {
  const hackathons = await listHackathons();
  const supabase = await createServerSupabaseClient();

  const coverFor = (h: Hackathon) =>
    h.cover_image_path
      ? supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data.publicUrl
      : null;

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-heading text-4xl font-bold sm:text-6xl">
          Hackathons da <span className="text-emerald">Superteam Brasil</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Monte seu time, aprenda com quem constrói em Solana e submeta seu projeto.
        </p>

        {GROUPS.map(({ stage, title }) => {
          const list = hackathons.filter((h) => editionStage(h) === stage);
          if (list.length === 0) return null;
          return (
            <section key={stage} className="mt-16">
              <h2 className="font-heading text-2xl font-bold">{title}</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((h, i) => (
                  <EditionCard key={h.id} hackathon={h} coverUrl={coverFor(h)} index={i} />
                ))}
              </div>
            </section>
          );
        })}

        {hackathons.length === 0 && (
          <p className="mt-16 text-muted">Nenhum hackathon publicado no momento.</p>
        )}
      </div>
    </div>
  );
}
